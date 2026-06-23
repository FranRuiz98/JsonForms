import { Component, computed, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FieldComponent, FieldConfig, FieldTree, FormField } from 'signal-jsonforms';

@Component({
  selector: 'jf-mat-text-field',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, FormField],
  template: `
    <mat-form-field appearance="outline" class="jf-field">
      <mat-label>{{ config().label }}</mat-label>
      <input matInput [formField]="$any(field())" [placeholder]="placeholder()" />
      @if (state().touched() && state().errors().length) {
        <mat-error>{{ state().errors()[0].message }}</mat-error>
      }
    </mat-form-field>
  `,
})
export class MatTextFieldComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  protected readonly state = computed(() => (this.field() as any)());
  protected readonly placeholder = computed(
    () => (this.config().props?.['placeholder'] as string) ?? '',
  );
}
