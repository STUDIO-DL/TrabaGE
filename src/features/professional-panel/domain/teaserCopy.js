import { formatPanelCount } from './periods';

/**
 * Pick one dynamic insight line for the compact teaser card.
 */
export function buildProfessionalTeaser(summary, { days = 30 } = {}) {
  const profileViews = Number(summary?.profile_views) || 0;
  const postViews = Number(summary?.post_views) || 0;
  const interactions = Number(summary?.interactions) || 0;
  const growthPct =
    summary?.growth_pct == null || Number.isNaN(Number(summary.growth_pct))
      ? null
      : Number(summary.growth_pct);

  const periodLabel =
    days === 7 ? 'los últimos 7 días' : days === 90 ? 'los últimos 90 días' : 'los últimos 30 días';
  const monthLabel = days === 30 ? 'este mes' : periodLabel;

  let insight =
    'Empieza a recibir visitas y actividad en tu perfil profesional.';

  const ranked = [
    {
      key: 'profile_views',
      value: profileViews,
      text: `Tu perfil recibió ${formatPanelCount(profileViews)} visualizaciones durante ${periodLabel}.`,
    },
    {
      key: 'post_views',
      value: postViews,
      text: `Tus publicaciones obtuvieron ${formatPanelCount(postViews)} visualizaciones ${monthLabel}.`,
    },
    {
      key: 'interactions',
      value: interactions,
      text: `Has recibido ${formatPanelCount(interactions)} interacciones durante ${periodLabel}.`,
    },
  ].sort((a, b) => b.value - a.value);

  if (ranked[0].value > 0) {
    insight = ranked[0].text;
  }

  return {
    insight,
    growthPct: growthPct != null && growthPct > 0 ? growthPct : null,
  };
}
