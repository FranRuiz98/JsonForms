/*
 * Public API of signal-jsonforms (core, UI-agnostic).
 */
// Core
export * from './lib/core/model';
export * from './lib/core/normalizer';
export * from './lib/core/model-builder';
export * from './lib/core/schema-compiler';
export * from './lib/core/path-utils';
export * from './lib/build-signal-form';
// Expression DSL
export * from './lib/expression/expression-engine';
// Registries / DI
export * from './lib/registry/types';
export * from './lib/registry/tokens';
export * from './lib/registry/provide-json-forms';
// Render
export * from './lib/render/field-component.interface';
export * from './lib/render/form-runtime';
export * from './lib/render/field-wrapper.component';
export * from './lib/render/field-renderer.component';
export * from './lib/render/form-host.component';
// Adapter (controlled re-export): FormField and SignalForms facade
export { SignalForms, FormField } from './lib/adapter/signal-forms.adapter';
export type { SignalFormsApi, FieldTree, FieldState } from './lib/adapter/signal-forms.adapter';
