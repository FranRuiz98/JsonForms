import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Type, computed, inject, input } from '@angular/core';
import { FieldNode } from '../core/model';
import { FieldTree } from '../adapter/signal-forms.adapter';
import { JSON_FORMS_CONFIG } from '../registry/tokens';

/**
 * Default wrapper (UI-agnostic). Renders the inner content and adds cross-cutting
 * scaffolding: description, hint, and the "Checking…" status indicator when async
 * validation is in progress (pending).
 *
 * The inner content is whatever the renderer threads in via `inner`/`innerInputs`
 * (the next wrapper in the stack, or the field control). When stacked, the first
 * wrapper key is the outermost. If `inner` is absent (e.g. the wrapper is used
 * standalone), it falls back to the control from the FieldTypeRegistry.
 *
 * Material manages its own label/errors inside the control; the wrapper only
 * composes around it, so it does not duplicate that chrome.
 */
@Component({
  selector: 'jf-field-wrapper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    <div class="jf-wrapper">
      @if (description()) {
        <p class="jf-description">{{ description() }}</p>
      }
      @if (innerComponent(); as cmp) {
        <ng-container [ngComponentOutlet]="cmp" [ngComponentOutletInputs]="innerComponentInputs()" />
      } @else {
        <div class="jf-unknown">Unregistered field type: "{{ node().config.type }}"</div>
      }
      @if (pending()) {
        <small class="jf-pending">Checking…</small>
      } @else if (hint()) {
        <small class="jf-hint">{{ hint() }}</small>
      }
    </div>
  `,
})
export class JfFieldWrapperComponent {
  private readonly registries = inject(JSON_FORMS_CONFIG);

  readonly node = input.required<FieldNode>();
  readonly field = input.required<FieldTree<unknown>>();
  /** Next component to render inside this wrapper (another wrapper or the control). */
  readonly inner = input<Type<unknown> | null>(null);
  /** Inputs for the inner component. */
  readonly innerInputs = input<Record<string, unknown>>({});

  /** Fallback control when used standalone (no inner threaded by the renderer). */
  private readonly control = computed(
    () => this.registries.fieldTypes?.[this.node().config.type] ?? null,
  );

  protected readonly innerComponent = computed(() => this.inner() ?? this.control());

  protected readonly innerComponentInputs = computed(() =>
    this.inner() ? this.innerInputs() : { field: this.field(), config: this.node().config },
  );

  /** true while an async field validation is in progress. */
  protected readonly pending = computed(() => {
    try {
      return !!(this.field() as any)().pending();
    } catch {
      return false;
    }
  });

  protected readonly description = computed(
    () => this.node().config.props?.['description'] as string | undefined,
  );
  protected readonly hint = computed(
    () => this.node().config.props?.['hint'] as string | undefined,
  );
}
