import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compileSchema, resolvePath } from '../../src/lib/core/schema-compiler';
import { FieldNode } from '../../src/lib/core/model';
import { createMockApi, makeControlNode, makeGroupNode, makeArrayNode, mockRoot, mockFc } from '../helpers';

// ── resolvePath ───────────────────────────────────────────────────────────

describe('resolvePath', () => {
  it('devuelve el root cuando keys está vacío', () => {
    const root = { a: 1 };
    expect(resolvePath(root, [])).toBe(root);
  });

  it('resuelve un path de un nivel', () => {
    expect(resolvePath({ a: 42 }, ['a'])).toBe(42);
  });

  it('resuelve un path anidado', () => {
    expect(resolvePath({ a: { b: { c: 7 } } }, ['a', 'b', 'c'])).toBe(7);
  });
});

// ── compileSchema ─────────────────────────────────────────────────────────

describe('compileSchema', () => {
  it('devuelve una función', () => {
    expect(typeof compileSchema([], createMockApi() as any)).toBe('function');
  });

  it('no lanza con lista de nodos vacía', () => {
    const api = createMockApi();
    expect(() => compileSchema([], api as any)({})).not.toThrow();
  });

  describe('validadores estándar', () => {
    it('llama api.required para kind "required"', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'name', path: ['name'], validators: [{ kind: 'required' }] })];
      compileSchema(nodes, api as any)(mockRoot(['name']));
      expect(api.required).toHaveBeenCalledWith('path_name', undefined);
    });

    it('pasa el message a required', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'name', path: ['name'], validators: [{ kind: 'required', message: 'Obligatorio' }] })];
      compileSchema(nodes, api as any)(mockRoot(['name']));
      expect(api.required).toHaveBeenCalledWith('path_name', { message: 'Obligatorio' });
    });

    it('llama api.email para kind "email"', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'email', path: ['email'], validators: [{ kind: 'email' }] })];
      compileSchema(nodes, api as any)(mockRoot(['email']));
      expect(api.email).toHaveBeenCalledWith('path_email', undefined);
    });

    it('llama api.min con valor numérico', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'n', path: ['n'], validators: [{ kind: 'min', value: 5 }] })];
      compileSchema(nodes, api as any)(mockRoot(['n']));
      expect(api.min).toHaveBeenCalledWith('path_n', 5, undefined);
    });

    it('llama api.max con valor numérico', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'n', path: ['n'], validators: [{ kind: 'max', value: 100 }] })];
      compileSchema(nodes, api as any)(mockRoot(['n']));
      expect(api.max).toHaveBeenCalledWith('path_n', 100, undefined);
    });

    it('llama api.minLength con valor numérico', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'txt', path: ['txt'], validators: [{ kind: 'minLength', value: 3 }] })];
      compileSchema(nodes, api as any)(mockRoot(['txt']));
      expect(api.minLength).toHaveBeenCalledWith('path_txt', 3, undefined);
    });

    it('llama api.maxLength con valor numérico', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'txt', path: ['txt'], validators: [{ kind: 'maxLength', value: 50 }] })];
      compileSchema(nodes, api as any)(mockRoot(['txt']));
      expect(api.maxLength).toHaveBeenCalledWith('path_txt', 50, undefined);
    });

    it('llama api.pattern con RegExp construida desde string', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'code', path: ['code'], validators: [{ kind: 'pattern', value: '^[A-Z]+$' }] })];
      compileSchema(nodes, api as any)(mockRoot(['code']));
      expect(api.pattern).toHaveBeenCalledWith('path_code', /^[A-Z]+$/, undefined);
    });

    it('llama api.pattern con RegExp si el value ya es RegExp', () => {
      const api = createMockApi();
      const re = /^\d+$/;
      const nodes = [makeControlNode({ key: 'code', path: ['code'], validators: [{ kind: 'pattern', value: re }] })];
      compileSchema(nodes, api as any)(mockRoot(['code']));
      expect(api.pattern).toHaveBeenCalledWith('path_code', re, undefined);
    });

    it('aplica múltiples validadores en orden', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({
        key: 'f', path: ['f'],
        validators: [{ kind: 'required' }, { kind: 'email' }, { kind: 'maxLength', value: 100 }],
      })];
      compileSchema(nodes, api as any)(mockRoot(['f']));
      expect(api.required).toHaveBeenCalledTimes(1);
      expect(api.email).toHaveBeenCalledTimes(1);
      expect(api.maxLength).toHaveBeenCalledTimes(1);
    });
  });

  describe('validador expr', () => {
    it('llama api.validate para kind "expr"', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'f', path: ['f'], validators: [{ kind: 'expr', expr: 'value !== ""' }] })];
      compileSchema(nodes, api as any)(mockRoot(['f']));
      expect(api.validate).toHaveBeenCalled();
    });

    it('el callback devuelve undefined cuando la expresión es truthy', () => {
      const api = createMockApi();
      let captured: ((fc: any) => any) | undefined;
      (api.validate as ReturnType<typeof vi.fn>).mockImplementation((_p: any, cb: any) => { captured = cb; });

      const nodes = [makeControlNode({ key: 'f', path: ['f'], validators: [{ kind: 'expr', expr: 'value !== ""' }] })];
      compileSchema(nodes, api as any)(mockRoot(['f']));

      expect(captured!(mockFc('hola'))).toBeUndefined();
    });

    it('el callback devuelve error cuando la expresión es falsy', () => {
      const api = createMockApi();
      let captured: ((fc: any) => any) | undefined;
      (api.validate as ReturnType<typeof vi.fn>).mockImplementation((_p: any, cb: any) => { captured = cb; });

      const nodes = [makeControlNode({ key: 'f', path: ['f'], validators: [{ kind: 'expr', expr: 'value !== ""', message: 'Requerido' }] })];
      compileSchema(nodes, api as any)(mockRoot(['f']));

      expect(captured!(mockFc(''))).toEqual({ kind: 'expr', message: 'Requerido' });
    });

    it('usa mensaje por defecto cuando no hay message', () => {
      const api = createMockApi();
      let captured: ((fc: any) => any) | undefined;
      (api.validate as ReturnType<typeof vi.fn>).mockImplementation((_p: any, cb: any) => { captured = cb; });

      const nodes = [makeControlNode({ key: 'f', path: ['f'], validators: [{ kind: 'expr', expr: 'value !== ""' }] })];
      compileSchema(nodes, api as any)(mockRoot(['f']));

      const err = captured!(mockFc(''));
      expect(err).toBeDefined();
      expect(err.message).toBeTruthy();
    });
  });

  describe('validador fn', () => {
    it('llama api.validate para kind "fn"', () => {
      const api = createMockApi();
      const mockFn = vi.fn().mockReturnValue(undefined);
      const nodes = [makeControlNode({ key: 'f', path: ['f'], validators: [{ kind: 'fn', fn: 'myVal' }] })];
      compileSchema(nodes, api as any, { validators: { myVal: mockFn } })(mockRoot(['f']));
      expect(api.validate).toHaveBeenCalled();
    });

    it('lanza si el fn no está registrado', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'f', path: ['f'], validators: [{ kind: 'fn', fn: 'noExiste' }] })];
      expect(() => compileSchema(nodes, api as any)(mockRoot(['f']))).toThrow(/no registrado/);
    });
  });

  describe('reglas condicionales', () => {
    it('llama api.hidden para hidden con expr', () => {
      const api = createMockApi();
      const node = makeControlNode({
        key: 'f', path: ['f'],
        config: { key: 'f', type: 'text', hidden: { expr: 'value === ""' } },
      });
      compileSchema([node], api as any)(mockRoot(['f']));
      expect(api.hidden).toHaveBeenCalled();
    });

    it('llama api.disabled para disabled con expr', () => {
      const api = createMockApi();
      const node = makeControlNode({
        key: 'f', path: ['f'],
        config: { key: 'f', type: 'text', disabled: { expr: 'value === true' } },
      });
      compileSchema([node], api as any)(mockRoot(['f']));
      expect(api.disabled).toHaveBeenCalled();
    });

    it('llama api.readonly para readonly con fn', () => {
      const api = createMockApi();
      const mockFn = vi.fn().mockReturnValue(false);
      const node = makeControlNode({
        key: 'f', path: ['f'],
        config: { key: 'f', type: 'text', readonly: { fn: 'isReadonly' } },
      });
      compileSchema([node], api as any, { functions: { isReadonly: mockFn } })(mockRoot(['f']));
      expect(api.readonly).toHaveBeenCalled();
    });

    it('lanza si la función condicional no está registrada', () => {
      const api = createMockApi();
      const node = makeControlNode({
        key: 'f', path: ['f'],
        config: { key: 'f', type: 'text', hidden: { fn: 'missingFn' } },
      });
      expect(() => compileSchema([node], api as any)(mockRoot(['f']))).toThrow(/no registrada/);
    });

    it('no llama api.hidden si no hay regla hidden', () => {
      const api = createMockApi();
      const node = makeControlNode({ key: 'f', path: ['f'] });
      compileSchema([node], api as any)(mockRoot(['f']));
      expect(api.hidden).not.toHaveBeenCalled();
    });
  });

  describe('estructura grupo', () => {
    it('recursa en los hijos del grupo', () => {
      const api = createMockApi();
      const child = makeControlNode({
        key: 'street',
        path: ['addr', 'street'],
        validators: [{ kind: 'required' }],
      });
      const group = makeGroupNode('addr', [child]);
      const root = { addr: mockRoot(['street']) };
      compileSchema([group], api as any)(root);
      expect(api.required).toHaveBeenCalled();
    });
  });

  describe('estructura array', () => {
    it('llama api.applyEach para nodos array', () => {
      const api = createMockApi();
      const item = makeControlNode({ key: 'val', path: ['val'] });
      const node = makeArrayNode('tags', item);
      compileSchema([node], api as any)(mockRoot(['tags']));
      expect(api.applyEach).toHaveBeenCalled();
    });
  });

  describe('async validators', () => {
    it('llama api.validateAsync con la definición registrada', () => {
      const api = createMockApi();
      const mockDef = { params: vi.fn(), factory: vi.fn(), onSuccess: vi.fn(), onError: vi.fn() };
      const nodes = [makeControlNode({ key: 'f', path: ['f'], asyncValidators: [{ kind: 'uniqueEmail' }] })];
      compileSchema(nodes, api as any, { asyncValidators: { uniqueEmail: mockDef as any } })(mockRoot(['f']));
      expect(api.validateAsync).toHaveBeenCalled();
    });

    it('llama api.debounce cuando asyncValidator tiene debounce', () => {
      const api = createMockApi();
      const mockDef = { params: vi.fn(), factory: vi.fn(), onSuccess: vi.fn(), onError: vi.fn() };
      const nodes = [makeControlNode({ key: 'f', path: ['f'], asyncValidators: [{ kind: 'uniqueEmail', debounce: 300 }] })];
      compileSchema(nodes, api as any, { asyncValidators: { uniqueEmail: mockDef as any } })(mockRoot(['f']));
      expect(api.debounce).toHaveBeenCalledWith('path_f', 300);
    });

    it('lanza si el validador async no está registrado', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'f', path: ['f'], asyncValidators: [{ kind: 'noExiste' }] })];
      expect(() => compileSchema(nodes, api as any)(mockRoot(['f']))).toThrow(/no registrado/);
    });
  });
});
