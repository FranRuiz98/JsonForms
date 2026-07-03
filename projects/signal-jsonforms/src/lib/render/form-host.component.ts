import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  Injector,
  OnInit,
  Optional,
  Signal,
  SkipSelf,
  WritableSignal,
  computed,
  forwardRef,
  inject,
  input,
  model,
  output,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { DynamicExpr, FieldNode, FormConfig, StepDefinition } from '../core/model';
import { updateIn } from '../core/path-utils';
import { JSON_FORMS_CONFIG } from '../registry/tokens';
import { JsonFormsConfig } from '../registry/types';
import { buildSignalForm } from '../build-signal-form';
import { resolvePath } from '../core/schema-compiler';
import { compileExpression } from '../expression/expression-engine';
import { FieldTree, SignalForms } from '../adapter/signal-forms.adapter';
import { FieldRendererComponent } from './field-renderer.component';
import { OptionsState } from '../registry/types';
import { JSON_FORMS_RUNTIME, JsonFormsRuntime } from './form-runtime';

/** Per-form holder for the resolved (override) config. */
@Injectable()
class JfResolvedConfig {
  value: JsonFormsConfig = {};
}

/**
 * Declarative entry point: <jf-form [schema]="json" [(model)]="data">.
 * Builds the Signal Forms form and delegates rendering to FieldRenderer.
 * Provides JSON_FORMS_RUNTIME so renderers can mutate the model (arrays).
 *
 * Optional [config] input overrides the global provideJsonForms() registry for
 * THIS form's subtree (per-property merge: what you pass wins, the rest is
 * inherited). Useful to render the same JSON with a different component kit.
 *
 * Root-level layout: schema.layout.columns arranges the top-level fields in a
 * CSS grid; per-field colSpan controls how many columns each one spans.
 */
@Component({
  selector: 'jf-form',
  standalone: true,
  exportAs: 'jfForm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FieldRendererComponent],
  providers: [
    { provide: JSON_FORMS_RUNTIME, useExisting: forwardRef(() => FormHostComponent) },
    JfResolvedConfig,
    {
      provide: JSON_FORMS_CONFIG,
      useFactory: (holder: JfResolvedConfig, parent: JsonFormsConfig | null) =>
        new Proxy({} as JsonFormsConfig, {
          get(_t, prop: string | symbol) {
            const o = holder.value as Record<string | symbol, unknown>;
            if (o && prop in o && o[prop] !== undefined) return o[prop];
            return parent ? (parent as Record<string | symbol, unknown>)[prop] : undefined;
          },
          has(_t, prop) {
            const o = holder.value as object;
            return (!!o && prop in o) || (!!parent && prop in (parent as object));
          },
        }),
      deps: [JfResolvedConfig, [new Optional(), new SkipSelf(), JSON_FORMS_CONFIG]],
    },
  ],
  template: `
    @if (form(); as f) {
      @if (steps(); as sd) {
        <div class="jf-wizard">
          @if (showStepper()) {
            <ol class="jf-steps">
              @for (s of sd; track $index) {
                @if (!isSkipped($index)) {
                  <li
                    class="jf-step"
                    [class.jf-step-active]="$index === currentStep()"
                    [class.jf-step-done]="isDone($index)"
                    (click)="goTo($index)">
                    <span class="jf-step-num">{{ stepNumber($index) }}</span>
                    <span class="jf-step-label">{{ s.config.label ?? 'Step ' + ($index + 1) }}</span>
                  </li>
                }
              }
            </ol>
          }
          @if (currentStepDef(); as step) {
            @if (step.config.description) {
              <p class="jf-step-description">{{ step.config.description }}</p>
            }
            <div
              class="jf-fields"
              [style.display]="cols() ? 'grid' : null"
              [style.gridTemplateColumns]="cols() ? 'repeat(' + cols() + ', minmax(0, 1fr))' : null"
              [style.gap]="cols() ? gap() : null">
              @for (node of currentStepNodes(); track node.key) {
                <jf-field-renderer
                  [style.gridColumn]="spanFor(node)"
                  [node]="node"
                  [field]="fieldFor(f, node)"
                  [path]="[node.key]" />
              }
            </div>
          }
          @if (attempted() && !currentStepValid()) {
            <p class="jf-wizard-hint">Please complete the required fields before continuing.</p>
          }
          <div class="jf-wizard-nav">
            <button type="button" class="jf-prev" [disabled]="isFirst()" (click)="prev()">Back</button>
            @if (isLast()) {
              <button type="button" class="jf-submit" (click)="wizardSubmit()">Submit</button>
            } @else {
              <button type="button" class="jf-next" (click)="next()">Next</button>
            }
          </div>
        </div>
      } @else {
        <div
          class="jf-root"
          [style.display]="cols() ? 'grid' : null"
          [style.gridTemplateColumns]="cols() ? 'repeat(' + cols() + ', minmax(0, 1fr))' : null"
          [style.gap]="cols() ? gap() : null">
          @for (node of nodes(); track node.key) {
            <jf-field-renderer
              [style.gridColumn]="spanFor(node)"
              [node]="node"
              [field]="fieldFor(f, node)"
              [path]="[node.key]" />
          }
        </div>
      }
    }
  `,
})
export class FormHostComponent implements OnInit, JsonFormsRuntime {
  private readonly injector = inject(Injector);
  private readonly registries = inject(JSON_FORMS_CONFIG);
  private readonly resolved = inject(JfResolvedConfig);

