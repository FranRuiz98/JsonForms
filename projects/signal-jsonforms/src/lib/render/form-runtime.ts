import { InjectionToken, WritableSignal } from '@angular/core';

/**
 * Servicio de runtime que el FormHost expone a los renderers para mutar el modelo
 * (necesario para add/remove de items de array, que en Signal Forms se hace
 * cambiando el modelo, no el form).
 */
export interface JsonFormsRuntime {
  readonly model: WritableSignal<Record<string, unknown>>;
  addArrayItem(path: ReadonlyArray<string | number>, item: unknown): void;
  removeArrayItem(path: ReadonlyArray<string | number>, index: number): void;
}

export const JSON_FORMS_RUNTIME = new InjectionToken<JsonFormsRuntime>('JSON_FORMS_RUNTIME');
