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
        'onboarding-btn-in relative mx-auto flex h-14 w-[90%] items-center justify-center rounded-[14px]',
        'bg-[#2563EB] text-base font-semibold text-white',
        'shadow-[0_8px_24px_rgba(37,99,235,0.18)]',
        'transition hover:bg-[#1D4ED8] active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
      {showArrow ? (
        <ArrowRight className="absolute right-5 h-5 w-5" strokeWidth={2.25} aria-hidden />
      ) : null}
    </button>
  );
}
