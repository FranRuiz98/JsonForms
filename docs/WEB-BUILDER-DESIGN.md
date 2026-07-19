# Web Builder — Design

A visual editor that produces the `FormConfig` JSON consumed by `signal-jsonforms`. Where the existing `demo` playground is *JSON in → rendered form out*, the **web-builder** app is the inverse: *drag/drop UI → `FormConfig` out*, with a live preview rendered by the real library so what you build is exactly what runs.

Target scope (agreed): drag-and-drop canvas, **near-full parity** with the config format (groups, arrays, wizard, dynamic logic, dynamic/async options, wrappers, layout), **round-trip** (import existing JSON to edit), and **live preview** using the actual `FormHost` + Material/HTML kits.

---

## 1. Guiding principle: `FieldConfig` is the source of truth

The builder does **not** invent a parallel model. Its document is the real `FormConfig`/`FieldConfig` tree from `core/model.ts`, decorated with one non-serialized field — a stable `_id` per node — used only for selection, drag identity, and history diffing.

```ts
// builder/model.ts
type NodeId = string;                       // uuid, builder-only

interface BuilderField extends FieldConfig {
  _id: NodeId;
  fields?: BuilderField[];                   // group children
  item?: BuilderField;                       // array item template
}

interface BuilderDocument {
  version?: string;
  id?: string;
  layout?: LayoutConfig;
  // Exactly one of these, mirroring FormConfig's zod exclusivity:
  fields?: BuilderField[];                   // flat form
  steps?: BuilderStep[];                     // wizard
  wizard?: WizardConfig;
}

interface BuilderStep extends StepConfig { _id: NodeId; fields: BuilderField[]; }
```

Serialization is a deep clone that strips every `_id`; import is a deep clone that assigns one. Because the builder edits the same shape the library consumes, parity is (almost) free — when `FieldConfig` grows a property, the builder's exporter already carries it; only the inspector UI for that property is new work. This is the single most important decision in the design: **no lossy intermediate model.**

### Round-trip contract

`import(serialize(doc))` must reproduce the same `FormConfig` (modulo `_id`), and `serialize(import(json))` must reproduce the same JSON (modulo migration/version stamping). This is a property test in Phase A and the guardrail for every later phase.

Export reuses the library's own `serializeForm` (canonical output, stamps `version`); import reuses `parseForm` (migrate → zod-validate) so legacy JSON upgrades on the way in. Nothing new is written for these — they already exist in `core/migration.ts`.

---

## 2. App shell & wiring

A new Angular **application** project `web-builder` under `projects/web-builder`, added to `angular.json`, consuming the libraries from `dist/` exactly like `demo` (same tsconfig `paths`, same build order: core → material → html → web-builder). It bootstraps with `provideJsonForms({ fieldTypes: MATERIAL_FIELD_TYPES, ... })` and also registers the HTML kit so the preview can toggle kits with the playground's existing per-form override pattern.

Standard three-pane layout:

**Left — Palette & Outline.** A catalogue of draggable field types grouped by category (Basic controls, Containers, Layout, Wizard) and a second tab with a structural **outline tree** of the current document for navigation and reordering on large forms.

**Center — Design canvas + Live preview.** A WYSIWYG canvas that mirrors the rendered form but is *editable* (selection, drag handles, drop zones), and a togglable/split **live preview** rendered by the real `FormHost`. See §4 for why these are two different renderers.

**Right — Inspector.** A context-sensitive property editor for the selected node; when nothing is selected it edits root-level form settings (layout, wizard on/off, version). See §5.

---

## 3. State: a signal-based `BuilderStore`

One injectable service, signal-first to match the project's ethos:

```ts
@Injectable({ providedIn: 'root' })
class BuilderStore {
  readonly document = signal<BuilderDocument>(emptyDoc());
  readonly selectedId = signal<NodeId | null>(null);

  // Fed straight into the live preview <jf-form [config]>:
  readonly formConfig = computed<FormConfig>(() => serialize(this.document()));

  // Continuous validation via the library's own zod schema:
  readonly validation = computed(() => tryValidate(this.formConfig()));

  // history for undo/redo (snapshot stacks)
  undo(): void; redo(): void;

  // structural mutations (each pushes a history snapshot):
  addNode(parentId, node, index): void;
  moveNode(id, newParentId, index): void;   // drag/drop + outline reorder
  updateNode(id, patch: Partial<FieldConfig>): void;
  duplicateNode(id): void;
  removeNode(id): void;
  setWizard(on: boolean): void;              // flat ⇄ wizard conversion
}
```

