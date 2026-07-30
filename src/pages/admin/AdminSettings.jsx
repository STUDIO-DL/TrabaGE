import { useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import AdminConfirmModal from '../../components/admin/AdminConfirmModal';
import { AdminSettingsSkeleton } from '../../components/common/Skeleton';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { maintenanceService } from '../../services/maintenance.service';
import { useMaintenance } from '../../context/MaintenanceContext';

function toLocalInputValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function AdminSettings() {
  const { showToast, showErrorToast } = useNotificationContext();
  const { refresh: refreshMaintenance, status: liveStatus } = useMaintenance();
  const [settings, setSettings] = useState({
    platform_name: 'TrabaGE',
    support_email: 'support@trabage.org',
  });
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: maintenanceService.DEFAULT_MESSAGE,
    startLocal: '',
    endLocal: '',
  });
  const [loading, setLoading] = useState(true);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data, error }, maintenanceResult] = await Promise.all([
        adminService.getPlatformSettings(),
        maintenanceService.getStatus(),
      ]);

      if (error) showErrorToast(error, 'settings');
      if (data) {
        setSettings({
          platform_name: data.platform_name ?? 'TrabaGE',
          support_email: data.support_email ?? 'support@trabage.org',
        });
      }

      const m = maintenanceResult.data;
      if (m) {
        setMaintenance({
          enabled: Boolean(m.enabled),
          message: m.message || maintenanceService.DEFAULT_MESSAGE,
          startLocal: toLocalInputValue(m.start_at),
          endLocal: toLocalInputValue(m.end_at),
        });
      }
      setLoading(false);
    };
    void load();
  }, [showErrorToast]);

  // Keep admin form roughly in sync when another admin toggles live status.
  useEffect(() => {
    if (!liveStatus) return;
    setMaintenance((prev) => ({
      ...prev,
      enabled: Boolean(liveStatus.enabled),
      message: liveStatus.message || prev.message,
      startLocal: toLocalInputValue(liveStatus.start_at) || prev.startLocal,
      endLocal: toLocalInputValue(liveStatus.end_at) || prev.endLocal,
    }));
  }, [liveStatus?.updated_at, liveStatus?.enabled, liveStatus?.message, liveStatus?.start_at, liveStatus?.end_at]);

  const handleSavePlatform = async (e) => {
    e.preventDefault();
    setSavingPlatform(true);
    const { error } = await adminService.updatePlatformSettings(settings);
    setSavingPlatform(false);
    if (error) {
      showErrorToast(error, 'settings');
      return;
    }
    showToast('Configuración guardada', 'success');
  };

  const persistMaintenance = async () => {
    setSavingMaintenance(true);
    const startAt = fromLocalInputValue(maintenance.startLocal);
    const endAt = fromLocalInputValue(maintenance.endLocal);

    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      setSavingMaintenance(false);
      showToast('La fecha de finalización debe ser posterior al inicio.', 'error');
      return;
    }

    const { error } = await maintenanceService.updateSettings({
      enabled: maintenance.enabled,
      message: maintenance.message,
      startAt,
      endAt,
      clearStart: !maintenance.startLocal,
      clearEnd: !maintenance.endLocal,
    });
    setSavingMaintenance(false);
    setConfirmOpen(false);

    if (error) {
      showErrorToast(error, 'settings');
      return;
    }

    await refreshMaintenance();
    showToast(
      maintenance.enabled ? 'Modo mantenimiento activado' : 'Modo mantenimiento desactivado',
      'success',
    );
  };

  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    // Confirm only when turning maintenance ON (not when editing while already on / turning off).
    const turningOn = maintenance.enabled && !liveStatus?.enabled;
    if (turningOn) {
      setConfirmOpen(true);
      return;
    }
    await persistMaintenance();
  };

  const liveBadge = useMemo(() => {
    if (liveStatus?.is_active) {
      return { label: 'Activo ahora', className: 'bg-amber-50 text-amber-800 ring-amber-200' };
    }
    if (liveStatus?.enabled) {
      return { label: 'Programado', className: 'bg-sky-50 text-sky-800 ring-sky-200' };
    }
    return { label: 'Inactivo', className: 'bg-slate-50 text-slate-600 ring-slate-200' };
  }, [liveStatus?.is_active, liveStatus?.enabled]);

  if (loading) {
    return <AdminSettingsSkeleton />;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card padding="lg">
        <h2 className="text-base font-semibold text-slate-900">Plataforma</h2>
        <form onSubmit={handleSavePlatform} className="mt-4 space-y-5">
          <Input
            label="Nombre de la plataforma"
            value={settings.platform_name}
            onChange={(e) => setSettings((prev) => ({ ...prev, platform_name: e.target.value }))}
          />
          <Input
            label="Email de soporte"
            type="email"
            value={settings.support_email}
            onChange={(e) => setSettings((prev) => ({ ...prev, support_email: e.target.value }))}
          />
          <Button type="submit" loading={savingPlatform}>
            Guardar cambios
          </Button>
        </form>
      </Card>

      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Modo mantenimiento</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mientras esté activo, los usuarios no podrán usar TrabaGE. Los administradores siguen
              teniendo acceso.
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${liveBadge.className}`}
          >
            {liveBadge.label}
          </span>
        </div>

        <form onSubmit={handleSaveMaintenance} className="mt-5 space-y-5">
          <label className="flex items-center gap-3 rounded-xl border border-app-border px-4 py-3">
            <input
              type="checkbox"
              checked={maintenance.enabled}
              onChange={(e) =>
                setMaintenance((prev) => ({ ...prev, enabled: e.target.checked }))
              }
              className="h-4 w-4 rounded border-app-border text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-app-text">Activar modo mantenimiento</span>
          </label>

          <Textarea
            label="Mensaje personalizado"
            rows={4}
            value={maintenance.message}
            onChange={(e) => setMaintenance((prev) => ({ ...prev, message: e.target.value }))}
            hint="Visible en la pantalla pública de mantenimiento."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Inicio (opcional)"
              type="datetime-local"
              value={maintenance.startLocal}
              onChange={(e) =>
                setMaintenance((prev) => ({ ...prev, startLocal: e.target.value }))
              }
            />
            <Input
              label="Finalización (opcional)"
              type="datetime-local"
              value={maintenance.endLocal}
              onChange={(e) => setMaintenance((prev) => ({ ...prev, endLocal: e.target.value }))}
            />
          </div>
          <p className="text-xs text-slate-500">
            Si defines una finalización, el modo se desactiva automáticamente a esa hora.
          </p>

          <Button type="submit" loading={savingMaintenance}>
            Guardar modo mantenimiento
          </Button>
        </form>
      </Card>

      <AdminConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={persistMaintenance}
        loading={savingMaintenance}
        title="¿Activar modo mantenimiento?"
        description="¿Seguro que deseas activar el modo mantenimiento? Mientras esté activo, los usuarios no podrán acceder a TrabaGE."
        confirmLabel="Activar"
        variant="danger"
      />
    </div>
  );
}
