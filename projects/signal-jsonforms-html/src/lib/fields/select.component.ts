import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FieldComponent, FieldConfig, FieldTree, FormField } from 'signal-jsonforms';

interface Option { value: string; label: string; }

@Component({
  selector: 'jfh-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField],
  template: `
    <select class="jfh-input" [formField]="$any(field())">
      @for (opt of options(); track opt.value) {
        <option [value]="opt.value">{{ opt.label }}</option>
      }
    </select>
  `,
  styles: [
    `:host{display:block}
     .jfh-input{width:100%;box-sizing:border-box;padding:.5rem .6rem;border:1px solid #cfd6df;border-radius:8px;font:inherit;color:#1f2733;background:#fff}
     .jfh-input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px #2563eb22}`,
  ],
})
export class HtmlSelectComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  protected readonly options = computed(
    () => (this.config().props?.['options'] as Option[]) ?? [],
  );
}
