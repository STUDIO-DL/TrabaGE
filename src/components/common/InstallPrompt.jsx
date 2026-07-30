import { useState } from 'react';
import AppIcon from './AppIcon';
import Button from '../ui/Button';
import TrabaGEWordmark from '../branding/TrabaGEWordmark';
import { Download, X, ICON_SIZES } from '../../constants/icons';
import { isPwaInstalled, useInstallPrompt } from '../../hooks/useInstallPrompt';

const DISMISS_KEY = 'trabage_install_prompt_dismissed';
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    if (raw === 'true') return true;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Chromium / Android install chip via beforeinstallprompt.
 * iOS Safari has no install event — guidance lives in push/onboarding prompts.
 */
export default function InstallPrompt() {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => wasDismissedRecently());

  if (isPwaInstalled() || !canInstall || dismissed) return null;

  const dismiss = () => {
    markDismissed();
    setDismissed(true);
  };

  return (
    <div
      className="pointer-events-none fixed bottom-20 left-0 right-0 z-[70] flex justify-center px-4 sm:bottom-6"
      role="region"
      aria-label="Instalar aplicación"
    >
      <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border border-app-border bg-app-card/95 p-3 shadow-elevation-2 backdrop-blur-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <AppIcon icon={Download} size={ICON_SIZES.sm} className="text-primary-600" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-1 text-caption font-semibold text-app-text">
            <span>Instalar</span>
            <TrabaGEWordmark size="xs" />
          </p>
          <p className="text-caption text-app-subtle">Acceso rápido desde tu pantalla de inicio</p>
        </div>
        <Button type="button" size="sm" className="!rounded-lg !px-3 !py-1.5 text-caption" onClick={install}>
          Instalar
        </Button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-app-subtle transition-colors hover:bg-app-surface hover:text-app-muted"
          aria-label="Cerrar"
        >
          <AppIcon icon={X} size={ICON_SIZES.sm} />
        </button>
      </div>
    </div>
  );
}
