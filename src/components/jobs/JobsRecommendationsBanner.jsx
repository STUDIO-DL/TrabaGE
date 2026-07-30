export default function JobsRecommendationsBanner({ mode, count = 0 }) {
  if (mode === 'recommended') {
    return (
      <p className="text-caption text-app-muted">
        {count > 0
          ? `${count} oferta${count === 1 ? '' : 's'} ordenada${count === 1 ? '' : 's'} por compatibilidad.`
          : 'Ordenadas por compatibilidad con tu perfil.'}
      </p>
    );
  }

  if (mode === 'fallback') {
    return (
      <p className="text-caption text-app-muted">
        Sin coincidencias exactas. Mostramos todas las ofertas disponibles.
      </p>
    );
  }

  return null;
}
