/**
 * CAPA ADAPTADORA (anti-corruption).
 * Único punto del proyecto que importa de @angular/forms/signals.
 * Aísla el resto del código del riesgo de la API @experimental: si Angular
 * cambia una firma, se arregla aquí y en ningún otro sitio.
 */
import {
  form, schema, apply, applyEach, applyWhen,
  validate, validateAsync, submit,
  required, email, min, max, minLength, maxLength, pattern,
  disabled, readonly, hidden, debounce,
  FormField,
} from '@angular/forms/signals';

export const SignalForms = {
  form, schema, apply, applyEach, applyWhen,
  validate, validateAsync, submit,
  required, email, min, max, minLength, maxLength, pattern,
  disabled, readonly, hidden, debounce,
};

export type SignalFormsApi = typeof SignalForms;

// Re-export controlado de tipos y de la directiva de binding,
// para que el resto del proyecto no importe directamente del paquete experimental.
export { FormField };
export type { FieldTree, FieldState } from '@angular/forms/signals';