`formConfig` is a `computed`, so the live preview and the JSON export are always derived from one source; there is no sync problem. Validation is also a `computed` over `formConfig`, reusing `validateConfig` — errors surface live and gate export.

History is snapshot-based (structural clone of `document` pushed on each mutation, capped depth). Autosave persists the current document to `localStorage` (this is a real app, not a chat artifact — storage is fine here) so a refresh doesn't lose work.

---

## 4. Two renderers: design canvas vs. live preview

This is the subtle part. The real `FormHost`/`FieldRenderer` renders a *working* form; it deliberately exposes no per-field hooks for selection or drop targets, and it *hides* fields whose `hidden` DSL is true — which is exactly the field you might want to select while editing. So the canvas cannot simply be a `FormHost`.

**Design canvas — a builder-specific renderer.** A recursive component that walks the `BuilderDocument` (mirroring `FieldRenderer`'s control/group/array/step recursion) and wraps every node in builder chrome: a selection outline, a drag handle, duplicate/delete buttons, and drop zones between/inside nodes. Inside each wrapper it shows a lightweight, non-interactive *preview* of the control (label + a representative widget) — it does not need real validation or reactivity, just enough to be recognizable. Hidden/disabled fields are shown with a badge rather than removed, so they stay editable.

**Live preview — the real library.** A separate pane (toggle or split view) renders `formConfig()` through the actual `FormHost` with the selected kit. This is where dynamic logic, validation, cascading options, computed values and the wizard genuinely run, so the author sees true behavior. Selecting a field on the design canvas can scroll the live preview to the matching node, but the live preview itself is read-through, not editable.

Rejected alternative: render the real `FormHost` on the canvas and lay a hit-testing/drop-zone overlay on top via DOM measurement. It couples the builder to the adapter's DOM, breaks on hidden fields, and is fragile across kits. The two-renderer split keeps the builder decoupled from any component kit.

---

## 5. Inspector — property editing by node kind

The inspector is a set of collapsible sections whose visibility depends on the selected node's `type`/`kind`:

- **Identity** — `key` (with sibling-uniqueness validation and auto-suggest), `type` (palette-backed dropdown), `label`, `dataType` (defaulted from type, overridable).
- **Data** — `defaultValue` (typed by `dataType`), `props` (a small key/value editor for arbitrary control props like placeholder/min/step).
- **Validation** — a list editor over `ValidatorConfig[]`: pick `kind` (required/email/min/max/minLength/maxLength/pattern/expr/fn), set `value`/`message`/`when`; plus `asyncValidators[]` referencing registered names.
- **Logic** — `hidden`/`disabled`/`readonly`/`computed`, each an expression editor (§6).
- **Options** (select-like) — choose static `OptionItem[]` (inline list editor), or `{expr}` / `{fn}` / `{source, debounce}`; plus `clearOnOptionsChange`.
- **Layout** — `colSpan`, and for groups `layout.columns`/`gap`, `collapsible`/`collapsed`.
- **Wrappers** — ordered list of wrapper keys (stackable), drawn from the preview runtime's `WrapperRegistry`.
- **Behavior** — `clearOnHide`.

When nothing is selected, the inspector edits the **root**: `layout`, `version`, and the wizard toggle. Array nodes get a slot for their single `item` template; group nodes get their `fields` children (both edited on the canvas, not the inspector).

---

## 6. The hard parts (and how each is handled)

**Dynamic logic (DSL).** `hidden`/`disabled`/`readonly`/`computed` are jsep DSL strings (`{expr}`) or registered function names (`{fn}`). The inspector offers a raw expression field validated live against `jsep` (same parser the engine uses), with autocomplete hints for the available identifiers (`value`, `model`, `root`, `valueAt('a.b')`) and the sibling/field keys in scope. For the common case it also offers a **simple condition builder** (field · operator · value rows joined by and/or) that compiles down to a DSL string — power users can always drop to raw `expr`.

**Registered code is referenced, not authored.** Functions (`fn`), async validators, `optionSources`, and wrappers live in the app's `provideJsonForms` registries — they are code, not serializable JSON. The builder can only reference them by name. It reads the injected `JSON_FORMS_CONFIG` registries of the preview runtime and presents the *known* names as dropdowns, and warns when an imported config references a name the runtime doesn't have (the field still round-trips; it just won't resolve in preview). This limitation is called out in the UI so authors aren't surprised.

**Arrays.** An array node owns exactly one `item` template (typically a group). The canvas models it as an array container with a single item slot; dropping a field into an array either sets the item template (first drop) or, if the item is a group, drops into that group's `fields`. Repeat/add-remove behavior is exercised in the live preview, not the design canvas.

**Wizard ⇄ flat conversion.** `fields` and `steps` are mutually exclusive (zod-enforced). Turning the wizard on wraps the current top-level `fields` into a first step; turning it off concatenates all steps' fields back to flat. Steps are themselves drag-reorderable containers with `label`/`description`/`skipWhen`.

**Keys & validation.** Sibling key uniqueness is enforced on edit with auto-suggestion; the whole document is continuously run through `validateConfig`, and hard zod errors are shown inline and block export while allowing continued editing.

---

## 7. Drag & drop

Built on Angular CDK `DragDrop` (`@angular/cdk` is already a dependency). Palette entries are drag sources that create a fresh node on drop; canvas containers (root, each group, each array item slot, each wizard step) are connected, nested `cdkDropList`s supporting both reordering within a list and transfer between lists. Drop zones render explicit affordances (insertion lines, highlighted containers). Nested `cdkDropList` needs care (enter/exit predicates, `cdkDropListGroup`); the outline tree offers a non-DnD fallback for reordering deep structures.

---

## 8. Export / import / templates

Export offers: copy JSON, download `.json` (via `serializeForm`), and "open in playground" (hand the config to the demo). Import accepts pasted or uploaded JSON, runs it through `parseForm` (migrate + validate), assigns `_id`s, and loads it — malformed input shows the aggregated zod error. A **templates gallery** seeds new documents from the existing `examples.ts` levels (1–13), giving authors a running start and doubling as round-trip fixtures.

---

## 9. Reuse map

| Need | Reused from library |
|---|---|
| Live preview | `FormHostComponent`, `provideJsonForms`, Material/HTML kits |
| Export (canonical) | `serializeForm` |
| Import (migrate+validate) | `parseForm`, `migrateConfig` |
| Continuous validation | `validateConfig` (zod) |
| DSL validation/autocomplete | `jsep` (same parser as `expression-engine`) |
| Config types | `core/model.ts` |
| Kit toggle in preview | playground per-form override pattern |
| Seed templates / fixtures | `demo/examples.ts` |

Effectively the only genuinely new code is the builder shell, the `BuilderStore`, the design-canvas renderer, the inspector, and the DnD glue. Everything semantic (validation, migration, rendering, the config schema) is borrowed.

---

## 10. Phasing

**Phase A — skeleton & round-trip.** New `web-builder` project, three-pane shell, `BuilderStore`, serialize/import round-trip against JSON (with property test), live preview via `FormHost`, basic-control palette, add-by-click (no DnD yet), inspector for Identity/Data/Validation, export JSON. Milestone: build a simple flat form and confirm `import(serialize(doc)) === config`.

**Phase B — drag-drop & containers.** CDK palette→canvas drag, reorder, nested groups & arrays with drop zones, duplicate/delete, undo/redo, layout (colSpan/columns/collapsible), outline tree.

**Phase C — logic & options.** Expression editor + simple condition builder for hidden/disabled/readonly/computed; options (static/expr/fn/source) and wrappers driven by the injected registries; `clearOnHide`/`clearOnOptionsChange`; the "referenced not authored" warnings.

**Phase D — wizard & polish.** Wizard steps builder (reorder, `skipWhen`), templates gallery, keyboard shortcuts, autosave, accessibility pass, and tests: vitest for store/serialize/import/key-uniqueness, cypress for the DnD and export flows.

---

## 11. Open decisions

- **Canvas fidelity.** How faithful should the design-canvas control previews be? Recommendation: minimal recognizable widgets, not the real controls — keeps the canvas decoupled and fast; the live preview covers fidelity.
- **Condition builder depth.** Ship the simple (field/op/value) builder in Phase C and always allow raw `expr`, or defer the visual builder and start raw-only? Recommendation: raw-first, visual condition builder as a Phase C stretch.
- **Registry introspection.** Read names from the injected `JSON_FORMS_CONFIG`, or let the author type free-form names? Recommendation: dropdown from the runtime plus free-text with an "unknown name" warning.
