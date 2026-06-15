import AppIcon from '../../common/AppIcon';
import { Bell, ICON_SIZES } from '../../../constants/icons';

export default function CompanyActivitySection() {
  return (
    <section className="bg-white px-4 py-5 pb-8">
      <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
        <span className="h-5 w-1 rounded-full bg-primary-600" aria-hidden />
        Actividad reciente
      </h3>
      <div className="mt-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <AppIcon icon={Bell} size={ICON_SIZES.default} className="text-primary-600" />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-900">
            Aún no hay actividad reciente para mostrar.
          </p>
          <p className="mt-1 text-sm text-gray-500">Las nuevas actividades aparecerán aquí.</p>
        </div>
      </div>
    </section>
  );
}
