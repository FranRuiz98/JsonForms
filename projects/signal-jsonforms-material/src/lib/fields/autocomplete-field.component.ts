import { Component, computed, input } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  FieldComponent,
  FieldConfig,
  FieldTree,
  FormField,
  OptionItem,
  OptionsState,
} from 'signal-jsonforms';

/**
 * Text input with suggestions. Picking a suggestion stores the option's `value`
 * (rendered through `displayWith` as its label); free text is kept as typed.
 */
@Component({
  selector: 'jf-mat-autocomplete-field',
  standalone: true,
  imports: [MatAutocompleteModule, MatFormFieldModule, MatInputModule, FormField],
  template: `
    <mat-form-field appearance="outline" class="jf-field">
      <mat-label>{{ config().label }}</mat-label>
      <input
        matInput
        [formField]="$any(field())"
        [matAutocomplete]="auto"
        [placeholder]="placeholder()" />
      <mat-autocomplete #auto [displayWith]="displayWith">
        @for (opt of filtered(); track opt.value) {
          <mat-option [value]="opt.value" [disabled]="opt.disabled ?? false">{{ opt.label }}</mat-option>
        }
      </mat-autocomplete>
      @if (loading()) {
        <mat-hint>Loading…</mat-hint>
      }
      @if (state().touched() && state().errors().length) {
        <mat-error>{{ state().errors()[0].message }}</mat-error>
      }
    </mat-form-field>
  `,
})
export class MatAutocompleteFieldComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  /** Reactive options injected by the renderer for fields with dynamic options. */
  readonly options = input<OptionsState | undefined>(undefined);

  protected readonly state = computed(() => (this.field() as any)());
  protected readonly placeholder = computed(
    () => (this.config().props?.['placeholder'] as string) ?? '',
  );

  protected readonly opts = computed<OptionItem[]>(() => {
    const dynamic = this.options();
    if (dynamic) return dynamic.options;
    return (this.config().props?.['options'] as OptionItem[]) ?? [];
  });

  /** Suggestions matching the current text (or all, when it matches a value exactly). */
  protected readonly filtered = computed<OptionItem[]>(() => {
    const raw = String(this.state().value() ?? '').toLowerCase();
    const all = this.opts();
    if (!raw || all.some((o) => String(o.value).toLowerCase() === raw)) return all;
    return all.filter((o) => o.label.toLowerCase().includes(raw));
  });

  protected readonly loading = computed(() => !!this.options()?.loading);

  /** Shows the matching option's label for a stored value. */
  protected readonly displayWith = (value: unknown): string => {
    const match = this.opts().find((o) => o.value === value);
    return match ? match.label : value == null ? '' : String(value);
  };
}
