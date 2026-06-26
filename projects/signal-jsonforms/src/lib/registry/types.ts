import { Signal, Type } from '@angular/core';
import { FieldComponent } from '../render/field-component.interface';
import { Migration } from '../core/migration';

export type ValidationResult = { kind: string; message?: string } | undefined;

/**
 * Reactive context received by registered functions (conditions and custom
 * validators). Everything is read through a getter to keep Signal Forms
 * tracking: value() the current field, model() the whole model, valueAt('a.b')
 * a specific field by dotted path.
 */
export interface DynamicContext {
  value: () => unknown;
  model: () => Record<string, unknown>;
  valueAt: (path: string) => unknown;
  /** Whole-model root (equals model() outside arrays; the form root inside array items). */
  root?: () => Record<string, unknown>;
}

/** Synchronous custom validator (kind 'fn'): returns an error or undefined. */
export type SyncValidatorFn = (ctx: DynamicContext) => ValidationResult;

/** Logic function (hidden/disabled/readonly with kind 'fn'; also computed). */
export type LogicFn = (ctx: DynamicContext) => unknown;

/** Async validator definition (params/factory/onSuccess/onError of validateAsync). */
export interface AsyncValidatorDef {
  params: (ctx: { value: () => unknown }) => unknown;
  factory: (input: Signal<unknown>) => unknown;
  onSuccess: (result: unknown) => ValidationResult;
  onError: (err: unknown) => ValidationResult;
}

export type FieldTypeRegistry = Record<string, Type<FieldComponent>>;
export type WrapperRegistry = Record<string, Type<unknown>>;
export type ValidatorRegistry = Record<string, SyncValidatorFn>;
export type AsyncValidatorRegistry = Record<string, AsyncValidatorDef>;
export type FunctionRegistry = Record<string, LogicFn>;

/** Global config the consumer passes to provideJsonForms(). */
export interface JsonFormsConfig {
  fieldTypes?: FieldTypeRegistry;
  wrappers?: WrapperRegistry;
  defaultWrapper?: string;
  validators?: ValidatorRegistry;        // kind 'fn' in validators[]
  asyncValidators?: AsyncValidatorRegistry;
  functions?: FunctionRegistry;          // hidden/disabled/readonly/computed with { fn }
  messages?: Record<string, string>;     // centralized error text by kind (i18n)
  migrations?: Migration[];              // upgrade older definitions before building
}
