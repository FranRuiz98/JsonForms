import { Component, computed, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  FieldComponent,
  FieldConfig,
  FieldTree,
  FormField,
  OptionItem,
  OptionsState,
} from 'signal-jsonforms';

/** Multiple-choice select; the model value is an array of option values. */
@Component({
  selector: 'jf-mat-multiselect-field',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule, FormField],
  template: `
    <mat-form-field appearance="outline" class="jf-field">
      <mat-label>{{ config().label }}</mat-label>
      <mat-select multiple [formField]="$any(field())">
        @for (opt of opts(); track opt.value) {
          <mat-option [value]="opt.value" [disabled]="opt.disabled ?? false">{{ opt.label }}</mat-option>
        }
      </mat-select>
      @if (loading()) {
        <mat-hint>Loading…</mat-hint>
      }
      @if (state().touched() && state().errors().length) {
        <mat-error>{{ state().errors()[0].message }}</mat-error>
      }
    </mat-form-field>
  `,
})
export class MatMultiselectFieldComponent implements FieldComponent {
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