  readonly schema = input.required<FormConfig>();
  readonly model = model<Record<string, unknown>>({});
  /** Optional per-form override of the global provideJsonForms() registry. */
  readonly config = input<JsonFormsConfig>();
  /** Emitted by the wizard's built-in Submit button with the model value. */
  readonly submitted = output<Record<string, unknown>>();

  /** Root FieldTree (null until built in ngOnInit). */
  readonly form = signal<FieldTree<unknown> | null>(null);
  readonly nodes = signal<FieldNode[]>([]);

  /** Reactive options by field path, populated when the form is built. */
  private optionsByPath = new Map<string, Signal<OptionsState>>();

  /** Wizard step definitions (null for a plain, non-wizard form). */
  readonly steps = signal<StepDefinition[] | null>(null);
  /** Index of the currently shown step. */
  readonly currentStep = signal(0);
  /** True after a blocked "Next" in linear mode (drives the hint + touched state). */
  protected readonly attempted = signal(false);

  /** Validity state of the entire form (true while not yet built). */
  readonly invalid = computed(() => {
    const f = this.form();
    return f ? (f as any)().invalid() : true;
  });

  ngOnInit(): void {
    // Publish the override BEFORE building / rendering so the whole subtree
    // (compileSchema + child renderers) sees the merged registry.
    this.resolved.value = this.config() ?? {};

    const { form, definition, options } = buildSignalForm(this.schema(), {
      injector: this.injector,
      model: this.model as WritableSignal<Record<string, unknown>>,
      registries: this.registries,
    });
    this.optionsByPath = options;
    this.nodes.set(definition.nodes);
    this.steps.set(definition.steps ?? null);
    this.form.set(form as FieldTree<unknown>);
  }

  protected fieldFor(root: unknown, node: FieldNode): FieldTree<unknown> {
    return resolvePath(root, node.path);
  }

  // --- Root layout (columns) ---
  protected readonly cols = computed(() => this.schema().layout?.columns ?? null);
  protected readonly gap = computed(() => this.schema().layout?.gap ?? '0.75rem 1rem');

  /** CSS grid-column span for a top-level field, or null for a single column. */
  protected spanFor(node: FieldNode): string | null {
    const s = node.config.colSpan;
    return s && s > 1 ? `span ${s}` : null;
  }

  // --- Wizard (multi-step) ---------------------------------------------------
  // Steps are a render-layer partition of the already-flat model: form() is built
  // once, a step just shows a subset of the top-level fields, and step validity is
  // derived from the fields' FieldState. Exposed on the component so consumers can
  // build custom navigation via #f="jfForm".

  protected readonly showStepper = computed(() => this.schema().wizard?.showStepper !== false);
  private readonly linear = computed(() => this.schema().wizard?.linear !== false);

  protected readonly currentStepDef = computed<StepDefinition | null>(() => {
    const sd = this.steps();
    return sd ? (sd[this.currentStep()] ?? null) : null;
  });

  protected readonly currentStepNodes = computed<FieldNode[]>(() => {
    const step = this.currentStepDef();
    if (!step) return [];
    const keys = new Set(step.nodeKeys);
    return this.nodes().filter((n) => keys.has(n.key));
  });

  /** Whether a step is hidden by its skipWhen condition (reactive on the model). */
  protected isSkipped(i: number): boolean {
    const sd = this.steps();
    const cond = sd?.[i]?.config.skipWhen;
    return cond ? this.evalDynamic(cond) : false;
  }

  /** True if every field in a step is valid. */
  stepValidAt(i: number): boolean {
    const f = this.form();
    const sd = this.steps();
    if (!f || !sd?.[i]) return true;
    return sd[i].nodeKeys.every((key) => {
      try {
        const st: any = (resolvePath(f, [key]) as any)();
        return st ? !st.invalid() : true;
      } catch {
        return true;
      }
    });
  }

