import { FieldNode, FormConfig } from '../src/lib/core/model';
import { SignalFormsApi } from '../src/lib/adapter/signal-forms.adapter';
import { vi } from 'vitest';

// ── FieldNode factory ──────────────────────────────────────────────────────

export function makeControlNode(overrides: Partial<FieldNode> = {}): FieldNode {
  return {
    kind: 'control',
    key: 'field',
    path: ['field'],
    config: { key: 'field', type: 'text' },
    dataType: 'string',
    validators: [],
    asyncValidators: [],
    children: [],
    ...overrides,
  };
}

export function makeGroupNode(
  key: string,
  children: FieldNode[],
  overrides: Partial<FieldNode> = {},
): FieldNode {
  return {
    kind: 'group',
    key,
    path: [key],
    config: { key, type: 'group', fields: children.map((c) => c.config) },
    dataType: 'object',
    validators: [],
    asyncValidators: [],
    children,
    ...overrides,
  };
}

export function makeArrayNode(
  key: string,
  item: FieldNode,
  overrides: Partial<FieldNode> = {},
): FieldNode {
  return {
    kind: 'array',
    key,
    path: [key],
    config: { key, type: 'array', item: item.config },
    dataType: 'array',
    validators: [],
    asyncValidators: [],
    children: [],
    item,
    ...overrides,
  };
}

// ── FormConfig factory ─────────────────────────────────────────────────────

export const textField = (key: string, extra: Partial<FormConfig['fields'][0]> = {}) =>
  ({ key, type: 'text', ...extra } as FormConfig['fields'][0]);

// ── Mocked SignalFormsApi ──────────────────────────────────────────────────

export function createMockApi(): Record<keyof SignalFormsApi, ReturnType<typeof vi.fn>> {
  return {
    required: vi.fn(),
    email: vi.fn(),
    min: vi.fn(),
    max: vi.fn(),
    minLength: vi.fn(),
    maxLength: vi.fn(),
    pattern: vi.fn(),
    validate: vi.fn(),
    validateAsync: vi.fn(),
    debounce: vi.fn(),
    hidden: vi.fn(),
    disabled: vi.fn(),
    readonly: vi.fn(),
    applyEach: vi.fn(),
    form: vi.fn(),
    schema: vi.fn(),
    apply: vi.fn(),
    applyWhen: vi.fn(),
    submit: vi.fn(),
  } as any;
}

/** Builds a flat root path object: { key: 'path_key', ... } */
export function mockRoot(keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, `path_${k}`]));
}

/** Builds a mock field context for validator callbacks. */
export function mockFc(value: unknown, modelValues: Record<string, unknown> = {}) {
  return {
    value: () => value,
    valueOf: (path: unknown) => {
      if (typeof path === 'string' && path in modelValues) return modelValues[path];
      return undefined;
    },
  };
}
