import {
  Injector,
  Signal,
  WritableSignal,
  computed,
  effect,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { FieldNode, OptionItem } from './model';
import { compileExpression } from '../expression/expression-engine';
import { updateIn } from './path-utils';
import { buildNodeValue } from './model-builder';
import { JsonFormsConfig, OptionsState } from '../registry/types';

/**
 * Builds a reactive `Signal<OptionsState>` for every static-path field (top-level
 * or inside a group) that declares dynamic `options`. Options are NOT a validation
 * concern, so they live outside the SchemaCompiler: the model stays the single
 * source of truth for the value while options are reactive presentation.
 *
 * Four forms are supported:
 *  - OptionItem[]            constant signal
 *  - { expr } / { fn }       computed from the model (synchronous)
 *  - { source, debounce }    async via `optionSources` (a resource), with optional debounce
 *
 * `clearOnOptionsChange` wires an effect that resets the field to its default when
 * its current value is no longer among the resolved options (cascading selects).
 *
 * Array-item fields are not handled (their paths are dynamic); static inline
 * `options` arrays still work there because the field reads them from its config.
 *
 * Returns a map keyed by `path.join('.')`, consumed by the renderer via the runtime.
 */
export function setupOptions(
  nodes: FieldNode[],
  model: WritableSignal<Record<string, unknown>>,
  registries: JsonFormsConfig | undefined,
  injector: Injector,
): Map<string, Signal<OptionsState>> {
  const byPath = new Map<string, Signal<OptionsState>>();
  runInInjectionContext(injector, () => {
    walk(nodes, model, registries, injector, byPath);
  });
  return byPath;
}

function walk(
  nodes: FieldNode[],
  model: WritableSignal<Record<string, unknown>>,
  registries: JsonFormsConfig | undefined,
  injector: Injector,
  byPath: Map<string, Signal<OptionsState>>,
): void {
  for (const n of nodes) {
    if (n.kind === 'control' && n.config.options != null) {
      const sig = buildOptions(n, model, registries, injector);
      byPath.set(n.path.join('.'), sig);
      if (n.config.clearOnOptionsChange) wireClear(n, sig, model);
    }
    if (n.kind === 'group') walk(n.children, model, registries, injector, byPath);
    // Array items are intentionally not handled (dynamic paths).
  }
}

function buildOptions(
  node: FieldNode,
  model: WritableSignal<Record<string, unknown>>,
  registries: JsonFormsConfig | undefined,
  injector: Injector,
): Signal<OptionsState> {
  const cfg = node.config.options!;

  // Static inline list.
  if (Array.isArray(cfg)) {
    return signal<OptionsState>({ loading: false, options: normalize(cfg) });
  }

  // Derived from the model (DSL expression).
  if ('expr' in cfg) {
    const compiled = compileExpression(cfg.expr);
    return computed<OptionsState>(() => {
      const m = model();
      return { loading: false, options: normalize(compiled({ value: undefined, model: m, root: m })) };
    });
  }

  // Derived from a registered function.
  if ('fn' in cfg) {
    const fn = registries?.functions?.[cfg.fn];
    if (!fn) throw new Error(`setupOptions: options function "${cfg.fn}" is not registered.`);
    return computed<OptionsState>(() => {
      const m = model();
      return { loading: false, options: normalize(fn(dynCtx(m))) };
    });
  }

  // Async via a registered option source (resource).
  const def = registries?.optionSources?.[cfg.source];
  if (!def) throw new Error(`setupOptions: option source "${cfg.source}" is not registered.`);

  let params: Signal<unknown> = computed(() => def.params(dynCtx(model())));
  if (cfg.debounce) params = debounced(params, cfg.debounce, injector);

  const res = def.factory(params) as any;
  return computed<OptionsState>(() => {
    const loading = readLoading(res);
    const error = readError(res);
    const raw = typeof res?.value === 'function' ? res.value() : undefined;
    const options = raw == null ? [] : normalize(def.map(raw));
    return { loading, options, error };
  });
}

/** Resets the field to its default when the current value is not among the options. */
function wireClear(
  node: FieldNode,
  optionsSig: Signal<OptionsState>,
  model: WritableSignal<Record<string, unknown>>,
): void {
  const def = buildNodeValue(node);
  effect(() => {
    const state = optionsSig();
    if (state.loading) return; // don't clear while options are still loading
    const cur = plainAt(model(), node.path);
    if (cur === def || cur === '' || cur == null) return; // nothing meaningful to clear
    const present = state.options.some((o) => Object.is(o.value, cur));
    if (!present) model.update((m) => updateIn(m, node.path, () => def));
  });
}

// --- helpers ------------------------------------------------------------------

function dynCtx(m: Record<string, unknown>) {
  return {
    value: () => undefined,
    model: () => m,
    valueAt: (path: string) => plainAt(m, path.split('.')),
    root: () => m,
  };
}

/** Debounces a signal: emits its latest value after `ms` of quiet. */
function debounced<T>(source: Signal<T>, ms: number, injector: Injector): Signal<T> {
  const out = signal<T>(source());
  runInInjectionContext(injector, () => {
    effect((onCleanup) => {
      const v = source();
      const handle = setTimeout(() => out.set(v), ms);
      onCleanup(() => clearTimeout(handle));
    });
  });
  return out;
}

function readLoading(res: any): boolean {
  if (typeof res?.isLoading === 'function') return !!res.isLoading();
  if (typeof res?.status === 'function') {
    const s = res.status();
    return s === 'loading' || s === 'reloading';
  }
  return false;
}

function readError(res: any): unknown {
  return typeof res?.error === 'function' ? res.error() : undefined;
}

/** Coerces a raw value into OptionItem[]: objects with value/label, or primitives. */
function normalize(raw: unknown): OptionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o: any) => {
    if (o != null && typeof o === 'object' && 'value' in o) {
      return { value: o.value, label: String(o.label ?? o.value), disabled: !!o.disabled };
    }
    return { value: o, label: String(o) };
  });
}

function plainAt(obj: any, segs: ReadonlyArray<string>): unknown {
  return segs.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
