/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'rgb(var(--app-bg) / <alpha-value>)',
          surface: 'rgb(var(--app-surface) / <alpha-value>)',
          card: 'rgb(var(--app-card) / <alpha-value>)',
          text: 'rgb(var(--app-text) / <alpha-value>)',
          muted: 'rgb(var(--app-muted) / <alpha-value>)',
          border: 'rgb(var(--app-border) / <alpha-value>)',
        },
        primary: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          300: '#93C5FD',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        safe: 'env(safe-area-inset-bottom)',
      },
      fontSize: {
        'heading-xl': ['32px', { lineHeight: '1.15', fontWeight: '800' }],
        'heading-l': ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-m': ['24px', { lineHeight: '1.25', fontWeight: '700' }],
        body: ['16px', { lineHeight: '1.5' }],
        small: ['14px', { lineHeight: '1.45' }],
        caption: ['12px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        'btn-primary': '14px',
        'btn-secondary': '12px',
      },
      height: {
        'btn-primary': '56px',
        'btn-secondary': '48px',
        logo: '80px',
        'onboarding-ill': '260px',
      },
      maxHeight: {
        logo: '80px',
        'onboarding-ill': '260px',
        'hero-mobile': '35dvh',
      },
      minHeight: {
        'onboarding-ill': '220px',
      },
    },
  },
  plugins: [],
};
