import { FieldTypeRegistry } from 'signal-jsonforms';
import { HtmlTextComponent } from './fields/text.component';
import { HtmlNumberComponent } from './fields/number.component';
import { HtmlSelectComponent } from './fields/select.component';
import { HtmlCheckboxComponent } from './fields/checkbox.component';

/**
 * Registro de tipos de campo del adaptador HTML plano (sin dependencias de UI).
 * Úsalo junto con HtmlFieldWrapperComponent:
 *   provideJsonForms({ fieldTypes: HTML_FIELD_TYPES, wrappers: { default: HtmlFieldWrapperComponent }, defaultWrapper: 'default' })
 */
export const HTML_FIELD_TYPES: FieldTypeRegistry = {
  text: HtmlTextComponent,
  password: HtmlTextComponent,
  email: HtmlTextComponent,
  number: HtmlNumberComponent,
  select: HtmlSelectComponent,
  checkbox: HtmlCheckboxComponent,
};
