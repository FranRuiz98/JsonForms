/**
 * Wizard controls shown above the canvas: a flat⇄wizard toggle, step tabs
 * (activate / reorder / delete / add), and settings for the active step
 * (label, description, skipWhen) plus wizard options (linear, stepper).
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DynamicExpr } from 'signal-jsonforms';
import { BuilderStore } from '../builder/builder-store';
import { BuilderStep } from '../builder/builder-model';
import { IconComponent } from './icon.component';

type Mode = 'off' | 'expr' | 'fn';

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-700 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

@Component({
  selector: 'wb-wizard-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <!-- toggle row -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <wb-icon name="layers" [size]="15" />
          <span class="text-[13px] font-semibold text-slate-700">Multi-step wizard</span>
        </div>
        <button type="button" role="switch" [attr.aria-checked]="store.isWizard()" (click)="store.setWizard(!store.isWizard())"
          [class]="store.isWizard() ? 'bg-indigo-600' : 'bg-slate-300'" class="relative h-5 w-9 flex-none rounded-full transition">
          <span [class]="store.isWizard() ? 'translate-x-4' : 'translate-x-0.5'" class="absolute top-0.5 left-0 h-4 w-4 rounded-full bg-white shadow transition"></span>
        </button>
      </div>

      @if (store.isWizard()) {
        <!-- step tabs -->
        <div class="mt-3 flex flex-wrap items-center gap-1.5">
          @for (s of store.steps(); track s._id; let i = $index) {
            <div
              (click)="store.setActiveStep(s._id)"
              [class]="isActive(s) ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'"
              class="group flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12.5px] font-medium"
            >
              <span class="flex h-4 w-4 items-center justify-center rounded-full bg-white/70 text-[10px] font-semibold">{{ i + 1 }}</span>
              {{ s.label || 'Step ' + (i + 1) }}
              <button type="button" (click)="move(i, i - 1, $event)" [disabled]="i === 0" title="Move left" class="text-slate-400 hover:text-slate-700 disabled:opacity-30">‹</button>
              <button type="button" (click)="move(i, i + 1, $event)" [disabled]="i === store.steps().length - 1" title="Move right" class="text-slate-400 hover:text-slate-700 disabled:opacity-30">›</button>
              <button type="button" (click)="del(s._id, $event)" title="Delete step" class="text-slate-400 hover:text-rose-600">✕</button>
            </div>
          }
          <button type="button" (click)="store.addStep()" class="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-[12.5px] font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600">
            <wb-icon name="plus" [size]="13" /> Step
          </button>
        </div>

        <!-- active step settings -->
        @if (active(); as s) {
          <div class="mt-3 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3">
            <div>
              <label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Step label</label>
              <input [value]="s.label ?? ''" (change)="setLabel(s, str($event))" [class]="inputCls" />
            </div>
            <div>
              <label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Description</label>
              <input [value]="s.description ?? ''" (change)="setDescription(s, str($event))" [class]="inputCls" />
            </div>
            <div class="col-span-2">
              <label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Skip when</label>
              <div class="flex gap-2">
                <select [value]="skipMode(s)" (change)="setSkipMode(s, $any(str($event)))" class="w-24 flex-none rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12.5px] focus:border-indigo-400 focus:outline-none">
                  <option value="off">Off</option>
                  <option value="expr">Expr</option>
                  <option value="fn">Function</option>
                </select>
                @if (skipMode(s) !== 'off') {
                  <input [value]="skipText(s)" (change)="setSkipText(s, str($event))" [class]="inputCls" placeholder="condition to skip this step" />
                }
              </div>
            </div>
          </div>

          <div class="mt-2 flex flex-wrap gap-4">
            <label class="flex items-center gap-2 text-[12.5px] text-slate-600">
              <input type="checkbox" [checked]="store.wizardOptions().linear !== false" (change)="setLinear(checked($event))" /> Linear (block invalid steps)
            </label>
            <label class="flex items-center gap-2 text-[12.5px] text-slate-600">
              <input type="checkbox" [checked]="store.wizardOptions().showStepper !== false" (change)="setStepper(checked($event))" /> Show stepper
            </label>
          </div>
        }
      }
    </div>
  `,
})
export class WizardBarComponent {
  readonly store = inject(BuilderStore);
  readonly inputCls = INPUT;

  active(): BuilderStep | null {
    return this.store.activeStep();
  }
  isActive(s: BuilderStep): boolean {
    return this.store.activeStep()?._id === s._id;
  }

  str(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }
  checked(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
  }

  move(from: number, to: number, e: Event): void {
    e.stopPropagation();
    if (to < 0 || to >= this.store.steps().length) return;
    this.store.moveStep(from, to);
  }
  del(id: string, e: Event): void {
    e.stopPropagation();
    this.store.removeStep(id);
  }

  setLabel(s: BuilderStep, text: string): void {
    this.store.updateStep(s._id, { label: text || undefined });
  }
  setDescription(s: BuilderStep, text: string): void {
    this.store.updateStep(s._id, { description: text || undefined });
  }

  skipMode(s: BuilderStep): Mode {
    const d = s.skipWhen;
    if (!d) return 'off';
    return 'expr' in d ? 'expr' : 'fn';
  }
  skipText(s: BuilderStep): string {
    const d = s.skipWhen;
    if (!d) return '';
    return 'expr' in d ? d.expr : d.fn;
  }
  setSkipMode(s: BuilderStep, mode: Mode): void {
    const text = this.skipText(s);
    const val: DynamicExpr | undefined =
      mode === 'off' ? undefined : mode === 'expr' ? { expr: text } : { fn: text };
    this.store.updateStep(s._id, { skipWhen: val });
  }
  setSkipText(s: BuilderStep, text: string): void {
    const isFn = !!s.skipWhen && 'fn' in s.skipWhen;
    const val: DynamicExpr | undefined = text ? (isFn ? { fn: text } : { expr: text }) : undefined;
    this.store.updateStep(s._id, { skipWhen: val });
  }

  setLinear(on: boolean): void {
    this.store.setWizardOptions({ linear: on });
  }
  setStepper(on: boolean): void {
    this.store.setWizardOptions({ showStepper: on });
  }
}
