function splitMultilineItems(value) {
  return String(value)
    .split('\n')
    .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
    .filter(Boolean);
}

export function parseRequirements(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // Plain multiline text
  }
  return splitMultilineItems(value);
}

export function parseBenefits(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return splitMultilineItems(value);
    }
  }
  return [];
}

/** Convert stored requirements (JSON array or plain text) to textarea value. */
export function requirementsToText(value) {
  const items = parseRequirements(value);
  if (!items.length) return '';
  if (items.length === 1 && items[0].includes('\n')) return items[0];
  return items.join('\n');
}

/** Convert stored benefits to textarea value. */
export function benefitsToText(value) {
  return parseBenefits(value).join('\n');
}

/** Normalize textarea input into requirements storage (plain text). */
export function textToRequirements(text) {
  return String(text ?? '').trim();
}

/** Normalize textarea input into benefits JSONB array. */
export function textToBenefits(text) {
  return splitMultilineItems(text);
}
