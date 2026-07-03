/**
 * ADAPTER LAYER (anti-corruption).
 * The only place in the project that imports from @angular/forms/signals.
 * Signal Forms is stable as of Angular v22; this single integration point means
 * that if the API surface changes across a major, it is fixed here and nowhere else.
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
