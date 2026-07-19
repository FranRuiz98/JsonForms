/** The design canvas: the editable outline of the form (flat root or active
 *  wizard step). */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { BuilderStore } from '../builder/builder-store';
import { CanvasNodeComponent } from './canvas-node.component';
import { AddMenuComponent } from './add-menu.component';
import { WizardBarComponent } from './wizard-bar.component';
import { IconComponent } from './icon.component';

@Component({
  selector: 'wb-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CanvasNodeComponent, AddMenuComponent, WizardBarComponent, IconComponent, CdkDropList, CdkDrag],
  template: `
    <div class="wb-surface min-h-full p-6" (click)="clearSelection()">
      <div class="mx-auto max-w-2xl">
        <wb-wizard-bar />

        <div
          cdkDropList
          [id]="containerId()"
          [cdkDropListData]="fields()"
          (cdkDropListDropped)="store.handleDrop($event)"
          class="wb-dropzone flex min-h-[80px] flex-col gap-2 rounded-xl"
        >
          @for (node of fields(); track node._id) {
            <wb-canvas-node cdkDrag [cdkDragData]="node" class="wb-node-drag block" [node]="node" [depth]="0" />
          } @empty {
            <div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm ring-1 ring-slate-200">
                <wb-icon name="cursor" [size]="24" />
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-700">{{ store.isWizard() ? 'This step is empty' : 'Start building your form' }}</p>
                <p class="mt-1 text-[13px] text-slate-400">Use “Add field” below, drag from the palette, or click a palette item.</p>
              </div>
            </div>
          }
        </div>

        <div class="mt-3">
          <wb-add-menu [containerId]="containerId()" />
        </div>
      </div>
    </div>
  `,
})
export class CanvasComponent {
  readonly store = inject(BuilderStore);

  /** Top-level container id: the active step (wizard) or 'root' (flat). */
  readonly containerId = computed(() => this.store.topContainerId());

  /** Fields of the active step (wizard) or the flat root. */
  readonly fields = computed(() => {
    const d = this.store.document();
    if (d.steps) return this.store.activeStep()?.fields ?? [];
    return d.fields ?? [];
  });

  clearSelection(): void {
    this.store.select(null);
  }
}
