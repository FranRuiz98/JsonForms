# signal-jsonforms

Build dynamic Angular forms from a JSON definition, on top of **Angular Signal Forms**
(`@angular/forms/signals`, Angular v21+). The library is agnostic of any component
kit and integrates with one through a small **field-type registry**. Think Formly /
jsonforms.io, but signal-native.

- **`signal-jsonforms`** — the core engine (UI-agnostic).
- **`signal-jsonforms-material`** — reference adapter built on Angular Material.
- **`signal-jsonforms-html`** — zero-dependency plain-HTML adapter.

For the architecture and design rationale see [`DESIGN.md`](./DESIGN.md).

---

## Table of contents

1. [Installation](#installation)
2. [Quick start](#quick-start)
3. [The `<jf-form>` component](#the-jf-form-component)
4. [JSON definition format](#json-definition-format)
   - [Field](#field)
   - [Field types](#field-types)
   - [Validators](#validators)
   - [Dynamic logic (hidden / disabled / readonly)](#dynamic-logic)
   - [Computed (derived) fields](#computed-derived-fields)
   - [Groups and arrays](#groups-and-arrays)
   - [Layout (columns and sections)](#layout-columns-and-sections)
5. [The expression DSL](#the-expression-dsl)
6. [Registries (`provideJsonForms`)](#registries-providejsonforms)
7. [Centralized error messages (i18n)](#centralized-error-messages-i18n)
8. [Building a component adapter](#building-a-component-adapter)
9. [Wrappers](#wrappers)
10. [Per-form kit override](#per-form-kit-override)
11. [Low-level API (`buildSignalForm`)](#low-level-api-buildsignalform)
12. [Migration & serialization](#migration--serialization)
13. [Building the libraries in this monorepo](#building-the-libraries-in-this-monorepo)

---

## Installation

```bash
npm install signal-jsonforms signal-jsonforms-material
# or the plain-HTML adapter, or your own:
npm install signal-jsonforms signal-jsonforms-html
```

Peer dependencies of the core: `@angular/common`, `@angular/core`, `@angular/forms`
(all `^21.2`), plus `jsep` (DSL parser) and `zod` (definition validation).

> In this repository the packages are not published to npm; they are built locally
> to `dist/` — see [Building the libraries](#building-the-libraries-in-this-monorepo).

---

## Quick start

**1. Register a component kit** (and any helpers) once, at bootstrap:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideJsonForms } from 'signal-jsonforms';
import { MATERIAL_FIELD_TYPES } from 'signal-jsonforms-material';

export const appConfig: ApplicationConfig = {
  providers: [
    provideJsonForms({
      fieldTypes: MATERIAL_FIELD_TYPES,
    }),
  ],
};
```

**2. Drop a `<jf-form>` and bind a definition and a model:**

```ts
// my.component.ts
import { Component, signal } from '@angular/core';
import { FormConfig, FormHostComponent } from 'signal-jsonforms';

@Component({
  selector: 'my-form',
  imports: [FormHostComponent],
  template: `
    <jf-form [schema]="schema()" [(model)]="data" #f="jfForm"></jf-form>
    <button [disabled]="f.invalid()" (click)="f.submit(save)">Save</button>
  `,
})
export class MyForm {
  protected readonly schema = signal<FormConfig>({
    version: '1',
    fields: [
      { key: 'name', type: 'text', label: 'Name', validators: [{ kind: 'required' }] },
      { key: 'email', type: 'text', label: 'Email', validators: [{ kind: 'required' }, { kind: 'email' }] },
    ],
  });

  protected readonly data = signal<Record<string, unknown>>({});

  protected readonly save = (value: Record<string, unknown>) => {
    console.log('Submitted:', value);
  };
}
```

That's it — the JSON drives the structure, validation and behaviour; `data` holds the
live model.

---

## The `<jf-form>` component

`selector: jf-form`, `exportAs: jfForm`.

| Input / member | Type | Description |
| --- | --- | --- |
| `[schema]` | `FormConfig` | The JSON definition. **Required.** |
| `[(model)]` | `Record<string, unknown>` | Two-way bound form data (source of truth). |
| `[config]` | `JsonFormsConfig` | Optional per-form registry override (see [kit override](#per-form-kit-override)). |
| `form()` | `FieldTree \| null` | The underlying Signal Forms root node. |
| `invalid()` | `boolean` | `true` while the form is invalid (or not yet built). |
| `submit(action)` | `(value) => void \| Promise<void>` | Marks everything touched and runs `action` if valid. |

```html
<jf-form [schema]="schema()" [(model)]="data" #f="jfForm"></jf-form>

<button [disabled]="f.invalid()" (click)="f.submit(onSubmit)">Submit</button>
```

---

## JSON definition format

A definition is a `FormConfig`:

```ts
interface FormConfig {
  version?: string;     // used by migrations (see below)
  id?: string;
  layout?: LayoutConfig; // root column grid
  fields: FieldConfig[];
}
```

### Field

```jsonc
{
  "key":          "fieldName",   // unique within its level (required)
  "type":         "text",        // UI type — see the table below (required)
  "dataType":     "string",      // string | number | boolean (inferred when omitted)
  "label":        "Label",
  "defaultValue": "",
  "props": {
    "placeholder": "...",         // ghost text inside the control
    "hint":        "...",         // help text below the field
    "description": "...",         // descriptive text above the field
    "options":     [{ "value": "v", "label": "L" }]  // select only
  },
  "validators":      [ /* ... */ ],
  "asyncValidators": [ { "kind": "key", "debounce": 400 } ],
  "hidden":   { "expr": "..." },  // or { "fn": "key" }
  "disabled": { "expr": "..." },  // or { "fn": "key" }
  "readonly": { "expr": "..." },  // or { "fn": "key" }
  "computed": { "expr": "model.a + model.b" },  // derived, read-only
  "wrapper":  "key",              // wrapper from the registry
  "layout":   { "columns": 2 },   // grid for a group's children
  "colSpan":  2,                  // columns this field spans in a grid
  "collapsible": true,            // group only — foldable section
  "collapsed":   false,           // group only — initially folded
  "fields":   [ /* ... */ ],      // type: "group" only
  "item":     { /* ... */ }       // type: "array" only
}
```

`dataType` is inferred from `type` when omitted: `checkbox → boolean`, `number → number`,
everything else `→ string`. Declare it explicitly only when the visual type differs from
the stored data type.

### Field types

The reference adapters register these `type` keys:

| `type` | Control | Model value |
| --- | --- | --- |
| `text` (also `password`, `email`) | Text input | `string` |
| `number` | Numeric input | `number` |
| `select` | Dropdown (`props.options`) | `string` |
| `checkbox` | Boolean checkbox | `boolean` |
| `group` | Nested object (`fields`) | `{ ... }` |
| `array` | Repeatable list (`item`) | `[{ ... }]` |

You can register any other `type` key by mapping it to a component (see
[Building a component adapter](#building-a-component-adapter)).

### Validators

Declared under `validators` (sync) and `asyncValidators`. All sync validators accept an
optional `"message"`.

**Standard (self-contained):**

```jsonc
{ "kind": "required" }
{ "kind": "email" }
{ "kind": "min",       "value": 18  }
{ "kind": "max",       "value": 100 }
{ "kind": "minLength", "value": 3   }
{ "kind": "maxLength", "value": 50  }
{ "kind": "pattern",   "value": "^[A-Z]{2}[0-9]+$" }
```

**Cross-field with the DSL** — valid when the expression is truthy:

```jsonc
{ "kind": "expr", "expr": "value === model.email", "message": "Emails do not match" }
```

**Registered synchronous (kind `fn`)** — references `provideJsonForms().validators`:

```jsonc
{ "kind": "fn", "fn": "passwordStrength" }
```

**Asynchronous** — references `provideJsonForms().asyncValidators`; `debounce` (ms)
throttles requests:

```jsonc
"asyncValidators": [ { "kind": "uniqueEmail", "debounce": 400 } ]
```

### Dynamic logic

`hidden`, `disabled` and `readonly` are reactive conditions re-evaluated whenever the
model changes. Each accepts a DSL expression or a registered function:

```jsonc
{ "hidden":   { "expr": "model.accountType !== 'business'" } }
{ "disabled": { "expr": "!model.subscribe" } }
{ "readonly": { "fn": "lockedForGuests" } }
```

A hidden field is not rendered. (Note: hidden fields still validate — keep them optional
if they should not block submission.)

### Computed (derived) fields

A `computed` field becomes **read-only** and its value is derived reactively from the
model. Use a DSL expression or a registered function:

```jsonc
{ "key": "subtotal", "type": "number", "computed": { "expr": "model.unitPrice * model.quantity" } }
{ "key": "fullName", "type": "text",   "computed": { "expr": "model.firstName + ' ' + model.lastName" } }
{ "key": "grandTotal", "type": "number", "computed": { "fn": "sumLines" } }
```

Computed fields **chain**: if `tax` depends on `subtotal` and `total` on both, edits
propagate down until everything stabilizes.

Computed works at the **root**, inside **groups**, and inside **array items**. Inside an
array item, `model` is the **current item** (so `model.qty * model.price` references that
row's fields) and `root` is the whole model (see the [DSL](#the-expression-dsl)).

### Groups and arrays

```jsonc
// Nested object
{ "key": "address", "type": "group", "label": "Address",
  "fields": [
    { "key": "street", "type": "text", "label": "Street" },
    { "key": "city",   "type": "text", "label": "City" }
  ]
}
// → model: { address: { street: "...", city: "..." } }

// Repeatable list (Add / Remove buttons generated automatically)
{ "key": "contacts", "type": "array", "label": "Contacts",
  "item": {
    "key": "contact", "type": "group",
    "fields": [
      { "key": "name",  "type": "text" },
      { "key": "phone", "type": "text" }
    ]
  }
}
// → model: { contacts: [ { name: "...", phone: "..." }, ... ] }
```

The `item.key` does not appear in the model; only the inner `fields` keys are stored at
each array position. Validation and conditions work at any nesting depth.

### Layout (columns and sections)

Layout is **purely presentational** — it never changes the model shape or paths.

```jsonc
{
  "layout": { "columns": 2, "gap": "0.75rem 1rem" },   // root or any group
  "fields": [
    { "key": "firstName", "type": "text" },
    { "key": "lastName",  "type": "text" },
    { "key": "email", "type": "text", "colSpan": 2 },  // spans both columns
    { "key": "billing", "type": "group", "label": "Billing",
      "collapsible": true, "collapsed": true,           // foldable section
      "colSpan": 2,
      "layout": { "columns": 2 },                       // its own inner grid
      "fields": [ /* ... */ ] }
  ]
}
```

- `layout.columns` turns a container (the root config or a group) into a CSS grid.
- `colSpan` makes a field span N columns of its parent grid.
- `collapsible` / `collapsed` turn a group into a foldable section.
- Put `layout` on the **root** to place top-level fields side by side without nesting them.

The grid is applied with inline styles, so it works the same with any component kit.

---

## The expression DSL

A safe, JavaScript-like expression evaluator (no `eval`, no function calls, no globals).
Used in `hidden`, `disabled`, `readonly`, `computed`, and `expr` validators. The syntax
tree is parsed once and re-evaluated reactively with signals.

**Identifiers**

| Identifier | Meaning |
| --- | --- |
| `value` | The current field's value |
| `model.x` | Field `x` at the form root (or, inside an array item's `computed`, that item's field) |
| `model.group.x` | Field `x` inside group `group` |
| `root.x` | The whole-model root — reach outer fields from inside an array item's `computed` |

**Operators:** `=== !== < > <= >=` (comparison), `&& || !` (logical), `+ - * / %`
(arithmetic), `cond ? a : b` (ternary), `( )` (grouping).

```jsonc
"model.plan !== 'pro'"
"value === model.password"
"value >= 18 && value <= 65"
"model.accountType === 'business' && !!value"
```

For anything that does not fit (services, HTTP, complex math), use a registered function.

---

## Registries (`provideJsonForms`)

`provideJsonForms(config)` registers everything the JSON references by key:

```ts
provideJsonForms({
  fieldTypes,        // type (string)  -> Angular component
  wrappers,          // wrapper key    -> Angular component
  defaultWrapper,    // wrapper key applied to controls by default
  validators,        // kind 'fn'      -> SyncValidatorFn
  asyncValidators,   // async kind     -> AsyncValidatorDef
  functions,         // hidden/disabled/readonly/computed { fn }
  messages,          // centralized error text by kind (i18n)
  migrations,        // upgrade older definition versions
});
```

Registered **functions** and **validators** receive a `DynamicContext`:

```ts
interface DynamicContext {
  value: () => unknown;                       // current field value
  model: () => Record<string, unknown>;       // whole model (or the item, inside array computed)
  valueAt: (path: string) => unknown;         // another field by dotted path, e.g. 'address.city'
  root?: () => Record<string, unknown>;       // whole-model root (set for computed)
}
```

```ts
provideJsonForms({
  functions: {
    isAdmin: (ctx) => ctx.valueAt('role') === 'admin',
    sumLines: (ctx) =>
      (ctx.model() as any).lines?.reduce((s: number, l: any) => s + (+l.lineTotal || 0), 0) ?? 0,
  },
  validators: {
    passwordStrength: (ctx) => {
      const v = String(ctx.value() ?? '');
      return v.length >= 8 ? undefined : { kind: 'weak', message: 'Minimum 8 characters' };
    },
  },
  asyncValidators: {
    uniqueEmail: {
      params: ({ value }) => value(),
      factory: (email) =>
        resource({ params: email, loader: async ({ params }) => api.isTaken(params) }),
      onSuccess: (taken) => (taken ? { kind: 'taken', message: 'Already in use' } : undefined),
      onError: () => ({ kind: 'error', message: 'Could not validate' }),
    },
  },
});
```

> **Why async lives only in the registry:** async validators need an Angular `resource`
> with `params` / `factory` / `onSuccess` / `onError`, which is not serializable in JSON.
> The JSON only references the `kind`.

---

## Centralized error messages (i18n)

`messages` maps a validator `kind` to a message. Error text is resolved with the priority:

1. the field's own `"message"`,
2. `messages[kind]` (centralized / localizable),
3. the engine's built-in default.

`{value}` is interpolated from the rule, and missing messages on `fn` / async results are
also filled from the dictionary by their `kind`.

```ts
provideJsonForms({
  messages: {
    required:  'This field is required',
    email:     'Enter a valid email',
    minLength: 'At least {value} characters',
    weak:      'Password too weak',     // also fills fn/async results of kind "weak"
  },
});
```

Swap the dictionary to localize the whole form without touching the JSON.

---

## Building a component adapter

The core ships no widgets. An adapter is just a map of `type` → component, where each
component implements a tiny contract:

```ts
import { FieldComponent, FieldConfig, FieldTree, FormField } from 'signal-jsonforms';

@Component({
  selector: 'my-text-field',
  imports: [FormField],
  template: `
    <label>{{ config().label }}</label>
    <input [formField]="$any(field())" [placeholder]="$any(config().props?.['placeholder']) ?? ''" />
    @if (field()().touched() && field()().errors().length) {
      <small>{{ field()().errors()[0].message }}</small>
    }
  `,
})
export class MyTextField implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
}
```

```ts
export const MY_FIELD_TYPES: FieldTypeRegistry = {
  text: MyTextField,
  number: MyNumberField,
  select: MySelectField,
  checkbox: MyCheckboxField,
};
```

Notes:
- `field()` is the structural **`FieldTree` node** — bind it to `[formField]`. Use
  `$any(field())` because the directive is strongly typed to the value type while the
  renderer is dynamic.
- `field()()` is the **`FieldState`** — call `.value()`, `.valid()`, `.errors()`,
  `.touched()`, `.pending()`, `.hidden()`, etc.
- `FormField` (the binding directive) is re-exported by the core, so the adapter never
  imports `@angular/forms/signals` directly.

The same JSON renders with any registry — that is the whole point of the agnostic core.

---

## Wrappers

A **wrapper** instantiates a control and adds shared chrome around it (label, description,
hint, error, the "Checking…" pending indicator). Register wrappers and pick a default:

```ts
import { JfFieldWrapperComponent } from 'signal-jsonforms';

provideJsonForms({
  fieldTypes: MY_FIELD_TYPES,
  wrappers: { default: JfFieldWrapperComponent },
  defaultWrapper: 'default',
});
```

- `JfFieldWrapperComponent` (core) adds description / hint / pending around controls that
  already render their own label/errors (e.g. Material).
- The plain-HTML adapter ships `HtmlFieldWrapperComponent`, which renders the **full**
  chrome (label, error, hint, pending) because its controls are "naked" inputs.
- A field can pick a specific wrapper with `"wrapper": "key"`; otherwise `defaultWrapper`
  applies. A wrapper component receives `node: FieldNode` and `field: FieldTree` inputs.

---

## Per-form kit override

`<jf-form>` accepts an optional `[config]` that overrides the global registry for **that
form's subtree** (per-property merge: what you pass wins, the rest is inherited). Handy to
render the same definition with a different component kit:

```ts
import { HTML_FIELD_TYPES, HtmlFieldWrapperComponent } from 'signal-jsonforms-html';

readonly htmlKit = {
  fieldTypes: HTML_FIELD_TYPES,
  wrappers: { default: HtmlFieldWrapperComponent },
  defaultWrapper: 'default',
};
```

```html
<jf-form [schema]="schema()" [config]="htmlKit" [(model)]="data"></jf-form>
```

The override is read when the form is built, so to switch kits live you must recreate the
`<jf-form>` (e.g. bump a key in a `@for`/`@if`).

---

## Low-level API (`buildSignalForm`)

When you need the `FieldTree` directly (custom hosts, testing, validation-only), call the
low-level builder. It runs the full pipeline: migrate → validate (zod) → build initial
model → compile schema → `form()`, and wires the computed effects.

```ts
import { buildSignalForm } from 'signal-jsonforms';

const { form, model, definition } = buildSignalForm(jsonConfig, {
  injector,                 // required (form() and effects need an injection context)
  model?,                   // optional WritableSignal to reuse (two-way binding)
  registries?,              // same shape as provideJsonForms
  validate?,                // false to skip zod validation
});
```

---

## Migration & serialization

Definitions are versioned via `version`. As the format evolves, register migrations to
upgrade older definitions to the current version. `<jf-form>` applies them automatically
**before validating**, so old JSON keeps working.

```ts
provideJsonForms({
  migrations: [
    { from: '0', to: '1', migrate: (config) => ({ ...config, /* transform */ }) },
  ],
});
```

Programmatic helpers:

```ts
import { parseForm, serializeForm, migrateConfig, CURRENT_VERSION } from 'signal-jsonforms';

const config   = parseForm(jsonString, { migrations });  // JSON.parse → migrate → validate
const json     = serializeForm(config);                  // canonical JSON, stamps the version
const upgraded = migrateConfig(rawObject, migrations);   // just the migration step
```

`migrateConfig` follows the chain of migrations matched by `from`, detects cycles, and
throws a clear error when no path to `CURRENT_VERSION` exists.

---

## Building the libraries in this monorepo

The libraries are consumed from `dist/`. Build them in dependency order, then serve the
demo playground:

```bash
npm install
npm run build-core           # signal-jsonforms       -> dist/
npm run build-mat-adapter    # signal-jsonforms-material
npm run build-html-adapter   # signal-jsonforms-html
npm start                    # serves the demo playground
```

During development of a library, run it in watch mode in another terminal
(`ng build signal-jsonforms --watch`) so the demo picks up changes.

> The `paths` in the root `tsconfig.json` point to `dist/` (not source). This is the
> canonical Angular monorepo setup: it avoids ng-packagr's `referencedFiles` error and the
> `@angular/build` friction caused by path-mapping to library sources.

---

For the engine internals and the reasoning behind each decision, see
[`DESIGN.md`](./DESIGN.md).
