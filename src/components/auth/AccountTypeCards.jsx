import { ACCOUNT_KIND_OPTIONS } from '../../constants/accountKinds';

export default function AccountTypeCards({ value, onChange, disabled = false }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-2">
      {ACCOUNT_KIND_OPTIONS.map(({ id, label, description, icon: Icon }) => {
        const selected = value === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            disabled={disabled}
            aria-pressed={selected}
            className={[
              'group relative flex flex-col items-center rounded-2xl border px-3 py-4 text-center transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-60',
              selected
                ? 'border-primary-500 bg-primary-50/80 shadow-[0_0_0_1px_rgba(37,99,235,0.15)]'
                : 'border-slate-200 bg-white hover:border-primary-200 hover:bg-primary-50/40 hover:shadow-sm',
            ].join(' ')}
          >
            <span
              className={[
                'flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200',
                selected
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-50 text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-600',
              ].join(' ')}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="mt-2.5 text-sm font-semibold text-slate-900">{label}</span>
            <span className="mt-1 hidden text-xs leading-snug text-slate-500 sm:block">{description}</span>
          </button>
        );
      })}
    </div>
  );
}
