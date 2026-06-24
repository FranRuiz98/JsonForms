import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FieldNode, FieldTree, JSON_FORMS_CONFIG } from 'signal-jsonforms';

/**
 * Wrapper del kit HTML. A diferencia del wrapper por defecto del núcleo (pensado
 * para controles self-wrapping como Material), aquí los controles son "desnudos",
 * así que el wrapper aporta TODA la chrome: label, descripción, error, hint y el
 * indicador pending. Esto es lo que el sistema de wrappers pretende demostrar.
 */
@Component({
  selector: 'jfh-field-wrapper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    <div class="jfh-wrapper" [class.jfh-has-error]="showError()">
      @if (showLabel()) {
        <label class="jfh-label">{{ node().config.label }}</label>
      }
      @if (description()) {
        <p class="jfh-desc">{{ description() }}</p>
      }
      @if (control(); as cmp) {
        <ng-container [ngComponentOutlet]="cmp" [ngComponentOutletInputs]="controlInputs()" />
      } @else {
        <div class="jfh-unknown">Unregistered field type: "{{ node().config.type }}"</div>
      }
      @if (pending()) {
        <small class="jfh-pending">Checking…</small>
      } @else if (showError()) {
        <small class="jfh-error">{{ firstError() }}</small>
      } @else if (hint()) {
        <small class="jfh-hint">{{ hint() }}</small>
      }
    </div>
  `,
  styles: [
    `.jfh-wrapper{display:block;margin-bottom:1rem}
     .jfh-label{display:block;margin-bottom:.3rem;font-size:.82rem;font-weight:600;color:#384150}
     .jfh-desc{margin:0 0 .35rem;font-size:.8rem;color:#5b6675}
     .jfh-error{display:block;margin-top:.3rem;font-size:.78rem;color:#dc2626}
     .jfh-hint{display:block;margin-top:.3rem;font-size:.78rem;color:#9aa3b2}
     .jfh-pending{display:block;margin-top:.3rem;font-size:.78rem;color:#2563eb}
     .jfh-pending::before{content:'⏳ '}
     .jfh-has-error ::ng-deep .jfh-input{border-color:#dc2626}`,
  ],
})
export class HtmlFieldWrapperComponent {
  private readonly registries = inject(JSON_FORMS_CONFIG);

  readonly node = input.required<FieldNode>();
  readonly field = input.required<FieldTree<unknown>>();

  private readonly state = computed(() => {
    try {
      return (this.field() as any)();
    } catch {
      return null;
    }
  });

  protected readonly control = computed(
    () => this.registries.fieldTypes?.[this.node().config.type] ?? null,
  );
  protected readonly controlInputs = computed(() => ({
    field: this.field(),
    config: this.node().config,
  }));

  protected readonly pending = computed(() => {
    const s = this.state();
    return s ? !!s.pending() : false;
  });
  protected readonly showError = computed(() => {
    const s = this.state();
    return s ? !!s.touched() && s.errors().length > 0 : false;
  });
  protected readonly firstError = computed(() => {
    const s = this.state();
    return s ? (s.errors()[0]?.message ?? 'Invalid value') : '';
  });

  protected readonly showLabel = computed(
    () => !!this.node().config.label && this.node().config.type !== 'checkbox',
  );
  protected readonly description = computed(
    () => this.node().config.props?.['description'] as string | undefined,
  );
  protected readonly hint = computed(
    () => this.node().config.props?.['hint'] as string | undefined,
  );
}
