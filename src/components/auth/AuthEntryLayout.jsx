import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import AppIcon from '../common/AppIcon';
import TrabaGEWordmark from '../branding/TrabaGEWordmark';
import { ShieldCheck, User } from '../../constants/icons';

function AuthDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <span className="absolute -left-24 -top-28 h-[18rem] w-[18rem] rounded-full bg-primary-400/15 blur-3xl" />
      <span className="absolute -right-20 top-1/3 h-[14rem] w-[14rem] rounded-full bg-indigo-300/20 blur-3xl" />
      <span className="absolute -bottom-16 left-1/4 h-[12rem] w-[12rem] rounded-full bg-sky-200/25 blur-3xl" />
    </div>
  );
}

export function AuthModeToggle({ mode, compact = false }) {
  const tabClass = (active) =>
    [
      'relative flex flex-1 flex-col items-center justify-center font-semibold leading-none transition-colors',
      compact ? 'py-2.5 text-xs' : 'py-3 text-[13px]',
      active ? 'text-primary-600' : 'text-[#94A3B8]',
    ].join(' ');

  return (
    <nav
      className="flex rounded-2xl border border-white/60 bg-white/55 p-1 shadow-sm backdrop-blur-sm"
      aria-label="Modo de autenticación"
    >
      <Link
        to="/login"
        className={tabClass(mode === 'login')}
        aria-current={mode === 'login' ? 'page' : undefined}
      >
        <span className="flex items-center gap-1.5">
          <AppIcon
            icon={User}
            size={compact ? 14 : 16}
            className={mode === 'login' ? 'text-primary-600' : 'text-[#94A3B8]'}
            aria-hidden
          />
          Iniciar sesión
        </span>
        {mode === 'login' ? (
          <span className="absolute bottom-1 h-[3px] w-10 rounded-full bg-primary-600" aria-hidden />
        ) : null}
      </Link>
      <Link
        to="/register"
        className={tabClass(mode === 'register')}
        aria-current={mode === 'register' ? 'page' : undefined}
      >
        <span className="flex items-center gap-1.5">
          <UserPlus
            size={compact ? 14 : 16}
            strokeWidth={2}
            className={mode === 'register' ? 'text-primary-600' : 'text-[#94A3B8]'}
            aria-hidden
          />
          Crear cuenta
        </span>
        {mode === 'register' ? (
          <span className="absolute bottom-1 h-[3px] w-10 rounded-full bg-primary-600" aria-hidden />
        ) : null}
      </Link>
    </nav>
  );
}

export function AuthField({
  id,
  label,
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  children,
  compact = false,
  ...rest
}) {
  return (
    <div>
      {label ? (
        <label
          htmlFor={id}
          className={[
            'block font-semibold text-[#334155]',
            compact ? 'mb-1 text-xs' : 'mb-2 text-[13px]',
          ].join(' ')}
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        {icon ? (
          <AppIcon
            icon={icon}
            size={compact ? 16 : 18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            aria-hidden
          />
        ) : null}
        {children ?? (
          <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete={autoComplete}
            required={required}
            className={[
              'w-full rounded-xl border border-[#E2E8F0]/90 bg-white/90 text-[#0F172A] outline-none transition',
              'placeholder:text-[#94A3B8] focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
              compact ? 'h-10 text-sm' : 'h-11',
              icon ? 'pl-9 pr-3' : 'px-3.5',
            ].join(' ')}
            {...rest}
          />
        )}
      </div>
    </div>
  );
}

export function AuthDivider({ label = 'o continúa con', compact = false }) {
  return (
    <div className={compact ? 'relative my-3' : 'relative my-6'}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[#E2E8F0]/80" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white/80 px-2.5 text-[11px] text-[#94A3B8] backdrop-blur-sm">{label}</span>
      </div>
    </div>
  );
}

export function AuthPrimaryButton({ children, className = '', compact = false, ...props }) {
  return (
    <button
      type="button"
      className={[
        'flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 font-semibold text-white',
        'transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-70',
        compact ? 'h-10 text-sm' : 'h-11 text-[15px]',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}

export function AuthSecurityFooter({ compact = false }) {
  if (compact) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-center text-[10px] leading-snug text-[#64748B]">
        <AppIcon icon={ShieldCheck} size={12} className="shrink-0 text-primary-600" aria-hidden />
        Tus datos están protegidos con encriptación segura
      </p>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/50 bg-white/45 p-3 backdrop-blur-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50/90">
        <AppIcon icon={ShieldCheck} size={18} className="text-primary-600" aria-hidden />
      </span>
      <div className="min-w-0 pt-0.5 text-left">
        <p className="text-[13px] font-bold leading-tight text-[#334155]">Tu información está protegida</p>
        <p className="mt-1 text-[11px] leading-snug text-[#64748B]">
          Utilizamos encriptación segura para proteger tus datos personales.
        </p>
      </div>
    </div>
  );
}

export default function AuthEntryLayout({
  mode,
  title,
  subtitle,
  children,
  density = 'default',
  footer,
}) {
  const compact = density === 'compact';

  return (
    <div className="relative min-h-dvh bg-gradient-to-br from-[#E8EEF7] via-[#F1F5FA] to-[#E4EFFA] md:flex md:items-center md:justify-center md:p-6">
      <AuthDecorations />

      <div
        className={[
          'relative z-10 mx-auto flex h-dvh max-h-dvh w-full max-w-[420px] flex-col md:h-auto md:max-h-none',
          compact ? 'px-4' : 'px-5',
        ].join(' ')}
        style={{
          paddingTop: compact ? 'max(0.75rem, env(safe-area-inset-top))' : 'max(1.5rem, env(safe-area-inset-top))',
          paddingBottom: compact ? 'max(0.75rem, env(safe-area-inset-bottom))' : 'max(1.25rem, env(safe-area-inset-bottom))',
        }}
      >
        <header className="shrink-0 text-center">
          <TrabaGEWordmark size="hero" className="mx-auto" />
          <p className="mt-2 text-sm leading-none text-[#64748B]">Conecta. Descubre. Crece.</p>
        </header>

        <div className={compact ? 'mt-3 shrink-0' : 'mt-6 shrink-0'}>
          <AuthModeToggle mode={mode} compact={compact} />
        </div>

        <main className={compact ? 'mt-3 flex min-h-0 flex-1 flex-col' : 'mt-5 flex min-h-0 flex-1 flex-col justify-center'}>
          <div className="rounded-2xl border border-white/70 bg-white/72 p-4 shadow-[0_8px_32px_rgba(15,23,42,0.07)] backdrop-blur-md md:p-5">
            <div className={compact ? 'mb-3 text-center' : 'mb-6 text-center'}>
              <h1 className={compact ? 'text-base font-bold leading-tight text-[#0F172A]' : 'text-lg font-bold leading-tight text-[#0F172A]'}>
                {title}
              </h1>
              {subtitle && !compact ? (
                <p className="mt-1.5 text-sm leading-snug text-[#64748B]">{subtitle}</p>
              ) : null}
            </div>

            {children}
          </div>
        </main>

        <footer className={compact ? 'mt-2 shrink-0' : 'mt-6 shrink-0'}>
          <AuthSecurityFooter compact={compact} />
          {footer ? <div className="mt-3">{footer}</div> : null}
        </footer>
      </div>
    </div>
  );
}
