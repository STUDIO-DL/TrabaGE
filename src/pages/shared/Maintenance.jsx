import { useEffect, useMemo, useState } from 'react';
import ZarrelCredit from '../../components/branding/ZarrelCredit';
import TrabaGEWordmark from '../../components/splash/TrabaGEWordmark';
import { SUPPORT_EMAIL } from '../../constants/support';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useMaintenance } from '../../context/MaintenanceContext';
import { maintenanceService } from '../../services/maintenance.service';

function formatEndLabel(iso) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

function useCountdown(endAt) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endAt) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endAt]);

  return useMemo(() => {
    if (!endAt) return null;
    const endMs = new Date(endAt).getTime();
    const diff = Math.max(0, endMs - now);
    if (diff <= 0) return { done: true, label: null };

    const totalSec = Math.floor(diff / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    parts.push(`${String(hours).padStart(2, '0')}h`);
    parts.push(`${String(minutes).padStart(2, '0')}m`);
    parts.push(`${String(seconds).padStart(2, '0')}s`);

    return { done: false, label: parts.join(' ') };
  }, [endAt, now]);
}

/**
 * Public maintenance surface. Shown when the platform is under maintenance.
 */
export default function Maintenance() {
  usePageTitle('Mantenimiento | TrabaGE');
  const { status, refresh } = useMaintenance();
  const message = status?.message || maintenanceService.DEFAULT_MESSAGE;
  const endLabel = formatEndLabel(status?.end_at);
  const countdown = useCountdown(status?.end_at);

  useEffect(() => {
    if (countdown?.done) void refresh();
  }, [countdown?.done, refresh]);

  const paragraphs = String(message)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-[#EFF6FF] via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <TrabaGEWordmark size="lg" />
        <h1 className="mt-8 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Estamos realizando tareas de mantenimiento
        </h1>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {paragraphs.length > 0 ? (
            paragraphs.map((line) => <p key={line}>{line}</p>)
          ) : (
            <>
              <p>Estamos trabajando para mejorar la plataforma.</p>
              <p>Volveremos lo antes posible.</p>
            </>
          )}
        </div>

        {endLabel ? (
          <div className="mt-8 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Mantenimiento previsto hasta
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{endLabel}</p>
            {countdown?.label ? (
              <p className="mt-2 font-mono text-sm text-primary-600" aria-live="polite">
                {countdown.label}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
            El servicio volverá a estar disponible en breve.
          </p>
        )}

        <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          Si necesitas ayuda, escribe a{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>

      <div className="pb-8 pt-4" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-center">
          <ZarrelCredit variant="developed" />
        </div>
      </div>
    </div>
  );
}
