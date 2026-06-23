import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FieldNode } from '../core/model';
import { FieldTree } from '../adapter/signal-forms.adapter';
import { JSON_FORMS_CONFIG } from '../registry/tokens';

/**
 * Wrapper por defecto (agnóstico de UI). Instancia el control del FieldTypeRegistry
 * y añade el andamiaje transversal: descripción, hint y el indicador de estado
 * "Comprobando…" cuando hay validación async en curso (pending).
 *
 * Material gestiona su propio label/errores dentro del control; el wrapper solo
 * compone alrededor, así que no duplica esa chrome.
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
        <div class="jf-unknown">Tipo de campo no registrado: "{{ node().config.type }}"</div>
      }
      @if (pending()) {
        <small class="jf-pending">Comprobando…</small>
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

  /** true mientras una validación async del campo está en curso. */
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
