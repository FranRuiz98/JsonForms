import { describe, it, expect } from 'vitest';
import {
  CURRENT_VERSION,
  Migration,
  migrateConfig,
  parseForm,
  serializeForm,
} from '../../src/lib/core/migration';
import { FormConfig } from '../../src/lib/core/model';

const valid: FormConfig = { fields: [{ key: 'name', type: 'text' }] };

// ── migrateConfig ───────────────────────────────────────────────────────────

describe('migrateConfig', () => {
  it('returns non-object input unchanged', () => {
    expect(migrateConfig(null as any)).toBe(null);
    expect(migrateConfig(undefined as any)).toBe(undefined);
  });

  it('leaves a config without version unchanged (assumed current)', () => {
    const cfg = { ...valid };
    expect(migrateConfig(cfg)).toEqual(cfg);
  });

  it('leaves a config already at CURRENT_VERSION unchanged', () => {
    const cfg = { ...valid, version: CURRENT_VERSION };
    expect(migrateConfig(cfg, [])).toEqual(cfg);
  });

  it('applies a single migration and stamps the target version', () => {
    const migrations: Migration[] = [
      { from: '0', to: '1', migrate: (c) => ({ ...c, migrated: true }) },
    ];
    const out = migrateConfig({ ...valid, version: '0' }, migrations) as any;
    expect(out.migrated).toBe(true);
    expect(out.version).toBe('1');
  });

  it('applies a multi-step migration chain in order', () => {
    const order: string[] = [];
    const migrations: Migration[] = [
      { from: '0', to: '0.5', migrate: (c) => { order.push('a'); return c; } },
      { from: '0.5', to: '1', migrate: (c) => { order.push('b'); return c; } },
    ];
    const out = migrateConfig({ ...valid, version: '0' }, migrations) as any;
    expect(order).toEqual(['a', 'b']);
    expect(out.version).toBe('1');
  });

  it('throws when no migration path exists', () => {
    expect(() => migrateConfig({ ...valid, version: '0' }, [])).toThrow(/no migration from version "0"/);
  });

  it('throws when a cycle is detected', () => {
    const migrations: Migration[] = [{ from: '0', to: '0', migrate: (c) => c }];
    expect(() => migrateConfig({ ...valid, version: '0' }, migrations)).toThrow(/cycle/);
  });
});

// ── parseForm ─────────────────────────────────────────────────────────────

describe('parseForm', () => {
  it('parses, migrates and validates a JSON string', () => {
    const migrations: Migration[] = [
      { from: '0', to: '1', migrate: (c) => ({ ...c, fields: [{ key: 'x', type: 'text' }] }) },
    ];
    const out = parseForm(JSON.stringify({ version: '0' }), { migrations });
    expect(out.fields?.[0].key).toBe('x');
  });

  it('throws a readable error for invalid JSON', () => {
    expect(() => parseForm('{ not json')).toThrow(/invalid JSON/);
  });

  it('skips validation when validate is false', () => {
    // Missing fields/steps would fail zod, but validate:false bypasses it.
    const out = parseForm(JSON.stringify({ version: '1' }), { validate: false });
    expect(out).toEqual({ version: '1' });
  });

  it('validates by default and throws on an invalid definition', () => {
    expect(() => parseForm(JSON.stringify({ version: '1' }))).toThrow();
  });
});

// ── serializeForm ───────────────────────────────────────────────────────────

describe('serializeForm', () => {
  it('stamps CURRENT_VERSION when none is present', () => {
    const json = serializeForm(valid);
    expect(JSON.parse(json).version).toBe(CURRENT_VERSION);
  });

  it('preserves an existing version', () => {
    const json = serializeForm({ ...valid, version: '2' });
    expect(JSON.parse(json).version).toBe('2');
  });

  it('round-trips through parseForm', () => {
    const json = serializeForm(valid);
    expect(parseForm(json).fields?.[0].key).toBe('name');
  });

  it('honors the space option', () => {
    expect(serializeForm(valid, { space: 0 })).not.toContain('\n');
  });
});
