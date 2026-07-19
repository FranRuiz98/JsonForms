/**
 * Per-container "Add field" menu. Inserts a new field directly into a specific
 * container (root or a group id) via store.insertNewNode — so nesting never
 * depends on which node happens to be selected.
 */
import { ChangeDetectionStrategy, Component, HostListener, inject, input, signal } from '@angular/core';
import { BuilderStore } from '../builder/builder-store';
import { PALETTE_BY_CATEGORY, PaletteItem, fieldMeta } from '../builder/palette';
import { IconComponent } from './icon.component';

@Component({
  selector: 'wb-add-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="relative inline-block">
      <button
        type="button"
        (click)="toggle($event)"
        class="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-[12.5px] font-medium text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600"
      >
        <wb-icon name="plus" [size]="14" /> Add field
      </button>

      @if (open()) {
        <div
          (click)="$event.stopPropagation()"
          class="absolute left-0 z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          @for (group of categories; track group.category) {
            <div class="px-1.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {{ group.category }}
            </div>
            @for (item of group.items; track item.type) {
              <button
                type="button"
                (click)="pick(item)"
                class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-slate-700 hover:bg-indigo-50/70"
              >
                <span class="flex h-6 w-6 flex-none items-center justify-center rounded-md {{ meta(item.type).soft }}">
                  <wb-icon [name]="meta(item.type).icon" [size]="13" />
                </span>
                {{ item.title }}
              </button>
            }
          }
        </div>
      }
    </div>
  `,
})
export class AddMenuComponent {
  private readonly store = inject(BuilderStore);
  readonly containerId = input.required<string>();
  readonly categories = PALETTE_BY_CATEGORY;
  readonly meta = fieldMeta;
  readonly open = signal(false);

  toggle(e: Event): void {
    e.stopPropagation();
    this.open.update((v) => !v);
  }

  pick(item: PaletteItem): void {
    this.store.insertNewNode(item, this.containerId(), Number.MAX_SAFE_INTEGER);
    this.open.set(false);
  }

  /** Close when clicking anywhere else (toggle/menu clicks stop propagation). */
  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.open()) this.open.set(false);
  }
}
