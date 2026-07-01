import { InjectionToken, Signal, WritableSignal } from '@angular/core';
import { OptionsState } from '../registry/types';

/**
 * Servicio de runtime que el FormHost expone a los renderers para mutar el modelo
 * (necesario para add/remove de items de array, que en Signal Forms se hace
 * cambiando el modelo, no el form) y para resolver las opciones dinámicas de un campo.
 */
export interface JsonFormsRuntime {
  readonly model: WritableSignal<Record<string, unknown>>;
  addArrayItem(path: ReadonlyArray<string | number>, item: unknown): void;
  removeArrayItem(path: ReadonlyArray<string | number>, index: number): void;
  /** Reactive options for a field path, or null if it has no dynamic options. */
  optionsFor(path: ReadonlyArray<string | number>): Signal<OptionsState> | null;
}

export const JSON_FORMS_RUNTIME = new InjectionToken<JsonFormsRuntime>('JSON_FORMS_RUNTIME');
