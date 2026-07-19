/**
 * Signal-first store: the single source of truth for the builder.
 *
 * `document` is the editable BuilderDocument; `formConfig` is the serialized
 * FormConfig derived from it, and `validation` runs zod + a DSL/reference check
 * so the preview degrades gracefully. Wizard support: the document is either
 * flat (`fields`) or a wizard (`steps`); the "top-level container" for adds and
 * drops is the active step in wizard mode, or the root in flat mode.
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import jsep from 'jsep';
import {
  DynamicExpr,
  FieldConfig,
  FormConfig,
  JSON_FORMS_CONFIG,
  JsonFormsConfig,
  StepConfig,
  WizardConfig,
  validateConfig,
} from 'signal-jsonforms';
import {
  BuilderDocument,
  BuilderField,
  BuilderStep,
  NodeId,
  emptyDocument,
  exportJson,
  newId,
  serialize,
  toBuilderField,
} from './builder-model';
import { PaletteItem } from './palette';

export type ValidationState =
  | { ok: true; config: FormConfig }
  | { ok: false; error: string };

export const ROOT_CONTAINER = 'root';
export const PALETTE_CONTAINER = 'palette';

const HISTORY_LIMIT = 50;

@Injectable({ providedIn: 'root' })
export class BuilderStore {
  private readonly registry = inject(JSON_FORMS_CONFIG);

  readonly document = signal<BuilderDocument>(emptyDocument());
  readonly selectedId = signal<NodeId | null>(null);
  /** Active wizard step id (null in flat mode). */
  readonly activeStepId = signal<string | null>(null);

  private readonly past: BuilderDocument[] = [];
  private readonly future: BuilderDocument[] = [];
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  readonly formConfig = computed<FormConfig>(() => serialize(this.document()));

  readonly validation = computed<ValidationState>(() => {
    const config = this.formConfig();
    try {
      const validated = validateConfig(config);
      validateExpressions(validated);
      validateRefs(validated, this.registry);
      return { ok: true, config: validated };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });

  readonly selected = computed<BuilderField | null>(() => {
    const id = this.selectedId();
    return id ? findField(this.document(), id) : null;
  });

  readonly isEmpty = computed(() => {
    const d = this.document();
    return !(d.fields?.length || d.steps?.length);
  });

  // --- wizard ---------------------------------------------------------------

  readonly isWizard = computed(() => !!this.document().steps);
  readonly steps = computed<BuilderStep[]>(() => this.document().steps ?? []);
  readonly wizardOptions = computed<WizardConfig>(() => this.document().wizard ?? {});
  readonly activeStep = computed<BuilderStep | null>(() => {
    const d = this.document();
    if (!d.steps?.length) return null;
    return d.steps.find((s) => s._id === this.activeStepId()) ?? d.steps[0];
  });

  /** The container id that top-level adds/drops target. */
  topContainerId(): string {
    return this.isWizard() ? this.activeStep()?._id ?? ROOT_CONTAINER : ROOT_CONTAINER;
  }

  setWizard(on: boolean): void {
    let firstStepId: string | null = null;
    this.mutate((doc) => {
      if (on) {
        if (doc.steps) {
          firstStepId = doc.steps[0]?._id ?? null;
          return;
        }
        const step: BuilderStep = { _id: newId(), label: 'Step 1', fields: doc.fields ?? [] };
        doc.steps = [step];
        delete doc.fields;
        doc.wizard = doc.wizard ?? { linear: true, showStepper: true };
        firstStepId = step._id;
      } else {
        if (!doc.steps) return;
        doc.fields = doc.steps.flatMap((s) => s.fields);
        delete doc.steps;
        delete doc.wizard;
      }
    });
    this.activeStepId.set(on ? firstStepId : null);
    this.select(null);
  }

  addStep(): void {
    const id = newId();
    this.mutate((doc) => {
      if (!doc.steps) return;
      doc.steps.push({ _id: id, label: `Step ${doc.steps.length + 1}`, fields: [] });
    });
    this.activeStepId.set(id);
  }

  removeStep(id: string): void {
    this.mutate((doc) => {
      if (!doc.steps) return;
      doc.steps = doc.steps.filter((s) => s._id !== id);
      if (!doc.steps.length) {
        // Never leave a wizard with zero steps — fall back to a flat form.
        doc.fields = [];
        delete doc.steps;
        delete doc.wizard;
      }
    });
    const d = this.document();
    this.activeStepId.set(d.steps?.[0]?._id ?? null);
  }

  moveStep(from: number, to: number): void {
    this.mutate((doc) => {
      if (doc.steps) moveItemInArray(doc.steps, from, to);
    });
  }

  updateStep(id: string, patch: Partial<Omit<BuilderStep, '_id' | 'fields'>>): void {
    this.mutate((doc) => {
      const s = doc.steps?.find((x) => x._id === id);
      if (s) Object.assign(s, patch);
    });
  }

  setWizardOptions(patch: Partial<WizardConfig>): void {
    this.mutate((doc) => {
      doc.wizard = { ...(doc.wizard ?? {}), ...patch };
    });
  }

  setActiveStep(id: string): void {
    this.activeStepId.set(id);
    this.select(null);
  }

  // --- selection ------------------------------------------------------------

  select(id: NodeId | null): void {
    this.selectedId.set(id);
  }

  // --- structural mutations -------------------------------------------------

  addFromPalette(item: PaletteItem): void {
    const node = toBuilderField({ ...item.make(), key: '' } as FieldConfig);
    const topId = this.topContainerId();
    this.mutate((doc) => {
      const list = resolveTargetList(doc, this.selectedId(), topId);
      node.key = uniqueKey(list, item.type);
      list.push(node);
    });
    this.select(node._id);
  }

  insertNewNode(item: PaletteItem, containerId: string, index: number): void {
    const node = toBuilderField({ ...item.make(), key: '' } as FieldConfig);
    this.mutate((doc) => {
      const to = containerListById(doc, containerId);
      if (!to) return;
      node.key = uniqueKey(to, item.type);
      to.splice(clamp(index, 0, to.length), 0, node);
    });
    this.select(node._id);
  }

  handleDrop(e: CdkDragDrop<BuilderField[]>): void {
    const toId = e.container.id;

    if (e.previousContainer.id === PALETTE_CONTAINER) {
      this.insertNewNode(e.item.data as PaletteItem, toId, e.currentIndex);
      return;
    }

    if (e.previousContainer === e.container) {
      if (e.previousIndex === e.currentIndex) return;
      this.mutate((doc) => {
        const list = containerListById(doc, toId);
        if (list) moveItemInArray(list, e.previousIndex, e.currentIndex);
      });
      return;
    }

    this.mutate((doc) => {
      const from = containerListById(doc, e.previousContainer.id);
      const to = containerListById(doc, toId);
      if (!from || !to) return;
      const node = from[e.previousIndex];
      if (node && subtreeIds(node).has(toId)) return;
      transferArrayItem(from, to, e.previousIndex, clamp(e.currentIndex, 0, to.length));
      const moved = to[clamp(e.currentIndex, 0, to.length - 1)];
      if (moved) moved.key = uniqueKeyExcept(to, moved);
    });
  }

  updateNode(id: NodeId, patch: Partial<BuilderField>): void {
    this.mutate((doc) => {
      const f = findField(doc, id);
      if (f) Object.assign(f, patch);
    });
  }

  removeNode(id: NodeId): void {
    this.mutate((doc) => removeField(doc, id));
    if (this.selectedId() === id) this.select(null);
  }

  duplicateNode(id: NodeId): void {
    this.mutate((doc) => {
      const loc = locate(doc, id);
      if (!loc) return;
      const clone = cloneWithNewIds(loc.list[loc.index]);
      clone.key = uniqueKey(loc.list, clone.key || clone.type);
      loc.list.splice(loc.index + 1, 0, clone);
    });
  }

  setDocument(doc: BuilderDocument): void {
    this.past.length = 0;
    this.future.length = 0;
    this.syncHistoryFlags();
    this.document.set(doc);
    this.activeStepId.set(doc.steps?.[0]?._id ?? null);
    this.select(null);
  }

  reset(): void {
    this.setDocument(emptyDocument());
  }

  // --- history --------------------------------------------------------------

  undo(): void {
    if (!this.past.length) return;
    this.future.push(structuredClone(this.document()));
    this.document.set(this.past.pop()!);
    this.syncHistoryFlags();
  }

  redo(): void {
    if (!this.future.length) return;
    this.past.push(structuredClone(this.document()));
    this.document.set(this.future.pop()!);
    this.syncHistoryFlags();
  }

  toJson(): string {
    return exportJson(this.document());
  }

  // --- internals ------------------------------------------------------------

  private mutate(fn: (doc: BuilderDocument) => void): void {
    const next = structuredClone(this.document());
    fn(next);
    this.past.push(structuredClone(this.document()));
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future.length = 0;
    this.document.set(next);
    this.syncHistoryFlags();
  }

  private syncHistoryFlags(): void {
    this.canUndo.set(this.past.length > 0);
    this.canRedo.set(this.future.length > 0);
  }
}

