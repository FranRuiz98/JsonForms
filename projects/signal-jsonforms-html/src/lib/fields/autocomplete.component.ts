import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  FieldComponent,
  FieldConfig,
  FieldTree,
  FormField,
  OptionItem,
  OptionsState,
} from 'signal-jsonforms';

let nextListId = 0;

/** Text input with native <datalist> suggestions; free text is allowed. */
@Component({
  selector: 'jfh-autocomplete',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField],
  template: `
    <input
      class="jfh-input"
      [formField]="$any(field())"
      [placeholder]="placeholder()"
      [attr.list]="listId" />
    <datalist [id]="listId">
      @for (opt of opts(); track opt.value) {
        <option [value]="opt.value">{{ opt.label }}</option>
      }
    </datalist>
    @if (loading()) {
      <small class="jfh-loading">Loading…</small>
    }
  `,
  styles: [
    `:host{display:block}
     .jfh-input{width:100%;box-sizing:border-box;padding:.5rem .6rem;border:1px solid #cfd6df;border-radius:8px;font:inherit;color:#1f2733}
     .jfh-input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px #2563eb22}
     .jfh-loading{display:block;margin-top:.25rem;font-size:.78rem;color:#2563eb}`,
  ],
})
export class HtmlAutocompleteComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  /** Reactive options injected by the renderer for fields with dynamic options. */
  readonly options = input<OptionsState | undefined>(undefined);

  protected readonly listId = `jfh-datalist-${nextListId++}`;
  protected readonly placeholder = computed(
    () => (this.config().props?.['placeholder'] as string) ?? '',
  );

  protected readonly opts = computed<OptionItem[]>(() => {
    const dynamic = this.options();
    if (dynamic) return dynamic.options;
    return (this.config().props?.['options'] as OptionItem[]) ?? [];
  });

  protected readonly loading = computed(() => !!this.options()?.loading);
}
