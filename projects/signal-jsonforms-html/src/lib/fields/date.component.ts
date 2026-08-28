import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FieldComponent, FieldConfig, FieldTree, FormField } from 'signal-jsonforms';

/** Native date input; the model stores an ISO string (YYYY-MM-DD). Range
 *  limits belong in validators (Signal Forms owns min/max on [formField] nodes). */
@Component({
  selector: 'jfh-date',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField],
  template: `
    <input class="jfh-input" type="date" [formField]="$any(field())" />
  `,
  styles: [
    `:host{display:block}
     .jfh-input{width:100%;box-sizing:border-box;padding:.5rem .6rem;border:1px solid #cfd6df;border-radius:8px;font:inherit;color:#1f2733;background:#fff}
     .jfh-input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px #2563eb22}`,
  ],
})
export class HtmlDateComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
}
