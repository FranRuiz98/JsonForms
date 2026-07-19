import { FieldTypeRegistry } from 'signal-jsonforms';
import { HtmlTextComponent } from './fields/text.component';
import { HtmlNumberComponent } from './fields/number.component';
import { HtmlSelectComponent } from './fields/select.component';
import { HtmlCheckboxComponent } from './fields/checkbox.component';

/**
 * Field type registry for plain HTML adapter (no UI dependencies).
 * Use with HtmlFieldWrapperComponent:
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
