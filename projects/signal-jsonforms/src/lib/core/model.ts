// Types from JSON definition (hybrid format) and internal representation (IR).

export type DataType = 'string' | 'number' | 'boolean' | 'array' | 'object';
export type FieldKind = 'control' | 'group' | 'array';

/** Dynamic logic: DSL (expr) or registered function (fn). Hybrid model. */
export type DynamicExpr = { expr: string } | { fn: string };

/** Synchronous validator declared in JSON. */
export interface ValidatorConfig {
  kind: string;          // required | email | min | max | minLength | maxLength | pattern | minItems | maxItems | expr | fn | <custom>
  value?: unknown;
  message?: string;
  when?: DynamicExpr;     // the validator only applies while the condition is truthy
  expr?: string;          // kind 'expr' (cross-field/custom DSL)
  fn?: string;            // kind 'fn' (registered validator)
}

/** Asynchronous validator: only references a key from ValidatorRegistry (not serializable). */
export interface AsyncValidatorConfig {
  kind: string;
  debounce?: number;
}

/** A single option for a select field. */
export interface OptionItem {
  value: unknown;
  label: string;
  disabled?: boolean;
}

/**
 * Source for field options (select field):
 * - OptionItem[]              static, inline
 * - { expr }                  derived from model (DSL); evaluates to OptionItem[]
 * - { fn }                    derived (function registered in `functions`)
 * - { source, debounce }      async, via `optionSources` from registry (resource)
 */
export type OptionsConfig =
  | OptionItem[]
  | { expr: string }
  | { fn: string }
  | { source: string; debounce?: number };

/** Grid configuration for laying out children in columns. */
export interface LayoutConfig {
  columns?: number;   // number of grid columns
  gap?: string;       // CSS gap (e.g. '0.75rem 1rem')
}

/** Field as declared in JSON. */
export interface FieldConfig {
  key: string;
  type: string;                         // UI type -> FieldTypeRegistry
  dataType?: DataType;                  // data type -> ModelBuilder
  label?: string;
  props?: Record<string, unknown>;
  defaultValue?: unknown;
  validators?: ValidatorConfig[];
  asyncValidators?: AsyncValidatorConfig[];
  hidden?: DynamicExpr;
  validateWhenHidden?: boolean;  // keep validating while hidden (default: hidden skips validation)
  disabled?: DynamicExpr;
  readonly?: DynamicExpr;
  computed?: DynamicExpr;        // derived value (expr/fn); field becomes readonly
  options?: OptionsConfig;       // dynamic/async options (select); static also valid in props.options
  clearOnOptionsChange?: boolean;// if value leaves resolved options, reset it (cascading)
  clearOnHide?: boolean;         // when hidden (hidden=true) reset to default
  wrapper?: string | string[];   // key(s) in WrapperRegistry; multiple stack (first is outermost)
  layout?: LayoutConfig;         // grid for children (group)
  colSpan?: number;              // columns field spans in a grid
  collapsible?: boolean;         // group collapsible (section)
  collapsed?: boolean;           // initially collapsed state
  fields?: FieldConfig[];               // type 'group'
  item?: FieldConfig;                   // type 'array'
}

/** A step in the wizard: a presentational partition of top-level fields. */
export interface StepConfig {
  id?: string;
  label?: string;
  description?: string;
  fields: FieldConfig[];
  skipWhen?: DynamicExpr;   // step conditionally skipped (DSL or function)
}

/** Multi-step wizard options. */
export interface WizardConfig {
  linear?: boolean;         // true (default): cannot advance if current step is invalid
  showStepper?: boolean;    // show stepper/header by default (default true)
}

export interface FormConfig {
  version?: string;
  id?: string;
  layout?: LayoutConfig;   // root-level grid (columns for top-level fields)
  fields?: FieldConfig[];  // flat form
  steps?: StepConfig[];    // multi-step wizard (mutually exclusive with fields)
  wizard?: WizardConfig;
}

/** IR node with absolute path resolved from root. */
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
  item?: FieldNode;                     // array: item template
}

/** A normalized step: its config + keys of top-level nodes it groups. */
export interface StepDefinition {
  config: StepConfig;
  nodeKeys: string[];
}

export interface FormDefinition {
  config: FormConfig;
  nodes: FieldNode[];
  steps?: StepDefinition[];   // present when form is a wizard
}
