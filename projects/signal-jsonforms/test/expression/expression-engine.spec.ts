import { describe, it, expect } from 'vitest';
import { compileExpression, ExprContext } from '../../src/lib/expression/expression-engine';

const ctx = (value: unknown, model: unknown = {}): ExprContext => ({ value, model });
const run = (expr: string, value: unknown, model: unknown = {}) =>
  compileExpression(expr)(ctx(value, model));

// ── compileExpression ─────────────────────────────────────────────────────

describe('compileExpression', () => {
  describe('literales', () => {
    it('evalúa número entero', () => {
      expect(run('42', null)).toBe(42);
    });

    it('evalúa número decimal', () => {
      expect(run('3.14', null)).toBeCloseTo(3.14);
    });

    it('evalúa string con comillas dobles', () => {
      expect(run('"hola"', null)).toBe('hola');
    });

    it('evalúa string con comillas simples', () => {
      expect(run("'mundo'", null)).toBe('mundo');
    });

    it('evalúa true como boolean', () => {
      expect(run('true', null)).toBe(true);
    });

    it('evalúa false como boolean', () => {
      expect(run('false', null)).toBe(false);
    });

    it('evalúa null', () => {
      expect(run('null', null)).toBeNull();
    });

    it('evalúa undefined', () => {
      expect(run('undefined', null)).toBeUndefined();
    });
  });

  describe('identificadores permitidos', () => {
    it('devuelve el valor del contexto con "value"', () => {
      expect(run('value', 'test')).toBe('test');
    });

    it('devuelve el modelo con "model"', () => {
      const model = { x: 1 };
      expect(compileExpression('model')(ctx(null, model))).toBe(model);
    });

    it('lanza para identificador no permitido (window)', () => {
      expect(() => run('window', null)).toThrow(/no permitido/);
    });

    it('lanza para identificador no permitido (eval)', () => {
      expect(() => run('eval', null)).toThrow(/no permitido/);
    });

    it('lanza para identificador no permitido (document)', () => {
      expect(() => run('document', null)).toThrow(/no permitido/);
    });

    it('lanza para identificador no permitido (process)', () => {
      expect(() => run('process', null)).toThrow(/no permitido/);
    });
  });

  describe('MemberExpression (acceso a propiedades)', () => {
    it('lee model.campo', () => {
      expect(run('model.name', null, { name: 'Alice' })).toBe('Alice');
    });

    it('lee model.a.b anidado', () => {
      expect(run('model.address.city', null, { address: { city: 'Madrid' } })).toBe('Madrid');
    });

    it('devuelve undefined para acceso en null', () => {
      expect(run('model.x.y', null, { x: null })).toBeUndefined();
    });

    it('devuelve undefined cuando el campo no existe', () => {
      expect(run('model.missing', null, {})).toBeUndefined();
    });

    it('soporta acceso con corchetes (computed)', () => {
      expect(run('model["name"]', null, { name: 'Bob' })).toBe('Bob');
    });
  });

  describe('operadores unarios', () => {
    it('! niega un boolean', () => {
      expect(run('!value', true)).toBe(false);
      expect(run('!value', false)).toBe(true);
    });

    it('! en valor falsy', () => {
      expect(run('!value', 0)).toBe(true);
      expect(run('!value', '')).toBe(true);
    });

    it('- negación numérica', () => {
      expect(run('-value', 5)).toBe(-5);
    });

    it('+ coerción a número', () => {
      expect(run('+value', '7')).toBe(7);
    });

    it('lanza para operador unario no soportado', () => {
      expect(() => run('~value', 5)).toThrow(/operador unario no soportado/);
    });
  });

  describe('operadores binarios - comparación', () => {
    it('=== igualdad estricta (true)', () => {
      expect(run('value === "admin"', 'admin')).toBe(true);
    });

    it('=== igualdad estricta (false)', () => {
      expect(run('value === "admin"', 'user')).toBe(false);
    });

    it('!== desigualdad estricta', () => {
      expect(run('value !== "admin"', 'user')).toBe(true);
    });

    it('== igualdad débil (number/string)', () => {
      expect(run('value == 1', '1')).toBe(true);
    });

    it('!= desigualdad débil', () => {
      expect(run('value != 0', '')).toBe(false); // '' == 0 es true
    });

    it('< menor que', () => {
      expect(run('value < 10', 5)).toBe(true);
      expect(run('value < 10', 15)).toBe(false);
    });

    it('> mayor que', () => {
      expect(run('value > 5', 10)).toBe(true);
      expect(run('value > 5', 3)).toBe(false);
    });

    it('<= menor o igual', () => {
      expect(run('value <= 10', 10)).toBe(true);
      expect(run('value <= 10', 11)).toBe(false);
    });

    it('>= mayor o igual', () => {
      expect(run('value >= 5', 5)).toBe(true);
      expect(run('value >= 5', 4)).toBe(false);
    });

    it('lanza para operador no soportado', () => {
      expect(() => run('value ** 2', 3)).toThrow(/operador no soportado/);
    });
  });

  describe('operadores binarios - aritmética', () => {
    it('suma +', () => {
      expect(run('value + 3', 7)).toBe(10);
    });

    it('resta -', () => {
      expect(run('value - 3', 7)).toBe(4);
    });

    it('multiplicación *', () => {
      expect(run('value * 2', 5)).toBe(10);
    });

    it('división /', () => {
      expect(run('value / 2', 10)).toBe(5);
    });

    it('módulo %', () => {
      expect(run('value % 3', 7)).toBe(1);
    });

    it('concatenación de strings con +', () => {
      expect(run('value + " mundo"', 'hola')).toBe('hola mundo');
    });
  });

  describe('operadores lógicos', () => {
    it('&& true && true = true', () => {
      expect(run('value && true', true)).toBe(true);
    });

    it('&& false && true = false', () => {
      expect(run('value && true', false)).toBe(false);
    });

    it('&& short-circuit devuelve el lado izquierdo si falsy', () => {
      expect(run('value && "texto"', 0)).toBe(0);
    });

    it('|| false || true = true', () => {
      expect(run('value || true', false)).toBe(true);
    });

    it('|| true || false = true (short-circuit)', () => {
      expect(run('value || false', true)).toBe(true);
    });

    it('|| devuelve el lado derecho si el izquierdo es falsy', () => {
      expect(run('value || "default"', '')).toBe('default');
    });
  });

  describe('expresión condicional (ternaria)', () => {
    it('devuelve el consecuente si la condición es truthy', () => {
      expect(run('value ? "sí" : "no"', true)).toBe('sí');
    });

    it('devuelve el alternativo si la condición es falsy', () => {
      expect(run('value ? "sí" : "no"', false)).toBe('no');
    });

    it('condición basada en comparación', () => {
      expect(run('value > 18 ? "adulto" : "menor"', 25)).toBe('adulto');
      expect(run('value > 18 ? "adulto" : "menor"', 15)).toBe('menor');
    });
  });

  describe('expresiones de array', () => {
    it('crea array de literales', () => {
      expect(run('[1, 2, 3]', null)).toEqual([1, 2, 3]);
    });

    it('incluye valores dinámicos', () => {
      expect(run('[value, 0]', 5)).toEqual([5, 0]);
    });

    it('array vacío', () => {
      expect(run('[]', null)).toEqual([]);
    });
  });

  describe('expresiones compuestas (inválidas)', () => {
    it('lanza para expresiones con punto y coma', () => {
      expect(() => run('1; 2', null)).toThrow(/única/);
    });
  });

  describe('casos de uso reales del DSL', () => {
    it('hidden cuando value es string vacío', () => {
      const fn = compileExpression('value === ""');
      expect(fn(ctx(''))).toBe(true);
      expect(fn(ctx('algo'))).toBe(false);
    });

    it('disabled cuando model.role no es admin', () => {
      const fn = compileExpression('model.role !== "admin"');
      expect(fn(ctx(null, { role: 'user' }))).toBe(true);
      expect(fn(ctx(null, { role: 'admin' }))).toBe(false);
    });

    it('validación cross-field: edad >= 18 Y país ES', () => {
      const fn = compileExpression('value >= 18 && model.country === "ES"');
      expect(fn(ctx(18, { country: 'ES' }))).toBe(true);
      expect(fn(ctx(17, { country: 'ES' }))).toBe(false);
      expect(fn(ctx(18, { country: 'FR' }))).toBe(false);
    });

    it('campo requerido solo si otro campo tiene valor', () => {
      const fn = compileExpression('model.tipo !== "" ? value !== "" : true');
      expect(fn(ctx('', { tipo: '' }))).toBe(true);
      expect(fn(ctx('', { tipo: 'empresa' }))).toBe(false);
      expect(fn(ctx('MiEmpresa', { tipo: 'empresa' }))).toBe(true);
    });

    it('expresión con negación doble (!!) para coerción booleana', () => {
      const fn = compileExpression('!!value');
      expect(fn(ctx(0))).toBe(false);
      expect(fn(ctx(1))).toBe(true);
      expect(fn(ctx(''))).toBe(false);
      expect(fn(ctx('hola'))).toBe(true);
    });
  });
});
