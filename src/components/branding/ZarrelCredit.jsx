import { ZARREL_NAME, ZARREL_URL } from '../../constants/zarrel';

/**
 * Small, low-hierarchy credit for strategic surfaces only
 * (splash, auth, about, app info, legal, maintenance, emails, admin).
 * Do not use in feed, posts, profiles, or job offers.
 */
export default function ZarrelCredit({
  variant = 'developed',
  className = '',
  linkClassName = '',
}) {
  const prefix = variant === 'powered' ? 'Powered by' : 'Developed by';

  return (
    <p
      className={[
        'text-[11px] leading-none tracking-wide text-slate-400 dark:text-slate-500',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {prefix}{' '}
      <a
        href={ZARREL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={[
          'font-medium text-slate-500 underline decoration-slate-300/80 underline-offset-[3px] transition hover:text-slate-700 hover:decoration-slate-400 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-slate-300',
          linkClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {ZARREL_NAME}
      </a>
    </p>
  );
}
