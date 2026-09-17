export function base64UrlToUint8Array(value) {
  const source = String(value ?? '');
  const padded = source
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(source.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export function toByteArray(value) {
  if (!value) return null;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

export function applicationServerKeysEqual(left, right) {
  const a = toByteArray(left);
  const b = toByteArray(right);
  if (!a || !b || a.byteLength !== b.byteLength || a.byteLength === 0) return false;
  let diff = 0;
  for (let index = 0; index < a.byteLength; index += 1) {
    diff |= a[index] ^ b[index];
  }
  return diff === 0;
}
