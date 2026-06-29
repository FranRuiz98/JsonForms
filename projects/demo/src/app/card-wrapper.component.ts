import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Type, computed, input } from '@angular/core';
import { FieldNode } from 'signal-jsonforms';
import { FieldTree } from 'signal-jsonforms';

/**
 * Demo wrapper that draws a highlighted "card" around whatever it wraps. It is
 * meant to be STACKED on top of the default wrapper, so it renders the threaded-in
 * `inner` component (the next wrapper, or the control) with its `innerInputs`.
 *
 * Used in the playground with `"wrapper": ["card", "default"]`: `card` is the
 * outermost, `default` adds description/hint/pending, and the control is innermost.
 * The badge text comes from `props.badge`.
 */
@Component({
  selector: 'demo-card-wrapper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    <div class="demo-card">
      @if (badge(); as b) {
        <span class="demo-card-badge">{{ b }}</span>
      }
      @if (inner(); as cmp) {
        <ng-container [ngComponentOutlet]="cmp" [ngComponentOutletInputs]="innerInputs()" />
      }
    </div>
  `,
  styles: [
    `
      .demo-card {
        position: relative;
        border: 1px solid #c7d2fe;
        background: #eef2ff;
        border-radius: 12px;
        padding: 1.1rem 1rem 0.6rem;
        margin: 0.5rem 0;
      }
      .demo-card-badge {
        position: absolute;
        top: -0.6rem;
        left: 0.8rem;
        background: #4f46e5;
        color: #fff;
        font-size: 0.66rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
      }
    `,
  ],
})
export class CardWrapperComponent {
  readonly node = input<FieldNode>();
  readonly field = input<FieldTree<unknown>>();
  /** Next component to render inside the card (another wrapper or the control). */
  readonly inner = input<Type<unknown> | null>(null);
  readonly innerInputs = input<Record<string, unknown>>({});

  protected readonly badge = computed(
    () => this.node()?.config.props?.['badge'] as string | undefined,
  );
}