// --- DSL / reference validation ---------------------------------------------

const LOGIC_KEYS = ['hidden', 'disabled', 'readonly', 'computed'] as const;

function eachField(config: FormConfig, cb: (f: FieldConfig) => void): void {
  const walk = (f: FieldConfig): void => {
    cb(f);
    f.fields?.forEach(walk);
    if (f.item) walk(f.item);
  };
  (config.fields ?? []).forEach(walk);
  (config.steps ?? []).forEach((s) => s.fields.forEach(walk));
}

function eachStep(config: FormConfig, cb: (s: StepConfig) => void): void {
  (config.steps ?? []).forEach(cb);
}

function parseExpr(expr: string, where: string): void {
  if (!expr || !expr.trim()) throw new Error(`Empty expression in "${where}".`);
  try {
    jsep(expr);
  } catch (e) {
    throw new Error(`Invalid expression in "${where}": ${(e as Error).message}`);
  }
}

function validateExpressions(config: FormConfig): void {
  eachField(config, (f) => {
    for (const key of LOGIC_KEYS) {
      const d = (f as unknown as Record<string, unknown>)[key] as DynamicExpr | undefined;
      if (d && 'expr' in d) parseExpr(d.expr, `${f.key}.${key}`);
    }
    const o = f.options;
    if (o && !Array.isArray(o) && 'expr' in o) parseExpr(o.expr, `${f.key}.options`);
  });
  eachStep(config, (s) => {
    if (s.skipWhen && 'expr' in s.skipWhen) parseExpr(s.skipWhen.expr, `${s.label ?? s.id ?? 'step'}.skipWhen`);
  });
}

