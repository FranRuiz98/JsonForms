/**
 * Right panel: context-sensitive property editor for the selected node.
 *  A) Identity  B) Layout  C) Logic (hidden/disabled/readonly/computed, expr|fn)
 *  D) Data  E) Validation  F) Options (select)  G) Appearance (wrappers)
 * Bindings are explicit (value + change handler) to play nicely with OnPush.
 * fn / source / wrapper pickers list names registered in the runtime registry
 * (via JSON_FORMS_CONFIG); unknown names still round-trip but the store's
 * validation flags them so the preview shows a clear message.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  DynamicExpr,
  JSON_FORMS_CONFIG,
  LayoutConfig,
  OptionItem,
  ValidatorConfig,
} from 'signal-jsonforms';
import { BuilderStore } from '../builder/builder-store';
import { BuilderField } from '../builder/builder-model';
import { fieldMeta } from '../builder/palette';
import { IconComponent } from './icon.component';

type DataType = NonNullable<BuilderField['dataType']>;
type LogicKey = 'hidden' | 'disabled' | 'readonly' | 'computed';
type LogicMode = 'off' | 'expr' | 'fn';
type OptionsMode = 'static' | 'expr' | 'fn' | 'source';

const CONTROL_TYPES = ['text', 'number', 'select', 'checkbox'];
const DATA_TYPES: DataType[] = ['string', 'number', 'boolean', 'array', 'object'];
const DEFAULT_DATATYPE: Record<string, DataType> = {
  text: 'string', number: 'number', select: 'string', checkbox: 'boolean', group: 'object', array: 'array',
};
const VALIDATOR_KINDS = ['required', 'email', 'min', 'max', 'minLength', 'maxLength', 'pattern'];
const NEEDS_VALUE = new Set(['min', 'max', 'minLength', 'maxLength', 'pattern']);
const CONDITION_KEYS: LogicKey[] = ['hidden', 'disabled', 'readonly'];

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-700 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const LABEL = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400';
const SECTION = 'mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400';

@Component({
  selector: 'wb-inspector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @let f = node();
    @if (f) {
      <datalist id="wb-fns">@for (n of fnNames; track n) { <option [value]="n"></option> }</datalist>
      <datalist id="wb-sources">@for (n of sourceNames; track n) { <option [value]="n"></option> }</datalist>
      <datalist id="wb-wrappers">@for (n of wrapperNames; track n) { <option [value]="n"></option> }</datalist>

      <div>
        <div class="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3">
          <span class="flex h-8 w-8 flex-none items-center justify-center rounded-lg {{ meta(f.type).soft }}">
            <wb-icon [name]="meta(f.type).icon" [size]="16" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[13px] font-semibold text-slate-800">{{ f.label || f.key }}</div>
            <div class="text-[11px] text-slate-400">{{ f.type }} · {{ f.dataType }}</div>
          </div>
        </div>

        <div class="space-y-5 p-4">
          <!-- Identity -->
          <section>
            <div [class]="sectionCls">Identity</div>
            <div class="space-y-2.5">
              <div>
                <label [class]="labelCls">Key</label>
                <input [value]="f.key" (change)="patch('key', str($event))" [class]="inputCls" />
              </div>
              <div>
                <label [class]="labelCls">Label</label>
                <input [value]="f.label ?? ''" (change)="patch('label', str($event))" [class]="inputCls" />
              </div>
              <div class="grid grid-cols-2 gap-2.5">
                <div>
                  <label [class]="labelCls">Type</label>
                  <select [value]="f.type" (change)="changeType(str($event))" [class]="inputCls">
                    @for (t of controlTypes; track t) { <option [value]="t">{{ t }}</option> }
                    @if (isContainer(f.type)) { <option [value]="f.type">{{ f.type }}</option> }
                  </select>
                </div>
                <div>
                  <label [class]="labelCls">Data type</label>
                  <select [value]="f.dataType ?? ''" (change)="patch('dataType', str($event))" [class]="inputCls">
                    @for (d of dataTypes; track d) { <option [value]="d">{{ d }}</option> }
                  </select>
                </div>
              </div>
            </div>
          </section>

          <!-- Layout -->
          <section class="border-t border-slate-100 pt-4">
            <div [class]="sectionCls">Layout</div>
            <div class="space-y-2.5">
              <div>
                <label [class]="labelCls">Column span</label>
                <input type="number" min="1" [value]="f.colSpan ?? ''" (change)="setColSpan(f, str($event))" [class]="inputCls" placeholder="1" />
              </div>
              @if (f.type === 'group') {
                <div class="grid grid-cols-2 gap-2.5">
                  <div>
                    <label [class]="labelCls">Columns</label>
                    <input type="number" min="1" [value]="f.layout?.columns ?? ''" (change)="setColumns(f, str($event))" [class]="inputCls" placeholder="1" />
                  </div>
                  <div>
                    <label [class]="labelCls">Gap</label>
                    <input [value]="f.layout?.gap ?? ''" (change)="setGap(f, str($event))" [class]="inputCls" placeholder="0.75rem 1rem" />
                  </div>
                </div>
                <div class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span class="text-[13px] font-medium text-slate-600">Collapsible section</span>
                  <button type="button" role="switch" [attr.aria-checked]="!!f.collapsible" (click)="toggleCollapsible(f, !f.collapsible)"
                    [class]="f.collapsible ? 'bg-indigo-600' : 'bg-slate-300'" class="relative h-5 w-9 flex-none rounded-full transition">
                    <span [class]="f.collapsible ? 'translate-x-4' : 'translate-x-0.5'" class="absolute top-0.5 left-0 h-4 w-4 rounded-full bg-white shadow transition"></span>
                  </button>
                </div>
                @if (f.collapsible) {
                  <div class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span class="text-[13px] font-medium text-slate-600">Collapsed by default</span>
                    <button type="button" role="switch" [attr.aria-checked]="!!f.collapsed" (click)="toggleCollapsed(f, !f.collapsed)"
                      [class]="f.collapsed ? 'bg-indigo-600' : 'bg-slate-300'" class="relative h-5 w-9 flex-none rounded-full transition">
                      <span [class]="f.collapsed ? 'translate-x-4' : 'translate-x-0.5'" class="absolute top-0.5 left-0 h-4 w-4 rounded-full bg-white shadow transition"></span>
                    </button>
                  </div>
                }
              }
            </div>
          </section>

          <!-- Logic -->
          <section class="border-t border-slate-100 pt-4">
            <div [class]="sectionCls">Logic</div>
            <div class="space-y-3">
              @for (key of conditionKeys; track key) {
                <div>
                  <label [class]="labelCls">{{ key }} when</label>
                  <div class="flex gap-2">
                    <select [value]="dynMode(dyn(f, key))" (change)="setLogicMode(f, key, $any(str($event)))" class="w-24 flex-none rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12.5px] focus:border-indigo-400 focus:outline-none">
                      <option value="off">Off</option>
                      <option value="expr">Expr</option>
                      <option value="fn">Function</option>
                    </select>
                    @if (dynMode(dyn(f, key)) === 'expr') {
                      <input [value]="dynText(dyn(f, key))" (change)="setLogicText(f, key, str($event))" [class]="inputCls" placeholder="e.g. valueAt('plan') == 'free'" />
                    } @else if (dynMode(dyn(f, key)) === 'fn') {
                      <input [value]="dynText(dyn(f, key))" (change)="setLogicText(f, key, str($event))" list="wb-fns" [class]="inputCls" placeholder="function name" />
                    }
                  </div>
                </div>
              }

              @if (!isContainer(f.type)) {
                <div>
                  <label [class]="labelCls">computed value</label>
                  <div class="flex gap-2">
                    <select [value]="dynMode(f.computed)" (change)="setLogicMode(f, 'computed', $any(str($event)))" class="w-24 flex-none rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12.5px] focus:border-indigo-400 focus:outline-none">
                      <option value="off">Off</option>
                      <option value="expr">Expr</option>
                      <option value="fn">Function</option>
                    </select>
                    @if (dynMode(f.computed) === 'expr') {
                      <input [value]="dynText(f.computed)" (change)="setLogicText(f, 'computed', str($event))" [class]="inputCls" placeholder="e.g. model.qty * model.price" />
                    } @else if (dynMode(f.computed) === 'fn') {
                      <input [value]="dynText(f.computed)" (change)="setLogicText(f, 'computed', str($event))" list="wb-fns" [class]="inputCls" placeholder="function name" />
                    }
                  </div>
                  @if (f.computed) { <p class="mt-1 text-[11px] text-slate-400">Computed fields become read-only.</p> }
                </div>
              }
              <p class="text-[11px] leading-relaxed text-slate-400">DSL identifiers: <code>value</code>, <code>model</code>, <code>root</code>, <code>valueAt('a.b')</code>.</p>
            </div>
          </section>

          @if (!isContainer(f.type)) {
            <!-- Data -->
            <section class="border-t border-slate-100 pt-4">
              <div [class]="sectionCls">Data</div>
              <div>
                <label [class]="labelCls">Default value</label>
                <input [value]="defaultAsText(f)" (change)="setDefault(f, str($event))" [class]="inputCls" />
              </div>
            </section>

            <!-- Validation -->
            <section class="border-t border-slate-100 pt-4">
              <div [class]="sectionCls">Validation</div>
              <div class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span class="text-[13px] font-medium text-slate-600">Required</span>
                <button type="button" role="switch" [attr.aria-checked]="hasRequired(f)" (click)="toggleRequired(f, !hasRequired(f))"
                  [class]="hasRequired(f) ? 'bg-indigo-600' : 'bg-slate-300'" class="relative h-5 w-9 flex-none rounded-full transition">
                  <span [class]="hasRequired(f) ? 'translate-x-4' : 'translate-x-0.5'" class="absolute top-0.5 left-0 h-4 w-4 rounded-full bg-white shadow transition"></span>
                </button>
              </div>
              @for (v of otherValidators(f); track v.kind) {
                <div class="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
                  <span class="w-20 flex-none font-mono text-[12px] text-slate-500">{{ v.kind }}</span>
                  @if (needsValue(v.kind)) {
                    <input [value]="asText(v.value)" (change)="setValidatorValue(f, v.kind, str($event))"
                      class="w-full rounded-md border border-slate-200 px-2 py-1 text-[12px] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      [placeholder]="v.kind === 'pattern' ? 'regex' : 'value'" />
                  } @else { <span class="flex-1"></span> }
                  <button type="button" (click)="removeValidator(f, v.kind)" title="Remove" class="flex h-6 w-6 flex-none items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <wb-icon name="trash" [size]="13" />
                  </button>
                </div>
              }
              @if (addableKinds(f).length) {
                <div class="mt-2 flex items-center gap-2">
                  <select #vk [class]="inputCls">@for (k of addableKinds(f); track k) { <option [value]="k">{{ k }}</option> }</select>
                  <button type="button" (click)="addValidator(f, vk.value)" class="flex flex-none items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700">
                    <wb-icon name="plus" [size]="13" /> Add
                  </button>
                </div>
              }
            </section>

            <!-- Options (select) -->
            @if (f.type === 'select') {
              <section class="border-t border-slate-100 pt-4">
                <div [class]="sectionCls">Options</div>
                <label [class]="labelCls">Source</label>
                <select [value]="optionsMode(f)" (change)="setOptionsMode(f, $any(str($event)))" [class]="inputCls">
                  <option value="static">Static list</option>
                  <option value="expr">Expression</option>
                  <option value="fn">Function</option>
                  <option value="source">Async source</option>
                </select>

                @switch (optionsMode(f)) {
                  @case ('static') {
                    <div class="mt-2 space-y-1.5">
                      @for (opt of staticOptions(f); track $index) {
                        <div class="flex items-center gap-1.5">
                          <input [value]="asText(opt.value)" (change)="setOptionValue(f, $index, str($event))" class="w-1/2 rounded-md border border-slate-200 px-2 py-1 text-[12px] focus:border-indigo-400 focus:outline-none" placeholder="value" />
                          <input [value]="opt.label" (change)="setOptionLabel(f, $index, str($event))" class="w-1/2 rounded-md border border-slate-200 px-2 py-1 text-[12px] focus:border-indigo-400 focus:outline-none" placeholder="label" />
                          <button type="button" (click)="removeOption(f, $index)" class="flex h-6 w-6 flex-none items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"><wb-icon name="trash" [size]="13" /></button>
                        </div>
                      }
                      <button type="button" (click)="addOption(f)" class="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"><wb-icon name="plus" [size]="13" /> Add option</button>
                    </div>
                  }
                  @case ('expr') {
                    <input class="mt-2" [value]="optExpr(f)" (change)="setOptExpr(f, str($event))" [class]="inputCls" placeholder="expression returning an option array" />
                  }
                  @case ('fn') {
                    <input class="mt-2" [value]="optFn(f)" (change)="setOptFn(f, str($event))" list="wb-fns" [class]="inputCls" placeholder="function name" />
                  }
                  @case ('source') {
                    <div class="mt-2 grid grid-cols-2 gap-2">
                      <input [value]="optSource(f)" (change)="setOptSource(f, str($event))" list="wb-sources" [class]="inputCls" placeholder="source name" />
                      <input type="number" min="0" [value]="optDebounce(f)" (change)="setOptDebounce(f, str($event))" [class]="inputCls" placeholder="debounce ms" />
                    </div>
                  }
                }

                <div class="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span class="text-[13px] font-medium text-slate-600">Clear when options change</span>
                  <button type="button" role="switch" [attr.aria-checked]="!!f.clearOnOptionsChange" (click)="toggleClearOnOptions(f, !f.clearOnOptionsChange)"
                    [class]="f.clearOnOptionsChange ? 'bg-indigo-600' : 'bg-slate-300'" class="relative h-5 w-9 flex-none rounded-full transition">
                    <span [class]="f.clearOnOptionsChange ? 'translate-x-4' : 'translate-x-0.5'" class="absolute top-0.5 left-0 h-4 w-4 rounded-full bg-white shadow transition"></span>
                  </button>
                </div>
              </section>
            }
          }

          <!-- Appearance / wrappers -->
          <section class="border-t border-slate-100 pt-4">
            <div [class]="sectionCls">Appearance</div>
            <label [class]="labelCls">Wrappers (comma-separated, outermost first)</label>
            <input [value]="wrapperText(f)" (change)="setWrapper(f, str($event))" list="wb-wrappers" [class]="inputCls" placeholder="e.g. card, default" />
            <p class="mt-1 text-[11px] text-slate-400">Wrappers must be registered in the runtime; unknown names are flagged in the preview.</p>
          </section>

          @if (isContainer(f.type)) {
            <div class="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-500">
              <wb-icon [name]="meta(f.type).icon" [size]="15" />
              <span>This is a {{ f.type }} container — edit its children on the canvas.</span>
            </div>
          }
        </div>
      </div>
    } @else {
      <div class="flex flex-col items-center justify-center gap-2.5 px-6 py-24 text-center">
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><wb-icon name="cursor" [size]="20" /></div>
        <p class="text-[13px] font-medium text-slate-600">Nothing selected</p>
        <p class="text-[12px] text-slate-400">Select a field on the canvas to edit its properties.</p>
      </div>
    }
  `,
})
export class InspectorComponent {
  private readonly store = inject(BuilderStore);
  private readonly registry = inject(JSON_FORMS_CONFIG);
  readonly node = computed(() => this.store.selected());
  readonly controlTypes = CONTROL_TYPES;
  readonly dataTypes = DATA_TYPES;
  readonly conditionKeys = CONDITION_KEYS;
  readonly meta = fieldMeta;
  readonly inputCls = INPUT;
  readonly labelCls = LABEL;
  readonly sectionCls = SECTION;
  readonly fnNames = Object.keys(this.registry.functions ?? {});
  readonly sourceNames = Object.keys(this.registry.optionSources ?? {});
  readonly wrapperNames = Object.keys(this.registry.wrappers ?? {});

  str(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }
  asText(v: unknown): string {
    return v === undefined || v === null ? '' : String(v);
  }
  isContainer(type: string): boolean {
    return type === 'group' || type === 'array';
  }

  patch(key: keyof BuilderField, value: string): void {
    const f = this.node();
    if (f) this.store.updateNode(f._id, { [key]: value } as Partial<BuilderField>);
  }
  changeType(type: string): void {
    const f = this.node();
    if (f) this.store.updateNode(f._id, { type, dataType: DEFAULT_DATATYPE[type] ?? f.dataType });
  }

  // --- logic ----------------------------------------------------------------

  dyn(f: BuilderField, key: LogicKey): DynamicExpr | undefined {
    return (f as unknown as Record<string, unknown>)[key] as DynamicExpr | undefined;
  }
  dynMode(d: DynamicExpr | undefined): LogicMode {
    if (!d) return 'off';
    return 'expr' in d ? 'expr' : 'fn';
  }
  dynText(d: DynamicExpr | undefined): string {
    if (!d) return '';
    return 'expr' in d ? d.expr : d.fn;
  }
  setLogicMode(f: BuilderField, key: LogicKey, mode: LogicMode): void {
    const cur = this.dyn(f, key);
    const text = this.dynText(cur);
    const val: DynamicExpr | undefined =
      mode === 'off' ? undefined : mode === 'expr' ? { expr: text } : { fn: text };
    this.store.updateNode(f._id, { [key]: val } as Partial<BuilderField>);
  }
  setLogicText(f: BuilderField, key: LogicKey, text: string): void {
    const cur = this.dyn(f, key);
    const isFn = !!cur && 'fn' in cur;
    const val: DynamicExpr | undefined = text ? (isFn ? { fn: text } : { expr: text }) : undefined;
    this.store.updateNode(f._id, { [key]: val } as Partial<BuilderField>);
  }

  // --- layout ---------------------------------------------------------------

  setColSpan(f: BuilderField, text: string): void {
    const n = text === '' ? undefined : Number(text);
    this.store.updateNode(f._id, { colSpan: n && n > 1 ? n : undefined });
  }
  setColumns(f: BuilderField, text: string): void {
    const n = text === '' ? undefined : Number(text);
    const layout: LayoutConfig = { ...(f.layout ?? {}) };
    if (n && n > 1) layout.columns = n;
    else delete layout.columns;
    this.store.updateNode(f._id, { layout: Object.keys(layout).length ? layout : undefined });
  }
  setGap(f: BuilderField, text: string): void {
    const layout: LayoutConfig = { ...(f.layout ?? {}) };
    if (text) layout.gap = text;
    else delete layout.gap;
    this.store.updateNode(f._id, { layout: Object.keys(layout).length ? layout : undefined });
  }
  toggleCollapsible(f: BuilderField, on: boolean): void {
    this.store.updateNode(f._id, { collapsible: on || undefined, collapsed: on ? f.collapsed : undefined });
  }
  toggleCollapsed(f: BuilderField, on: boolean): void {
    this.store.updateNode(f._id, { collapsed: on || undefined });
  }

  // --- data -----------------------------------------------------------------

  defaultAsText(f: BuilderField): string {
    return this.asText(f.defaultValue);
  }
  setDefault(f: BuilderField, text: string): void {
    this.store.updateNode(f._id, { defaultValue: coerce(text, f.dataType) });
  }

  // --- validators -----------------------------------------------------------

  hasRequired(f: BuilderField): boolean {
    return !!f.validators?.some((v) => v.kind === 'required');
  }
  otherValidators(f: BuilderField): ValidatorConfig[] {
    return (f.validators ?? []).filter((v) => v.kind !== 'required');
  }
  needsValue(kind: string): boolean {
    return NEEDS_VALUE.has(kind);
  }
  addableKinds(f: BuilderField): string[] {
    const present = new Set((f.validators ?? []).map((v) => v.kind));
    return VALIDATOR_KINDS.filter((k) => k !== 'required' && !present.has(k));
  }
  toggleRequired(f: BuilderField, on: boolean): void {
    const list = (f.validators ?? []).filter((v) => v.kind !== 'required');
    if (on) list.unshift({ kind: 'required' });
    this.store.updateNode(f._id, { validators: list.length ? list : undefined });
  }
  addValidator(f: BuilderField, kind: string): void {
    if (!kind) return;
    const list = [...(f.validators ?? []), { kind } as ValidatorConfig];
    this.store.updateNode(f._id, { validators: list });
  }
  removeValidator(f: BuilderField, kind: string): void {
    const list = (f.validators ?? []).filter((v) => v.kind !== kind);
    this.store.updateNode(f._id, { validators: list.length ? list : undefined });
  }
  setValidatorValue(f: BuilderField, kind: string, text: string): void {
    const list = (f.validators ?? []).map((v) =>
      v.kind === kind ? { ...v, value: kind === 'pattern' ? text : coerce(text, 'number') } : v,
    );
    this.store.updateNode(f._id, { validators: list });
  }

  // --- options (select) -----------------------------------------------------

  optionsMode(f: BuilderField): OptionsMode {
    const o = f.options;
    if (!o || Array.isArray(o)) return 'static';
    if ('expr' in o) return 'expr';
    if ('fn' in o) return 'fn';
    return 'source';
  }
  staticOptions(f: BuilderField): OptionItem[] {
    return Array.isArray(f.options) ? f.options : [];
  }
  setOptionsMode(f: BuilderField, mode: OptionsMode): void {
    let options: BuilderField['options'];
    if (mode === 'static') options = this.staticOptions(f).length ? this.staticOptions(f) : [{ value: '', label: '' }];
    else if (mode === 'expr') options = { expr: '' };
    else if (mode === 'fn') options = { fn: '' };
    else options = { source: '' };
    this.store.updateNode(f._id, { options });
  }
  addOption(f: BuilderField): void {
    this.store.updateNode(f._id, { options: [...this.staticOptions(f), { value: '', label: '' }] });
  }
  removeOption(f: BuilderField, i: number): void {
    const list = this.staticOptions(f).filter((_, idx) => idx !== i);
    this.store.updateNode(f._id, { options: list });
  }
  setOptionValue(f: BuilderField, i: number, text: string): void {
    const list = this.staticOptions(f).map((o, idx) => (idx === i ? { ...o, value: text } : o));
    this.store.updateNode(f._id, { options: list });
  }
  setOptionLabel(f: BuilderField, i: number, text: string): void {
    const list = this.staticOptions(f).map((o, idx) => (idx === i ? { ...o, label: text } : o));
    this.store.updateNode(f._id, { options: list });
  }
  optExpr(f: BuilderField): string {
    const o = f.options;
    return o && !Array.isArray(o) && 'expr' in o ? o.expr : '';
  }
  setOptExpr(f: BuilderField, text: string): void {
    this.store.updateNode(f._id, { options: { expr: text } });
  }
  optFn(f: BuilderField): string {
    const o = f.options;
    return o && !Array.isArray(o) && 'fn' in o ? o.fn : '';
  }
  setOptFn(f: BuilderField, text: string): void {
    this.store.updateNode(f._id, { options: { fn: text } });
  }
  optSource(f: BuilderField): string {
    const o = f.options;
    return o && !Array.isArray(o) && 'source' in o ? o.source : '';
  }
  optDebounce(f: BuilderField): string {
    const o = f.options;
    return o && !Array.isArray(o) && 'source' in o && o.debounce != null ? String(o.debounce) : '';
  }
  setOptSource(f: BuilderField, text: string): void {
    const cur = f.options;
    const debounce = cur && !Array.isArray(cur) && 'source' in cur ? cur.debounce : undefined;
    this.store.updateNode(f._id, { options: { source: text, debounce } });
  }
  setOptDebounce(f: BuilderField, text: string): void {
    const source = this.optSource(f);
    const n = text === '' ? undefined : Number(text);
    this.store.updateNode(f._id, { options: { source, debounce: n } });
  }
  toggleClearOnOptions(f: BuilderField, on: boolean): void {
    this.store.updateNode(f._id, { clearOnOptionsChange: on || undefined });
  }

  // --- wrappers -------------------------------------------------------------

  wrapperText(f: BuilderField): string {
    const w = f.wrapper;
    return Array.isArray(w) ? w.join(', ') : (w ?? '');
  }
  setWrapper(f: BuilderField, text: string): void {
    const list = text.split(',').map((s) => s.trim()).filter(Boolean);
    const wrapper = list.length === 0 ? undefined : list.length === 1 ? list[0] : list;
    this.store.updateNode(f._id, { wrapper });
  }
}

function coerce(text: string, dataType?: DataType): unknown {
  if (text === '') return undefined;
  if (dataType === 'number') {
    const n = Number(text);
    return Number.isNaN(n) ? text : n;
  }
  if (dataType === 'boolean') return text === 'true';
  return text;
}
