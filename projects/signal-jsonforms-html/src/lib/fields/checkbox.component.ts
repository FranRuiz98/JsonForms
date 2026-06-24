import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FieldComponent, FieldConfig, FieldTree, FormField } from 'signal-jsonforms';

@Component({
  selector: 'jfh-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField],
  template: `
    <label class="jfh-check">
      <input type="checkbox" [formField]="$any(field())" />
      <span>{{ config().label }}</span>
    </label>
  `,
  styles: [
    `:host{display:block}
     .jfh-check{display:inline-flex;align-items:center;gap:.5rem;font:inherit;color:#1f2733;cursor:pointer}`,
  ],
})
export class HtmlCheckboxComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
}
