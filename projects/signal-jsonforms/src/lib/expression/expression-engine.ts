import jsep from 'jsep';

/**
 * Contexto seguro expuesto al DSL. `value` es el valor del campo actual y `model`
 * el modelo (típicamente un proxy reactivo que lee otros campos vía valueOf).
 */
export interface ExprContext {
  value: unknown;
  model: unknown;
}
export type CompiledExpr = (ctx: ExprContext) => unknown;

/**
 * Compila una expresión del DSL a una función pura. Parseo con jsep (AST) y
 * evaluación con un intérprete acotado: SIN eval/Function y sin llamadas a
 * funciones; solo lectura de `value`/`model`, operadores y literales.
 */
export function compileExpression(expr: string): CompiledExpr {
  const ast = jsep(expr) as unknown as Node;
  return (ctx: ExprContext) => evalNode(ast, ctx);
}

type Node = { type: string; [k: string]: any };

function evalNode(node: Node, ctx: ExprContext): any {
  switch (node['type']) {
    case 'Literal':
      return node['value'];
    case 'Identifier':
      return resolveIdentifier(node['name'], ctx);
    case 'MemberExpression': {
      const obj = evalNode(node['object'], ctx);
      const key = node['computed'] ? evalNode(node['property'], ctx) : node['property'].name;
      return obj == null ? undefined : obj[key];
    }
    case 'UnaryExpression': {
      const a = evalNode(node['argument'], ctx);
      switch (node['operator']) {
        case '!':
          return !a;
        case '-':
          return -(a as number);
        case '+':
          return +(a as number);
        default:
          throw new Error(`DSL: operador unario no soportado "${node['operator']}".`);
      }
    }
    case 'BinaryExpression':
    case 'LogicalExpression': {
      const op = node['operator'];
      if (op === '&&') return evalNode(node['left'], ctx) && evalNode(node['right'], ctx);
      if (op === '||') return evalNode(node['left'], ctx) || evalNode(node['right'], ctx);
      return binop(op, evalNode(node['left'], ctx), evalNode(node['right'], ctx));
    }
    case 'ConditionalExpression':
      return evalNode(node['test'], ctx)
        ? evalNode(node['consequent'], ctx)
        : evalNode(node['alternate'], ctx);
    case 'ArrayExpression':
      return (node['elements'] as Node[]).map((e) => evalNode(e, ctx));
    case 'Compound':
      throw new Error('DSL: la expresión debe ser única (sin ";").');
    default:
      throw new Error(`DSL: nodo no soportado "${node['type']}".`);
  }
}

function resolveIdentifier(name: string, ctx: ExprContext): any {
  switch (name) {
    case 'value':
      return ctx.value;
    case 'model':
      return ctx.model;
    case 'true':
      return true;
    case 'false':
      return false;
    case 'null':
      return null;
    case 'undefined':
      return undefined;
    default:
      throw new Error(`DSL: identificador no permitido "${name}" (usa value o model).`);
  }
}

function binop(op: string, l: any, r: any): any {
  switch (op) {
    case '===':
      return l === r;
    case '!==':
      return l !== r;
    case '==':
      // eslint-disable-next-line eqeqeq
      return l == r;
    case '!=':
      // eslint-disable-next-line eqeqeq
      return l != r;
    case '<':
      return l < r;
    case '>':
      return l > r;
    case '<=':
      return l <= r;
    case '>=':
      return l >= r;
    case '+':
      return l + r;
    case '-':
      return l - r;
    case '*':
      return l * r;
    case '/':
      return l / r;
    case '%':
      return l % r;
    default:
      throw new Error(`DSL: operador no soportado "${op}".`);
  }
}
