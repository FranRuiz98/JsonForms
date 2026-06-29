import { Injector, WritableSignal, effect, runInInjectionContext, signal } from '@angular/core';
import { FieldNode, FormConfig, FormDefinition } from './core/model';
import { normalizeConfig } from './core/normalizer';
import { buildInitialModel, buildNodeValue } from './core/model-builder';
import { compileSchema } from './core/schema-compiler';
import { compileExpression } from './expression/expression-engine';
import { updateIn } from './core/path-utils';
import { JsonFormsConfig } from './registry/types';
import { SignalForms } from './adapter/signal-forms.adapter';

export interface BuildSignalFormResult {
  /** Root FieldTree returned by form(). */
  form: unknown;
  /** WritableSignal of the model (source of truth). */
  model: WritableSignal<Record<string, unknown>>;
  /** Normalized IR (useful for the renderer). */
  definition: FormDefinition;
}

export interface BuildSignalFormOptions {
  /** Injection context required by form() and computed effects. */
  injector: Injector;
  /** Model signal to use (e.g. the model() from <jf-form> for two-way binding). */
  model?: WritableSignal<Record<string, unknown>>;
  registries?: JsonFormsConfig;
  /** Validate the definition with the zod meta-schema (default: true). */
  validate?: boolean;
}

/**
 * Low-level API: JSON -> { form, model }.
 * Chains validateConfig (zod) -> normalize -> buildInitialModel -> compileSchema -> form(),
 * then wires reactive effects for derived/computed fields.
 */
export function buildSignalForm(
  config: FormConfig,
  opts: BuildSignalFormOptions,
): BuildSignalFormResult {
  const definition = normalizeConfig(config, {
    validate: opts.validate,
    migrations: opts.registries?.migrations,
  });
  const initial = buildInitialModel(definition.nodes);

  // Reconcile the model with the schema shape: keep existing values for keys
  // present in the new schema, fill the rest with defaults, drop stale keys.
  if (opts.model) {
    opts.model.set(reshapeModel(initial, opts.model()));
  }
  const model = opts.model ?? signal<Record<string, unknown>>(initial);

  const schemaFn = compileSchema(definition.nodes, SignalForms, opts.registries);

  const form = runInInjectionContext(opts.injector, () =>
    (SignalForms.form as any)(model, schemaFn),
  );

  setupComputedFields(definition.nodes, model, opts.registries, opts.injector);
  setupClearOnHide(definition.nodes, form, model, opts.injector);

  return { form, model, definition };
}

/**
 * Returns an object with exactly `template`'s keys, reusing values from
 * `current` where the key exists and the type is compatible. Recurses into
 * nested objects and preserves arrays.
 */
function reshapeModel(template: Record<string, unknown>, current: unknown): Record<string, unknown> {
  const cur = (current && typeof current === 'object' ? current : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(template)) {
    const t = template[key];
    const c = cur[key];
    if (t && typeof t === 'object' && !Array.isArray(t)) {
      out[key] = reshapeModel(t as Record<string, unknown>, c);
    } else if (Array.isArray(t)) {
      out[key] = Array.isArray(c) ? c : t;
    } else {
      out[key] = c !== undefined && c !== null && typeof c !== 'object' ? c : t;
    }
  }
  return out;
}

// --- Derived / computed fields -------------------------------------------------

/** Compute fn for a static field: receives the whole model. */
type ComputeFn = (model: Record<string, unknown>) => unknown;
/** Compute fn for an array-item field: receives the item and the whole-model root. */
type ItemComputeFn = (item: Record<string, unknown>, root: Record<string, unknown>) => unknown;

interface ItemComputed {
  relPath: string[];
  compute: ItemComputeFn;
}

/**
 * Wires reactive effects for derived/computed fields:
 * - static fields (top-level and groups): one effect each; `model` is the root.
 * - array-item fields: one effect per array; it maps every item, computing each
 *   field with `model` = the item and `root` = the whole model.
 * The Object.is guard prevents write loops; chains converge across effects.
 */
function setupComputedFields(
  nodes: FieldNode[],
  model: WritableSignal<Record<string, unknown>>,
  registries: JsonFormsConfig | undefined,
  injector: Injector,
): void {
  const statics = collectComputed(nodes, registries);
  const arrays = collectArrayComputed(nodes, registries);
  if (statics.length === 0 && arrays.length === 0) return;

  runInInjectionContext(injector, () => {
    for (const { node, compute } of statics) {
      effect(() => {
        const m = model();
        const next = compute(m);
        if (!Object.is(plainAt(m, node.path), next)) {
          model.update((mm) => updateIn(mm, node.path, () => next));
        }
      });
    }

    for (const { arrayPath, itemComputeds } of arrays) {
      effect(() => {
        const m = model();
        const arr = plainAt(m, arrayPath);
        if (!Array.isArray(arr)) return;
        let changed = false;
        const nextArr = arr.map((item) => {
          let it = item as Record<string, unknown>;
          for (const { relPath, compute } of itemComputeds) {
            const next = compute(it, m);
            if (!Object.is(plainAt(it, relPath), next)) {
              it = updateIn(it, relPath, () => next);
              changed = true;
            }
          }
          return it;
        });
        if (changed) {
          model.update((mm) => updateIn(mm, arrayPath, () => nextArr));
        }
      });
    }
  });
}

