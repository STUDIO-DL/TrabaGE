import { ArrowRight } from 'lucide-react';

export default function PrimaryButton({
  children,
  className = '',
  showArrow = false,
  ...props
}) {
  return (
    <button
      type="button"
      className={[
        'onboarding-btn-in relative inline-flex h-btn-primary shrink-0 items-center justify-center rounded-btn-primary px-lg text-body font-semibold',
        'bg-primary-600 text-white shadow-elevation-2',
        'transition-colors duration-fast ease-out hover:bg-primary-700 active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
        showArrow ? 'pr-10' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
      {showArrow ? (
        <ArrowRight className="absolute right-3.5 h-4 w-4" strokeWidth={2.25} aria-hidden />
      ) : null}
    </button>
  );
}
