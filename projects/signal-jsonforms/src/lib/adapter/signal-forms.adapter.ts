/**
 * ADAPTER LAYER (anti-corruption).
 * The only place in the project that imports from @angular/forms/signals.
 * Isolates the rest of the code from the @experimental API risk: if Angular
 * changes a signature, it is fixed here and nowhere else.
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

// Controlled re-export of types and the binding directive,
// so that the rest of the project does not import directly from the experimental package.
export { FormField };
export type { FieldTree, FieldState } from '@angular/forms/signals';
