import AppIcon from '../../common/AppIcon';
import { BadgeCheck, ICON_COLORS, ICON_SIZES } from '../../../constants/icons';
import {
  getCompanyCompletenessPercent,
  getCompanyProfileChecklist,
} from '../../../utils/companyProfileCompleteness';

export default function CompanyProfileCompleteness({ profile, jobCount = 0 }) {
  const checklist = getCompanyProfileChecklist(profile, jobCount);
  const percent = getCompanyCompletenessPercent(profile, jobCount);
  const pending = checklist.filter((item) => !item.done);

  if (percent >= 100) return null;

  return (
    <section className="border-b border-app-border bg-app-card px-space-base py-space-base">
      <div className="mx-auto w-full max-w-lg rounded-radius-lg border border-app-border bg-app-surface p-space-base">
        <div className="flex items-start justify-between gap-space-md">
          <div className="min-w-0 flex-1">
            <p className="text-body-small font-semibold text-app-text">Tu perfil está al {percent}%</p>
            <p className="mt-space-xs text-caption text-app-muted">
              Completa estos pasos para que más candidatos te encuentren.
            </p>
          </div>
          <span className="shrink-0 rounded-radius-circular bg-primary-600 px-space-sm py-1 text-caption font-bold text-white">
            {percent}%
          </span>
        </div>

        <div
          className="mt-space-md h-1.5 overflow-hidden rounded-radius-circular bg-app-border"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Perfil completado al ${percent} por ciento`}
        >
          <div
            className="h-full rounded-radius-circular bg-primary-600 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="mt-space-md space-y-space-sm">
          {checklist.map((item) => (
            <li key={item.key} className="flex items-center gap-space-sm text-body-small">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-radius-circular ${
                  item.done ? 'bg-app-surface text-app-text ring-1 ring-app-border' : 'bg-app-surface ring-1 ring-app-border'
                }`}
              >
                {item.done ? (
                  <AppIcon icon={BadgeCheck} size={ICON_SIZES.sm} className={ICON_COLORS.default} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-radius-circular bg-app-muted" aria-hidden />
                )}
              </span>
              <span className={item.done ? 'text-app-muted line-through' : 'text-app-text'}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>

        {pending.length > 0 ? (
          <p className="mt-space-md text-caption text-app-muted">
            {pending.length === 1
              ? 'Te falta 1 paso por completar.'
              : `Te faltan ${pending.length} pasos por completar.`}
          </p>
        ) : null}
      </div>
    </section>
  );
}
