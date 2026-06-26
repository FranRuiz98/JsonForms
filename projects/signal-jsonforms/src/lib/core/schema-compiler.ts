import { AsyncValidatorConfig, DynamicExpr, FieldNode, ValidatorConfig } from './model';
import { SignalFormsApi } from '../adapter/signal-forms.adapter';
import { JsonFormsConfig, ValidationResult } from '../registry/types';
import { compileExpression, ExprContext } from '../expression/expression-engine';

/** Resolves a SchemaPathTree path by key (runtime). */
export const resolvePath = (root: any, keys: ReadonlyArray<string>): any =>
  keys.reduce((p, k) => p[k], root);

const STANDARD = new Set(['required', 'email', 'min', 'max', 'minLength', 'maxLength', 'pattern']);

interface CompileCtx {
  api: SignalFormsApi;
  root: any;
  registries?: JsonFormsConfig;
}

/**
 * Generates the dynamic schemaFn that form() executes once. Traverses the IR
 * recursively: groups recurse, arrays use applyEach. Applies standard validators,
 * cross-field (DSL/registry), async (validateAsync), and conditional rules.
 *
 * Error text is resolved with the priority: the field's own `message` →
 * `registries.messages[kind]` (centralized / i18n) → Signal Forms' built-in
 * default. Messages support `{value}` interpolation.
 */
export function compileSchema(
  nodes: FieldNode[],
  api: SignalFormsApi,
  registries?: JsonFormsConfig,
): (path: unknown) => void {
  return (root: unknown) => {
    const cc: CompileCtx = { api, root, registries };
    applySchema(nodes, root, cc);
  };
}

function applySchema(nodes: FieldNode[], pathNode: any, cc: CompileCtx): void {
  for (const node of nodes) {
    applyNode(node, pathNode[node.key], cc);
  }
}

function applyNode(node: FieldNode, p: any, cc: CompileCtx): void {
  // Synchronous validators (standard + cross-field expr/fn).
  for (const v of node.validators) applyValidator(cc, p, v);

  // Async validators (always via registry).
  for (const av of node.asyncValidators) applyAsyncValidator(cc, p, av);

  // Conditional rules (DSL or registered function).
  applyConditional(cc, p, node.config.hidden, 'hidden');
  applyConditional(cc, p, node.config.disabled, 'disabled');
  applyConditional(cc, p, node.config.readonly, 'readonly');

  // Derived/computed fields are read-only (their value is written by an effect).
  if (node.config.computed) cc.api.readonly(p);

  // Structure.
  if (node.kind === 'group') {
    applySchema(node.children, p, cc);
  } else if (node.kind === 'array' && node.item) {
    const item = node.item;
    cc.api.applyEach(p, (itemPath: any) => applyNode(item, itemPath, cc));
  }
}

// --- Message resolution (i18n) ---

/** field message > registries.messages[kind] > undefined (let Signal Forms default). */
function resolveMessage(cc: CompileCtx, kind: string, v: ValidatorConfig): string | undefined {
  const raw = v.message ?? cc.registries?.messages?.[kind];
  return raw == null ? undefined : interpolate(raw, v);
}

/** Replaces {value} placeholders with the validator's value. */
function interpolate(template: string, v: ValidatorConfig): string {
  return template.replace(/\{value\}/g, v.value != null ? String(v.value) : '');
}

/** Fills a missing error message from registries.messages[kind] (for fn/async). */
function fillMessage(result: ValidationResult, cc: CompileCtx): ValidationResult {
  if (!result || result.message) return result;
  const m = cc.registries?.messages?.[result.kind];
  return m ? { kind: result.kind, message: m } : result;
}

// --- Synchronous validation ---

