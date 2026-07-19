/**
 * Live preview: renders the serialized config through the REAL library, so the
 * author sees true rendering, validation, and dynamic behavior. FormHost builds
 * in ngOnInit only, so we recreate it (keyed @for) whenever the config changes.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormHostComponent } from 'signal-jsonforms';
import { BuilderStore } from '../builder/builder-store';
import { IconComponent } from './icon.component';

@Component({
  selector: 'wb-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormHostComponent, IconComponent],
  template: `
    <div class="wb-surface min-h-full p-6">
      @if (store.isEmpty()) {
        <div class="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
            <wb-icon name="layers" [size]="24" />
          </div>
          <p class="text-[13px] text-slate-400">Add a field to see the live preview.</p>
        </div>
      } @else if (validation().ok) {
        <div class="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          @for (key of [previewKey()]; track key) {
            <jf-form [schema]="validation().config!" [(model)]="model"></jf-form>
          }
        </div>
      } @else {
        <div class="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div class="mb-2 flex items-center gap-2 text-[13px] font-semibold text-rose-700">
            <wb-icon name="alert" [size]="16" /> Invalid configuration
          </div>
          <pre class="wb-scroll max-h-80 overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-rose-600">{{ validation().error }}</pre>
        </div>
      }
    </div>
  `,
})
export class PreviewComponent {
  readonly store = inject(BuilderStore);
  readonly model = signal<Record<string, unknown>>({});

  readonly validation = computed<{ ok: boolean; config?: any; error?: string }>(() => {
    const v = this.store.validation();
    return v.ok ? { ok: true, config: v.config } : { ok: false, error: v.error };
  });

  /** Recreate the FormHost whenever the config content changes. */
  readonly previewKey = computed(() => JSON.stringify(this.store.formConfig()));
}
