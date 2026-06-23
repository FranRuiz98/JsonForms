import { DataType, FieldNode } from './model';

/** Valor inicial por tipo de dato (Signal Forms prohíbe null/undefined). */
export function defaultFor(dataType: DataType): unknown {
  switch (dataType) {
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return '';
  }
}

/** Valor inicial de un nodo individual (control, grupo o array). */
export function buildNodeValue(node: FieldNode): unknown {
  if (node.kind === 'group') {
    return buildInitialModel(node.children);
  }
  if (node.kind === 'array') {
    return node.defaultValue ?? [];
  }
  return node.defaultValue ?? defaultFor(node.dataType);
}

/** Construye el objeto modelo inicial a partir de la IR. */
export function buildInitialModel(nodes: FieldNode[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const n of nodes) {
    out[n.key] = buildNodeValue(n);
  }
  return out;
}
