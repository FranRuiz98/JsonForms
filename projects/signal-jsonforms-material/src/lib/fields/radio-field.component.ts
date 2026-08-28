import { Component, computed, input } from '@angular/core';
import { MatRadioModule } from '@angular/material/radio';
import {
  FieldComponent,
  FieldConfig,
  FieldTree,
  FormField,
  OptionItem,
  OptionsState,
} from 'signal-jsonforms';

@Component({
  selector: 'jf-mat-radio-field',
  standalone: true,
  imports: [MatRadioModule, FormField],
  template: `
    <div class="jf-field jf-radio-field">
      @if (config().label) {
        <label class="jf-radio-label">{{ config().label }}</label>
      }
      <mat-radio-group [formField]="$any(field())" class="jf-radio-group">
        @for (opt of opts(); track opt.value) {
          <mat-radio-button [value]="opt.value" [disabled]="opt.disabled ?? false">
            {{ opt.label }}
          </mat-radio-button>
        }
      </mat-radio-group>
      @if (loading()) {
        <small class="jf-radio-loading">Loading…</small>
      }
      @if (state().touched() && state().errors().length) {
        <small class="jf-radio-error">{{ state().errors()[0].message }}</small>
      }
    </div>
  `,
  styles: [
    `:host{display:block}
     .jf-radio-label{display:block;margin-bottom:.25rem;font-size:.9rem}
     .jf-radio-group{display:flex;flex-direction:column;gap:.15rem}
     .jf-radio-error{color:var(--mat-form-field-error-text-color,#ba1a1a);font-size:.75rem}
     .jf-radio-loading{font-size:.75rem;opacity:.7}`,
  ],
})
export class MatRadioFieldComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  /** Reactive options injected by the renderer for fields with dynamic options. */
  readonly options = input<OptionsState | undefined>(undefined);

  protected readonly state = computed(() => (this.field() as any)());

  protected readonly opts = computed<OptionItem[]>(() => {
    const dynamic = this.options();
    if (dynamic) return dynamic.options;
    return (this.config().props?.['options'] as OptionItem[]) ?? [];
  });

  protected readonly loading = computed(() => !!this.options()?.loading);
}
