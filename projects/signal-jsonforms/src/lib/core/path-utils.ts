/**
 * Actualización inmutable por path. Soporta claves de objeto (string) e índices
 * de array (number). Devuelve una copia nueva con el segmento final transformado.
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
