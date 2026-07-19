/**
 * Makes CDK's nested drag-drop deterministic.
 *
 * CDK connects drop lists but resolves an ambiguous target when nested lists
 * overlap their parent geometrically (a group's list sits inside the root
 * list's box), so the parent tends to "steal" the drop. We fix that with an
 * innermost-wins enter predicate: during a drag we track the pointer, and a
 * drop list only accepts the drag if IT is the deepest `.cdk-drop-list` under
 * the cursor. We also reject entering a node's own subtree at hover time.
 */
import { Injectable } from '@angular/core';
import { CdkDrag, CdkDragMove, CdkDropList } from '@angular/cdk/drag-drop';

@Injectable({ providedIn: 'root' })
export class DragService {
  private pointer: { x: number; y: number } | null = null;

  onMove(e: CdkDragMove): void {
    this.pointer = e.pointerPosition;
  }

  onEnd(): void {
    this.pointer = null;
  }

  /** Bound so it can be passed directly to [cdkDropListEnterPredicate]. */
  readonly enterPredicate = (drag: CdkDrag, drop: CdkDropList): boolean => {
    const dropEl = drop.element.nativeElement as HTMLElement;

    // 1) Never drop a node into its own subtree (the dragged element contains
    //    this list). Guards against corrupting the tree during hover.
    const dragEl = drag.getRootElement();
    if (dragEl.contains(dropEl)) return false;

    // 2) Innermost-wins: only the deepest drop list under the pointer accepts.
    const p = this.pointer;
    if (!p) return true;
    const target = document.elementFromPoint(p.x, p.y) as HTMLElement | null;
    const innermost = target?.closest('.cdk-drop-list') ?? null;
    return innermost === null || innermost === dropEl;
  };
}
