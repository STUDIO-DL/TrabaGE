import AppIcon from '../common/AppIcon';
import PageContainer from '../layout/PageContainer';
import { BadgeCheck, ICON_SIZES } from '../../constants/icons';
import { THEME_OPTIONS } from '../../constants/theme';
import { useNotificationContext } from '../../context/NotificationContext';
import { useTheme } from '../../hooks/useTheme';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

function ThemePreview({ theme }) {
  const isDark = theme === 'dark';

  return (
    <div
      className={[
        'mt-5 overflow-hidden rounded-2xl border p-3 transition',
        isDark
          ? 'border-slate-600 bg-slate-950'
          : 'border-slate-200 bg-slate-50',
      ].join(' ')}
      aria-hidden
    >
      <div className={['mb-3 h-3 w-20 rounded-full', isDark ? 'bg-slate-700' : 'bg-white'].join(' ')} />
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <div className={['h-16 rounded-xl', isDark ? 'bg-slate-800' : 'bg-white'].join(' ')} />
        <div className="space-y-2">
          <div className={['h-5 rounded-lg', isDark ? 'bg-primary-500/70' : 'bg-primary-100'].join(' ')} />
          <div className={['h-4 rounded-lg', isDark ? 'bg-slate-700' : 'bg-slate-200'].join(' ')} />
          <div className={['h-4 w-2/3 rounded-lg', isDark ? 'bg-slate-700' : 'bg-slate-200'].join(' ')} />
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
        'group w-full rounded-[30px] border p-5 text-left shadow-[0_18px_46px_rgba(15,23,42,0.06)] transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 active:scale-[0.99]',
        selected
          ? 'border-primary-300 bg-primary-50/70 shadow-[0_20px_52px_rgba(37,99,235,0.14)]'
          : 'border-slate-100 bg-white hover:-translate-y-0.5 hover:border-primary-100',
        saving ? 'cursor-wait opacity-80' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-4">
        <span
          className={[
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition',
            selected ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-600 group-hover:bg-primary-100',
          ].join(' ')}
        >
          <AppIcon icon={option.icon} size={ICON_SIZES.lg} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="text-[17px] font-bold text-slate-950">{option.title}</span>
            <span
              className={[
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition',
                selected ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 bg-white text-transparent',
              ].join(' ')}
            >
              <AppIcon icon={BadgeCheck} size={ICON_SIZES.sm} strokeWidth={2.2} />
            </span>
          </span>
          <span className="mt-1.5 block text-[13px] leading-relaxed text-slate-500">
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

    showToast('Apariencia actualizada', 'success');
  };

  return (
    <PageContainer title="Apariencia" backButton className="bg-app-surface">
      <div className="min-h-dvh bg-gradient-to-b from-white via-slate-50 to-slate-50 px-5 pb-28 pt-5 theme-transition">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-6 rounded-[30px] border border-slate-100 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.05)]">
            <h1 className="text-[24px] font-bold tracking-[-0.02em] text-slate-950">Apariencia</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
              Personaliza el aspecto visual de TrabaGE.
            </p>
          </div>

          <div className="space-y-4">
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
