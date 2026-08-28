import { Component, computed, input } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { FieldComponent, FieldConfig, FieldTree, FormField } from 'signal-jsonforms';

/** Numeric slider. `props.min` / `props.max` / `props.step` configure the range. */
@Component({
  selector: 'jf-mat-slider-field',
  standalone: true,
  imports: [MatSliderModule, FormField],
  template: `
    <div class="jf-field jf-slider-field">
      @if (config().label) {
        <label class="jf-slider-label">
          {{ config().label }}
          <span class="jf-slider-value">{{ state().value() }}</span>
        </label>
      }
      <mat-slider [min]="min()" [max]="max()" [step]="step()" discrete class="jf-slider">
        <input matSliderThumb [formField]="$any(field())" />
      </mat-slider>
      @if (state().touched() && state().errors().length) {
        <small class="jf-slider-error">{{ state().errors()[0].message }}</small>
      }
    </div>
  `,
  styles: [
    `:host{display:block}
     .jf-slider-label{display:flex;justify-content:space-between;font-size:.9rem}
     .jf-slider{width:100%}
     .jf-slider-value{opacity:.7}
     .jf-slider-error{color:var(--mat-form-field-error-text-color,#ba1a1a);font-size:.75rem}`,
  ],
})
export class MatSliderFieldComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  protected readonly state = computed(() => (this.field() as any)());
  protected readonly min = computed(() => (this.config().props?.['min'] as number) ?? 0);
  protected readonly max = computed(() => (this.config().props?.['max'] as number) ?? 100);
  protected readonly step = computed(() => (this.config().props?.['step'] as number) ?? 1);
}
