/**
 * Builder document = the real FormConfig/FieldConfig tree (core/model.ts)
 * decorated with a stable, non-serialized `_id` per node. The `_id` is used
 * only for selection, drag identity, and history diffing — it never reaches
 * the exported JSON.
 *
 * Serialization strips every `_id`; import assigns one. Because the builder
 * edits the exact shape the library consumes, parity with the config format is
 * (almost) free and the round-trip is lossless:
 *   import(serialize(doc)) === config   (modulo _id)
 */
import {
  FieldConfig,
  FormConfig,
  LayoutConfig,
  StepConfig,
  WizardConfig,
  parseForm,
  serializeForm,
} from 'signal-jsonforms';

export type NodeId = string;

let _counter = 0;
export function newId(): NodeId {
  return `n${Date.now().toString(36)}-${(_counter++).toString(36)}`;
}

/** A FieldConfig with a builder id; children/item are builder nodes too. */
export interface BuilderField extends Omit<FieldConfig, 'fields' | 'item'> {
  _id: NodeId;
  fields?: BuilderField[]; // group children
  item?: BuilderField; // array item template
}

/** A wizard step with a builder id. */
export interface BuilderStep extends Omit<StepConfig, 'fields'> {
  _id: NodeId;
  fields: BuilderField[];
}

/** The full editable document. `fields` and `steps` are mutually exclusive. */
export interface BuilderDocument {
  version?: string;
  id?: string;
  layout?: LayoutConfig;
  fields?: BuilderField[];
  steps?: BuilderStep[];
  wizard?: WizardConfig;
}

export function emptyDocument(): BuilderDocument {
  return { fields: [] };
}

// --- serialize: BuilderDocument -> FormConfig (strip _id) --------------------

function stripField(f: BuilderField): FieldConfig {
  const { _id, fields, item, ...rest } = f;
  const out: FieldConfig = { ...rest };
  if (fields) out.fields = fields.map(stripField);
  if (item) out.item = stripField(item);
  return out;
}

export function serialize(doc: BuilderDocument): FormConfig {
  const out: FormConfig = {};
  if (doc.version !== undefined) out.version = doc.version;
  if (doc.id !== undefined) out.id = doc.id;
  if (doc.layout) out.layout = doc.layout;
  if (doc.fields) out.fields = doc.fields.map(stripField);
  if (doc.steps) {
    out.steps = doc.steps.map((s) => {
      const { _id, fields, ...rest } = s;
      return { ...rest, fields: fields.map(stripField) };
    });
  }
  if (doc.wizard) out.wizard = doc.wizard;
  return out;
}

// --- import: FormConfig -> BuilderDocument (assign _id) ----------------------

/** Deep-clone a FieldConfig into a BuilderField, assigning a fresh id to every
 *  node (including nested group fields and array item templates). */
export function toBuilderField(f: FieldConfig): BuilderField {
  const { fields, item, ...rest } = f;
  const bf: BuilderField = { ...rest, _id: newId() };
  if (fields) bf.fields = fields.map(toBuilderField);
  if (item) bf.item = toBuilderField(item);
  return bf;
}

export function toDocument(config: FormConfig): BuilderDocument {
  const doc: BuilderDocument = {};
  if (config.version !== undefined) doc.version = config.version;
  if (config.id !== undefined) doc.id = config.id;
  if (config.layout) doc.layout = config.layout;
  if (config.wizard) doc.wizard = config.wizard;
  if (config.fields) doc.fields = config.fields.map(toBuilderField);
  if (config.steps) {
    doc.steps = config.steps.map((s) => ({
      ...s,
      _id: newId(),
      fields: s.fields.map(toBuilderField),
    }));
  }
  if (!doc.fields && !doc.steps) doc.fields = [];
  return doc;
}

/** Parse pasted/loaded JSON (migrate + zod-validate) into a builder document. */
export function importJson(json: string): BuilderDocument {
  return toDocument(parseForm(json, { validate: true }));
}

/** Canonical JSON export (stamps `version`). */
export function exportJson(doc: BuilderDocument): string {
  return serializeForm(serialize(doc));
}
