import { describe, it, expect } from 'vitest';
import { compileExpression, ExprContext } from '../../src/lib/expression/expression-engine';

const ctx = (value: unknown, model: unknown = {}): ExprContext => ({ value, model });
const run = (expr: string, value: unknown, model: unknown = {}) =>
  compileExpression(expr)(ctx(value, model));

// ── compileExpression ─────────────────────────────────────────────────────

describe('compileExpression', () => {
  describe('literals', () => {
    it('evaluates integer number', () => {
      expect(run('42', null)).toBe(42);
    });

    it('evaluates decimal number', () => {
      expect(run('3.14', null)).toBeCloseTo(3.14);
    });

    it('evaluates string with double quotes', () => {
      expect(run('"hello"', null)).toBe('hello');
    });

    it('evaluates string with single quotes', () => {
      expect(run("'world'", null)).toBe('world');
    });

    it('evaluates true as boolean', () => {
      expect(run('true', null)).toBe(true);
    });

    it('evaluates false as boolean', () => {
      expect(run('false', null)).toBe(false);
    });

    it('evaluates null', () => {
      expect(run('null', null)).toBeNull();
    });

    it('evaluates undefined', () => {
      expect(run('undefined', null)).toBeUndefined();
    });
  });

  describe('allowed identifiers', () => {
    it('returns the context value with "value"', () => {
      expect(run('value', 'test')).toBe('test');
    });

    it('returns the model with "model"', () => {
      const model = { x: 1 };
      expect(compileExpression('model')(ctx(null, model))).toBe(model);
    });

    it('throws for disallowed identifier (window)', () => {
      expect(() => run('window', null)).toThrow(/not allowed/);
    });

    it('throws for disallowed identifier (eval)', () => {
      expect(() => run('eval', null)).toThrow(/not allowed/);
    });

    it('throws for disallowed identifier (document)', () => {
      expect(() => run('document', null)).toThrow(/not allowed/);
    });

    it('throws for disallowed identifier (process)', () => {
      expect(() => run('process', null)).toThrow(/not allowed/);
    });
  });

  describe('MemberExpression (property access)', () => {
    it('reads model.field', () => {
      expect(run('model.name', null, { name: 'Alice' })).toBe('Alice');
    });

    it('reads nested model.a.b', () => {
      expect(run('model.address.city', null, { address: { city: 'Madrid' } })).toBe('Madrid');
    });

    it('returns undefined for access on null', () => {
      expect(run('model.x.y', null, { x: null })).toBeUndefined();
    });

    it('returns undefined when field does not exist', () => {
      expect(run('model.missing', null, {})).toBeUndefined();
    });

    it('supports bracket access (computed)', () => {
      expect(run('model["name"]', null, { name: 'Bob' })).toBe('Bob');
    });
  });

  describe('unary operators', () => {
    it('! negates a boolean', () => {
      expect(run('!value', true)).toBe(false);
      expect(run('!value', false)).toBe(true);
    });

    it('! on falsy value', () => {
      expect(run('!value', 0)).toBe(true);
      expect(run('!value', '')).toBe(true);
    });

    it('- numeric negation', () => {
      expect(run('-value', 5)).toBe(-5);
    });

    it('+ coercion to number', () => {
      expect(run('+value', '7')).toBe(7);
    });

    it('throws for unsupported unary operator', () => {
      expect(() => run('~value', 5)).toThrow(/unsupported unary operator/);
    });
  });

  describe('binary operators - comparison', () => {
    it('=== strict equality (true)', () => {
      expect(run('value === "admin"', 'admin')).toBe(true);
    });

    it('=== strict equality (false)', () => {
      expect(run('value === "admin"', 'user')).toBe(false);
    });

    it('!== strict inequality', () => {
      expect(run('value !== "admin"', 'user')).toBe(true);
    });

    it('== loose equality (number/string)', () => {
      expect(run('value == 1', '1')).toBe(true);
    });

    it('!= loose inequality', () => {
      expect(run('value != 0', '')).toBe(false); // '' == 0 is true
    });

    it('< less than', () => {
      expect(run('value < 10', 5)).toBe(true);
      expect(run('value < 10', 15)).toBe(false);
    });

    it('> greater than', () => {
      expect(run('value > 5', 10)).toBe(true);
      expect(run('value > 5', 3)).toBe(false);
    });

    it('<= less than or equal', () => {
      expect(run('value <= 10', 10)).toBe(true);
      expect(run('value <= 10', 11)).toBe(false);
    });

    it('>= greater than or equal', () => {
      expect(run('value >= 5', 5)).toBe(true);
      expect(run('value >= 5', 4)).toBe(false);
    });

    it('throws for unsupported operator', () => {
      expect(() => run('value ** 2', 3)).toThrow(/unsupported operator/);
    });
  });

  describe('binary operators - arithmetic', () => {
    it('addition +', () => {
      expect(run('value + 3', 7)).toBe(10);
    });

    it('subtraction -', () => {
      expect(run('value - 3', 7)).toBe(4);
    });

    it('multiplication *', () => {
      expect(run('value * 2', 5)).toBe(10);
    });

    it('division /', () => {
      expect(run('value / 2', 10)).toBe(5);
    });

    it('modulo %', () => {
      expect(run('value % 3', 7)).toBe(1);
    });

    it('string concatenation with +', () => {
      expect(run('value + " world"', 'hello')).toBe('hello world');
    });
  });

  describe('logical operators', () => {
    it('&& true && true = true', () => {
      expect(run('value && true', true)).toBe(true);
    });

    it('&& false && true = false', () => {
      expect(run('value && true', false)).toBe(false);
    });

    it('&& short-circuit returns left side if falsy', () => {
      expect(run('value && "text"', 0)).toBe(0);
    });

    it('|| false || true = true', () => {
      expect(run('value || true', false)).toBe(true);
    });

    it('|| true || false = true (short-circuit)', () => {
      expect(run('value || false', true)).toBe(true);
    });

    it('|| returns right side if left is falsy', () => {
      expect(run('value || "default"', '')).toBe('default');
    });
  });

  describe('conditional expression (ternary)', () => {
    it('returns consequent if condition is truthy', () => {
      expect(run('value ? "yes" : "no"', true)).toBe('yes');
    });

    it('returns alternate if condition is falsy', () => {
      expect(run('value ? "yes" : "no"', false)).toBe('no');
    });

    it('condition based on comparison', () => {
      expect(run('value > 18 ? "adult" : "minor"', 25)).toBe('adult');
      expect(run('value > 18 ? "adult" : "minor"', 15)).toBe('minor');
    });
  });

  describe('array expressions', () => {
    it('creates array of literals', () => {
      expect(run('[1, 2, 3]', null)).toEqual([1, 2, 3]);
    });

    it('includes dynamic values', () => {
      expect(run('[value, 0]', 5)).toEqual([5, 0]);
    });

    it('empty array', () => {
      expect(run('[]', null)).toEqual([]);
    });
  });

  describe('compound expressions (invalid)', () => {
    it('throws for expressions with semicolon', () => {
      expect(() => run('1; 2', null)).toThrow(/single expression/);
    });
  });

  describe('real DSL use cases', () => {
    it('hidden when value is empty string', () => {
      const fn = compileExpression('value === ""');
      expect(fn(ctx(''))).toBe(true);
      expect(fn(ctx('something'))).toBe(false);
    });

    it('disabled when model.role is not admin', () => {
      const fn = compileExpression('model.role !== "admin"');
      expect(fn(ctx(null, { role: 'user' }))).toBe(true);
      expect(fn(ctx(null, { role: 'admin' }))).toBe(false);
    });

    it('cross-field validation: age >= 18 AND country ES', () => {
      const fn = compileExpression('value >= 18 && model.country === "ES"');
      expect(fn(ctx(18, { country: 'ES' }))).toBe(true);
      expect(fn(ctx(17, { country: 'ES' }))).toBe(false);
      expect(fn(ctx(18, { country: 'FR' }))).toBe(false);
    });

    it('field required only if another field has a value', () => {
      const fn = compileExpression('model.tipo !== "" ? value !== "" : true');
      expect(fn(ctx('', { tipo: '' }))).toBe(true);
      expect(fn(ctx('', { tipo: 'company' }))).toBe(false);
      expect(fn(ctx('MyCompany', { tipo: 'company' }))).toBe(true);
    });

    it('expression with double negation (!!) for boolean coercion', () => {
      const fn = compileExpression('!!value');
      expect(fn(ctx(0))).toBe(false);
      expect(fn(ctx(1))).toBe(true);
      expect(fn(ctx(''))).toBe(false);
      expect(fn(ctx('hello'))).toBe(true);
    });
  });
});