function validateRefs(config: FormConfig, reg: JsonFormsConfig): void {
  const fns = new Set(Object.keys(reg.functions ?? {}));
  const sources = new Set(Object.keys(reg.optionSources ?? {}));
  const wrappers = new Set(Object.keys(reg.wrappers ?? {}));

  const checkFn = (d: DynamicExpr | undefined, where: string): void => {
    if (d && 'fn' in d && !fns.has(d.fn)) {
      throw new Error(`Unknown function "${d.fn}" in "${where}". Register it in provideJsonForms({ functions }).`);
    }
  };

  eachField(config, (f) => {
    for (const key of LOGIC_KEYS) {
      checkFn((f as unknown as Record<string, unknown>)[key] as DynamicExpr | undefined, `${f.key}.${key}`);
    }
    const o = f.options;
    if (o && !Array.isArray(o)) {
      if ('fn' in o && !fns.has(o.fn)) throw new Error(`Unknown function "${o.fn}" in "${f.key}.options".`);
      if ('source' in o && !sources.has(o.source)) {
        throw new Error(`Unknown option source "${o.source}" in "${f.key}.options". Register it in provideJsonForms({ optionSources }).`);
      }
    }
    const w = f.wrapper;
    const list = Array.isArray(w) ? w : w ? [w] : [];
    for (const name of list) {
      if (!wrappers.has(name)) throw new Error(`Unknown wrapper "${name}" on "${f.key}". Register it in provideJsonForms({ wrappers }).`);
    }
  });
  eachStep(config, (s) => checkFn(s.skipWhen, `${s.label ?? s.id ?? 'step'}.skipWhen`));
}

// --- tree helpers (operate on a mutable clone) ------------------------------

