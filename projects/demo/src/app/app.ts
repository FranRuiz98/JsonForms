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
    { id: 'field',      icon: '◆', label: 'Estructura de campo' },
    { id: 'types',      icon: '▦', label: 'Tipos de campo' },
    { id: 'validators', icon: '✓', label: 'Validadores' },
    { id: 'structure',  icon: '⊞', label: 'Grupos y arrays' },
    { id: 'dsl',        icon: 'ƒ', label: 'DSL de expresiones' },
    { id: 'registered', icon: '⚙', label: 'Funciones registradas' },
  ];

  protected readonly archTabs: ReadonlyArray<{ id: ArchTab; icon: string; label: string }> = [
    { id: 'overview',  icon: '◈', label: 'Visión general' },
    { id: 'layers',    icon: '⊟', label: 'Capas del sistema' },
    { id: 'engine',    icon: '⚙', label: 'Motor' },
    { id: 'dsl',       icon: 'ƒ', label: 'Lógica híbrida' },
    { id: 'renderer',  icon: '▦', label: 'Render y componentes' },
  ];

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  // ── API reference content ──────────────────────────────────────────────

  protected readonly fieldTypes = [
    { type: 'text',     desc: 'Input de texto libre',  model: '"texto"',            req: '—' },
    { type: 'number',   desc: 'Input numérico',        model: '42',                 req: '—' },
    { type: 'select',   desc: 'Desplegable',            model: '"valor-opcion"',     req: 'props.options' },
    { type: 'checkbox', desc: 'Casilla booleana',      model: 'true / false',       req: '—' },
    { type: 'group',    desc: 'Grupo de campos',        model: '{ campo: valor }',   req: 'fields: [...]' },
    { type: 'array',    desc: 'Lista repetible',        model: '[{ campo: valor }]', req: 'item: { ... }' },
  ];

  protected readonly ref = {
    field: [
      '  "key":          "campo",     // único por formulario (requerido)',
      '  "type":         "text",      // tipo de UI — ver tabla Tipos (requerido)',
      '  "dataType":     "string",    // string | number | boolean',
      '  "label":        "Etiqueta",',
      '  "defaultValue": "",',
      '  "props": {',
      '    "placeholder":  "...",',
      '    "hint":         "Texto bajo el campo",',
      '    "description":  "Texto sobre el campo",',
      '    "options": [{ "value": "v", "label": "L" }]  // solo select',
      '  },',
      '  "validators":      [...],',
      '  "asyncValidators": [{ "kind": "clave", "debounce": 400 }],',
      '  "hidden":   { "expr": "..." }  // o  { "fn": "clave" }',
      '  "disabled": { "expr": "..." }  // o  { "fn": "clave" }',
      '  "readonly": { "expr": "..." }  // o  { "fn": "clave" }',
      '  "fields":   [...],             // solo type: group',
      '  "item":     { ... }            // solo type: array',
    ].join('\n'),

    validators: [
      '// ─ Estándar (self-contained): ────────────────────────',
      '{ "kind": "required" }',
      '{ "kind": "email" }',
      '{ "kind": "min",       "value": 18  }',
      '{ "kind": "max",       "value": 100 }',
      '{ "kind": "minLength", "value": 3   }',
      '{ "kind": "maxLength", "value": 50  }',
      '{ "kind": "pattern",   "value": "^[A-Z]{2}[0-9]+$" }',
      '',
      '// Todos admiten: "message": "Texto de error personalizado"',
      '',
      '// ─ Cross-field con DSL (self-contained): ──────────────',
      '{ "kind": "expr",',
      '  "expr": "value === model.email",',
      '  "message": "Los correos no coinciden" }',
      '',
      '// ─ Custom síncrono registrado: ─────────────────────────',
      '{ "kind": "fn", "fn": "nombreRegistrado" }',
      '',
      '// ─ Async registrado: ────────────────────────────────────',
      '{ "kind": "nombreAsync", "debounce": 400 }',
    ].join('\n'),

    dsl: [
      '// Identificadores:',
      '//   value     → valor del campo actual',
      '//   model.x   → otro campo del formulario',
      '//   model.a.b → campo anidado dentro de un grupo',
      '',
      '// Operadores:',
      '//   ===  !==  <  >  <=  >=   (comparación)',
      '//   &&   ||   !               (lógicos)',
      '//   +  -  *  /  %             (aritméticos)',
      '//   cond ? a : b              (ternario)',
      '',
      '// Ejemplos:',
      "model.plan !== 'pro'",
      'value === model.email',
      'value >= 18 && value <= 65',
      "model.accountType === 'business' && !!value",
      '!model.subscribe',
    ].join('\n'),

    structure: [
      '// Grupo anidado ─────────────────────────────────────────',
      '{ "key": "address", "type": "group", "label": "Dirección",',
      '  "fields": [',
      '    { "key": "street", "type": "text",',
      '      "dataType": "string", "label": "Calle" },',
      '    { "key": "city",   "type": "text",',
      '      "dataType": "string", "label": "Ciudad" }',
      '  ]',
      '}',
      '',
      '// Array repetible ────────────────────────────────────────',
      '{ "key": "contacts", "type": "array", "label": "Contactos",',
      '  "item": {',
      '    "key": "contact", "type": "group",',
      '    "fields": [',
      '      { "key": "name",  "type": "text",',
      '        "dataType": "string", "label": "Nombre" },',
      '      { "key": "phone", "type": "text",',
      '        "dataType": "string", "label": "Teléfono" }',
      '    ]',
      '  }',
      '}',
    ].join('\n'),

    registered: [
      '// ─ Declara en app.config.ts / provideJsonForms(): ─────',
      'provideJsonForms({',
      '  // Condiciones hidden / disabled / readonly:',
      '  functions: {',
      "    esAdmin: (ctx) => ctx.valueAt('role') === 'admin',",
      '  },',
      '',
      "  // Validadores síncronos — { kind: 'fn', fn: 'clave' }:",
      '  validators: {',
      '    segura: (ctx) => {',
      "      const v = String(ctx.value() ?? '');",
      '      return v.length >= 8',
      '        ? undefined',
      "        : { kind: 'weak', message: 'Mínimo 8 caracteres' };",
      '    },',
      '  },',
      '',
      '  // Validadores async — { kind: "clave", debounce: N }:',
      '  asyncValidators: {',
      '    checkUser: {',
      '      params:    ({ value }) => value(),',
      '      factory:   (sig) => resource({ params: sig,',
      '                   loader: async ({ params }) => ... }),',
      '      onSuccess: (taken) => taken',
      "        ? { kind: 'taken', message: 'Ya existe' }",
      '        : undefined,',
      "      onError: () => ({ kind: 'error', message: '...' }),",
      '    },',
      '  },',
      '});',
      '',
      '// ─ Referencia en el JSON: ──────────────────────────────',
      '"hidden":  { "fn": "esAdmin" }',
      '{ "kind": "fn",        "fn": "segura" }',
      '{ "kind": "checkUser", "debounce": 400 }',
    ].join('\n'),
  };

  // ── Architecture content ───────────────────────────────────────────────

  protected readonly arch = {
    layers: [
      '┌──────────────────────────────────────────────────────────────────────┐',
      '│  Consumidor (app)                                                     │',
      '│  · Define la configuración JSON del formulario                       │',
      '│  · Registra: tipos de campo · validadores · funciones                │',
      '└──────────────────┬───────────────────────────────────────────────────┘',
      '                   │  <jf-form [schema]="json" [(model)]="data">',
      '┌──────────────────▼───────────────────────────────────────────────────┐',
      '│  Capa de RENDER  (UI-agnóstica)                                      │',
      '│  · FormHost · FieldRenderer (recursivo)                              │',
      '│  · FieldTypeRegistry: type (string) → componente Angular             │',
      '└──────────────────┬───────────────────────────────────────────────────┘',
      '                   │  FieldTree + configuración normalizada',
      '┌──────────────────▼───────────────────────────────────────────────────┐',
      '│  Capa de MOTOR  (core, sin dependencias de UI)                       │',
      '│  · Parser/Normalizador: JSON → FieldNode[]                           │',
      '│  · ModelBuilder: FieldNode[] → signal(modelo inicial)                │',
      '│  · SchemaCompiler: FieldNode[] → schemaFn dinámica                   │',
      '│  · ExpressionEngine (DSL) · FunctionRegistry · ValidatorRegistry     │',
      '└──────────────────┬───────────────────────────────────────────────────┘',
      '                   │  llamadas aisladas a la API experimental',
      '┌──────────────────▼───────────────────────────────────────────────────┐',
      '│  Capa ADAPTADORA  (anti-corruption layer)                            │',
      '│  · Único módulo que importa @angular/forms/signals                   │',
      '│  · form() · validate() · validateAsync() · applyWhen()              │',
      '│  · required · email · min · max · minLength · maxLength              │',
      '└──────────────────────────────────────────────────────────────────────┘',
    ].join('\n'),

    engine: [
      '// 1. Parser / Normalizador  ─────────────────────────────────────────',
      '// JSON → FieldNode[]  (valida contra meta-schema, asigna paths absolutos)',
      'const nodes: FieldNode[] = parse(json);',
      '// nodes[0] = { key: "city", path: ["address","city"],',
      '//              dataType: "string", validators: [...] }',
      '',
      '// 2. ModelBuilder  ──────────────────────────────────────────────────',
      '// FieldNode[] → objeto inicial → signal()',
      'const model = signal(buildInitialModel(nodes));',
      '// → signal({ name: "", age: 0, address: { street: "", city: "" } })',
      '',
      '// 3. SchemaCompiler  ─────────────────────────────────────────────────',
      '// Clave: path[key] en runtime es idéntico a path.key en compile-time',
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
      '// 4. Ensamblado  ──────────────────────────────────────────────────────',
      '// Delegado a la capa adaptadora (único importador de Signal Forms)',
      'const form = adapter.form(model, schemaFn, { injector });',
    ].join('\n'),

    dsl: [
      '// ─ DSL de expresiones (self-contained, sin eval) ────────────────',
      '// AST seguro: no accede a window, document ni funciones globales',
      '// Disponible en: hidden · disabled · readonly · validators "expr"',
      '"hidden":   { "expr": "model.plan !== \'pro\'" }',
      '"disabled": { "expr": "!model.createAccount" }',
      '"readonly": { "expr": "model.status === \'confirmed\'" }',
      '{ "kind": "expr",',
      '  "expr": "value === model.password",',
      '  "message": "Las contraseñas no coinciden" }',
      '',
      '// ─ Funciones registradas (TypeScript + DI Angular) ────────────',
      '// Para lógica que no cabe en el DSL: servicios, HTTP, closures...',
      'provideJsonForms({',
      '  functions: {                          // hidden/disabled/readonly',
      "    soloAdmin: ({ valueAt }) => valueAt('role') === 'admin',",
      '  },',
      '  validators: {                         // { "kind": "fn", "fn": "segura" }',
      '    segura: ({ value }) => {',
      "      const v = String(value() ?? '');",
      "      return v.length >= 8 ? undefined : { kind: 'weak', message: 'Débil' };",
      '    },',
      '  },',
      '  asyncValidators: {                    // siempre en registro, nunca en DSL',
      '    emailLibre: {',
      '      params:    ({ value }) => value(),',
      '      factory:   (email) => resource({',
      '                   params: email,',
      '                   loader: async ({ params }) => api.check(params) }),',
      "      onSuccess: (taken) => taken ? { kind: 'taken', message: 'Ya existe' } : undefined,",
      "      onError:   () => ({ kind: 'err', message: 'Error de red' }),",
      '    },',
      '  },',
      '});',
    ].join('\n'),

    renderer: [
      '// ─ 1. Registrar tipos de campo ──────────────────────────────────',
      'provideJsonForms({',
      '  fieldTypes: {',
      '    text:     MatTextFieldComponent,',
      '    number:   MatNumberFieldComponent,',
      '    select:   MatSelectFieldComponent,',
      '    checkbox: MatCheckboxFieldComponent,',
      '  },',
      '});',
      '',
      '// ─ 2. Contrato mínimo de cualquier componente de campo ──────────',
      'export interface FieldComponent {',
      '  field:  FieldTree<unknown>;  // nodo estructural → [formField]',
      '  config: FieldConfig;         // label, props, type, key...',
      '}',
      '',
      '// ─ 3. Ejemplo: adaptador Angular Material ───────────────────────',
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
      /* banner de error ya informa */
    }
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.editorText());
    } catch {
      /* clipboard no disponible */
    }
  }

  protected resetData(): void {
    this.data.set({});
    this.formRev.update((r) => r + 1);
  }

  protected readonly onSubmit = (value: Record<string, unknown>): void => {
    console.log('Formulario enviado:', value);
    window.alert('Formulario válido y enviado. Revisa la consola para ver el valor.');
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
      this.error.set('JSON no válido: ' + (e as Error).message);
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
