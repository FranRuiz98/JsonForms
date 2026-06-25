import { Injector, WritableSignal, runInInjectionContext, signal } from '@angular/core';
import { FormConfig, FormDefinition } from './core/model';
import { normalizeConfig } from './core/normalizer';
import { buildInitialModel } from './core/model-builder';
import { compileSchema } from './core/schema-compiler';
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
  /** Injection context required by form(). */
  injector: Injector;
  /** Model signal to use (e.g. the model() from <jf-form> for two-way binding). */
  model?: WritableSignal<Record<string, unknown>>;
  registries?: JsonFormsConfig;
  /** Validate the definition with the zod meta-schema (default: true). */
  validate?: boolean;
}

/**
 * Low-level API: JSON -> { form, model }.
 * Chains validateConfig (zod) -> normalize -> buildInitialModel -> compileSchema -> form().
 */
export function buildSignalForm(
  config: FormConfig,
  opts: BuildSignalFormOptions,
): BuildSignalFormResult {
  const definition = normalizeConfig(config, { validate: opts.validate });
  const initial = buildInitialModel(definition.nodes);

  // Reconcile the model with the schema shape: keep existing values for keys
  // present in the new schema, fill the rest with defaults, drop stale keys.
  // This makes rebuilding the form with a DIFFERENT schema while reusing the
  // same model signal robust (e.g. a live JSON editor) — otherwise stale keys
  // leave new fields without a FieldTree node.
  if (opts.model) {
    opts.model.set(reshapeModel(initial, opts.model()));
  }
  const model = opts.model ?? signal<Record<string, unknown>>(initial);

  const schemaFn = compileSchema(definition.nodes, SignalForms, opts.registries);

  const form = runInInjectionContext(opts.injector, () =>
    (SignalForms.form as any)(model, schemaFn),
  );

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
