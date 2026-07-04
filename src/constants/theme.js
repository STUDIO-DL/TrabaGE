import { Moon, Sun } from './icons';

export const THEME_STORAGE_KEY = 'trabage_theme';

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

export const THEME_OPTIONS = [
  {
    value: THEMES.LIGHT,
    title: 'Modo Claro',
    description: 'Interfaz clara con colores luminosos.',
    icon: Sun,
  },
  {
    value: THEMES.DARK,
    title: 'Modo Oscuro',
    description: 'Reduce la fatiga visual en entornos con poca luz.',
    icon: Moon,
  },
];

export function normalizeTheme(theme) {
  return theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
}
