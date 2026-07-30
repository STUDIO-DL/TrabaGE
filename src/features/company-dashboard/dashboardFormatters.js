export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function formatDashboardDate(date = new Date()) {
  const formatted = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function buildSmartSummary(stats = {}) {
  const parts = [];
  const apps = Number(stats.new_applications_today || 0);
  const visits = Number(stats.new_profile_visits_today || 0);
  const notifs = Number(stats.new_notifications_today || stats.unread_notifications || 0);

  if (apps > 0) {
    parts.push(`${apps} nueva${apps === 1 ? '' : 's'} candidatura${apps === 1 ? '' : 's'}`);
  }
  if (visits > 0) {
    parts.push(`${visits} nueva${visits === 1 ? '' : 's'} visita${visits === 1 ? '' : 's'} al perfil`);
  }
  if (notifs > 0) {
    parts.push(`${notifs} nueva${notifs === 1 ? '' : 's'} notificación${notifs === 1 ? '' : 'es'}`);
  }

  if (parts.length === 0) {
    return 'Todo tranquilo por ahora. Buen momento para publicar o revisar tu perfil.';
  }

  return parts.join(' · ');
}

export function formatDeltaPct(value) {
  if (value == null) return { text: 'Sin base previa', tone: 'muted' };
  const n = Number(value);
  if (Number.isNaN(n) || n === 0) return { text: 'Sin cambio', tone: 'neutral' };
  const sign = n > 0 ? '↑ +' : '↓ ';
  return {
    text: `${sign}${Math.abs(n)}%`,
    tone: n > 0 ? 'positive' : 'negative',
  };
}

export function formatRelativeTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hace 1 día';
  if (days < 7) return `Hace ${days} días`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function formatDaysActive(days) {
  if (days == null || Number.isNaN(Number(days))) return '—';
  const n = Number(days);
  if (n < 1) return '< 1 día';
  if (n === 1) return '1 día';
  return `${Math.round(n)} días`;
}

export function funnelStatusLabel(status) {
  if (status === 'accepted') return 'Aceptado';
  if (status === 'rejected') return 'Rechazado';
  if (status === 'withdrawn') return 'Retirada';
  return 'Pendiente';
}

export function funnelStatusTone(status) {
  if (status === 'accepted') return 'success';
  if (status === 'rejected') return 'danger';
  return 'pending';
}
