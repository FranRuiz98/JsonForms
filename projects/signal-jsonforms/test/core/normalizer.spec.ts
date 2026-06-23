import { describe, it, expect } from 'vitest';
import { normalizeConfig } from '../../src/lib/core/normalizer';
import { FormConfig } from '../../src/lib/core/model';

const SKIP_VALIDATION = { validate: false };

const text = (key: string, extra: object = {}) => ({ key, type: 'text', ...extra });

// ── normalizeConfig ───────────────────────────────────────────────────────

describe('normalizeConfig', () => {
  describe('controls simples', () => {
    it('produce un nodo de kind control', () => {
      const { nodes } = normalizeConfig({ fields: [text('name')] }, SKIP_VALIDATION);
      expect(nodes[0].kind).toBe('control');
    });

    it('asigna path absoluto desde la raíz', () => {
      const { nodes } = normalizeConfig({ fields: [text('name')] }, SKIP_VALIDATION);
      expect(nodes[0].path).toEqual(['name']);
    });

    it('infiere dataType string por defecto', () => {
      const { nodes } = normalizeConfig({ fields: [text('name')] }, SKIP_VALIDATION);
      expect(nodes[0].dataType).toBe('string');
    });

    it('infiere dataType number para type "number"', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'age', type: 'number' }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].dataType).toBe('number');
    });

    it('infiere dataType boolean para type "checkbox"', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'active', type: 'checkbox' }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].dataType).toBe('boolean');
    });

    it('respeta el dataType explícito del campo', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'score', type: 'text', dataType: 'number' }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].dataType).toBe('number');
    });

    it('conserva defaultValue en el nodo', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'x', type: 'text', defaultValue: 'hola' }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].defaultValue).toBe('hola');
    });

    it('inicializa validators y asyncValidators vacíos si no se declaran', () => {
      const { nodes } = normalizeConfig({ fields: [text('x')] }, SKIP_VALIDATION);
      expect(nodes[0].validators).toEqual([]);
      expect(nodes[0].asyncValidators).toEqual([]);
    });

    it('transfiere los validators declarados', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'email', type: 'text', validators: [{ kind: 'required' }, { kind: 'email' }] }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].validators).toHaveLength(2);
      expect(nodes[0].validators[0].kind).toBe('required');
    });

    it('transfiere los asyncValidators declarados', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'user', type: 'text', asyncValidators: [{ kind: 'uniqueEmail' }] }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].asyncValidators[0].kind).toBe('uniqueEmail');
    });
  });

  describe('grupos', () => {
    it('produce un nodo de kind group', () => {
      const config: FormConfig = {
        fields: [{ key: 'addr', type: 'group', fields: [text('street')] }],
      };
      const { nodes } = normalizeConfig(config, SKIP_VALIDATION);
      expect(nodes[0].kind).toBe('group');
    });

    it('asigna dataType object al grupo', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'addr', type: 'group', fields: [text('street')] }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].dataType).toBe('object');
    });

    it('los hijos tienen paths absolutos que incluyen el padre', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'addr', type: 'group', fields: [text('street'), text('city')] }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].children[0].path).toEqual(['addr', 'street']);
      expect(nodes[0].children[1].path).toEqual(['addr', 'city']);
    });

    it('normaliza grupos anidados recursivamente', () => {
      const config: FormConfig = {
        fields: [{
          key: 'outer', type: 'group',
          fields: [{ key: 'inner', type: 'group', fields: [text('leaf')] }],
        }],
      };
      const { nodes } = normalizeConfig(config, SKIP_VALIDATION);
      expect(nodes[0].children[0].children[0].path).toEqual(['outer', 'inner', 'leaf']);
    });

    it('detecta grupo por presencia de "fields" aunque type no sea "group"', () => {
      const config = { fields: [{ key: 'g', type: 'custom', fields: [text('x')] }] };
      const { nodes } = normalizeConfig(config as any, SKIP_VALIDATION);
      expect(nodes[0].kind).toBe('group');
    });
  });

  describe('arrays', () => {
    it('produce un nodo de kind array', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'tags', type: 'array', item: text('value') }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].kind).toBe('array');
    });

    it('asigna dataType array al nodo', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'tags', type: 'array', item: text('value') }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].dataType).toBe('array');
    });

    it('guarda la plantilla de item con path vacío', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'tags', type: 'array', item: { key: 'label', type: 'text' } }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].item).toBeDefined();
      expect(nodes[0].item?.key).toBe('label');
      expect(nodes[0].item?.path).toEqual(['label']);
    });

    it('aplica defaultValue al array', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'list', type: 'array', item: text('v'), defaultValue: [1, 2] }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].defaultValue).toEqual([1, 2]);
    });

    it('lanza si el array no tiene item (sin validación zod)', () => {
      const badConfig = { fields: [{ key: 'tags', type: 'array' }] } as any;
      expect(() => normalizeConfig(badConfig, SKIP_VALIDATION)).toThrow(/item/);
    });

    it('detecta array por presencia de "item" aunque type no sea "array"', () => {
      const config = { fields: [{ key: 'arr', type: 'custom', item: text('x') }] };
      const { nodes } = normalizeConfig(config as any, SKIP_VALIDATION);
      expect(nodes[0].kind).toBe('array');
    });
  });

  describe('FormDefinition devuelta', () => {
    it('incluye la config original', () => {
      const config: FormConfig = { id: 'mi-form', fields: [text('x')] };
      const { config: out } = normalizeConfig(config, SKIP_VALIDATION);
      expect(out.id).toBe('mi-form');
    });

    it('incluye todos los nodos del nivel raíz', () => {
      const config: FormConfig = { fields: [text('a'), text('b'), text('c')] };
      const { nodes } = normalizeConfig(config, SKIP_VALIDATION);
      expect(nodes).toHaveLength(3);
    });
  });

  describe('integración con validación zod (validate: true por defecto)', () => {
    it('acepta una config válida', () => {
      const config: FormConfig = { fields: [text('name')] };
      expect(() => normalizeConfig(config)).not.toThrow();
    });

    it('lanza para config inválida (key vacío)', () => {
      const bad = { fields: [{ key: '', type: 'text' }] };
      expect(() => normalizeConfig(bad as any)).toThrow();
    });
  });
});
