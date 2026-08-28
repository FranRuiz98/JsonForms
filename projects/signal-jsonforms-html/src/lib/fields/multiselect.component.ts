import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  FieldComponent,
  FieldConfig,
  FieldTree,
  OptionItem,
  OptionsState,
} from 'signal-jsonforms';

/**
 * Checkbox group whose model value is an array of the checked option values,
 * bound manually to the FieldState (array values do not map onto a single
 * native control).
 */
@Component({
  selector: 'jfh-multiselect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="jfh-multi-group" role="group">
      @for (opt of opts(); track opt.value) {
        <label class="jfh-multi">
          <input
            type="checkbox"
            [checked]="isChecked(opt.value)"
            [disabled]="disabled() || (opt.disabled ?? false)"
            (change)="toggle(opt.value)"
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
     .jfh-multi-group{display:flex;flex-direction:column;gap:.35rem}
     .jfh-multi{display:inline-flex;align-items:center;gap:.5rem;font:inherit;color:#1f2733;cursor:pointer}
     .jfh-multi input:disabled+span{opacity:.5}
     .jfh-loading{display:block;margin-top:.25rem;font-size:.78rem;color:#2563eb}`,
  ],
})
export class HtmlMultiselectComponent implements FieldComponent {
  readonly field = input.required<FieldTree<unknown>>();
  readonly config = input.required<FieldConfig>();
  /** Reactive options injected by the renderer for fields with dynamic options. */
  readonly options = input<OptionsState | undefined>(undefined);

  protected readonly state = computed(() => (this.field() as any)());
  protected readonly disabled = computed(() => !!this.state().disabled?.());

  protected readonly opts = computed<OptionItem[]>(() => {
    const dynamic = this.options();
    if (dynamic) return dynamic.options;
    return (this.config().props?.['options'] as OptionItem[]) ?? [];
  });

  protected readonly loading = computed(() => !!this.options()?.loading);

  private current(): unknown[] {
    const v = this.state().value();
    return Array.isArray(v) ? v : [];
  }

  protected isChecked(value: unknown): boolean {
    return this.current().includes(value);
  }

  protected toggle(value: unknown): void {
    const cur = this.current();
    this.state().value.set(
      cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
    );
    this.touch();
  }

  protected touch(): void {
    this.state().markAsTouched?.();
  }
}
