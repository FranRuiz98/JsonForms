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

/** Validador síncrono registrado (kind 'fn'): exige una contraseña razonable. */
function passwordStrength(ctx: DynamicContext): ValidationResult {
  const value = String(ctx.value() ?? '');
  if (value.length < 8) return { kind: 'weak', message: 'Mínimo 8 caracteres' };
  if (!/[0-9]/.test(value) || !/[a-zA-Z]/.test(value)) {
    return { kind: 'weak', message: 'Combina letras y números' };
  }
  return undefined;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideJsonForms({
      fieldTypes: MATERIAL_FIELD_TYPES,
      // Wrapper por defecto: añade description/hint y el indicador "Comprobando…".
      wrappers: { default: JfFieldWrapperComponent },
      defaultWrapper: 'default',
      // Lógica condicional compleja referenciada por clave.
      functions: {
        hideForNonPro: (ctx: DynamicContext) => ctx.valueAt('plan') !== 'pro',
      },
      // Validadores síncronos registrados (kind 'fn').
      validators: {
        passwordStrength,
      },
      // Validadores async (siempre por registro): no son serializables en JSON.
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
            taken ? { kind: 'taken', message: 'Ese usuario ya existe' } : undefined,
          onError: () => ({ kind: 'error', message: 'No se pudo validar el usuario' }),
        },
      },
    }),
  ],
};
