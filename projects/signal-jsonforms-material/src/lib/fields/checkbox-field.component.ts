import { Component, computed, input } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FieldComponent, FieldConfig, FieldTree, FormField } from 'signal-jsonforms';

@Component({
  selector: 'jf-mat-checkbox-field',
  standalone: true,
  imports: [MatCheckboxModule, FormField],
  template: `
    <mat-checkbox [formField]="$any(field())">{{ config().label }}</mat-checkbox>
  `,
})
export class MatCheckboxFieldComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  protected readonly state = computed(() => (this.field() as any)());
}
