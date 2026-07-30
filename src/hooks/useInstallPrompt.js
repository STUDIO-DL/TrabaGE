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

function readInstalledFlag() {
  try {
    return localStorage.getItem(INSTALLED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function isPwaInstalled() {
  if (typeof window === 'undefined') return false;
  if (isStandaloneDisplayMode()) return true;
  return readInstalledFlag();
}

export function markPwaInstalled() {
  try {
    localStorage.setItem(INSTALLED_KEY, 'true');
  } catch {
    // Private mode / storage quota — ignore.
  }
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
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      setPrompt(null);
      if (outcome === 'accepted') {
        markPwaInstalled();
        setInstalled(true);
      }
    } catch {
      setPrompt(null);
    }
  };

  return { canInstall: Boolean(prompt) && !installed, install, isInstalled: installed };
}
