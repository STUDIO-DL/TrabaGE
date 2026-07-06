import { ACCOUNT_KIND_OPTIONS } from '../../constants/accountKinds';

export default function AccountTypeCards({ value, onChange, disabled = false }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-3 min-[420px]:gap-2">
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
              'group relative flex flex-col items-center rounded-xl border px-2.5 py-3.5 text-center transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-60',
              selected
                ? 'border-primary-500 bg-primary-50/70 shadow-[0_0_0_1px_rgba(37,99,235,0.12)]'
                : 'border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50/80',
            ].join(' ')}
          >
            <span
              className={[
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200',
                selected
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-slate-50 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500',
              ].join(' ')}
            >
              <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="mt-2 text-sm font-semibold text-slate-900">{label}</span>
            <span className="mt-1 text-[11px] leading-snug text-slate-500">{description}</span>
          </button>
        );
      })}
    </div>
  );
}
