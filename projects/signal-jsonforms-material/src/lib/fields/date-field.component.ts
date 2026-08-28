import { Component, computed, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FieldComponent, FieldConfig, FieldTree, FormField } from 'signal-jsonforms';

/**
 * Date control backed by a native `<input type="date">` so the model stores a
 * serializable ISO string (`YYYY-MM-DD`) instead of a `Date` object — no
 * DateAdapter setup required. Range limits belong in validators (Signal Forms
 * owns min/max on [formField] nodes, so they cannot be bound here).
 */
@Component({
  selector: 'jf-mat-date-field',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, FormField],
  template: `
    <mat-form-field appearance="outline" class="jf-field">
      <mat-label>{{ config().label }}</mat-label>
      <input matInput type="date" [formField]="$any(field())" />
      @if (state().touched() && state().errors().length) {
        <mat-error>{{ state().errors()[0].message }}</mat-error>
      }
    </mat-form-field>
  `,
})
export class MatDateFieldComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  protected readonly state = computed(() => (this.field() as any)());
}
