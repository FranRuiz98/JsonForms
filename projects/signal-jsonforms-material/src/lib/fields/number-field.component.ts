import { Component, computed, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FieldComponent, FieldConfig, FieldTree, FormField } from 'signal-jsonforms';

@Component({
  selector: 'jf-mat-number-field',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, FormField],
  template: `
    <mat-form-field appearance="outline" class="jf-field">
      <mat-label>{{ config().label }}</mat-label>
      <input matInput type="number" [formField]="$any(field())" />
      @if (state().touched() && state().errors().length) {
        <mat-error>{{ state().errors()[0].message }}</mat-error>
      }
    </mat-form-field>
  `,
})
export class MatNumberFieldComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  protected readonly state = computed(() => (this.field() as any)());
}
