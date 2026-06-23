import { DataType, FieldConfig, FieldNode, FormConfig, FormDefinition } from './model';
import { validateConfig } from './definition-schema';

export interface NormalizeOptions {
  /** Validar la definición con el meta-schema zod antes de normalizar (por defecto true). */
  validate?: boolean;
}

/**
 * Normaliza el JSON (FormConfig) a la IR: árbol de FieldNode con paths absolutos
 * y validadores normalizados. Soporta controles, grupos anidados y arrays.
 * Por defecto valida primero la definición con zod (errores tempranos y claros).
 */
export function normalizeConfig(config: FormConfig, options?: NormalizeOptions): FormDefinition {
  const validated = options?.validate === false ? config : validateConfig(config);
  const nodes = validated.fields.map((f) => toNode(f, []));
  return { config: validated, nodes };
}

function toNode(field: FieldConfig, parentPath: string[]): FieldNode {
  const path = [...parentPath, field.key];

  // Grupo
  if (field.type === 'group' || field.fields) {
    const children = (field.fields ?? []).map((c) => toNode(c, path));
    return base(field, 'group', path, 'object', children);
  }

  // Array
  if (field.type === 'array' || field.item) {
    if (!field.item) {
      throw new Error(`normalizeConfig: el array "${field.key}" necesita un "item".`);
    }
    const item = toNode(field.item, []);
    const node = base(field, 'array', path, 'array', []);
    node.defaultValue = field.defaultValue ?? [];
    node.item = item;
    return node;
  }

  // Control
  const node = base(field, 'control', path, field.dataType ?? inferDataType(field), []);
  node.defaultValue = field.defaultValue;
  return node;
}

function base(
  field: FieldConfig,
  kind: FieldNode['kind'],
  path: string[],
  dataType: DataType,
  children: FieldNode[],
): FieldNode {
  return {
    kind,
    key: field.key,
    path,
    config: field,
    dataType,
    validators: field.validators ?? [],
    asyncValidators: field.asyncValidators ?? [],
    children,
  };
}

/** Heurística de tipo de dato cuando el campo no lo declara explícitamente. */
function inferDataType(field: FieldConfig): DataType {
  switch (field.type) {
    case 'number':
      return 'number';
    case 'checkbox':
      return 'boolean';
    default:
      return 'string';
  }
}
