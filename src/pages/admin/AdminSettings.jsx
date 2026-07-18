import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

const DEFAULTS = {
  platform_name: 'TrabaGE',
  support_email: 'support@trabage.org',
  maintenance_mode: false,
};

export default function AdminSettings() {
  const { showToast } = useNotificationContext();
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await adminService.getPlatformSettings();
      if (error) showToast(getSupabaseErrorMessage(error), 'error');
      if (data) {
        setSettings({
          platform_name: data.platform_name ?? DEFAULTS.platform_name,
          support_email: data.support_email ?? DEFAULTS.support_email,
          maintenance_mode: Boolean(data.maintenance_mode),
        });
      }
      setLoading(false);
    };
    load();
  }, [showToast]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await adminService.updatePlatformSettings(settings);
    setSaving(false);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Configuración guardada', 'success');
  };

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Card padding="lg" className="max-w-xl">
      <form onSubmit={handleSave} className="space-y-5">
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
        <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
          <input
            type="checkbox"
            checked={settings.maintenance_mode}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, maintenance_mode: e.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-gray-900">Modo mantenimiento</span>
        </label>
        <Button type="submit" loading={saving}>
          Guardar cambios
        </Button>
      </form>
    </Card>
  );
}
