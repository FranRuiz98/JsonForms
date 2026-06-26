/*
 * Public API de signal-jsonforms (núcleo, agnóstico de UI).
 */
// Núcleo
export * from './lib/core/model';
export * from './lib/core/normalizer';
export * from './lib/core/definition-schema';
export * from './lib/core/migration';
export * from './lib/core/model-builder';
export * from './lib/core/schema-compiler';
export * from './lib/core/path-utils';
export * from './lib/build-signal-form';
// DSL de expresiones
export * from './lib/expression/expression-engine';
// Registros / DI
export * from './lib/registry/types';
export * from './lib/registry/tokens';
export * from './lib/registry/provide-json-forms';
// Render
export * from './lib/render/field-component.interface';
export * from './lib/render/form-runtime';
export * from './lib/render/field-wrapper.component';
export * from './lib/render/field-renderer.component';
export * from './lib/render/form-host.component';
// Adaptador (re-export controlado): FormField y la fachada SignalForms
export { SignalForms, FormField } from './lib/adapter/signal-forms.adapter';
export type { SignalFormsApi, FieldTree, FieldState } from './lib/adapter/signal-forms.adapter';
