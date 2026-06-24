import { describe, it, expect } from 'vitest';
import { updateIn } from '../../src/lib/core/path-utils';

describe('updateIn', () => {
  describe('empty path', () => {
    it('applies fn directly to the value', () => {
      expect(updateIn(5, [], (x) => x + 1)).toBe(6);
    });

    it('works with objects at root', () => {
      expect(updateIn({ a: 1 }, [], () => ({ a: 99 }))).toEqual({ a: 99 });
    });
  });

  describe('single-level path', () => {
    it('updates a top-level object key', () => {
      const obj = { a: 1, b: 2 };
      const result = updateIn(obj, ['a'], () => 99);
      expect(result).toEqual({ a: 99, b: 2 });
    });

    it('does not mutate the original object', () => {
      const obj = { a: 1, b: 2 };
      updateIn(obj, ['a'], () => 99);
      expect(obj.a).toBe(1);
    });

    it('returns a new object reference', () => {
      const obj = { a: 1 };
      const result = updateIn(obj, ['a'], (v) => v);
      expect(result).not.toBe(obj);
    });

    it('updates an array element by index', () => {
      const arr = [10, 20, 30];
      const result = updateIn(arr, [1], () => 99);
      expect(result).toEqual([10, 99, 30]);
    });

    it('does not mutate the original array', () => {
      const arr = [10, 20, 30];
      updateIn(arr, [1], () => 99);
      expect(arr[1]).toBe(20);
    });
  });

  describe('multi-level path', () => {
    it('updates deeply nested object keys', () => {
      const obj = { a: { b: { c: 1 } } };
      const result = updateIn(obj, ['a', 'b', 'c'], (v) => v * 2);
      expect(result).toEqual({ a: { b: { c: 2 } } });
    });

    it('does not mutate intermediate objects', () => {
      const inner = { c: 1 };
      const obj = { a: { b: inner } };
      updateIn(obj, ['a', 'b', 'c'], (v) => v * 2);
      expect(inner.c).toBe(1);
    });

    it('handles mixed object/array path', () => {
      const obj = { items: [{ name: 'alpha' }, { name: 'beta' }] };
      const result = updateIn(obj, ['items', 1, 'name'], () => 'changed');
      expect(result).toEqual({ items: [{ name: 'alpha' }, { name: 'changed' }] });
    });

    it('creates missing intermediate keys as objects', () => {
      const result = updateIn({}, ['a', 'b'], () => 42);
      expect(result).toEqual({ a: { b: 42 } });
    });
  });

  describe('fn receives current value', () => {
    it('passes current value to the updater function', () => {
      const obj = { count: 3 };
      const result = updateIn(obj, ['count'], (v) => (v as number) + 1);
      expect(result).toEqual({ count: 4 });
    });

    it('passes undefined for missing keys', () => {
      let received: unknown;
      updateIn({}, ['missing'], (v) => {
        received = v;
        return v;
      });
      expect(received).toBeUndefined();
    });
  });

  describe('array mutation use-cases (form array model)', () => {
    it('appends an item to an array', () => {
      const model = { tags: ['a', 'b'] };
      const result = updateIn(model, ['tags'], (arr) => [...(arr as string[]), 'c']);
      expect(result.tags).toEqual(['a', 'b', 'c']);
    });

    it('removes an item from an array by index', () => {
      const model = { tags: ['a', 'b', 'c'] };
      const result = updateIn(model, ['tags'], (arr) =>
        (arr as string[]).filter((_, i) => i !== 1),
      );
      expect(result.tags).toEqual(['a', 'c']);
    });
  });
});
