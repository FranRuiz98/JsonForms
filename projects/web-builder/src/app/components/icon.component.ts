/** Thin wrapper over lucide-angular. Keeps the semantic <wb-icon name="…">
 *  API used across the app while rendering real Lucide icons (tree-shaken —
 *  only the icons mapped below are bundled). */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  LucideAngularModule,
  LucideIconData,
  Type,
  Hash,
  List,
  SquareCheck,
  Folder,
  Layers,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Download,
  Clipboard,
  Upload,
  Plus,
  TriangleAlert,
  EyeOff,
  Ban,
  Check,
  MousePointer2,
  GripVertical,
  Columns2,
  LayoutGrid,
  AlignLeft,
  CircleDot,
  Calendar,
  ListChecks,
  SlidersHorizontal,
  TextCursorInput,
} from 'lucide-angular';

const ICONS: Record<string, LucideIconData> = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  select: List,
  multiselect: ListChecks,
  checkbox: SquareCheck,
  radio: CircleDot,
  date: Calendar,
  slider: SlidersHorizontal,
  autocomplete: TextCursorInput,
  group: Folder,
  array: Layers,
  undo: Undo2,
  redo: Redo2,
  copy: Copy,
  trash: Trash2,
  download: Download,
  clipboard: Clipboard,
  import: Upload,
  plus: Plus,
  layers: Layers,
  alert: TriangleAlert,
  'eye-off': EyeOff,
  ban: Ban,
  check: Check,
  cursor: MousePointer2,
  grip: GripVertical,
  columns: Columns2,
  grid: LayoutGrid,
};

@Component({
  selector: 'wb-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `<lucide-icon [img]="icon()" [size]="size()" [strokeWidth]="strokeWidth()" class="inline-block shrink-0 align-middle" />`,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(16);
  readonly strokeWidth = input(1.75);

  readonly icon = computed<LucideIconData>(() => ICONS[this.name()] ?? Type);
}
