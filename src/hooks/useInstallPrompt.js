import { useEffect, useState } from 'react';

const INSTALLED_KEY = 'trabage_pwa_installed';

function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

export function isPwaInstalled() {
  if (typeof window === 'undefined') return false;
  if (isStandaloneDisplayMode()) return true;
  return localStorage.getItem(INSTALLED_KEY) === 'true';
}

export function markPwaInstalled() {
  localStorage.setItem(INSTALLED_KEY, 'true');
}

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isPwaInstalled());

  useEffect(() => {
    if (isStandaloneDisplayMode()) {
      markPwaInstalled();
      setInstalled(true);
    }
  }, []);

  useEffect(() => {
    if (installed) return undefined;

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [installed]);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === 'accepted') {
      markPwaInstalled();
      setInstalled(true);
    }
  };

  return { canInstall: Boolean(prompt) && !installed, install, isInstalled: installed };
}
