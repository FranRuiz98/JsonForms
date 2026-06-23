import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/lib/core/definition-schema';

// ── validateConfig ─────────────────────────────────────────────────────────

describe('validateConfig', () => {
  describe('configs válidas', () => {
    it('acepta un campo mínimo (key + type)', () => {
      expect(() => validateConfig({ fields: [{ key: 'name', type: 'text' }] })).not.toThrow();
    });

    it('devuelve la config parseada', () => {
      const result = validateConfig({ fields: [{ key: 'name', type: 'text' }] });
      expect(result.fields[0].key).toBe('name');
    });

    it('acepta version e id opcionales', () => {
      expect(() =>
        validateConfig({ version: '1.0', id: 'myForm', fields: [{ key: 'x', type: 'text' }] }),
      ).not.toThrow();
    });

    it('acepta label, props y defaultValue opcionales', () => {
      expect(() =>
        validateConfig({
          fields: [{
            key: 'x', type: 'text',
            label: 'Mi campo',
            props: { placeholder: 'Escribe aquí' },
            defaultValue: 'default',
          }],
        }),
      ).not.toThrow();
    });

    it('acepta wrapper opcional', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', wrapper: 'myWrapper' }] }),
      ).not.toThrow();
    });

    it('acepta validators estándar', () => {
      expect(() =>
        validateConfig({
          fields: [{
            key: 'email', type: 'text',
            validators: [
              { kind: 'required' },
              { kind: 'email', message: 'Correo inválido' },
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

    it('acepta validador expr con expr presente', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', validators: [{ kind: 'expr', expr: 'value !== ""' }] }] }),
      ).not.toThrow();
    });

    it('acepta validador fn con fn presente', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', validators: [{ kind: 'fn', fn: 'myValidator' }] }] }),
      ).not.toThrow();
    });

    it('acepta asyncValidators', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'user', type: 'text', asyncValidators: [{ kind: 'uniqueEmail', debounce: 300 }] }] }),
      ).not.toThrow();
    });

    it('acepta hidden con expr', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', hidden: { expr: 'value === ""' } }] }),
      ).not.toThrow();
    });

    it('acepta disabled con fn', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', disabled: { fn: 'isDisabled' } }] }),
      ).not.toThrow();
    });

    it('acepta readonly con expr', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', readonly: { fn: 'isReadonly' } }] }),
      ).not.toThrow();
    });

    it('acepta grupo con fields', () => {
      expect(() =>
        validateConfig({
          fields: [{
            key: 'addr', type: 'group',
            fields: [{ key: 'street', type: 'text' }],
          }],
        }),
      ).not.toThrow();
    });

    it('acepta array con item', () => {
      expect(() =>
        validateConfig({
          fields: [{
            key: 'tags', type: 'array',
            item: { key: 'value', type: 'text' },
          }],
        }),
      ).not.toThrow();
    });

    it('acepta múltiples campos', () => {
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

  describe('errores por config inválida', () => {
    it('lanza si fields está vacío', () => {
      expect(() => validateConfig({ fields: [] })).toThrow();
    });

    it('lanza si fields falta', () => {
      expect(() => validateConfig({})).toThrow();
    });

    it('lanza si key está vacío', () => {
      expect(() => validateConfig({ fields: [{ key: '', type: 'text' }] })).toThrow();
    });

    it('lanza si type está vacío', () => {
      expect(() => validateConfig({ fields: [{ key: 'x', type: '' }] })).toThrow();
    });

    it('lanza si type falta', () => {
      expect(() => validateConfig({ fields: [{ key: 'x' }] })).toThrow();
    });

    it('lanza si key falta', () => {
      expect(() => validateConfig({ fields: [{ type: 'text' }] })).toThrow();
    });

    it('lanza si array no tiene item', () => {
      expect(() => validateConfig({ fields: [{ key: 'tags', type: 'array' }] })).toThrow(/item/);
    });

    it('lanza si group no tiene fields', () => {
      expect(() => validateConfig({ fields: [{ key: 'addr', type: 'group' }] })).toThrow(/fields/);
    });

    it('lanza si validador expr no tiene expr', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', validators: [{ kind: 'expr' }] }] }),
      ).toThrow(/expr/);
    });

    it('lanza si validador fn no tiene fn', () => {
      expect(() =>
        validateConfig({ fields: [{ key: 'x', type: 'text', validators: [{ kind: 'fn' }] }] }),
      ).toThrow(/fn/);
    });

    it('produce un mensaje de error legible con prefijo', () => {
      try {
        validateConfig({ fields: [] });
        expect.fail('debería haber lanzado');
      } catch (err: unknown) {
        expect((err as Error).message).toContain('Definición de formulario inválida');
      }
    });

    it('enumera todos los errores en el mensaje', () => {
      try {
        validateConfig({ fields: [{ key: '', type: '' }] });
        expect.fail('debería haber lanzado');
      } catch (err: unknown) {
        const msg = (err as Error).message;
        expect(msg).toContain('  - ');
      }
    });
  });
});
