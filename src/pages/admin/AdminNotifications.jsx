import { useEffect, useMemo, useState } from 'react';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { AdminNotificationsSkeleton } from '../../components/common/Skeleton';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { formatRelativeTime } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

const ROLE_OPTIONS = [
  { value: 'all', label: 'Todos los usuarios' },
  { value: 'personal', label: 'Candidatos (personal)' },
  { value: 'business', label: 'Empresas (business)' },
  { value: 'organization', label: 'Organizaciones' },
];

function buildAudienceFilter({ audience, city, sector }) {
  if (audience === 'all') {
    return { all: true };
  }

  const filter = { roles: [audience] };
  if (city.trim()) filter.city = city.trim();
  if (sector.trim()) filter.sector = sector.trim();
  return filter;
}

function formatAudience(filter = {}) {
  if (filter.all) return 'Todos';
  const roles = Array.isArray(filter.roles) ? filter.roles.join(', ') : '—';
  const parts = [roles];
  if (filter.city) parts.push(`Ciudad: ${filter.city}`);
  if (filter.sector) parts.push(`Sector: ${filter.sector}`);
  return parts.join(' · ');
}

export default function AdminNotifications() {
  const { showToast } = useNotificationContext();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('/personal/notifications');
  const [audience, setAudience] = useState('all');
  const [city, setCity] = useState('');
  const [sector, setSector] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const audienceFilter = useMemo(
    () => buildAudienceFilter({ audience, city, sector }),
    [audience, city, sector],
  );

  const loadHistory = async () => {
    setLoading(true);
    const { data, error } = await adminService.getPushBroadcastHistory();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setHistory(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadHistory();
  }, [showToast]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast('Título y mensaje son obligatorios.', 'error');
      return;
    }

    setSending(true);
    const { data, error } = await adminService.sendAdminPushBroadcast({
      title: title.trim(),
      body: body.trim(),
      link: link.trim() || '/personal/notifications',
      audienceFilter,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    });
    setSending(false);

    if (error) {
      showToast(getSupabaseErrorMessage(error, 'No se pudo enviar la notificación.'), 'error');
      return;
    }

    if (data?.scheduled) {
      showToast('Notificación programada correctamente.', 'success');
    } else {
      showToast(`Push enviado a ${data?.recipient_count ?? 0} usuarios.`, 'success');
    }

    setTitle('');
    setBody('');
    setScheduledAt('');
    await loadHistory();
  };

  const handleProcessScheduled = async () => {
    setSending(true);
    const { data, error } = await adminService.processScheduledPushNotifications();
    setSending(false);

    if (error) {
      showToast(getSupabaseErrorMessage(error, 'No se pudieron procesar envíos programados.'), 'error');
      return;
    }

    showToast(`Procesados: ${data?.processed ?? 0} · Enviados: ${data?.sent ?? 0}`, 'success');
    await loadHistory();
  };

  if (loading) {
    return <AdminNotificationsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <AdminSectionCard title="Enviar notificación push">
        <form className="space-y-4" onSubmit={handleSend}>
          <Input
            label="Título"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Aviso importante de TrabaGE"
            required
          />
          <Textarea
            label="Mensaje"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Escribe el contenido de la notificación…"
            rows={4}
            required
          />
          <Input
            label="Enlace al pulsar (deep link)"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="/personal/notifications"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              Audiencia
              <select
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <Input
              label="Programar envío (opcional)"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </div>

          {audience !== 'all' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Filtrar por ciudad (opcional)"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Malabo"
              />
              <Input
                label="Filtrar por sector (opcional)"
                value={sector}
                onChange={(event) => setSector(event.target.value)}
                placeholder="Tecnología"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={sending}>
              {sending ? 'Enviando…' : scheduledAt ? 'Programar envío' : 'Enviar ahora'}
            </Button>
            <Button type="button" variant="secondary" disabled={sending} onClick={handleProcessScheduled}>
              Procesar programados
            </Button>
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard title="Historial de envíos">
        <ul className="divide-y divide-gray-100">
          {history.length === 0 ? (
            <li className="py-6 text-center text-sm text-gray-500">Sin envíos registrados.</li>
          ) : (
            history.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{item.body}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatAudience(item.audience_filter)} · {item.recipient_count ?? 0} destinatarios · {item.status}
                  </p>
                  {item.error ? (
                    <p className="mt-1 text-xs text-red-600">{item.error}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatRelativeTime(item.sent_at ?? item.scheduled_at ?? item.created_at)}
                </span>
              </li>
            ))
          )}
        </ul>
      </AdminSectionCard>
    </div>
  );
}
