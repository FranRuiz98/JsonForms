import { z } from 'zod';
import { FieldConfig, FormConfig } from './model';

/**
 * Meta-schema (zod) that validates the JSON definition BEFORE compiling the form,
 * to give early, readable errors instead of opaque runtime failures.
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

const layoutConfig = z.object({
  columns: z.number().int().positive().optional(),
  gap: z.string().optional(),
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
      computed: dynamicExpr.optional(),
      clearOnHide: z.boolean().optional(),
      wrapper: z.union([z.string(), z.array(z.string())]).optional(),
      layout: layoutConfig.optional(),
      colSpan: z.number().int().positive().optional(),
      collapsible: z.boolean().optional(),
      collapsed: z.boolean().optional(),
      fields: z.array(fieldConfig).optional(),
      item: fieldConfig.optional(),
    })
    .superRefine((field, ctx) => {
      if (field.type === 'array' && !field.item) {
        ctx.addIssue({
          code: 'custom',
          path: ['item'],
          message: 'an "array" field requires "item".',
        });
      }
      if (field.type === 'group' && !field.fields) {
        ctx.addIssue({
          code: 'custom',
          path: ['fields'],
          message: 'a "group" field requires "fields".',
        });
      }
      (field.validators ?? []).forEach((v, i) => {
        if (v.kind === 'expr' && !v.expr) {
          ctx.addIssue({
            code: 'custom',
            path: ['validators', i, 'expr'],
            message: 'an "expr" validator requires "expr".',
          });
        }
        if (v.kind === 'fn' && !v.fn) {
          ctx.addIssue({
            code: 'custom',
            path: ['validators', i, 'fn'],
            message: 'a "fn" validator requires "fn".',
          });
        }
      });
    }),
) as z.ZodType<FieldConfig>;

export const formConfigSchema = z.object({
  version: z.string().optional(),
  id: z.string().optional(),
  layout: layoutConfig.optional(),
  fields: z.array(fieldConfig).min(1, 'the form needs at least one field.'),
});

/** Validates the definition; throws a readable aggregated error if invalid. */
export function validateConfig(config: unknown): FormConfig {
  const result = formConfigSchema.safeParse(config);
  if (!result.success) {
    const lines = result.error.issues.map((i) => {
      const path = i.path.length ? i.path.join('.') : '(root)';
      return `  - ${path}: ${i.message}`;
    });
    throw new Error(`Invalid form definition:\n${lines.join('\n')}`);
  }
  return result.data as FormConfig;
}
