/** Left panel: the palette. Items are click-to-add AND draggable onto the canvas. */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CdkDrag, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { BuilderStore, PALETTE_CONTAINER } from '../builder/builder-store';
import { PALETTE_BY_CATEGORY, PaletteItem, fieldMeta } from '../builder/palette';
import { IconComponent } from './icon.component';

@Component({
  selector: 'wb-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CdkDropList, CdkDrag, CdkDragPreview],
  template: `
    <div class="p-3">
      <div class="px-1.5 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Palette</div>

      <div
        cdkDropList
        [id]="paletteId"
        cdkDropListSortingDisabled
        [cdkDropListEnterPredicate]="noEnter"
        class="space-y-4"
      >
        @for (group of categories; track group.category) {
          <div>
            <div class="mb-1.5 px-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {{ group.category }}
            </div>
            <div class="flex flex-col gap-1.5">
              @for (item of group.items; track item.type) {
                <button
                  type="button"
                  cdkDrag
                  [cdkDragData]="item"
                  (click)="add(item)"
                  class="group flex cursor-grab items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-sm active:cursor-grabbing"
                >
                  <span class="flex h-7 w-7 flex-none items-center justify-center rounded-md {{ meta(item.type).soft }}">
                    <wb-icon [name]="meta(item.type).icon" [size]="15" />
                  </span>
                  <span class="flex-1 text-[13px] font-medium text-slate-700">{{ item.title }}</span>
                  <wb-icon name="plus" [size]="14" />

                  <div *cdkDragPreview class="flex items-center gap-2 rounded-lg border border-indigo-300 bg-white px-3 py-2 shadow-lg">
                    <span class="flex h-6 w-6 items-center justify-center rounded-md {{ meta(item.type).soft }}">
                      <wb-icon [name]="meta(item.type).icon" [size]="14" />
                    </span>
                    <span class="text-[13px] font-medium text-slate-700">{{ item.title }}</span>
                  </div>
                </button>
              }
            </div>
          </div>
        }
      </div>

      <p class="mt-4 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-relaxed text-slate-400">
        Use “Add field” inside a group to nest, or click to add at the top level. You can also drag.
      </p>
    </div>
  `,
})
export class PaletteComponent {
  private readonly store = inject(BuilderStore);
  readonly categories = PALETTE_BY_CATEGORY;
  readonly meta = fieldMeta;
  readonly paletteId = PALETTE_CONTAINER;

  /** The palette never accepts drops — it is a drag source only. */
  readonly noEnter = () => false;

  add(item: PaletteItem): void {
    this.store.addFromPalette(item);
  }
}
