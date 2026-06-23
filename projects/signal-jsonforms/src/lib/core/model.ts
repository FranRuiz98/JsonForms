// Tipos de la definición JSON (formato híbrido) y de la representación interna (IR).

export type DataType = 'string' | 'number' | 'boolean' | 'array' | 'object';
export type FieldKind = 'control' | 'group' | 'array';

/** Lógica dinámica: DSL (expr) o función registrada (fn). Modelo híbrido. */
export type DynamicExpr = { expr: string } | { fn: string };

/** Validador síncrono declarado en el JSON. */
export interface ValidatorConfig {
  kind: string;          // required | email | min | max | minLength | maxLength | pattern | expr | fn | <custom>
  value?: unknown;
  message?: string;
  when?: DynamicExpr;     // OJO: en Signal Forms 'when' solo aplica a required()
  expr?: string;          // kind 'expr' (cross-field/custom DSL)
  fn?: string;            // kind 'fn' (validador registrado)
}

/** Validador asíncrono: solo referencia una clave del ValidatorRegistry (no serializable). */
export interface AsyncValidatorConfig {
  kind: string;
  debounce?: number;
}

/** Campo tal cual se declara en el JSON. */
export interface FieldConfig {
  key: string;
  type: string;                         // tipo de UI -> FieldTypeRegistry
  dataType?: DataType;                  // tipo de dato -> ModelBuilder
  label?: string;
  props?: Record<string, unknown>;
  defaultValue?: unknown;
  validators?: ValidatorConfig[];
  asyncValidators?: AsyncValidatorConfig[];
  hidden?: DynamicExpr;
  disabled?: DynamicExpr;
  readonly?: DynamicExpr;
  wrapper?: string;              // clave en el WrapperRegistry
  fields?: FieldConfig[];               // type 'group'
  item?: FieldConfig;                   // type 'array'
}

export interface FormConfig {
  version?: string;
  id?: string;
  fields: FieldConfig[];
}

/** Nodo de la IR con path absoluto resuelto desde la raíz. */
export interface FieldNode {
  kind: FieldKind;
  key: string;
  path: string[];
  config: FieldConfig;
  dataType: DataType;
  defaultValue?: unknown;
  validators: ValidatorConfig[];
  asyncValidators: AsyncValidatorConfig[];
  children: FieldNode[];                // group
  item?: FieldNode;                     // array: plantilla del elemento
}

export interface FormDefinition {
  config: FormConfig;
  nodes: FieldNode[];
}
