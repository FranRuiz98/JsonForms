import { describe, it, expect } from 'vitest';
import { normalizeConfig } from '../../src/lib/core/normalizer';
import { FormConfig } from '../../src/lib/core/model';

const SKIP_VALIDATION = { validate: false };

const text = (key: string, extra: object = {}) => ({ key, type: 'text', ...extra });

// ── normalizeConfig ───────────────────────────────────────────────────────

describe('normalizeConfig', () => {
  describe('simple controls', () => {
    it('produces a node of kind control', () => {
      const { nodes } = normalizeConfig({ fields: [text('name')] }, SKIP_VALIDATION);
      expect(nodes[0].kind).toBe('control');
    });

    it('assigns absolute path from root', () => {
      const { nodes } = normalizeConfig({ fields: [text('name')] }, SKIP_VALIDATION);
      expect(nodes[0].path).toEqual(['name']);
    });

    it('infers string dataType by default', () => {
      const { nodes } = normalizeConfig({ fields: [text('name')] }, SKIP_VALIDATION);
      expect(nodes[0].dataType).toBe('string');
    });

    it('infers number dataType for type "number"', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'age', type: 'number' }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].dataType).toBe('number');
    });

    it('infers boolean dataType for type "checkbox"', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'active', type: 'checkbox' }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].dataType).toBe('boolean');
    });

    it('respects explicit dataType on the field', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'score', type: 'text', dataType: 'number' }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].dataType).toBe('number');
    });

    it('preserves defaultValue in the node', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'x', type: 'text', defaultValue: 'hello' }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].defaultValue).toBe('hello');
    });

    it('initializes validators and asyncValidators as empty if not declared', () => {
      const { nodes } = normalizeConfig({ fields: [text('x')] }, SKIP_VALIDATION);
      expect(nodes[0].validators).toEqual([]);
      expect(nodes[0].asyncValidators).toEqual([]);
    });

    it('transfers declared validators', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'email', type: 'text', validators: [{ kind: 'required' }, { kind: 'email' }] }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].validators).toHaveLength(2);
      expect(nodes[0].validators[0].kind).toBe('required');
    });

    it('transfers declared asyncValidators', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'user', type: 'text', asyncValidators: [{ kind: 'uniqueEmail' }] }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].asyncValidators[0].kind).toBe('uniqueEmail');
    });
  });

  describe('groups', () => {
    it('produces a node of kind group', () => {
      const config: FormConfig = {
        fields: [{ key: 'addr', type: 'group', fields: [text('street')] }],
      };
      const { nodes } = normalizeConfig(config, SKIP_VALIDATION);
      expect(nodes[0].kind).toBe('group');
    });

    it('assigns object dataType to the group', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'addr', type: 'group', fields: [text('street')] }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].dataType).toBe('object');
    });

    it('children have absolute paths that include the parent', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'addr', type: 'group', fields: [text('street'), text('city')] }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].children[0].path).toEqual(['addr', 'street']);
      expect(nodes[0].children[1].path).toEqual(['addr', 'city']);
    });

    it('normalizes nested groups recursively', () => {
      const config: FormConfig = {
        fields: [{
          key: 'outer', type: 'group',
          fields: [{ key: 'inner', type: 'group', fields: [text('leaf')] }],
        }],
      };
      const { nodes } = normalizeConfig(config, SKIP_VALIDATION);
      expect(nodes[0].children[0].children[0].path).toEqual(['outer', 'inner', 'leaf']);
    });

    it('detects group by presence of "fields" even if type is not "group"', () => {
      const config = { fields: [{ key: 'g', type: 'custom', fields: [text('x')] }] };
      const { nodes } = normalizeConfig(config as any, SKIP_VALIDATION);
      expect(nodes[0].kind).toBe('group');
    });
  });

  describe('arrays', () => {
    it('produces a node of kind array', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'tags', type: 'array', item: text('value') }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].kind).toBe('array');
    });

    it('assigns array dataType to the node', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'tags', type: 'array', item: text('value') }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].dataType).toBe('array');
    });

    it('stores the item template with an empty path', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'tags', type: 'array', item: { key: 'label', type: 'text' } }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].item).toBeDefined();
      expect(nodes[0].item?.key).toBe('label');
      expect(nodes[0].item?.path).toEqual(['label']);
    });

    it('applies defaultValue to the array', () => {
      const { nodes } = normalizeConfig(
        { fields: [{ key: 'list', type: 'array', item: text('v'), defaultValue: [1, 2] }] },
        SKIP_VALIDATION,
      );
      expect(nodes[0].defaultValue).toEqual([1, 2]);
    });

    it('throws if array has no item (without zod validation)', () => {
      const badConfig = { fields: [{ key: 'tags', type: 'array' }] } as any;
      expect(() => normalizeConfig(badConfig, SKIP_VALIDATION)).toThrow(/item/);
    });

    it('detects array by presence of "item" even if type is not "array"', () => {
      const config = { fields: [{ key: 'arr', type: 'custom', item: text('x') }] };
      const { nodes } = normalizeConfig(config as any, SKIP_VALIDATION);
      expect(nodes[0].kind).toBe('array');
    });
  });

  describe('returned FormDefinition', () => {
    it('includes the original config', () => {
      const config: FormConfig = { id: 'my-form', fields: [text('x')] };
      const { config: out } = normalizeConfig(config, SKIP_VALIDATION);
      expect(out.id).toBe('my-form');
    });

    it('includes all root-level nodes', () => {
      const config: FormConfig = { fields: [text('a'), text('b'), text('c')] };
      const { nodes } = normalizeConfig(config, SKIP_VALIDATION);
      expect(nodes).toHaveLength(3);
    });
  });

  describe('integration with zod validation (validate: true by default)', () => {
    it('accepts a valid config', () => {
      const config: FormConfig = { fields: [text('name')] };
      expect(() => normalizeConfig(config)).not.toThrow();
    });

    it('throws for invalid config (empty key)', () => {
      const bad = { fields: [{ key: '', type: 'text' }] };
      expect(() => normalizeConfig(bad as any)).toThrow();
    });
  });
});
