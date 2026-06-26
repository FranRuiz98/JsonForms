import { DataType, FieldConfig, FieldNode, FormConfig, FormDefinition } from './model';
import { validateConfig } from './definition-schema';
import { Migration, migrateConfig } from './migration';

export interface NormalizeOptions {
  /** Validate the definition with the zod meta-schema before normalizing (default: true). */
  validate?: boolean;
  /** Migrations applied before validating (upgrades older definitions). */
  migrations?: Migration[];
}

/**
 * Normalizes the JSON (FormConfig) to the IR: a FieldNode tree with absolute paths
 * and normalized validators. Supports controls, nested groups, and arrays.
 * Pipeline: migrate (if any) -> validate (zod) -> build IR.
 */
export function normalizeConfig(config: FormConfig, options?: NormalizeOptions): FormDefinition {
  const migrated = options?.migrations?.length ? migrateConfig(config, options.migrations) : config;
  const validated = options?.validate === false ? migrated : validateConfig(migrated);
  const nodes = validated.fields.map((f) => toNode(f, []));
  return { config: validated, nodes };
}

function toNode(field: FieldConfig, parentPath: string[]): FieldNode {
  const path = [...parentPath, field.key];

  // Group
  if (field.type === 'group' || field.fields) {
    const children = (field.fields ?? []).map((c) => toNode(c, path));
    return base(field, 'group', path, 'object', children);
  }

  // Array
  if (field.type === 'array' || field.item) {
    if (!field.item) {
      throw new Error(`normalizeConfig: the array "${field.key}" requires an "item".`);
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

/** Data type heuristic when the field does not declare it explicitly. */
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
