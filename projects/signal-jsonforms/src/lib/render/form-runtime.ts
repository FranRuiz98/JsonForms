import { InjectionToken, Signal, WritableSignal } from '@angular/core';
import { OptionsState } from '../registry/types';

/**
 * Runtime service that FormHost exposes to renderers for mutating the model
 * (necessary for array item add/remove, which in Signal Forms is done by
 * changing the model, not the form) and for resolving dynamic field options.
 */
export interface JsonFormsRuntime {
  readonly model: WritableSignal<Record<string, unknown>>;
  addArrayItem(path: ReadonlyArray<string | number>, item: unknown): void;
  removeArrayItem(path: ReadonlyArray<string | number>, index: number): void;
  /** Reactive options for a field path, or null if it has no dynamic options. */
  optionsFor(path: ReadonlyArray<string | number>): Signal<OptionsState> | null;
}

export const JSON_FORMS_RUNTIME = new InjectionToken<JsonFormsRuntime>('JSON_FORMS_RUNTIME');
