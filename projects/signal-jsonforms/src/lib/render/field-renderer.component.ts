import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FieldNode } from '../core/model';
import { buildNodeValue } from '../core/model-builder';
import { FieldTree } from '../adapter/signal-forms.adapter';
import { JSON_FORMS_CONFIG } from '../registry/tokens';
import { JSON_FORMS_RUNTIME } from './form-runtime';

/**
 * Renders a field recursively, honoring the hidden state:
 * - control: wraps it in the resolved wrapper (config.wrapper ?? defaultWrapper)
 *   or, if none, instantiates the FieldTypeRegistry component directly.
 * - group:   fieldset that recurses into its children (optional column grid,
 *            optional collapsible section).
 * - array:   iterates the array FieldTree and allows adding/removing items.
 */
@Component({
  selector: 'jf-field-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    @if (!hidden()) {
      @switch (node().kind) {
        @case ('group') {
          <fieldset class="jf-group">
            @if (node().config.label) {
              <legend [class.jf-legend-toggle]="collapsible()" (click)="onLegendClick()">
                {{ node().config.label }}
                @if (collapsible()) {
                  <span class="jf-collapse-ico">{{ collapsed() ? '▸' : '▾' }}</span>
                }
              </legend>
            }
            @if (!collapsed()) {
              <div
                class="jf-fields"
                [style.display]="cols() ? 'grid' : null"
                [style.gridTemplateColumns]="cols() ? 'repeat(' + cols() + ', minmax(0, 1fr))' : null"
                [style.gap]="cols() ? gap() : null">
                @for (child of node().children; track child.key) {
                  <jf-field-renderer
                    [style.gridColumn]="spanFor(child)"
                    [node]="child"
                    [field]="childField(child.key)"
                    [path]="path().concat(child.key)" />
                }
              </div>
            }
          </fieldset>
        }
        @case ('array') {
          <fieldset class="jf-array">
            @if (node().config.label) {
              <legend>{{ node().config.label }}</legend>
            }
            @for (itemField of items(); track $index) {
              <div class="jf-array-item">
                @if (node().item; as itemNode) {
                  <jf-field-renderer
                    [node]="itemNode"
                    [field]="itemField"
                    [path]="path().concat($index)" />
                }
                <button type="button" class="jf-remove" (click)="removeItem($index)">Remove</button>
              </div>
            }
            <button type="button" class="jf-add" (click)="addItem()">Add</button>
          </fieldset>
        }
        @default {
          @if (wrapper(); as w) {
            <ng-container [ngComponentOutlet]="w" [ngComponentOutletInputs]="wrapperInputs()" />
          } @else if (component(); as cmp) {
            <ng-container [ngComponentOutlet]="cmp" [ngComponentOutletInputs]="inputs()" />
          } @else {
            <div class="jf-unknown">Unregistered field type: "{{ node().config.type }}"</div>
          }
        }
      }
    }
  `,
})
export class FieldRendererComponent {
  private readonly registries = inject(JSON_FORMS_CONFIG);
  private readonly runtime = inject(JSON_FORMS_RUNTIME);

  readonly node = input.required<FieldNode>();
  readonly field = input.required<FieldTree<unknown>>();
  readonly path = input<ReadonlyArray<string | number>>([]);

  /** Reactive hidden state of the field; if hidden the field is not rendered. */
  protected readonly hidden = computed(() => {
    try {
      return !!(this.field() as any)().hidden();
    } catch {
      return false;
    }
  });

  /** Resolved wrapper for the control (config.wrapper or defaultWrapper). */
  protected readonly wrapper = computed(() => {
    const key = this.node().config.wrapper ?? this.registries.defaultWrapper;
    return key ? (this.registries.wrappers?.[key] ?? null) : null;
  });

  protected readonly wrapperInputs = computed(() => ({
    node: this.node(),
    field: this.field(),
  }));

  protected readonly component = computed(
    () => this.registries.fieldTypes?.[this.node().config.type] ?? null,
  );

  protected readonly inputs = computed(() => ({
    field: this.field(),
    config: this.node().config,
  }));

  // --- Layout (columns) and collapsible sections ---

  protected readonly collapsible = computed(() => !!this.node().config.collapsible);
  private readonly collapsedOverride = signal<boolean | null>(null);
  protected readonly collapsed = computed(
    () => this.collapsedOverride() ?? !!this.node().config.collapsed,
  );
  protected onLegendClick(): void {
    if (this.collapsible()) this.collapsedOverride.set(!this.collapsed());
  }

  protected readonly cols = computed(() => this.node().config.layout?.columns ?? null);
  protected readonly gap = computed(() => this.node().config.layout?.gap ?? '0.75rem 1rem');

  /** CSS grid-column span for a child, or null for a single column. */
  protected spanFor(child: FieldNode): string | null {
    const s = child.config.colSpan;
    return s && s > 1 ? `span ${s}` : null;
  }

  protected childField(key: string): FieldTree<unknown> {
    return (this.field() as any)[key];
  }

  protected items(): FieldTree<unknown>[] {
    return this.field() as any;
  }

  protected addItem(): void {
    const item = this.node().item;
    if (!item) return;
    this.runtime.addArrayItem(this.path(), buildNodeValue(item));
  }

  protected removeItem(index: number): void {
    this.runtime.removeArrayItem(this.path(), index);
  }
}
