import { AsyncValidatorConfig, DynamicExpr, FieldNode, ValidatorConfig } from './model';
import { SignalFormsApi } from '../adapter/signal-forms.adapter';
import { JsonFormsConfig, ValidationResult } from '../registry/types';
import { compileExpression, ExprContext } from '../expression/expression-engine';

/** Resuelve un path del SchemaPathTree por clave (runtime). */
export const resolvePath = (root: any, keys: ReadonlyArray<string>): any =>
  keys.reduce((p, k) => p[k], root);

const STANDARD = new Set(['required', 'email', 'min', 'max', 'minLength', 'maxLength', 'pattern']);

interface CompileCtx {
  api: SignalFormsApi;
  root: any;
  registries?: JsonFormsConfig;
}

/**
 * Genera la schemaFn dinámica que form() ejecuta una vez. Recorre la IR de forma
 * recursiva: grupos recurren, arrays usan applyEach. Aplica validadores estándar,
 * cross-field (DSL/registro), async (validateAsync) y reglas condicionales.
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
  // Validadores síncronos (estándar + cross-field expr/fn).
  for (const v of node.validators) applyValidator(cc, p, v);

  // Validadores asíncronos (siempre por registro).
  for (const av of node.asyncValidators) applyAsyncValidator(cc, p, av);

  // Reglas condicionales (DSL o función registrada).
  applyConditional(cc, p, node.config.hidden, 'hidden');
  applyConditional(cc, p, node.config.disabled, 'disabled');
  applyConditional(cc, p, node.config.readonly, 'readonly');

  // Estructura.
  if (node.kind === 'group') {
    applySchema(node.children, p, cc);
  } else if (node.kind === 'array' && node.item) {
    const item = node.item;
    cc.api.applyEach(p, (itemPath: any) => applyNode(item, itemPath, cc));
  }
}

// --- Validación síncrona ---

function applyValidator(cc: CompileCtx, p: any, v: ValidatorConfig): void {
  if (STANDARD.has(v.kind)) {
    applyStandardValidator(cc.api, p, v);
    return;
  }
  if (v.kind === 'expr' && v.expr) {
    const compiled = compileExpression(v.expr);
    cc.api.validate(p, (fc: any) =>
      compiled(exprContext(cc, fc)) ? undefined : { kind: 'expr', message: v.message ?? 'Valor no válido' },
    );
    return;
  }
  if (v.kind === 'fn' && v.fn) {
    const fn = cc.registries?.validators?.[v.fn];
    if (!fn) throw new Error(`compileSchema: validador "${v.fn}" no registrado.`);
    cc.api.validate(p, (fc: any): ValidationResult => fn(dynamicContext(cc, fc)) ?? undefined);
  }
}

function applyStandardValidator(api: SignalFormsApi, path: any, v: ValidatorConfig): void {
  const opts = v.message ? { message: v.message } : undefined;
  switch (v.kind) {
    case 'required':
      api.required(path, opts);
      break;
    case 'email':
      api.email(path, opts);
      break;
    case 'min':
      api.min(path, Number(v.value), opts);
      break;
    case 'max':
      api.max(path, Number(v.value), opts);
      break;
    case 'minLength':
      api.minLength(path, Number(v.value), opts);
      break;
    case 'maxLength':
      api.maxLength(path, Number(v.value), opts);
      break;
    case 'pattern':
      api.pattern(path, toRegExp(v.value), opts);
      break;
  }
}

// --- Validación asíncrona ---

function applyAsyncValidator(cc: CompileCtx, p: any, av: AsyncValidatorConfig): void {
  const def = cc.registries?.asyncValidators?.[av.kind];
  if (!def) throw new Error(`compileSchema: validador async "${av.kind}" no registrado.`);
  if (av.debounce) cc.api.debounce(p, av.debounce);
  (cc.api.validateAsync as any)(p, {
    params: def.params,
    factory: def.factory,
    onSuccess: def.onSuccess,
    onError: def.onError,
  });
}

// --- Reglas condicionales ---

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
  if (!fn) throw new Error(`compileSchema: función "${dyn.fn}" no registrada.`);
  return (fc: any) => !!fn(dynamicContext(cc, fc));
}

// --- Contextos reactivos ---

/** Proxy que lee el modelo por path a través de valueOf (mantiene el tracking). */
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
