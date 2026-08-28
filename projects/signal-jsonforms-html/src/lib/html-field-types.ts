import { FieldTypeRegistry } from 'signal-jsonforms';
import { HtmlTextComponent } from './fields/text.component';
import { HtmlTextareaComponent } from './fields/textarea.component';
import { HtmlNumberComponent } from './fields/number.component';
import { HtmlSelectComponent } from './fields/select.component';
import { HtmlMultiselectComponent } from './fields/multiselect.component';
import { HtmlCheckboxComponent } from './fields/checkbox.component';
import { HtmlRadioComponent } from './fields/radio.component';
import { HtmlDateComponent } from './fields/date.component';
import { HtmlSliderComponent } from './fields/slider.component';
import { HtmlAutocompleteComponent } from './fields/autocomplete.component';

/**
 * Field type registry for plain HTML adapter (no UI dependencies).
 * Use with HtmlFieldWrapperComponent:
 *   provideJsonForms({ fieldTypes: HTML_FIELD_TYPES, wrappers: { default: HtmlFieldWrapperComponent }, defaultWrapper: 'default' })
 */
export const HTML_FIELD_TYPES: FieldTypeRegistry = {
  text: HtmlTextComponent,
  password: HtmlTextComponent,
  email: HtmlTextComponent,
  textarea: HtmlTextareaComponent,
  number: HtmlNumberComponent,
  select: HtmlSelectComponent,
  multiselect: HtmlMultiselectComponent,
  checkbox: HtmlCheckboxComponent,
  radio: HtmlRadioComponent,
  date: HtmlDateComponent,
  slider: HtmlSliderComponent,
  autocomplete: HtmlAutocompleteComponent,
};