  readonly currentStepValid = computed(() => this.stepValidAt(this.currentStep()));

  protected isDone(i: number): boolean {
    return i < this.currentStep() && this.stepValidAt(i);
  }

  /** 1-based number of a step among the visible (non-skipped) ones. */
  protected stepNumber(i: number): number {
    const sd = this.steps();
    if (!sd) return i + 1;
    let n = 0;
    for (let k = 0; k <= i; k++) if (!this.isSkipped(k)) n++;
    return n;
  }

  private nextVisible(from: number): number {
    const sd = this.steps();
    if (sd) for (let i = from + 1; i < sd.length; i++) if (!this.isSkipped(i)) return i;
    return from;
  }

  private prevVisible(from: number): number {
    if (this.steps()) for (let i = from - 1; i >= 0; i--) if (!this.isSkipped(i)) return i;
    return from;
  }

  readonly isFirst = computed(() => this.prevVisible(this.currentStep()) === this.currentStep());
  readonly isLast = computed(() => this.nextVisible(this.currentStep()) === this.currentStep());

  /** Advances to the next visible step; in linear mode, blocks while invalid. */
  next(): void {
    if (this.linear() && !this.currentStepValid()) {
      this.attempted.set(true);
      this.touchStep(this.currentStep());
      return;
    }
    const nxt = this.nextVisible(this.currentStep());
    if (nxt !== this.currentStep()) {
      this.currentStep.set(nxt);
      this.attempted.set(false);
    }
  }

  prev(): void {
    const prv = this.prevVisible(this.currentStep());
    if (prv !== this.currentStep()) {
      this.currentStep.set(prv);
      this.attempted.set(false);
    }
  }

  /** Jumps to a step. Backwards is always allowed; forwards requires prior steps valid (linear). */
  goTo(i: number): void {
    if (i === this.currentStep() || this.isSkipped(i)) return;
    if (i > this.currentStep() && this.linear()) {
      for (let s = this.currentStep(); s < i; s++) {
        if (!this.isSkipped(s) && !this.stepValidAt(s)) {
          this.attempted.set(true);
          this.touchStep(this.currentStep());
          return;
        }
      }
    }
    this.currentStep.set(i);
    this.attempted.set(false);
  }

  /** Fires the wizard's built-in Submit: marks touched, then emits when valid. */
  protected wizardSubmit(): void {
    void this.submit((v) => this.submitted.emit(v));
  }

  private touchStep(i: number): void {
    const f = this.form();
    const sd = this.steps();
    if (!f || !sd?.[i]) return;
    for (const key of sd[i].nodeKeys) {
      try {
        const st: any = (resolvePath(f, [key]) as any)();
        st?.markAsTouched?.();
      } catch {
        /* markAsTouched may be unavailable; the gate still blocks navigation */
      }
    }
  }

  /** Evaluates a skipWhen condition (DSL or registered function) against the model. */
  private evalDynamic(dyn: DynamicExpr): boolean {
    const m = this.model();
    if ('expr' in dyn) {
      try {
        return !!compileExpression(dyn.expr)({ value: undefined, model: m, root: m });
      } catch {
        return false;
      }
    }
    const fn = this.registries.functions?.[dyn.fn];
    if (!fn) return false;
    return !!fn({
      value: () => undefined,
      model: () => m,
      valueAt: (path: string) => path.split('.').reduce((o: any, k) => (o == null ? undefined : o[k]), m),
      root: () => m,
    });
  }

  // --- JsonFormsRuntime: immutable model mutation for arrays ---
  addArrayItem(path: ReadonlyArray<string | number>, item: unknown): void {
    this.model.update((m) => updateIn(m, path, (arr) => [...((arr as unknown[]) ?? []), item]));
  }

  removeArrayItem(path: ReadonlyArray<string | number>, index: number): void {
    this.model.update((m) =>
      updateIn(m, path, (arr) => (arr as unknown[]).filter((_, i) => i !== index)),
    );
  }

  /** Reactive options for a field path, or null if it has no dynamic options. */
  optionsFor(path: ReadonlyArray<string | number>): Signal<OptionsState> | null {
    return this.optionsByPath.get(path.join('.')) ?? null;
  }

  /** Marks everything as touched and executes the action if the form is valid. */
  async submit(action: (value: Record<string, unknown>) => Promise<void> | void): Promise<void> {
    const f = this.form();
    if (!f) return;
    return new Promise<void>((resolve, reject) => {
      runInInjectionContext(this.injector, () => {
        (SignalForms.submit as any)(f, async () => {
          try {
            await action(this.model());
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });
  }
}
