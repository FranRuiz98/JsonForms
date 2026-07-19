import { describe, it, expect, beforeEach } from 'vitest';
import { Injector, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { setupOptions } from '../../src/lib/core/options-resolver';
import { FieldNode } from '../../src/lib/core/model';
import { JsonFormsConfig } from '../../src/lib/registry/types';

function control(key: string, options: any): FieldNode {
  return {
    kind: 'control',
    key,
    path: [key],
    config: { key, type: 'select', options },
    dataType: 'string',
    validators: [],
    asyncValidators: [],
    children: [],
  };
}

describe('setupOptions', () => {
  let injector: Injector;
  let model: WritableSignal<Record<string, unknown>>;

  beforeEach(() => {
    injector = TestBed.inject(Injector);
    model = signal<Record<string, unknown>>({});
  });

  it('returns an empty map when no field declares options', () => {
    const node: FieldNode = { ...control('c', undefined) };
    (node.config as any).options = undefined;
    const map = setupOptions([node], model, undefined, injector);
    expect(map.size).toBe(0);
  });

  it('resolves a static inline array', () => {
    const node = control('c', [{ value: 'a', label: 'A' }]);
    const map = setupOptions([node], model, undefined, injector);
    const state = map.get('c')!();
    expect(state.loading).toBe(false);
    expect(state.options).toEqual([{ value: 'a', label: 'A', disabled: false }]);
  });

  it('normalizes primitive options', () => {
    const node = control('c', ['x', 'y'] as any);
    const state = setupOptions([node], model, undefined, injector).get('c')!();
    expect(state.options).toEqual([
      { value: 'x', label: 'x' },
      { value: 'y', label: 'y' },
    ]);
  });

  it('carries the disabled flag through', () => {
    const node = control('c', [{ value: 'a', label: 'A', disabled: true }]);
    const state = setupOptions([node], model, undefined, injector).get('c')!();
    expect(state.options[0].disabled).toBe(true);
  });

  it('resolves options derived from the model via an expression', () => {
    model.set({ cities: [{ value: 'mad', label: 'Madrid' }] });
    const node = control('city', { expr: 'model.cities' });
    const sig = setupOptions([node], model, undefined, injector).get('city')!;
    expect(sig().options).toEqual([{ value: 'mad', label: 'Madrid', disabled: false }]);
  });

  it('recomputes derived options when the model changes (reactive)', () => {
    model.set({ list: [{ value: 'a', label: 'A' }] });
    const node = control('c', { expr: 'model.list' });
    const sig = setupOptions([node], model, undefined, injector).get('c')!;
    expect(sig().options.map((o) => o.value)).toEqual(['a']);
    model.set({ list: [{ value: 'b', label: 'B' }] });
    expect(sig().options.map((o) => o.value)).toEqual(['b']);
  });

  it('resolves options from a registered function', () => {
    const registries: JsonFormsConfig = {
      functions: { roleOpts: () => [{ value: 'admin', label: 'Admin' }] },
    };
    const node = control('role', { fn: 'roleOpts' });
    const sig = setupOptions([node], model, registries, injector).get('role')!;
    expect(sig().options).toEqual([{ value: 'admin', label: 'Admin', disabled: false }]);
  });

  it('throws when a fn options source is not registered', () => {
    const node = control('c', { fn: 'missing' });
    expect(() => setupOptions([node], model, {}, injector)).toThrow(/not registered/);
  });

  it('throws when an async source is not registered', () => {
    const node = control('c', { source: 'missing' });
    expect(() => setupOptions([node], model, {}, injector)).toThrow(/not registered/);
  });

  it('resolves options for fields nested inside a group', () => {
    const child = control('city', [{ value: 'a', label: 'A' }]);
    child.path = ['addr', 'city'];
    const group: FieldNode = {
      kind: 'group',
      key: 'addr',
      path: ['addr'],
      config: { key: 'addr', type: 'group', fields: [child.config] },
      dataType: 'object',
      validators: [],
      asyncValidators: [],
      children: [child],
    };
    const map = setupOptions([group], model, undefined, injector);
    expect(map.get('addr.city')!().options).toHaveLength(1);
  });
});
