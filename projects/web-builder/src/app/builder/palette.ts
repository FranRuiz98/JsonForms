/**
 * Palette catalogue: the field types an author can add. Each entry knows the
 * default FieldConfig fragment to create. Kept to what the Material preview kit
 * renders in Phase A (text/number/select/checkbox) plus the two containers.
 */
import { FieldConfig } from 'signal-jsonforms';

export type PaletteKind = 'control' | 'group' | 'array';

export interface PaletteItem {
  type: string;
  title: string;
  category: 'Basic controls' | 'Containers';
  kind: PaletteKind;
  /** Default config fragment (without `key`, which the store assigns uniquely). */
  make(): Omit<FieldConfig, 'key'>;
}

export const PALETTE: PaletteItem[] = [
  {
    type: 'text',
    title: 'Text',
    category: 'Basic controls',
    kind: 'control',
    make: () => ({ type: 'text', dataType: 'string', label: 'Text' }),
  },
  {
    type: 'number',
    title: 'Number',
    category: 'Basic controls',
    kind: 'control',
    make: () => ({ type: 'number', dataType: 'number', label: 'Number' }),
  },
  {
    type: 'select',
    title: 'Select',
    category: 'Basic controls',
    kind: 'control',
    make: () => ({
      type: 'select',
      dataType: 'string',
      label: 'Select',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
    }),
  },
  {
    type: 'checkbox',
    title: 'Checkbox',
    category: 'Basic controls',
    kind: 'control',
    make: () => ({ type: 'checkbox', dataType: 'boolean', label: 'Checkbox', defaultValue: false }),
  },
  {
    type: 'group',
    title: 'Group',
    category: 'Containers',
    kind: 'group',
    make: () => ({ type: 'group', dataType: 'object', label: 'Group', fields: [] }),
  },
  {
    type: 'array',
    title: 'Array',
    category: 'Containers',
    kind: 'array',
    make: () => ({
      type: 'array',
      dataType: 'array',
      label: 'Array',
      item: { key: 'item', type: 'group', dataType: 'object', fields: [] },
    }),
  },
];

export const PALETTE_BY_CATEGORY: { category: string; items: PaletteItem[] }[] = [
  { category: 'Basic controls', items: PALETTE.filter((p) => p.category === 'Basic controls') },
  { category: 'Containers', items: PALETTE.filter((p) => p.category === 'Containers') },
];

/** Per-type visual metadata shared by the palette and the canvas (icon name +
 *  Tailwind accent classes). Class strings are picked up by the @source scan. */
export interface FieldMeta {
  icon: string;
  badge: string;
  dot: string;
  soft: string;
}

export const FIELD_META: Record<string, FieldMeta> = {
  text: { icon: 'text', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', soft: 'bg-slate-100 text-slate-500' },
  number: { icon: 'number', badge: 'bg-sky-50 text-sky-700', dot: 'bg-sky-400', soft: 'bg-sky-50 text-sky-600' },
  select: { icon: 'select', badge: 'bg-teal-50 text-teal-700', dot: 'bg-teal-400', soft: 'bg-teal-50 text-teal-600' },
  checkbox: { icon: 'checkbox', badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400', soft: 'bg-emerald-50 text-emerald-600' },
  group: { icon: 'group', badge: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500', soft: 'bg-indigo-50 text-indigo-600' },
  array: { icon: 'array', badge: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500', soft: 'bg-violet-50 text-violet-600' },
};

export function fieldMeta(type: string): FieldMeta {
  return FIELD_META[type] ?? { icon: 'text', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', soft: 'bg-slate-100 text-slate-500' };
}
