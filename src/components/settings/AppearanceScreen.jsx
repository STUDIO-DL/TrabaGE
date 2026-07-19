import AppIcon from '../common/AppIcon';
import PageContainer from '../layout/PageContainer';
import { BadgeCheck, ICON_SIZES } from '../../constants/icons';
import { THEME_OPTIONS } from '../../constants/theme';
import { useNotificationContext } from '../../context/NotificationContext';
import { useTheme } from '../../hooks/useTheme';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { TOAST } from '../../utils/copyLabels';

function ThemePreview({ theme }) {
  const isDark = theme === 'dark';

  return (
    <div
      className={[
        'mt-5 overflow-hidden rounded-radius-lg border p-3 transition',
        isDark
          ? 'border-app-border bg-app-bg'
          : 'border-app-border bg-app-surface',
      ].join(' ')}
      aria-hidden
    >
      <div className={['mb-3 h-3 w-20 rounded-full', isDark ? 'bg-app-border' : 'bg-app-card'].join(' ')} />
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <div className={['h-16 rounded-radius-md', isDark ? 'bg-app-elevated' : 'bg-app-card'].join(' ')} />
        <div className="space-y-2">
          <div className={['h-5 rounded-radius-sm', isDark ? 'bg-primary-500/70' : 'bg-primary-100'].join(' ')} />
          <div className={['h-4 rounded-radius-sm', isDark ? 'bg-app-border' : 'bg-app-border'].join(' ')} />
          <div className={['h-4 w-2/3 rounded-radius-sm', isDark ? 'bg-app-border' : 'bg-app-border'].join(' ')} />
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ option, selected, saving, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={saving}
      aria-pressed={selected}
      className={[
        'group w-full rounded-radius-xl border p-space-base text-left shadow-elevation-2 transition duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 active:scale-[0.99]',
        selected
          ? 'border-primary-300 bg-app-primary-soft/70 shadow-elevation-2'
          : 'border-app-border bg-app-card hover:-translate-y-0.5 hover:border-primary-100',
        saving ? 'cursor-wait opacity-80' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-4">
        <span
          className={[
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-radius-lg transition',
            selected ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-600 group-hover:bg-primary-100',
          ].join(' ')}
        >
          <AppIcon icon={option.icon} size={ICON_SIZES.lg} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="text-subtitle font-bold text-app-text">{option.title}</span>
            <span
              className={[
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-radius-circular border transition',
                selected ? 'border-primary-600 bg-primary-600 text-white' : 'border-app-border bg-app-card text-transparent',
              ].join(' ')}
            >
              <AppIcon icon={BadgeCheck} size={ICON_SIZES.sm} strokeWidth={2.2} />
            </span>
          </span>
          <span className="mt-1.5 block text-body-small leading-relaxed text-app-muted">
            {option.description}
          </span>
        </span>
      </div>

      <ThemePreview theme={option.value} />
    </button>
  );
}

export default function AppearanceScreen() {
  const { theme, saving, setTheme } = useTheme();
  const { showToast } = useNotificationContext();

  const handleSelectTheme = async (nextTheme) => {
    if (nextTheme === theme) return;

    const { error } = await setTheme(nextTheme);
    if (error) {
      showToast(getSupabaseErrorMessage(error, 'No se pudo guardar la apariencia.'), 'error');
      return;
    }

    showToast(TOAST.appearanceUpdated, 'success');
  };

  return (
    <PageContainer backButton className="bg-app-surface">
      <div className="bg-gradient-to-b from-app-card via-app-surface to-app-surface px-space-base pt-space-base theme-transition">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-space-lg surface-card p-space-base">
            <h1 className="text-heading-m text-app-text">Apariencia</h1>
            <p className="mt-space-sm text-body-small leading-relaxed text-app-muted">
              Personaliza el aspecto visual de TrabaGE.
            </p>
          </div>

          <div className="space-y-space-base">
            {THEME_OPTIONS.map((option) => (
              <ThemeCard
                key={option.value}
                option={option}
                selected={theme === option.value}
                saving={saving}
                onSelect={() => handleSelectTheme(option.value)}
              />
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
