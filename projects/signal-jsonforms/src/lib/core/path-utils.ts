/**
 * Immutable update by path. Supports object keys (string) and array indices (number).
 * Returns a new copy with the final segment transformed.
 */
export function updateIn(
  obj: any,
  path: ReadonlyArray<string | number>,
  fn: (current: any) => any,
): any {
  if (path.length === 0) {
    return fn(obj);
  }
  const [head, ...rest] = path;
  const clone = Array.isArray(obj) ? [...obj] : { ...(obj ?? {}) };
  clone[head] = updateIn(obj?.[head], rest, fn);
  return clone;
}
