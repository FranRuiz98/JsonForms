/**
 * One node on the design canvas, rendered recursively. Shows builder chrome
 * (grip + icon + label + type badge + actions) rather than the real control —
 * the live preview pane covers true rendering. Groups expose a nested droplist
 * for their fields PLUS an explicit "Add field" menu; arrays recurse into their
 * item template (whose group, in turn, exposes its own droplist + add menu).
 * Hidden/disabled fields are badged, not removed, so they stay selectable.
 */
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CdkDrag, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { BuilderStore } from '../builder/builder-store';
import { BuilderField } from '../builder/builder-model';
import { fieldMeta } from '../builder/palette';
import { AddMenuComponent } from './add-menu.component';
import { IconComponent } from './icon.component';

@Component({
  selector: 'wb-canvas-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AddMenuComponent, CdkDropList, CdkDrag, CdkDragHandle],
  template: `
    @let f = node();
    @let m = meta(f.type);
    <div class="group/node">
      <div
        (click)="select($event)"
        class="relative flex cursor-pointer items-center gap-2 rounded-xl border bg-white py-2.5 pl-1.5 pr-3 transition"
        [class]="selected()
          ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'"
      >
        <button
          type="button"
          cdkDragHandle
          (click)="$event.stopPropagation()"
          title="Drag to reorder or move"
          class="flex h-8 w-5 flex-none cursor-grab items-center justify-center rounded text-slate-300 hover:text-slate-500 active:cursor-grabbing"
        >
          <wb-icon name="grip" [size]="16" />
        </button>

        <span class="flex h-8 w-8 flex-none items-center justify-center rounded-lg {{ m.soft }}">
          <wb-icon [name]="m.icon" [size]="16" />
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate text-[13.5px] font-semibold text-slate-800">{{ f.label || f.key }}</span>
            @if (isRequired(f)) { <span class="text-rose-500" title="Required">*</span> }
          </div>
          <div class="mt-0.5 flex items-center gap-1.5">
            <code class="rounded bg-slate-100 px-1.5 py-px font-mono text-[11px] text-slate-500">{{ f.key }}</code>
            @if (f.hidden) {
              <span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-px text-[10.5px] font-medium text-amber-700">
                <wb-icon name="eye-off" [size]="11" /> hidden
              </span>
            }
            @if (f.disabled) {
              <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-px text-[10.5px] font-medium text-slate-500">
                <wb-icon name="ban" [size]="11" /> disabled
              </span>
            }
          </div>
        </div>

        <span class="flex-none rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide {{ m.badge }}">
          {{ f.type }}
        </span>

        <div class="flex flex-none items-center gap-0.5 opacity-0 transition group-hover/node:opacity-100">
          <button type="button" (click)="duplicate($event)" title="Duplicate"
            class="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <wb-icon name="copy" [size]="14" />
          </button>
          <button type="button" (click)="remove($event)" title="Delete"
            class="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <wb-icon name="trash" [size]="14" />
          </button>
        </div>
      </div>

      @if (f.type === 'group') {
        <div class="mt-2 ml-6 border-l-2 border-dashed border-slate-200 pl-4">
          <div
            cdkDropList
            [id]="f._id"
            [cdkDropListData]="f.fields || []"
            (cdkDropListDropped)="store.handleDrop($event)"
            class="wb-dropzone flex min-h-[24px] flex-col gap-2 rounded-lg"
          >
            @for (child of f.fields || []; track child._id) {
              <wb-canvas-node cdkDrag [cdkDragData]="child" class="wb-node-drag block" [node]="child" [depth]="depth() + 1" />
            } @empty {
              <p class="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[12px] italic text-slate-400">
                Empty group — add fields below or drag them here.
              </p>
            }
          </div>
          <div class="mt-2">
            <wb-add-menu [containerId]="f._id" />
          </div>
        </div>
      }

      @if (f.type === 'array' && f.item) {
        <div class="mt-2 ml-6 border-l-2 border-dashed border-violet-200 pl-4">
          <div class="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-violet-400">
            <wb-icon name="array" [size]="12" /> item template
          </div>
          <wb-canvas-node [node]="f.item" [depth]="depth() + 1" />
        </div>
      }
    </div>
  `,
})
export class CanvasNodeComponent {
  readonly store = inject(BuilderStore);
  readonly node = input.required<BuilderField>();
  readonly depth = input(0);
  readonly meta = fieldMeta;

  readonly selected = computed(() => this.store.selectedId() === this.node()._id);

  isRequired(f: BuilderField): boolean {
    return !!f.validators?.some((v) => v.kind === 'required');
  }

  select(e: Event): void {
    e.stopPropagation();
    this.store.select(this.node()._id);
  }
  remove(e: Event): void {
    e.stopPropagation();
    this.store.removeNode(this.node()._id);
  }
  duplicate(e: Event): void {
    e.stopPropagation();
    this.store.duplicateNode(this.node()._id);
  }
}
