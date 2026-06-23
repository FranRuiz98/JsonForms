import { z } from 'zod';
import { FieldConfig, FormConfig } from './model';

/**
 * Meta-schema (zod) que valida la definición JSON ANTES de compilar el formulario,
 * para dar errores tempranos y legibles en lugar de fallos opacos en runtime.
 */

const dataType = z.enum(['string', 'number', 'boolean', 'array', 'object']);

const dynamicExpr = z.union([z.object({ expr: z.string() }), z.object({ fn: z.string() })]);

const validatorConfig = z.object({
  kind: z.string().min(1),
  value: z.unknown().optional(),
  message: z.string().optional(),
  when: dynamicExpr.optional(),
  expr: z.string().optional(),
  fn: z.string().optional(),
});

const asyncValidatorConfig = z.object({
  kind: z.string().min(1),
  debounce: z.number().optional(),
});

const fieldConfig: z.ZodType<FieldConfig> = z.lazy(() =>
  z
    .object({
      key: z.string().min(1),
      type: z.string().min(1),
      dataType: dataType.optional(),
      label: z.string().optional(),
      props: z.record(z.string(), z.unknown()).optional(),
      defaultValue: z.unknown().optional(),
      validators: z.array(validatorConfig).optional(),
      asyncValidators: z.array(asyncValidatorConfig).optional(),
      hidden: dynamicExpr.optional(),
      disabled: dynamicExpr.optional(),
      readonly: dynamicExpr.optional(),
      wrapper: z.string().optional(),
      fields: z.array(fieldConfig).optional(),
      item: fieldConfig.optional(),
    })
    .superRefine((field, ctx) => {
      if (field.type === 'array' && !field.item) {
        ctx.addIssue({ code: 'custom', path: ['item'], message: 'un campo "array" requiere "item".' });
      }
      if (field.type === 'group' && !field.fields) {
        ctx.addIssue({ code: 'custom', path: ['fields'], message: 'un campo "group" requiere "fields".' });
      }
      (field.validators ?? []).forEach((v, i) => {
        if (v.kind === 'expr' && !v.expr) {
          ctx.addIssue({ code: 'custom', path: ['validators', i, 'expr'], message: 'el validador "expr" requiere "expr".' });
        }
        if (v.kind === 'fn' && !v.fn) {
          ctx.addIssue({ code: 'custom', path: ['validators', i, 'fn'], message: 'el validador "fn" requiere "fn".' });
        }
      });
    }),
) as z.ZodType<FieldConfig>;

export const formConfigSchema = z.object({
  version: z.string().optional(),
  id: z.string().optional(),
  fields: z.array(fieldConfig).min(1, 'el formulario necesita al menos un campo.'),
});

/** Valida la definición; lanza un error agregado y legible si es inválida. */
export function validateConfig(config: unknown): FormConfig {
  const result = formConfigSchema.safeParse(config);
  if (!result.success) {
    const lines = result.error.issues.map((i) => {
      const path = i.path.length ? i.path.join('.') : '(raíz)';
      return `  - ${path}: ${i.message}`;
    });
    throw new Error(`Definición de formulario inválida:\n${lines.join('\n')}`);
  }
  return result.data as FormConfig;
}
