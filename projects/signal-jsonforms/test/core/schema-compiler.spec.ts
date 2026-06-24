import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compileSchema, resolvePath } from '../../src/lib/core/schema-compiler';
import { FieldNode } from '../../src/lib/core/model';
import { createMockApi, makeControlNode, makeGroupNode, makeArrayNode, mockRoot, mockFc } from '../helpers';

// ── resolvePath ───────────────────────────────────────────────────────────

describe('resolvePath', () => {
  it('returns root when keys is empty', () => {
    const root = { a: 1 };
    expect(resolvePath(root, [])).toBe(root);
  });

  it('resolves a single-level path', () => {
    expect(resolvePath({ a: 42 }, ['a'])).toBe(42);
  });

  it('resolves a nested path', () => {
    expect(resolvePath({ a: { b: { c: 7 } } }, ['a', 'b', 'c'])).toBe(7);
  });
});

// ── compileSchema ─────────────────────────────────────────────────────────

describe('compileSchema', () => {
  it('returns a function', () => {
    expect(typeof compileSchema([], createMockApi() as any)).toBe('function');
  });

  it('does not throw with empty node list', () => {
    const api = createMockApi();
    expect(() => compileSchema([], api as any)({})).not.toThrow();
  });

  describe('standard validators', () => {
    it('calls api.required for kind "required"', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'name', path: ['name'], validators: [{ kind: 'required' }] })];
      compileSchema(nodes, api as any)(mockRoot(['name']));
      expect(api.required).toHaveBeenCalledWith('path_name', undefined);
    });

    it('passes the message to required', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'name', path: ['name'], validators: [{ kind: 'required', message: 'Required' }] })];
      compileSchema(nodes, api as any)(mockRoot(['name']));
      expect(api.required).toHaveBeenCalledWith('path_name', { message: 'Required' });
    });

    it('calls api.email for kind "email"', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'email', path: ['email'], validators: [{ kind: 'email' }] })];
      compileSchema(nodes, api as any)(mockRoot(['email']));
      expect(api.email).toHaveBeenCalledWith('path_email', undefined);
    });

    it('calls api.min with numeric value', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'n', path: ['n'], validators: [{ kind: 'min', value: 5 }] })];
      compileSchema(nodes, api as any)(mockRoot(['n']));
      expect(api.min).toHaveBeenCalledWith('path_n', 5, undefined);
    });

    it('calls api.max with numeric value', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'n', path: ['n'], validators: [{ kind: 'max', value: 100 }] })];
      compileSchema(nodes, api as any)(mockRoot(['n']));
      expect(api.max).toHaveBeenCalledWith('path_n', 100, undefined);
    });

    it('calls api.minLength with numeric value', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'txt', path: ['txt'], validators: [{ kind: 'minLength', value: 3 }] })];
      compileSchema(nodes, api as any)(mockRoot(['txt']));
      expect(api.minLength).toHaveBeenCalledWith('path_txt', 3, undefined);
    });

    it('calls api.maxLength with numeric value', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'txt', path: ['txt'], validators: [{ kind: 'maxLength', value: 50 }] })];
      compileSchema(nodes, api as any)(mockRoot(['txt']));
      expect(api.maxLength).toHaveBeenCalledWith('path_txt', 50, undefined);
    });

    it('calls api.pattern with RegExp built from string', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'code', path: ['code'], validators: [{ kind: 'pattern', value: '^[A-Z]+$' }] })];
      compileSchema(nodes, api as any)(mockRoot(['code']));
      expect(api.pattern).toHaveBeenCalledWith('path_code', /^[A-Z]+$/, undefined);
    });

    it('calls api.pattern with RegExp if value is already a RegExp', () => {
      const api = createMockApi();
      const re = /^\d+$/;
      const nodes = [makeControlNode({ key: 'code', path: ['code'], validators: [{ kind: 'pattern', value: re }] })];
      compileSchema(nodes, api as any)(mockRoot(['code']));
      expect(api.pattern).toHaveBeenCalledWith('path_code', re, undefined);
    });

    it('applies multiple validators in order', () => {
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

  describe('expr validator', () => {
    it('calls api.validate for kind "expr"', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'f', path: ['f'], validators: [{ kind: 'expr', expr: 'value !== ""' }] })];
      compileSchema(nodes, api as any)(mockRoot(['f']));
      expect(api.validate).toHaveBeenCalled();
    });

    it('callback returns undefined when expression is truthy', () => {
      const api = createMockApi();
      let captured: ((fc: any) => any) | undefined;
      (api.validate as ReturnType<typeof vi.fn>).mockImplementation((_p: any, cb: any) => { captured = cb; });

      const nodes = [makeControlNode({ key: 'f', path: ['f'], validators: [{ kind: 'expr', expr: 'value !== ""' }] })];
      compileSchema(nodes, api as any)(mockRoot(['f']));

      expect(captured!(mockFc('hello'))).toBeUndefined();
    });

    it('callback returns error when expression is falsy', () => {
      const api = createMockApi();
      let captured: ((fc: any) => any) | undefined;
      (api.validate as ReturnType<typeof vi.fn>).mockImplementation((_p: any, cb: any) => { captured = cb; });

      const nodes = [makeControlNode({ key: 'f', path: ['f'], validators: [{ kind: 'expr', expr: 'value !== ""', message: 'Required' }] })];
      compileSchema(nodes, api as any)(mockRoot(['f']));

      expect(captured!(mockFc(''))).toEqual({ kind: 'expr', message: 'Required' });
    });

    it('uses default message when no message is provided', () => {
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

  describe('fn validator', () => {
    it('calls api.validate for kind "fn"', () => {
      const api = createMockApi();
      const mockFn = vi.fn().mockReturnValue(undefined);
      const nodes = [makeControlNode({ key: 'f', path: ['f'], validators: [{ kind: 'fn', fn: 'myVal' }] })];
      compileSchema(nodes, api as any, { validators: { myVal: mockFn } })(mockRoot(['f']));
      expect(api.validate).toHaveBeenCalled();
    });

    it('throws if the fn is not registered', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'f', path: ['f'], validators: [{ kind: 'fn', fn: 'notExists' }] })];
      expect(() => compileSchema(nodes, api as any)(mockRoot(['f']))).toThrow(/not registered/);
    });
  });

  describe('conditional rules', () => {
    it('calls api.hidden for hidden with expr', () => {
      const api = createMockApi();
      const node = makeControlNode({
        key: 'f', path: ['f'],
        config: { key: 'f', type: 'text', hidden: { expr: 'value === ""' } },
      });
      compileSchema([node], api as any)(mockRoot(['f']));
      expect(api.hidden).toHaveBeenCalled();
    });

    it('calls api.disabled for disabled with expr', () => {
      const api = createMockApi();
      const node = makeControlNode({
        key: 'f', path: ['f'],
        config: { key: 'f', type: 'text', disabled: { expr: 'value === true' } },
      });
      compileSchema([node], api as any)(mockRoot(['f']));
      expect(api.disabled).toHaveBeenCalled();
    });

    it('calls api.readonly for readonly with fn', () => {
      const api = createMockApi();
      const mockFn = vi.fn().mockReturnValue(false);
      const node = makeControlNode({
        key: 'f', path: ['f'],
        config: { key: 'f', type: 'text', readonly: { fn: 'isReadonly' } },
      });
      compileSchema([node], api as any, { functions: { isReadonly: mockFn } })(mockRoot(['f']));
      expect(api.readonly).toHaveBeenCalled();
    });

    it('throws if the conditional function is not registered', () => {
      const api = createMockApi();
      const node = makeControlNode({
        key: 'f', path: ['f'],
        config: { key: 'f', type: 'text', hidden: { fn: 'missingFn' } },
      });
      expect(() => compileSchema([node], api as any)(mockRoot(['f']))).toThrow(/not registered/);
    });

    it('does not call api.hidden if there is no hidden rule', () => {
      const api = createMockApi();
      const node = makeControlNode({ key: 'f', path: ['f'] });
      compileSchema([node], api as any)(mockRoot(['f']));
      expect(api.hidden).not.toHaveBeenCalled();
    });
  });

  describe('group structure', () => {
    it('recurses into group children', () => {
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

  describe('array structure', () => {
    it('calls api.applyEach for array nodes', () => {
      const api = createMockApi();
      const item = makeControlNode({ key: 'val', path: ['val'] });
      const node = makeArrayNode('tags', item);
      compileSchema([node], api as any)(mockRoot(['tags']));
      expect(api.applyEach).toHaveBeenCalled();
    });
  });

  describe('async validators', () => {
    it('calls api.validateAsync with the registered definition', () => {
      const api = createMockApi();
      const mockDef = { params: vi.fn(), factory: vi.fn(), onSuccess: vi.fn(), onError: vi.fn() };
      const nodes = [makeControlNode({ key: 'f', path: ['f'], asyncValidators: [{ kind: 'uniqueEmail' }] })];
      compileSchema(nodes, api as any, { asyncValidators: { uniqueEmail: mockDef as any } })(mockRoot(['f']));
      expect(api.validateAsync).toHaveBeenCalled();
    });

    it('calls api.debounce when asyncValidator has debounce', () => {
      const api = createMockApi();
      const mockDef = { params: vi.fn(), factory: vi.fn(), onSuccess: vi.fn(), onError: vi.fn() };
      const nodes = [makeControlNode({ key: 'f', path: ['f'], asyncValidators: [{ kind: 'uniqueEmail', debounce: 300 }] })];
      compileSchema(nodes, api as any, { asyncValidators: { uniqueEmail: mockDef as any } })(mockRoot(['f']));
      expect(api.debounce).toHaveBeenCalledWith('path_f', 300);
    });

    it('throws if the async validator is not registered', () => {
      const api = createMockApi();
      const nodes = [makeControlNode({ key: 'f', path: ['f'], asyncValidators: [{ kind: 'notExists' }] })];
      expect(() => compileSchema(nodes, api as any)(mockRoot(['f']))).toThrow(/not registered/);
    });
  });
});
