import { Component, computed, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FieldComponent, FieldConfig, FieldTree, FormField } from 'signal-jsonforms';

interface Option { value: string; label: string; }

@Component({
  selector: 'jf-mat-select-field',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule, FormField],
  template: `
    <mat-form-field appearance="outline" class="jf-field">
      <mat-label>{{ config().label }}</mat-label>
      <mat-select [formField]="$any(field())">
        @for (opt of options(); track opt.value) {
          <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
        }
      </mat-select>
      @if (state().touched() && state().errors().length) {
        <mat-error>{{ state().errors()[0].message }}</mat-error>
      }
    </mat-form-field>
  `,
})
export class MatSelectFieldComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  protected readonly state = computed(() => (this.field() as any)());
  protected readonly options = computed(
    () => (this.config().props?.['options'] as Option[]) ?? [],
  );
}
