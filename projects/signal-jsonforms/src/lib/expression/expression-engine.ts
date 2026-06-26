import jsep from 'jsep';

/**
 * Safe context exposed to the DSL. `value` is the current field value and `model`
 * is the model (typically a reactive proxy that reads other fields via valueOf).
 */
export interface ExprContext {
  value: unknown;
  model: unknown;
  /** Whole-model root (equals `model` for top-level/group fields; the form root inside array items). */
  root?: unknown;
}
export type CompiledExpr = (ctx: ExprContext) => unknown;

/**
 * Compiles a DSL expression to a pure function. Parsed with jsep (AST) and
 * evaluated with a sandboxed interpreter: NO eval/Function and no function calls;
 * only reads `value`/`model`, operators, and literals.
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
          throw new Error(`DSL: unsupported unary operator "${node['operator']}".`);
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
      throw new Error('DSL: expression must be a single expression (no ";").');
    default:
      throw new Error(`DSL: unsupported node type "${node['type']}".`);
  }
}

function resolveIdentifier(name: string, ctx: ExprContext): any {
  switch (name) {
    case 'value':
      return ctx.value;
    case 'model':
      return ctx.model;
    case 'root':
      return ctx.root;
    case 'true':
      return true;
    case 'false':
      return false;
    case 'null':
      return null;
    case 'undefined':
      return undefined;
    default:
      throw new Error(`DSL: identifier not allowed "${name}" (use value or model).`);
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
      throw new Error(`DSL: unsupported operator "${op}".`);
  }
}
