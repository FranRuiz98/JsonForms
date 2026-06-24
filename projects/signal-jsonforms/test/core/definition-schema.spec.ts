import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/lib/core/definition-schema';

// ── validateConfig ─────────────────────────────────────────────────────────

describe('validateConfig', () => {
  describe('valid configs', () => {
    it('accepts a minimal field (key + type)', () => {
      expect(() => validateConfig({ fields: [{ key: 'name', type: 'text' }] })).not.toThrow();
    });

    it('returns the parsed config', () => {
      const result = validateConfig({ fields: [{ key: 'name', type: 'text' }] });
      expect(result.fields[0].key).toBe('name');
    });

    it('accepts optional version and id', () => {
      expect(() =>
        validateConfig({ version: '1.0', id: 'myForm', fields: [{ key: 'x', type: 'text' }] }),
      ).not.toThrow();
    });

    it('accepts optional label, props, and defaultValue', () => {
      expect(() =>
        validateConfig({
          fields: [{
            key: 'x', type: 'text',
            label: 'My field',
            props: { placeholder: 'Type here' },
            defaultValue: 'default',
          }],
        }),
      ).not.toThrow();
    });

    it('accepts optional wrapper', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', wrapper: 'myWrapper' }] }),
      ).not.toThrow();
    });

    it('accepts standard validators', () => {
      expect(() =>
        validateConfig({
          fields: [{
            key: 'email', type: 'text',
            validators: [
              { kind: 'required' },
              { kind: 'email', message: 'Invalid email' },
              { kind: 'minLength', value: 3 },
              { kind: 'maxLength', value: 100 },
              { kind: 'min', value: 0 },
              { kind: 'max', value: 999 },
              { kind: 'pattern', value: '^[a-z]+$' },
            ],
          }],
        }),
      ).not.toThrow();
    });

    it('accepts expr validator with expr present', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', validators: [{ kind: 'expr', expr: 'value !== ""' }] }] }),
      ).not.toThrow();
    });

    it('accepts fn validator with fn present', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', validators: [{ kind: 'fn', fn: 'myValidator' }] }] }),
      ).not.toThrow();
    });

    it('accepts asyncValidators', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'user', type: 'text', asyncValidators: [{ kind: 'uniqueEmail', debounce: 300 }] }] }),
      ).not.toThrow();
    });

    it('accepts hidden with expr', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', hidden: { expr: 'value === ""' } }] }),
      ).not.toThrow();
    });

    it('accepts disabled with fn', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', disabled: { fn: 'isDisabled' } }] }),
      ).not.toThrow();
    });

    it('accepts readonly with expr', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', readonly: { fn: 'isReadonly' } }] }),
      ).not.toThrow();
    });

    it('accepts group with fields', () => {
      expect(() =>
        validateConfig({
          fields: [{
            key: 'addr', type: 'group',
            fields: [{ key: 'street', type: 'text' }],
          }],
        }),
      ).not.toThrow();
    });

    it('accepts array with item', () => {
      expect(() =>
        validateConfig({
          fields: [{
            key: 'tags', type: 'array',
            item: { key: 'value', type: 'text' },
          }],
        }),
      ).not.toThrow();
    });

    it('accepts multiple fields', () => {
      expect(() =>
        validateConfig({
          fields: [
            { key: 'first', type: 'text' },
            { key: 'last', type: 'text' },
            { key: 'age', type: 'number' },
          ],
        }),
      ).not.toThrow();
    });
  });

  describe('errors for invalid config', () => {
    it('throws if fields is empty', () => {
      expect(() => validateConfig({ fields: [] })).toThrow();
    });

    it('throws if fields is missing', () => {
      expect(() => validateConfig({})).toThrow();
    });

    it('throws if key is empty', () => {
      expect(() => validateConfig({ fields: [{ key: '', type: 'text' }] })).toThrow();
    });

    it('throws if type is empty', () => {
      expect(() => validateConfig({ fields: [{ key: 'x', type: '' }] })).toThrow();
    });

    it('throws if type is missing', () => {
      expect(() => validateConfig({ fields: [{ key: 'x' }] })).toThrow();
    });

    it('throws if key is missing', () => {
      expect(() => validateConfig({ fields: [{ type: 'text' }] })).toThrow();
    });

    it('throws if array has no item', () => {
      expect(() => validateConfig({ fields: [{ key: 'tags', type: 'array' }] })).toThrow(/item/);
    });

    it('throws if group has no fields', () => {
      expect(() => validateConfig({ fields: [{ key: 'addr', type: 'group' }] })).toThrow(/fields/);
    });

    it('throws if expr validator has no expr', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', validators: [{ kind: 'expr' }] }] }),
      ).toThrow(/expr/);
    });

    it('throws if fn validator has no fn', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', validators: [{ kind: 'fn' }] }] }),
      ).toThrow(/fn/);
    });

    it('produces a readable error message with prefix', () => {
      try {
        validateConfig({ fields: [] });
        expect.fail('should have thrown');
      } catch (err: unknown) {
        expect((err as Error).message).toContain('Invalid form definition');
      }
    });

    it('lists all errors in the message', () => {
      try {
        validateConfig({ fields: [{ key: '', type: '' }] });
        expect.fail('should have thrown');
      } catch (err: unknown) {
        const msg = (err as Error).message;
        expect(msg).toContain('  - ');
      }
    });
  });
});
