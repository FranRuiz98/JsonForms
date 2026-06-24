import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
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
import { buildSignalForm } from '../build-signal-form';
import { resolvePath } from '../core/schema-compiler';
import { FieldTree, SignalForms } from '../adapter/signal-forms.adapter';
import { FieldRendererComponent } from './field-renderer.component';
import { JSON_FORMS_RUNTIME, JsonFormsRuntime } from './form-runtime';

/**
 * Declarative entry point: <jf-form [schema]="json" [(model)]="data">.
 * Builds the Signal Forms form and delegates rendering to FieldRenderer.
 * Provides JSON_FORMS_RUNTIME so renderers can mutate the model (arrays).
 */
@Component({
  selector: 'jf-form',
  standalone: true,
  exportAs: 'jfForm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FieldRendererComponent],
  providers: [
    { provide: JSON_FORMS_RUNTIME, useExisting: forwardRef(() => FormHostComponent) },
  ],
  template: `
    @if (form(); as f) {
      @for (node of nodes(); track node.key) {
        <jf-field-renderer [node]="node" [field]="fieldFor(f, node)" [path]="[node.key]" />
      }
    }
  `,
})
export class FormHostComponent implements OnInit, JsonFormsRuntime {
  private readonly injector = inject(Injector);
  private readonly registries = inject(JSON_FORMS_CONFIG);

  readonly schema = input.required<FormConfig>();
  readonly model = model<Record<string, unknown>>({});

  /** Root FieldTree (null until built in ngOnInit). */
  readonly form = signal<FieldTree<unknown> | null>(null);
  readonly nodes = signal<FieldNode[]>([]);

  /** Validity state of the entire form (true while not yet built). */
  readonly invalid = computed(() => {
    const f = this.form();
    return f ? (f as any)().invalid() : true;
  });

  ngOnInit(): void {
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