function containerLists(doc: BuilderDocument): { id: NodeId | null; list: BuilderField[] }[] {
  const out: { id: NodeId | null; list: BuilderField[] }[] = [];
  if (doc.steps) {
    for (const s of doc.steps) out.push({ id: s._id, list: s.fields });
    for (const s of doc.steps) collectGroupLists(s.fields, out);
  } else {
    if (!doc.fields) doc.fields = [];
    out.push({ id: null, list: doc.fields });
    collectGroupLists(doc.fields, out);
  }
  return out;
}

function collectGroupLists(
  fields: BuilderField[],
  out: { id: NodeId | null; list: BuilderField[] }[],
): void {
  for (const f of fields) {
    if (f.type === 'group') {
      if (!f.fields) f.fields = [];
      out.push({ id: f._id, list: f.fields });
      collectGroupLists(f.fields, out);
    }
    if (f.item) collectGroupLists([f.item], out);
  }
}

function containerListById(doc: BuilderDocument, id: string): BuilderField[] | null {
  if (id === ROOT_CONTAINER) {
    if (doc.steps) return doc.steps[0]?.fields ?? null;
    if (!doc.fields) doc.fields = [];
    return doc.fields;
  }
  const step = doc.steps?.find((s) => s._id === id);
  if (step) return step.fields;
  const f = findField(doc, id);
  if (f && f.type === 'group') {
    if (!f.fields) f.fields = [];
    return f.fields;
  }
  return null;
}

function resolveTargetList(
  doc: BuilderDocument,
  selectedId: NodeId | null,
  topId: string,
): BuilderField[] {
  const lists = containerLists(doc);
  if (selectedId) {
    const asContainer = lists.find((l) => l.id === selectedId);
    if (asContainer) return asContainer.list;
    const loc = locate(doc, selectedId);
    if (loc) return loc.list;
  }
  return containerListById(doc, topId) ?? lists[0].list;
}

function uniqueKey(list: BuilderField[], base: string): string {
  const taken = new Set(list.map((f) => f.key));
  let i = 1;
  let key = `${base}${i}`;
  while (taken.has(key)) key = `${base}${++i}`;
  return key;
}

function uniqueKeyExcept(list: BuilderField[], node: BuilderField): string {
  const taken = new Set(list.filter((f) => f !== node).map((f) => f.key));
  if (node.key && !taken.has(node.key)) return node.key;
  const base = (node.key || node.type).replace(/\d+$/, '') || node.type;
  let i = 1;
  let key = `${base}${i}`;
  while (taken.has(key)) key = `${base}${++i}`;
  return key;
}

function subtreeIds(node: BuilderField): Set<NodeId> {
  const ids = new Set<NodeId>();
  const walk = (n: BuilderField): void => {
    ids.add(n._id);
    n.fields?.forEach(walk);
    if (n.item) walk(n.item);
  };
  walk(node);
  return ids;
}

export function findField(doc: BuilderDocument, id: NodeId): BuilderField | null {
  const loc = locate(doc, id);
  return loc ? loc.list[loc.index] : null;
}

interface Loc {
  list: BuilderField[];
  index: number;
}

function locate(doc: BuilderDocument, id: NodeId): Loc | null {
  const roots: BuilderField[][] = doc.steps
    ? doc.steps.map((s) => s.fields)
    : [doc.fields ?? []];
  for (const list of roots) {
    const found = locateIn(list, id);
    if (found) return found;
  }
  return null;
}

function locateIn(list: BuilderField[], id: NodeId): Loc | null {
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    if (f._id === id) return { list, index: i };
    if (f.fields) {
      const inGroup = locateIn(f.fields, id);
      if (inGroup) return inGroup;
    }
    if (f.item) {
      if (f.item._id === id) return { list: [f.item], index: 0 };
      if (f.item.fields) {
        const inItem = locateIn(f.item.fields, id);
        if (inItem) return inItem;
      }
    }
  }
  return null;
}

function removeField(doc: BuilderDocument, id: NodeId): void {
  const loc = locate(doc, id);
  if (loc) loc.list.splice(loc.index, 1);
}

function cloneWithNewIds(f: BuilderField): BuilderField {
  const clone: BuilderField = structuredClone(f);
  reassignIds(clone);
  return clone;
}

function reassignIds(f: BuilderField): void {
  f._id = newId();
  if (f.fields) f.fields.forEach(reassignIds);
  if (f.item) reassignIds(f.item);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(n, hi));
}
