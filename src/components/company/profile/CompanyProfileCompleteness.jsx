import AppIcon from '../../common/AppIcon';
import { BadgeCheck, ICON_SIZES } from '../../../constants/icons';
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
    <section className="border-b border-app-border bg-app-card px-4 py-4">
      <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50/80 via-app-card to-app-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-app-text">Tu perfil está al {percent}%</p>
            <p className="mt-0.5 text-xs text-app-muted">
              Completa estos pasos para que más candidatos te encuentren.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary-600 px-2.5 py-1 text-xs font-bold text-white">
            {percent}%
          </span>
        </div>

        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-app-border"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Perfil completado al ${percent} por ciento`}
        >
          <div
            className="h-full rounded-full bg-primary-600 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="mt-4 space-y-2">
          {checklist.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  item.done ? 'bg-primary-100 text-primary-700' : 'bg-app-surface text-app-muted'
                }`}
              >
                {item.done ? (
                  <AppIcon icon={BadgeCheck} size={ICON_SIZES.sm} className="text-primary-700" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-app-muted" aria-hidden />
                )}
              </span>
              <span className={item.done ? 'text-app-muted line-through' : 'text-app-text'}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>

        {pending.length > 0 && (
          <p className="mt-3 text-xs text-app-muted">
            {pending.length === 1
              ? 'Te falta 1 paso por completar.'
              : `Te faltan ${pending.length} pasos por completar.`}
          </p>
        )}
      </div>
    </section>
  );
}
