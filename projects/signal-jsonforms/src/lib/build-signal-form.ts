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

  const model = opts.model ?? signal<Record<string, unknown>>(initial);
  if (opts.model && isEmpty(opts.model())) {
    opts.model.set(initial);
  }

  const schemaFn = compileSchema(definition.nodes, SignalForms, opts.registries);

  const form = runInInjectionContext(opts.injector, () =>
    (SignalForms.form as any)(model, schemaFn),
  );

  return { form, model, definition };
}

function isEmpty(value: Record<string, unknown> | undefined | null): boolean {
  return !value || Object.keys(value).length === 0;
}
