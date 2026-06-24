import { DataType, FieldNode } from './model';

/** Default value per data type (Signal Forms forbids null/undefined). */
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

/** Initial value for a single node (control, group, or array). */
export function buildNodeValue(node: FieldNode): unknown {
  if (node.kind === 'group') {
    return buildInitialModel(node.children);
  }
  if (node.kind === 'array') {
    return node.defaultValue ?? [];
  }
  return node.defaultValue ?? defaultFor(node.dataType);
}

/** Builds the initial model object from the IR. */
export function buildInitialModel(nodes: FieldNode[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const n of nodes) {
    out[n.key] = buildNodeValue(n);
  }
  return out;
}
