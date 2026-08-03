export function shouldDisplayToast(type = 'info') {
  return type !== 'success';
}
