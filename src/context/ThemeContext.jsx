import { useCallback, useEffect, useMemo, useState } from 'react';

import { ThemeContext } from './themeContextValue';
import { THEME_STORAGE_KEY, THEMES, normalizeTheme } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { appearanceService } from '../services/appearance.service';
import { reportError } from '../utils/logger';

function readStoredTheme() {
  if (typeof window === 'undefined') return THEMES.LIGHT;
  return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return;

  const normalized = normalizeTheme(theme);
  const root = document.documentElement;
  root.dataset.theme = normalized;
  root.classList.add('theme-transition');
  root.classList.toggle('dark', normalized === THEMES.DARK);
  root.style.colorScheme = normalized;

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', normalized === THEMES.DARK ? '#0F172A' : '#2563EB');
  }
}

function persistLocalTheme(theme) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_STORAGE_KEY, normalizeTheme(theme));
}

export function ThemeProvider({ children }) {
  const { user, isPreviewMode } = useAuth();
  const [theme, setThemeState] = useState(readStoredTheme);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const applyTheme = useCallback((nextTheme) => {
    const normalized = normalizeTheme(nextTheme);
    setThemeState(normalized);
    applyThemeToDocument(normalized);
    persistLocalTheme(normalized);
    return normalized;
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    if (!user?.id || isPreviewMode) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    appearanceService
      .getOrCreate()
      .then(({ data, error: loadError }) => {
        if (!mounted) return;
        if (loadError) {
          setError(loadError);
          return;
        }
        if (data?.theme) {
          applyTheme(data.theme);
        }
      })
      .catch((loadError) => {
        reportError(loadError, { area: 'appearance_preferences_load', userId: user.id });
        if (mounted) setError(loadError);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [applyTheme, isPreviewMode, user?.id]);

  const setTheme = useCallback(
    async (nextTheme) => {
      const normalized = applyTheme(nextTheme);

      if (!user?.id || isPreviewMode) {
        return { data: { theme: normalized }, error: null };
      }

      setSaving(true);
      setError(null);
      const { data, error: saveError } = await appearanceService.updateTheme(user.id, normalized);
      setSaving(false);

      if (saveError) {
        setError(saveError);
        return { data: null, error: saveError };
      }

      return { data, error: null };
    },
    [applyTheme, isPreviewMode, user?.id],
  );

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === THEMES.DARK,
      loading,
      saving,
      error,
      setTheme,
    }),
    [error, loading, saving, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
