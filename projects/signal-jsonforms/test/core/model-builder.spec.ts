import { describe, it, expect } from 'vitest';
import { defaultFor, buildNodeValue, buildInitialModel } from '../../src/lib/core/model-builder';
import { makeControlNode, makeGroupNode, makeArrayNode } from '../helpers';

// ── defaultFor ────────────────────────────────────────────────────────────

describe('defaultFor', () => {
  it('returns "" for string', () => {
    expect(defaultFor('string')).toBe('');
  });

  it('returns 0 for number', () => {
    expect(defaultFor('number')).toBe(0);
  });

  it('returns false for boolean', () => {
    expect(defaultFor('boolean')).toBe(false);
  });

  it('returns [] for array', () => {
    expect(defaultFor('array')).toEqual([]);
  });

  it('returns {} for object', () => {
    expect(defaultFor('object')).toEqual({});
  });
});

// ── buildNodeValue ────────────────────────────────────────────────────────

describe('buildNodeValue', () => {
  describe('control nodes', () => {
    it('uses defaultValue when set', () => {
      const node = makeControlNode({ defaultValue: 'hello' });
      expect(buildNodeValue(node)).toBe('hello');
    });

    it('falls back to defaultFor(string) when no defaultValue', () => {
      expect(buildNodeValue(makeControlNode({ dataType: 'string' }))).toBe('');
    });

    it('falls back to defaultFor(number)', () => {
      expect(buildNodeValue(makeControlNode({ dataType: 'number' }))).toBe(0);
    });

    it('falls back to defaultFor(boolean)', () => {
      expect(buildNodeValue(makeControlNode({ dataType: 'boolean' }))).toBe(false);
    });

    it('explicit defaultValue 0 is preserved (not falsy-ignored)', () => {
      const node = makeControlNode({ dataType: 'number', defaultValue: 0 });
      expect(buildNodeValue(node)).toBe(0);
    });

    it('explicit defaultValue false is preserved', () => {
      const node = makeControlNode({ dataType: 'boolean', defaultValue: false });
      expect(buildNodeValue(node)).toBe(false);
    });
  });

  describe('array nodes', () => {
    it('returns [] when no defaultValue', () => {
      const node = makeArrayNode('tags', makeControlNode({ key: 'value' }));
      expect(buildNodeValue(node)).toEqual([]);
    });

    it('returns defaultValue when set', () => {
      const node = makeArrayNode('tags', makeControlNode({ key: 'value' }), {
        defaultValue: ['a', 'b'],
      });
      expect(buildNodeValue(node)).toEqual(['a', 'b']);
    });
  });

  describe('group nodes', () => {
    it('recursively builds object from children', () => {
      const node = makeGroupNode('person', [
        makeControlNode({ key: 'name', dataType: 'string' }),
        makeControlNode({ key: 'age', dataType: 'number' }),
      ]);
      expect(buildNodeValue(node)).toEqual({ name: '', age: 0 });
    });

    it('handles nested groups', () => {
      const inner = makeGroupNode('address', [
        makeControlNode({ key: 'city', dataType: 'string' }),
      ]);
      const outer = makeGroupNode('profile', [
        makeControlNode({ key: 'email', dataType: 'string' }),
        inner,
      ]);
      expect(buildNodeValue(outer)).toEqual({ email: '', address: { city: '' } });
    });

    it('returns {} for group with no children', () => {
      const node = makeGroupNode('empty', []);
      expect(buildNodeValue(node)).toEqual({});
    });
  });
});

// ── buildInitialModel ─────────────────────────────────────────────────────

describe('buildInitialModel', () => {
  it('returns empty object when no nodes', () => {
    expect(buildInitialModel([])).toEqual({});
  });

  it('builds flat model from multiple controls', () => {
    const nodes = [
      makeControlNode({ key: 'firstName', dataType: 'string' }),
      makeControlNode({ key: 'age', dataType: 'number' }),
      makeControlNode({ key: 'active', dataType: 'boolean' }),
    ];
    expect(buildInitialModel(nodes)).toEqual({ firstName: '', age: 0, active: false });
  });

  it('respects defaultValues per control', () => {
    const nodes = [
      makeControlNode({ key: 'status', dataType: 'string', defaultValue: 'draft' }),
      makeControlNode({ key: 'count', dataType: 'number', defaultValue: 10 }),
    ];
    expect(buildInitialModel(nodes)).toEqual({ status: 'draft', count: 10 });
  });

  it('builds nested model with groups', () => {
    const nodes = [
      makeControlNode({ key: 'title', dataType: 'string' }),
      makeGroupNode('meta', [
        makeControlNode({ key: 'author', dataType: 'string' }),
      ]),
    ];
    expect(buildInitialModel(nodes)).toEqual({ title: '', meta: { author: '' } });
  });

  it('uses empty array for array nodes', () => {
    const nodes = [
      makeControlNode({ key: 'name', dataType: 'string' }),
      makeArrayNode('tags', makeControlNode({ key: 'v' })),
    ];
    expect(buildInitialModel(nodes)).toEqual({ name: '', tags: [] });
  });
});
