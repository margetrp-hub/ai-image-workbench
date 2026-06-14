export function text(value, length) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, length);
}
