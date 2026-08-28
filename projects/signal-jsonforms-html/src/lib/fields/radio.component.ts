import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  FieldComponent,
  FieldConfig,
  FieldTree,
  OptionItem,
  OptionsState,
} from 'signal-jsonforms';

let nextGroupId = 0;

/**
 * Radio group bound manually to the FieldState (a set of native radios has no
 * single element the FormField directive could attach to).
 */
@Component({
  selector: 'jfh-radio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="jfh-radio-group" role="radiogroup">
      @for (opt of opts(); track opt.value) {
        <label class="jfh-radio">
          <input
            type="radio"
            [name]="groupName"
            [checked]="state().value() === opt.value"
            [disabled]="disabled() || (opt.disabled ?? false)"
            (change)="pick(opt.value)"
            (blur)="touch()" />
          <span>{{ opt.label }}</span>
        </label>
      }
    </div>
    @if (loading()) {
      <small class="jfh-loading">Loading…</small>
    }
  `,
  styles: [
    `:host{display:block}
     .jfh-radio-group{display:flex;flex-direction:column;gap:.35rem}
     .jfh-radio{display:inline-flex;align-items:center;gap:.5rem;font:inherit;color:#1f2733;cursor:pointer}
     .jfh-radio input:disabled+span{opacity:.5}
     .jfh-loading{display:block;margin-top:.25rem;font-size:.78rem;color:#2563eb}`,
  ],
})
export class HtmlRadioComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  /** Reactive options injected by the renderer for fields with dynamic options. */
  readonly options = input<OptionsState | undefined>(undefined);

  protected readonly groupName = `jfh-radio-${nextGroupId++}`;
  protected readonly state = computed(() => (this.field() as any)());
  protected readonly disabled = computed(() => !!this.state().disabled?.());

  protected readonly opts = computed<OptionItem[]>(() => {
    const dynamic = this.options();
    if (dynamic) return dynamic.options;
    return (this.config().props?.['options'] as OptionItem[]) ?? [];
  });

  protected readonly loading = computed(() => !!this.options()?.loading);

  protected pick(value: unknown): void {
    this.state().value.set(value);
    this.touch();
  }

  protected touch(): void {
    this.state().markAsTouched?.();
  }
}
