import { ZARREL_NAME, ZARREL_URL } from '../../constants/zarrel';

/**
 * Small, low-hierarchy credit for strategic surfaces only
 * (splash, auth, about, app info, legal, maintenance, emails, admin).
 * Do not use in feed, posts, profiles, or job offers.
 */
export default function ZarrelCredit({
  variant: _variant = 'developed',
  className = '',
  linkClassName = '',
}) {
  const prefix = 'Desarrollado por';

  return (
    <p
      className={[
        'text-[11px] leading-none tracking-wide text-app-subtle',
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
          'font-medium text-primary-600/80 underline decoration-primary-200 underline-offset-[3px] transition hover:text-primary-700 hover:decoration-primary-400',
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
