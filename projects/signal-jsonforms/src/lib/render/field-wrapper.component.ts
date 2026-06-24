import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FieldNode } from '../core/model';
import { FieldTree } from '../adapter/signal-forms.adapter';
import { JSON_FORMS_CONFIG } from '../registry/tokens';

/**
 * Default wrapper (UI-agnostic). Instantiates the control from the FieldTypeRegistry
 * and adds cross-cutting scaffolding: description, hint, and the "Checking…" status
 * indicator when async validation is in progress (pending).
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
      @if (control(); as cmp) {
        <ng-container [ngComponentOutlet]="cmp" [ngComponentOutletInputs]="controlInputs()" />
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

  protected readonly control = computed(
    () => this.registries.fieldTypes?.[this.node().config.type] ?? null,
  );

  protected readonly controlInputs = computed(() => ({
    field: this.field(),
    config: this.node().config,
  }));

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
