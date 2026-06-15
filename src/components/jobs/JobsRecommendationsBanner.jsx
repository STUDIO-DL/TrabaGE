import AppIcon from '../common/AppIcon';
import { Target, ICON_SIZES } from '../../constants/icons';

export default function JobsRecommendationsBanner({ mode }) {
  if (mode === 'recommended') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3">
        <AppIcon icon={Target} size={ICON_SIZES.default} className="mt-0.5 shrink-0 text-primary-600" />
        <div>
          <p className="text-sm font-semibold text-primary-900">Ofertas recomendadas para ti</p>
          <p className="mt-0.5 text-xs leading-relaxed text-primary-800/90">
            Según tus preferencias de empleo. Puedes buscar o filtrar manualmente cuando quieras.
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'fallback') {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        No hay coincidencias exactas con tus preferencias ahora mismo. Mostramos todas las ofertas
        disponibles; puedes ajustar tus preferencias en tu perfil.
      </div>
    );
  }

  return null;
}
