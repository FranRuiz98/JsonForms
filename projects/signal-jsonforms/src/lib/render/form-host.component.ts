import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  Injector,
  OnInit,
  Optional,
  SkipSelf,
  WritableSignal,
  computed,
  forwardRef,
  inject,
  input,
  model,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { FieldNode, FormConfig } from '../core/model';
import { updateIn } from '../core/path-utils';
import { JSON_FORMS_CONFIG } from '../registry/tokens';
import { JsonFormsConfig } from '../registry/types';
import { buildSignalForm } from '../build-signal-form';
import { resolvePath } from '../core/schema-compiler';
import { FieldTree, SignalForms } from '../adapter/signal-forms.adapter';
import { FieldRendererComponent } from './field-renderer.component';
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

  /** Root FieldTree (null until built in ngOnInit). */
  readonly form = signal<FieldTree<unknown> | null>(null);
  readonly nodes = signal<FieldNode[]>([]);

  /** Validity state of the entire form (true while not yet built). */
  readonly invalid = computed(() => {
    const f = this.form();
    return f ? (f as any)().invalid() : true;
  });

  ngOnInit(): void {
    // Publish the override BEFORE building / rendering so the whole subtree
    // (compileSchema + child renderers) sees the merged registry.
    this.resolved.value = this.config() ?? {};

    const { form, definition } = buildSignalForm(this.schema(), {
      injector: this.injector,
      model: this.model as WritableSignal<Record<string, unknown>>,
      registries: this.registries,
    });
    this.nodes.set(definition.nodes);
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

  // --- JsonFormsRuntime: immutable model mutation for arrays ---
  addArrayItem(path: ReadonlyArray<string | number>, item: unknown): void {
    this.model.update((m) => updateIn(m, path, (arr) => [...((arr as unknown[]) ?? []), item]));
  }

  removeArrayItem(path: ReadonlyArray<string | number>, index: number): void {
    this.model.update((m) =>
      updateIn(m, path, (arr) => (arr as unknown[]).filter((_, i) => i !== index)),
    );
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
