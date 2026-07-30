/**
 * Fetches avatar image and converts to a PNG data URI for @react-pdf.
 * react-pdf only embeds JPEG/PNG/SVG — TrabaGE avatars are stored as WebP,
 * which previously caused "Offset is outside the bounds of the DataView"
 * (or "invalid format") when embedded raw.
 * Returns null on failure — CV generation continues without photo.
 */
export async function fetchAvatarDataUri(avatarUrl) {
  if (!avatarUrl) return null;

  try {
    const response = await fetch(avatarUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    if (!blob.type.startsWith('image/') && blob.type !== 'application/octet-stream') {
      return null;
    }

    // Already a format react-pdf accepts — still re-encode to PNG for a stable,
    // bounded payload (and to normalize Supabase signed-url content-types).
    return await rasterBlobToPngDataUri(blob);
  } catch {
    return null;
  }
}

async function rasterBlobToPngDataUri(blob) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return null;
  }

  const bitmap = await createImageBitmap(blob);
  try {
    const maxEdge = 256;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(bitmap, 0, 0, width, height);
    const dataUri = canvas.toDataURL('image/png');
    if (!dataUri.startsWith('data:image/png;base64,')) return null;
    return dataUri;
  } finally {
    bitmap.close?.();
  }
}
