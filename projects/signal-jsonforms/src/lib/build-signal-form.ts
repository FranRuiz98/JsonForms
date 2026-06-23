import { Injector, WritableSignal, runInInjectionContext, signal } from '@angular/core';
import { FormConfig, FormDefinition } from './core/model';
import { normalizeConfig } from './core/normalizer';
import { buildInitialModel } from './core/model-builder';
import { compileSchema } from './core/schema-compiler';
import { JsonFormsConfig } from './registry/types';
import { SignalForms } from './adapter/signal-forms.adapter';

export interface BuildSignalFormResult {
  /** FieldTree raíz devuelto por form(). */
  form: unknown;
  /** WritableSignal del modelo (fuente de la verdad). */
  model: WritableSignal<Record<string, unknown>>;
  /** IR normalizada (útil para el renderer). */
  definition: FormDefinition;
}

export interface BuildSignalFormOptions {
  /** Contexto de inyección requerido por form(). */
  injector: Injector;
  /** Signal del modelo a usar (p. ej. el model() de <jf-form> para two-way binding). */
  model?: WritableSignal<Record<string, unknown>>;
  registries?: JsonFormsConfig;
  /** Validar la definición con el meta-schema zod (por defecto true). */
  validate?: boolean;
}

/**
 * API de bajo nivel: JSON -> { form, model }.
 * Encadena validateConfig (zod) -> normalize -> buildInitialModel -> compileSchema -> form().
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
