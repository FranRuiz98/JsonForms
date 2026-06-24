import { ApplicationConfig, provideBrowserGlobalErrorListeners, resource } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  DynamicContext,
  JfFieldWrapperComponent,
  provideJsonForms,
  ValidationResult,
} from 'signal-jsonforms';
import { MATERIAL_FIELD_TYPES } from 'signal-jsonforms-material';

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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideJsonForms({
      fieldTypes: MATERIAL_FIELD_TYPES,
      // Default wrapper: adds description/hint and the "Checking…" indicator.
      wrappers: { default: JfFieldWrapperComponent },
      defaultWrapper: 'default',
      // Complex conditional logic referenced by key.
      functions: {
        hideForNonPro: (ctx: DynamicContext) => ctx.valueAt('plan') !== 'pro',
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
    }),
  ],
};
