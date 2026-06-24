import { Signal, Type } from '@angular/core';
import { FieldComponent } from '../render/field-component.interface';

export type ValidationResult = { kind: string; message?: string } | undefined;

/**
 * Reactive context received by registered functions (conditions and
 * custom validators). Everything is read as a getter to maintain Signal Forms
 * tracking: `value()` is the current field, `model()` the full model,
 * `valueAt('a.b')` a specific field by dot-separated path.
 */
export interface DynamicContext {
  value: () => unknown;
  model: () => Record<string, unknown>;
  valueAt: (path: string) => unknown;
}

/** Custom synchronous validator (kind 'fn'): returns an error or undefined. */
export type SyncValidatorFn = (ctx: DynamicContext) => ValidationResult;

/** Logic function (hidden/disabled/readonly conditions with kind 'fn'). */
export type LogicFn = (ctx: DynamicContext) => unknown;

/**
 * Definition of an async validator (params/factory/onSuccess/onError for validateAsync).
 * `factory` receives a Signal with the value of `params` and must return a resource()
 * whose `params` is that same Signal (do NOT wrap it in another function).
 */
export interface AsyncValidatorDef {
  params: (ctx: { value: () => unknown }) => unknown;
  factory: (input: Signal<unknown>) => unknown;
  onSuccess: (result: unknown) => ValidationResult;
  onError: (err: unknown) => ValidationResult; // REQUIRED by validateAsync
}

export type FieldTypeRegistry = Record<string, Type<FieldComponent>>;
export type WrapperRegistry = Record<string, Type<unknown>>;
export type ValidatorRegistry = Record<string, SyncValidatorFn>;
export type AsyncValidatorRegistry = Record<string, AsyncValidatorDef>;
export type FunctionRegistry = Record<string, LogicFn>;

/** Global config passed by the consumer to provideJsonForms(). */
export interface JsonFormsConfig {
  fieldTypes?: FieldTypeRegistry;
  wrappers?: WrapperRegistry;
  defaultWrapper?: string;               // wrapper applied to controls that do not specify one
  validators?: ValidatorRegistry;       // kind 'fn' in validators[]
  asyncValidators?: AsyncValidatorRegistry;
  functions?: FunctionRegistry;          // hidden/disabled/readonly with { fn }
  messages?: Record<string, string>;
}
