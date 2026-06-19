export function formatFollowerCount(count = 0) {
  const value = Number(count) || 0;

  if (value >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}M seguidores`;
  }

  if (value >= 1_000) {
    const formatted = (value / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}K seguidores`;
  }

  return `${value} seguidor${value === 1 ? '' : 'es'}`;
}
