import { ApplicationConfig, provideBrowserGlobalErrorListeners, resource } from '@angular/core';
import {
  DynamicContext,
  JfFieldWrapperComponent,
  provideJsonForms,
  ValidationResult,
} from 'signal-jsonforms';
import { MATERIAL_FIELD_TYPES } from 'signal-jsonforms-material';
import { CardWrapperComponent } from './card-wrapper.component';

const TAKEN_USERNAMES = ['admin', 'root', 'test'];

/** Registered synchronous validator (kind 'fn'): enforces a reasonable password. */
function passwordStrength(ctx: DynamicContext): ValidationResult {
  const value = String(ctx.value() ?? '');
  if (value.length < 8) return { kind: 'weak', message: 'Minimum 8 characters' };
  if (!/[0-9]/.test(value) || !/[a-zA-Z]/.test(value)) {
    return { kind: 'weak', message: 'Combine letters and numbers' };
  }
  return undefined;
}

/**
 * Example migration helper: v0 definitions used "title" instead of "label".
 * Recursively renames title -> label across fields, groups, and array items.
 */
function renameTitleToLabel(fields: any[]): any[] {
  return (fields ?? []).map((f) => {
    const { title, ...rest } = f;
    const out: any = { ...rest };
    if (title !== undefined && out.label === undefined) out.label = title;
    if (out.fields) out.fields = renameTitleToLabel(out.fields);
    if (out.item) out.item = renameTitleToLabel([out.item])[0];
    return out;
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideJsonForms({
      fieldTypes: MATERIAL_FIELD_TYPES,
      // Default wrapper: adds description/hint and the "Checking…" indicator.
      // 'card' is a demo wrapper meant to be stacked on top of 'default'
      // (e.g. "wrapper": ["card", "default"]) to draw a highlighted box.
      wrappers: { default: JfFieldWrapperComponent, card: CardWrapperComponent },
      defaultWrapper: 'default',
      // Centralized error messages by validator kind (i18n). A field's own
      // "message" overrides these; {value} is interpolated from the rule.
      messages: {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        min: 'Must be {value} or more',
        max: 'Must be {value} or less',
        minLength: 'Use at least {value} characters',
        maxLength: 'Use at most {value} characters',
        pattern: 'Invalid format',
      },
      // Complex conditional logic referenced by key, and a computed aggregator.
      functions: {
        hideForNonPro: (ctx: DynamicContext) => ctx.valueAt('plan') !== 'pro',
        // Computed grand total: sums lineTotal across the "lines" array.
        sumLines: (ctx: DynamicContext) => {
          const lines = (ctx.model() as { lines?: { lineTotal?: number }[] }).lines ?? [];
          return lines.reduce((sum, line) => sum + (Number(line?.lineTotal) || 0), 0);
        },
      },
      // Registered synchronous validators (kind 'fn').
      validators: {
        passwordStrength,
      },
      // Async validators (always via registry): not serializable in JSON.
      asyncValidators: {
        uniqueUsername: {
          params: ({ value }) => value(),
          factory: (username) =>
            resource({
              params: username,
              loader: async ({ params }) => {
                await new Promise((r) => setTimeout(r, 600));
                return TAKEN_USERNAMES.includes(String(params ?? '').toLowerCase());
              },
            }),
          onSuccess: (taken) =>
            taken ? { kind: 'taken', message: 'That username is already taken' } : undefined,
          onError: () => ({ kind: 'error', message: 'Could not validate the username' }),
        },
      },
      // Definition migrations: older format versions are upgraded on load.
      migrations: [
        {
          from: '0',
          to: '1',
          // v0 used "title"; v1 uses "label".
          migrate: (config) => ({ ...config, fields: renameTitleToLabel(config.fields) }),
        },
      ],
    }),
  ],
};
