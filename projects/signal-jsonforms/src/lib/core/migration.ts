import { FormConfig } from './model';
import { validateConfig } from './definition-schema';

/** Current definition format version produced by serializeForm / migrations. */
export const CURRENT_VERSION = '1';

/** A single upgrade step between two definition format versions. */
export interface Migration {
  /** Version this migration upgrades FROM. */
  from: string;
  /** Version it produces (must move towards CURRENT_VERSION). */
  to: string;
  /** Pure transform of the raw config object. */
  migrate: (config: any) => any;
}

export interface ParseFormOptions {
  migrations?: Migration[];
  /** Validate with the zod meta-schema after migrating (default: true). */
  validate?: boolean;
}

export interface SerializeFormOptions {
  /** JSON.stringify indentation (default: 2). */
  space?: number | string;
}

/**
 * Upgrades a raw definition to CURRENT_VERSION by applying the registered
 * migrations in sequence (matched by `from`). Definitions without a `version`,
 * or already at CURRENT_VERSION, are returned unchanged. Throws a clear error
 * if no migration path exists or a cycle is detected.
 */
export function migrateConfig(config: any, migrations: Migration[] = []): FormConfig {
  if (!config || typeof config !== 'object') return config as FormConfig;
  const byFrom = new Map(migrations.map((m) => [m.from, m]));
  let current = config;
  let version = String(current.version ?? CURRENT_VERSION);
  const seen = new Set<string>();
  while (version !== CURRENT_VERSION) {
    if (seen.has(version)) {
      throw new Error(`migrateConfig: migration cycle detected at version "${version}".`);
    }
    seen.add(version);
    const m = byFrom.get(version);
    if (!m) {
      throw new Error(`migrateConfig: no migration from version "${version}" to "${CURRENT_VERSION}".`);
    }
    current = { ...m.migrate(current), version: m.to };
    version = m.to;
  }
  return current as FormConfig;
}

/** Full deserialization pipeline: JSON string -> migrate -> validate (zod). */
export function parseForm(json: string, options: ParseFormOptions = {}): FormConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`parseForm: invalid JSON — ${(e as Error).message}`);
  }
  const migrated = migrateConfig(parsed, options.migrations ?? []);
  return options.validate === false ? (migrated as FormConfig) : validateConfig(migrated);
}

/** Serializes a definition to a canonical JSON string, stamping the current version. */
export function serializeForm(config: FormConfig, options: SerializeFormOptions = {}): string {
  const stamped: FormConfig = { ...config, version: config.version ?? CURRENT_VERSION };
  return JSON.stringify(stamped, null, options.space ?? 2);
}
