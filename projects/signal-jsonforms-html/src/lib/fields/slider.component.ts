import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FieldComponent, FieldConfig, FieldTree } from 'signal-jsonforms';

/**
 * Range slider bound manually to the FieldState so the model always stores a
 * number (a native range input reports its value as a string).
 */
@Component({
  selector: 'jfh-slider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="jfh-slider-row">
      <input
        class="jfh-slider"
        type="range"
        [min]="min()"
        [max]="max()"
        [step]="step()"
        [value]="numValue()"
        [disabled]="disabled()"
        (input)="set($event)"
        (blur)="touch()" />
      <output class="jfh-slider-out">{{ numValue() }}</output>
    </div>
  `,
  styles: [
    `:host{display:block}
     .jfh-slider-row{display:flex;align-items:center;gap:.75rem}
     .jfh-slider{flex:1;accent-color:#2563eb}
     .jfh-slider-out{min-width:2.5rem;text-align:right;font:inherit;color:#1f2733;font-variant-numeric:tabular-nums}`,
  ],
})
export class HtmlSliderComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();

  protected readonly state = computed(() => (this.field() as any)());
  protected readonly disabled = computed(() => !!this.state().disabled?.());
  protected readonly min = computed(() => (this.config().props?.['min'] as number) ?? 0);
  protected readonly max = computed(() => (this.config().props?.['max'] as number) ?? 100);
  protected readonly step = computed(() => (this.config().props?.['step'] as number) ?? 1);
  protected readonly numValue = computed(() => Number(this.state().value() ?? 0));

  protected set(e: Event): void {
    this.state().value.set(Number((e.target as HTMLInputElement).value));
  }

  protected touch(): void {
    this.state().markAsTouched?.();
  }
}
