function compactCount(value) {
  if (value >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}M`;
  }

  if (value >= 1_000) {
    const formatted = (value / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}K`;
  }

  return String(value);
}

/** Number-only follower display for compact profile headers. */
export function formatFollowerNumber(count = 0) {
  return compactCount(Number(count) || 0);
}

export function formatFollowerCount(count = 0) {
  const value = Number(count) || 0;
  const compact = compactCount(value);

  if (value >= 1_000) {
    return `${compact} seguidores`;
  }

  return `${value} seguidor${value === 1 ? '' : 'es'}`;
}