function applyValidator(cc: CompileCtx, p: any, v: ValidatorConfig): void {
  if (STANDARD.has(v.kind)) {
    applyStandardValidator(cc, p, v);
    return;
  }
  if (v.kind === 'expr' && v.expr) {
    const compiled = compileExpression(v.expr);
    const message = resolveMessage(cc, 'expr', v) ?? 'Invalid value';
    cc.api.validate(p, (fc: any) =>
      compiled(exprContext(cc, fc)) ? undefined : { kind: 'expr', message },
    );
    return;
  }
  if (v.kind === 'fn' && v.fn) {
    const fn = cc.registries?.validators?.[v.fn];
    if (!fn) throw new Error(`compileSchema: validator "${v.fn}" is not registered.`);
    cc.api.validate(p, (fc: any): ValidationResult => fillMessage(fn(dynamicContext(cc, fc)) ?? undefined, cc));
  }
}

function applyStandardValidator(cc: CompileCtx, path: any, v: ValidatorConfig): void {
  const message = resolveMessage(cc, v.kind, v);
  const opts = message ? { message } : undefined;
  switch (v.kind) {
    case 'required':
      cc.api.required(path, opts);
      break;
    case 'email':
      cc.api.email(path, opts);
      break;
    case 'min':
      cc.api.min(path, Number(v.value), opts);
      break;
    case 'max':
      cc.api.max(path, Number(v.value), opts);
      break;
    case 'minLength':
      cc.api.minLength(path, Number(v.value), opts);
      break;
    case 'maxLength':
      cc.api.maxLength(path, Number(v.value), opts);
      break;
    case 'pattern':
      cc.api.pattern(path, toRegExp(v.value), opts);
      break;
  }
}

// --- Async validation ---

function applyAsyncValidator(cc: CompileCtx, p: any, av: AsyncValidatorConfig): void {
  const def = cc.registries?.asyncValidators?.[av.kind];
  if (!def) throw new Error(`compileSchema: async validator "${av.kind}" is not registered.`);
  if (av.debounce) cc.api.debounce(p, av.debounce);
  (cc.api.validateAsync as any)(p, {
    params: def.params,
    factory: def.factory,
    onSuccess: (result: unknown) => fillMessage(def.onSuccess(result), cc),
    onError: (err: unknown) => fillMessage(def.onError(err), cc),
  });
}

// --- Conditional rules ---

type BooleanRule = 'hidden' | 'disabled' | 'readonly';

function applyConditional(cc: CompileCtx, p: any, dyn: DynamicExpr | undefined, rule: BooleanRule): void {
  if (!dyn) return;
  const fn = booleanRule(cc, dyn);
  (cc.api as any)[rule](p, fn);
}

function booleanRule(cc: CompileCtx, dyn: DynamicExpr): (fc: any) => boolean {
  if ('expr' in dyn) {
    const compiled = compileExpression(dyn.expr);
    return (fc: any) => !!compiled(exprContext(cc, fc));
  }
  const fn = cc.registries?.functions?.[dyn.fn];
  if (!fn) throw new Error(`compileSchema: function "${dyn.fn}" is not registered.`);
  return (fc: any) => !!fn(dynamicContext(cc, fc));
}

// --- Reactive contexts ---

/** Proxy that reads the model by path via valueOf (maintains tracking). */
function modelProxy(root: any, valueOf: (p: any) => any, base: string[] = []): any {
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (typeof prop !== 'string') return undefined;
        const segs = [...base, prop];
        const val = valueOf(resolvePath(root, segs));
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          return modelProxy(root, valueOf, segs);
        }
        return val;
      },
    },
  );
}

function exprContext(cc: CompileCtx, fc: any): ExprContext {
  return { value: fc.value(), model: modelProxy(cc.root, fc.valueOf) };
}

function dynamicContext(cc: CompileCtx, fc: any) {
  return {
    value: () => fc.value(),
    model: () => modelProxy(cc.root, fc.valueOf) as Record<string, unknown>,
    valueAt: (path: string) => fc.valueOf(resolvePath(cc.root, path.split('.'))),
  };
}

function toRegExp(value: unknown): RegExp {
  return value instanceof RegExp ? value : new RegExp(String(value));
}