// --- Static computed (top-level + groups) ---

function collectComputed(
  nodes: FieldNode[],
  registries: JsonFormsConfig | undefined,
): Array<{ node: FieldNode; compute: ComputeFn }> {
  const out: Array<{ node: FieldNode; compute: ComputeFn }> = [];
  for (const n of nodes) {
    if (n.config.computed) out.push({ node: n, compute: makeComputeFn(n, registries) });
    if (n.kind === 'group') out.push(...collectComputed(n.children, registries));
    // Array item templates are handled by collectArrayComputed.
  }
  return out;
}

function makeComputeFn(node: FieldNode, registries: JsonFormsConfig | undefined): ComputeFn {
  const c = node.config.computed!;
  if ('expr' in c) {
    const compiled = compileExpression(c.expr);
    return (m) => compiled({ value: plainAt(m, node.path), model: m, root: m });
  }
  const fn = registries?.functions?.[c.fn];
  if (!fn) throw new Error(`buildSignalForm: computed function "${c.fn}" is not registered.`);
  return (m) =>
    fn({
      value: () => plainAt(m, node.path),
      model: () => m,
      valueAt: (path: string) => plainAt(m, path.split('.')),
      root: () => m,
    });
}

// --- Array-item computed ---

function collectArrayComputed(
  nodes: FieldNode[],
  registries: JsonFormsConfig | undefined,
): Array<{ arrayPath: string[]; itemComputeds: ItemComputed[] }> {
  const out: Array<{ arrayPath: string[]; itemComputeds: ItemComputed[] }> = [];
  for (const n of nodes) {
    if (n.kind === 'array' && n.item) {
      const itemComputeds = collectItemComputed(n.item, registries);
      if (itemComputeds.length) out.push({ arrayPath: n.path, itemComputeds });
      // Computed fields inside arrays nested within this item are not handled.
    }
    if (n.kind === 'group') out.push(...collectArrayComputed(n.children, registries));
  }
  return out;
}

function collectItemComputed(
  itemNode: FieldNode,
  registries: JsonFormsConfig | undefined,
): ItemComputed[] {
  const out: ItemComputed[] = [];
  const base = itemNode.path.length;
  const visit = (n: FieldNode): void => {
    if (n.config.computed) {
      const relPath = n.path.slice(base);
      out.push({ relPath, compute: makeItemComputeFn(n, registries, relPath) });
    }
    if (n.kind === 'group') n.children.forEach(visit);
    // Nested arrays inside the item are not handled.
  };
  visit(itemNode);
  return out;
}

function makeItemComputeFn(
  node: FieldNode,
  registries: JsonFormsConfig | undefined,
  relPath: string[],
): ItemComputeFn {
  const c = node.config.computed!;
  if ('expr' in c) {
    const compiled = compileExpression(c.expr);
    return (item, root) => compiled({ value: plainAt(item, relPath), model: item, root });
  }
  const fn = registries?.functions?.[c.fn];
  if (!fn) throw new Error(`buildSignalForm: computed function "${c.fn}" is not registered.`);
  return (item, root) =>
    fn({
      value: () => plainAt(item, relPath),
      model: () => item,
      valueAt: (path: string) => plainAt(item, path.split('.')),
      root: () => root,
    });
}

function plainAt(obj: any, segs: ReadonlyArray<string>): unknown {
  return segs.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// --- clearOnHide --------------------------------------------------------------

interface ClearTarget {
  path: string[];
  reset: unknown;
}

/**
 * Wires effects that reset a field to its default whenever it transitions to
 * hidden (config.clearOnHide). The hidden state is read from the compiled form
 * tree, so it honors both DSL and registered-function conditions. Reset happens
 * only on the visible -> hidden edge (not every tick), which also keeps group/
 * array resets from looping on object identity. Top-level and group fields are
 * supported; array-item fields are not.
 */
function setupClearOnHide(
  nodes: FieldNode[],
  form: unknown,
  model: WritableSignal<Record<string, unknown>>,
  injector: Injector,
): void {
  const targets = collectClearOnHide(nodes);
  if (targets.length === 0) return;

  runInInjectionContext(injector, () => {
    for (const { path, reset } of targets) {
      let wasHidden = false;
      effect(() => {
        const state = readFieldState(form, path);
        const isHidden = !!(state && state.hidden());
        if (isHidden && !wasHidden) {
          model.update((m) => updateIn(m, path, () => cloneValue(reset)));
        }
        wasHidden = isHidden;
      });
    }
  });
}

function collectClearOnHide(nodes: FieldNode[]): ClearTarget[] {
  const out: ClearTarget[] = [];
  for (const n of nodes) {
    if (n.config.clearOnHide) out.push({ path: n.path, reset: buildNodeValue(n) });
    if (n.kind === 'group') out.push(...collectClearOnHide(n.children));
  }
  return out;
}

/** Navigates the FieldTree by key and returns the FieldState, or null. */
function readFieldState(form: unknown, path: ReadonlyArray<string>): any {
  let node: any = form;
  for (const k of path) {
    node = node?.[k];
    if (node == null) return null;
  }
  try {
    return node();
  } catch {
    return null;
  }
}

/** Deep-clones objects/arrays so each reset gets a fresh value; primitives pass through. */
function cloneValue(v: unknown): unknown {
  return v && typeof v === 'object' ? structuredClone(v) : v;
}
