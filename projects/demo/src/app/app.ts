import { JsonPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Injector,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormConfig,
  FormHostComponent,
  JSON_FORMS_CONFIG,
  buildSignalForm,
} from 'signal-jsonforms';
import { EXAMPLES } from './examples';

@Component({
  selector: 'app-root',
  imports: [FormHostComponent, JsonPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit {
  private readonly injector = inject(Injector);
  private readonly registries = inject(JSON_FORMS_CONFIG);

  private readonly editorRef =
    viewChild.required<ElementRef<HTMLTextAreaElement>>('editor');

  protected readonly examples = EXAMPLES;
  protected readonly activeId = signal(EXAMPLES[0].id);
  protected readonly activeExample = computed(() =>
    this.examples.find((e) => e.id === this.activeId()),
  );

  protected readonly editorText = signal(pretty(EXAMPLES[0].config));
  protected readonly appliedConfig = signal<FormConfig | null>(EXAMPLES[0].config);
  protected readonly formRev = signal(0);
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<Record<string, unknown>>({});
  protected readonly refOpen = signal(false);
  protected readonly refTab = signal<RefTab>('field');
  protected readonly archOpen = signal(false);
  protected readonly archTab = signal<ArchTab>('overview');

  protected readonly refTabs: ReadonlyArray<{ id: RefTab; icon: string; label: string }> = [
    { id: 'field',      icon: '◆', label: 'Field structure' },
    { id: 'types',      icon: '▦', label: 'Field types' },
    { id: 'validators', icon: '✓', label: 'Validators' },
    { id: 'structure',  icon: '⊞', label: 'Groups and arrays' },
    { id: 'dsl',        icon: 'ƒ', label: 'Expression DSL' },
    { id: 'registered', icon: '⚙', label: 'Registered functions' },
  ];

  protected readonly archTabs: ReadonlyArray<{ id: ArchTab; icon: string; label: string }> = [
    { id: 'overview',  icon: '◈', label: 'Overview' },
    { id: 'layers',    icon: '⊟', label: 'System layers' },
    { id: 'engine',    icon: '⚙', label: 'Engine' },
    { id: 'dsl',       icon: 'ƒ', label: 'Hybrid logic' },
    { id: 'renderer',  icon: '▦', label: 'Renderer and components' },
  ];

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  // ── API reference content ──────────────────────────────────────────────

  protected readonly fieldTypes = [
    { type: 'text',     desc: 'Free text input',    model: '"text"',             req: '—' },
    { type: 'number',   desc: 'Numeric input',      model: '42',                 req: '—' },
    { type: 'select',   desc: 'Dropdown',           model: '"option-value"',     req: 'props.options' },
    { type: 'checkbox', desc: 'Boolean checkbox',   model: 'true / false',       req: '—' },
    { type: 'group',    desc: 'Field group',        model: '{ field: value }',   req: 'fields: [...]' },
    { type: 'array',    desc: 'Repeatable list',    model: '[{ field: value }]', req: 'item: { ... }' },
  ];

  protected readonly ref = {
    field: [
      '  "key":          "fieldName",  // unique per form (required)',
      '  "type":         "text",       // UI type — see Types table (required)',
      '  "dataType":     "string",     // string | number | boolean',
      '  "label":        "Label",',
      '  "defaultValue": "",',
      '  "props": {',
      '    "placeholder":  "...",',
      '    "hint":         "Text below the field",',
      '    "description":  "Text above the field",',
      '    "options": [{ "value": "v", "label": "L" }]  // select only',
      '  },',
      '  "validators":      [...],',
      '  "asyncValidators": [{ "kind": "key", "debounce": 400 }],',
      '  "hidden":   { "expr": "..." }  // or  { "fn": "key" }',
      '  "disabled": { "expr": "..." }  // or  { "fn": "key" }',
      '  "readonly": { "expr": "..." }  // or  { "fn": "key" }',
      '  "fields":   [...],             // type: group only',
      '  "item":     { ... }            // type: array only',
    ].join('\n'),

    validators: [
      '// ─ Standard (self-contained): ─────────────────────────',
      '{ "kind": "required" }',
      '{ "kind": "email" }',
      '{ "kind": "min",       "value": 18  }',
      '{ "kind": "max",       "value": 100 }',
      '{ "kind": "minLength", "value": 3   }',
      '{ "kind": "maxLength", "value": 50  }',
      '{ "kind": "pattern",   "value": "^[A-Z]{2}[0-9]+$" }',
      '',
      '// All support: "message": "Custom error text"',
      '',
      '// ─ Cross-field with DSL (self-contained): ─────────────',
      '{ "kind": "expr",',
      '  "expr": "value === model.email",',
      '  "message": "Emails do not match" }',
      '',
      '// ─ Registered synchronous custom: ──────────────────────',
      '{ "kind": "fn", "fn": "registeredName" }',
      '',
      '// ─ Registered async: ────────────────────────────────────',
      '{ "kind": "asyncName", "debounce": 400 }',
    ].join('\n'),

    dsl: [
      '// Identifiers:',
      '//   value     → current field value',
      '//   model.x   → another form field',
      '//   model.a.b → field nested inside a group',
      '',
      '// Operators:',
      '//   ===  !==  <  >  <=  >=   (comparison)',
      '//   &&   ||   !               (logical)',
      '//   +  -  *  /  %             (arithmetic)',
      '//   cond ? a : b              (ternary)',
      '',
      '// Examples:',
      "model.plan !== 'pro'",
      'value === model.email',
      'value >= 18 && value <= 65',
      "model.accountType === 'business' && !!value",
      '!model.subscribe',
    ].join('\n'),

    structure: [
      '// Nested group ──────────────────────────────────────────',
      '{ "key": "address", "type": "group", "label": "Address",',
      '  "fields": [',
      '    { "key": "street", "type": "text",',
      '      "dataType": "string", "label": "Street" },',
      '    { "key": "city",   "type": "text",',
      '      "dataType": "string", "label": "City" }',
      '  ]',
      '}',
      '',
      '// Repeatable array ──────────────────────────────────────',
      '{ "key": "contacts", "type": "array", "label": "Contacts",',
      '  "item": {',
      '    "key": "contact", "type": "group",',
      '    "fields": [',
      '      { "key": "name",  "type": "text",',
      '        "dataType": "string", "label": "Name" },',
      '      { "key": "phone", "type": "text",',
      '        "dataType": "string", "label": "Phone" }',
      '    ]',
      '  }',
      '}',
    ].join('\n'),

    registered: [
      '// ─ Declare in app.config.ts / provideJsonForms(): ─────',
      'provideJsonForms({',
      '  // Conditions for hidden / disabled / readonly:',
      '  functions: {',
      "    isAdmin: (ctx) => ctx.valueAt('role') === 'admin',",
      '  },',
      '',
      "  // Synchronous validators — { kind: 'fn', fn: 'key' }:",
      '  validators: {',
      '    strong: (ctx) => {',
      "      const v = String(ctx.value() ?? '');",
      '      return v.length >= 8',
      '        ? undefined',
      "        : { kind: 'weak', message: 'Minimum 8 characters' };",
      '    },',
      '  },',
      '',
      '  // Async validators — { kind: "key", debounce: N }:',
      '  asyncValidators: {',
      '    checkUser: {',
      '      params:    ({ value }) => value(),',
      '      factory:   (sig) => resource({ params: sig,',
      '                   loader: async ({ params }) => ... }),',
      '      onSuccess: (taken) => taken',
      "        ? { kind: 'taken', message: 'Already exists' }",
      '        : undefined,',
      "      onError: () => ({ kind: 'error', message: '...' }),",
      '    },',
      '  },',
      '});',
      '',
      '// ─ Reference in JSON: ───────────────────────────────────',
      '"hidden":  { "fn": "isAdmin" }',
      '{ "kind": "fn",        "fn": "strong" }',
      '{ "kind": "checkUser", "debounce": 400 }',
    ].join('\n'),
  };

  // ── Architecture content ───────────────────────────────────────────────

  protected readonly arch = {
    layers: [
      '┌──────────────────────────────────────────────────────────────────────┐',
      '│  Consumer (app)                                                       │',
      '│  · Defines the JSON form configuration                               │',
      '│  · Registers: field types · validators · functions                   │',
      '└──────────────────┬───────────────────────────────────────────────────┘',
      '                   │  <jf-form [schema]="json" [(model)]="data">',
      '┌──────────────────▼───────────────────────────────────────────────────┐',
      '│  RENDER layer  (UI-agnostic)                                         │',
      '│  · FormHost · FieldRenderer (recursive)                              │',
      '│  · FieldTypeRegistry: type (string) → Angular component              │',
      '└──────────────────┬───────────────────────────────────────────────────┘',
      '                   │  FieldTree + normalized configuration',
      '┌──────────────────▼───────────────────────────────────────────────────┐',
      '│  ENGINE layer  (core, no UI dependencies)                            │',
      '│  · Parser/Normalizer: JSON → FieldNode[]                             │',
      '│  · ModelBuilder: FieldNode[] → signal(initial model)                 │',
      '│  · SchemaCompiler: FieldNode[] → dynamic schemaFn                    │',
      '│  · ExpressionEngine (DSL) · FunctionRegistry · ValidatorRegistry     │',
      '└──────────────────┬───────────────────────────────────────────────────┘',
      '                   │  isolated calls to the experimental API',
      '┌──────────────────▼───────────────────────────────────────────────────┐',
      '│  ADAPTER layer  (anti-corruption layer)                              │',
      '│  · The only module that imports @angular/forms/signals               │',
      '│  · form() · validate() · validateAsync() · applyWhen()              │',
      '│  · required · email · min · max · minLength · maxLength              │',
      '└──────────────────────────────────────────────────────────────────────┘',
    ].join('\n'),

    engine: [
      '// 1. Parser / Normalizer  ───────────────────────────────────────────',
      '// JSON → FieldNode[]  (validates against meta-schema, assigns absolute paths)',
      'const nodes: FieldNode[] = parse(json);',
      '// nodes[0] = { key: "city", path: ["address","city"],',
      '//              dataType: "string", validators: [...] }',
      '',
      '// 2. ModelBuilder  ──────────────────────────────────────────────────',
      '// FieldNode[] → initial object → signal()',
      'const model = signal(buildInitialModel(nodes));',
      '// → signal({ name: "", age: 0, address: { street: "", city: "" } })',
      '',
      '// 3. SchemaCompiler  ─────────────────────────────────────────────────',
      '// Key insight: path[key] at runtime is identical to path.key at compile-time',
      'const resolvePath = (root: any, keys: string[]) =>',
      '  keys.reduce((p, k) => p[k], root);',
      '',
      'const schemaFn = (path: any) => {',
      '  for (const node of nodes) {',
      '    const p = resolvePath(path, node.path);',
      '    // node.path = ["address","city"]  →  p = path.address.city',
      '    applyStandardValidators(p, node.validators);',
      '    applyCustomValidators(p, node.customValidators, path);',
      '    if (node.condition) applyWhen(p, node.condition, schemaFnFor(node));',
      '  }',
      '};',
      '',
      '// 4. Assembly  ────────────────────────────────────────────────────────',
      '// Delegated to the adapter layer (sole importer of Signal Forms)',
      'const form = adapter.form(model, schemaFn, { injector });',
    ].join('\n'),

    dsl: [
      '// ─ Expression DSL (self-contained, no eval) ─────────────────────',
      '// Safe AST: no access to window, document, or global functions',
      '// Available in: hidden · disabled · readonly · validators "expr"',
      '"hidden":   { "expr": "model.plan !== \'pro\'" }',
      '"disabled": { "expr": "!model.createAccount" }',
      '"readonly": { "expr": "model.status === \'confirmed\'" }',
      '{ "kind": "expr",',
      '  "expr": "value === model.password",',
      '  "message": "Passwords do not match" }',
      '',
      '// ─ Registered functions (TypeScript + Angular DI) ───────────────',
      '// For logic that does not fit in the DSL: services, HTTP, closures...',
      'provideJsonForms({',
      '  functions: {                          // hidden/disabled/readonly',
      "    adminOnly: ({ valueAt }) => valueAt('role') === 'admin',",
      '  },',
      '  validators: {                         // { "kind": "fn", "fn": "strong" }',
      '    strong: ({ value }) => {',
      "      const v = String(value() ?? '');",
      "      return v.length >= 8 ? undefined : { kind: 'weak', message: 'Weak' };",
      '    },',
      '  },',
      '  asyncValidators: {                    // always in registry, never in DSL',
      '    freeEmail: {',
      '      params:    ({ value }) => value(),',
      '      factory:   (email) => resource({',
      '                   params: email,',
      '                   loader: async ({ params }) => api.check(params) }),',
      "      onSuccess: (taken) => taken ? { kind: 'taken', message: 'Already exists' } : undefined,",
      "      onError:   () => ({ kind: 'err', message: 'Network error' }),",
      '    },',
      '  },',
      '});',
    ].join('\n'),

    renderer: [
      '// ─ 1. Register field types ──────────────────────────────────────',
      'provideJsonForms({',
      '  fieldTypes: {',
      '    text:     MatTextFieldComponent,',
      '    number:   MatNumberFieldComponent,',
      '    select:   MatSelectFieldComponent,',
      '    checkbox: MatCheckboxFieldComponent,',
      '  },',
      '});',
      '',
      '// ─ 2. Minimum contract for any field component ──────────────────',
      'export interface FieldComponent {',
      '  field:  FieldTree<unknown>;  // structural node → [formField]',
      '  config: FieldConfig;         // label, props, type, key...',
      '}',
      '',
      '// ─ 3. Example: Angular Material adapter ─────────────────────────',
      '@Component({',
      '  template: `',
      '    <mat-form-field>',
      '      <mat-label>{{ config.label }}</mat-label>',
      '      <input matInput [formField]="field"',
      "             [placeholder]=\"config.props?.placeholder ?? ''\" />",
      '      @if (field().touched() && field().errors().length) {',
      '        <mat-error>{{ field().errors()[0].message }}</mat-error>',
      '      }',
      '    </mat-form-field>',
      '  `',
      '})',
      'export class MatTextFieldComponent implements FieldComponent {',
      '  field  = input.required<FieldTree<unknown>>();',
      '  config = input.required<FieldConfig>();',
      '}',
    ].join('\n'),
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.editorRef().nativeElement.value = this.editorText();
  }

  // ── Actions ───────────────────────────────────────────────────────────

  protected loadExample(id: string): void {
    const ex = this.examples.find((e) => e.id === id);
    if (!ex) return;
    this.activeId.set(id);
    this.setEditorText(pretty(ex.config));
    this.apply(this.editorText(), true);
  }

  protected onInput(event: Event): void {
    const text = (event.target as HTMLTextAreaElement).value;
    this.editorText.set(text);
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.apply(text, false), 450);
  }

  protected format(): void {
    try {
      this.setEditorText(JSON.stringify(JSON.parse(this.editorText()), null, 2));
      this.apply(this.editorText(), false);
    } catch {
      /* error banner already handles it */
    }
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.editorText());
    } catch {
      /* clipboard not available */
    }
  }

  protected resetData(): void {
    this.data.set({});
    this.formRev.update((r) => r + 1);
  }

  protected readonly onSubmit = (value: Record<string, unknown>): void => {
    console.log('Form submitted:', value);
    window.alert('Form is valid and submitted. Check the console to see the value.');
  };

  private setEditorText(text: string): void {
    this.editorText.set(text);
    const el = this.editorRef().nativeElement;
    if (el) el.value = text;
  }

  private apply(text: string, resetData: boolean): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      this.error.set('Invalid JSON: ' + (e as Error).message);
      return;
    }

    try {
      buildSignalForm(parsed as FormConfig, {
        injector: this.injector,
        model: signal<Record<string, unknown>>({}),
        registries: this.registries,
      });
    } catch (e) {
      this.error.set((e as Error).message);
      return;
    }

    this.error.set(null);
    if (resetData) this.data.set({});
    this.appliedConfig.set(parsed as FormConfig);
    this.formRev.update((r) => r + 1);
  }
}

type RefTab = 'field' | 'types' | 'validators' | 'structure' | 'dsl' | 'registered';
type ArchTab = 'overview' | 'layers' | 'engine' | 'dsl' | 'renderer';

function pretty(config: FormConfig): string {
  return JSON.stringify(config, null, 2);
}
