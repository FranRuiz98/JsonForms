import { Signal, Type } from '@angular/core';
import { FieldComponent } from '../render/field-component.interface';

export type ValidationResult = { kind: string; message?: string } | undefined;

/**
 * Contexto reactivo que reciben las funciones registradas (condiciones y
 * validadores custom). Todo se lee como getter para mantener el tracking de
 * Signal Forms: `value()` el campo actual, `model()` el modelo completo,
 * `valueAt('a.b')` un campo concreto por path con puntos.
 */
export interface DynamicContext {
  value: () => unknown;
  model: () => Record<string, unknown>;
  valueAt: (path: string) => unknown;
}

/** Validador síncrono custom (kind 'fn'): devuelve error o undefined. */
export type SyncValidatorFn = (ctx: DynamicContext) => ValidationResult;

/** Función de lógica (condiciones hidden/disabled/readonly con kind 'fn'). */
export type LogicFn = (ctx: DynamicContext) => unknown;

/**
 * Definición de un validador async (params/factory/onSuccess/onError de validateAsync).
 * `factory` recibe un Signal con el valor de `params` y debe devolver un resource()
 * cuyo `params` sea ese mismo Signal (NO envolverlo en otra función).
 */
export interface AsyncValidatorDef {
  params: (ctx: { value: () => unknown }) => unknown;
  factory: (input: Signal<unknown>) => unknown;
  onSuccess: (result: unknown) => ValidationResult;
  onError: (err: unknown) => ValidationResult; // OBLIGATORIO en validateAsync
}

export type FieldTypeRegistry = Record<string, Type<FieldComponent>>;
export type WrapperRegistry = Record<string, Type<unknown>>;
export type ValidatorRegistry = Record<string, SyncValidatorFn>;
export type AsyncValidatorRegistry = Record<string, AsyncValidatorDef>;
export type FunctionRegistry = Record<string, LogicFn>;

/** Config global que el consumidor pasa a provideJsonForms(). */
export interface JsonFormsConfig {
  fieldTypes?: FieldTypeRegistry;
  wrappers?: WrapperRegistry;
  defaultWrapper?: string;               // wrapper aplicado a los controles si no indican uno
  validators?: ValidatorRegistry;       // kind 'fn' en validators[]
  asyncValidators?: AsyncValidatorRegistry;
  functions?: FunctionRegistry;          // hidden/disabled/readonly con { fn }
  messages?: Record<string, string>;
}
