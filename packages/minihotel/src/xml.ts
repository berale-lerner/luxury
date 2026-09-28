const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A real calendar date in `YYYY-MM-DD`. Dates go into the XML unescaped, so
 * this is also what keeps a caller from placing text inside it through them.
 */
export function isDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const at = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(at.getTime()) && at.toISOString().slice(0, 10) === value;
}

/** Attribute values go into XML; a password with `"` or `&` must not break it. */
export function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
