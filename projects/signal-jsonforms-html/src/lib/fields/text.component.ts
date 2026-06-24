import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FieldComponent, FieldConfig, FieldTree, FormField } from 'signal-jsonforms';

/** Control de texto desnudo (text/password/email) bound con [formField]. */
@Component({
  selector: 'jfh-text',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField],
  template: `
    <input class="jfh-input" [type]="type()" [formField]="$any(field())" [placeholder]="placeholder()" />
  `,
  styles: [
    `:host{display:block}
     .jfh-input{width:100%;box-sizing:border-box;padding:.5rem .6rem;border:1px solid #cfd6df;border-radius:8px;font:inherit;color:#1f2733}
     .jfh-input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px #2563eb22}`,
  ],
})
export class HtmlTextComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  protected readonly placeholder = computed(
    () => (this.config().props?.['placeholder'] as string) ?? '',
  );
  protected readonly type = computed(() => {
    const t = this.config().type;
    return t === 'password' || t === 'email' ? t : 'text';
  });
}
