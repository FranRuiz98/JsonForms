import { FieldTypeRegistry } from 'signal-jsonforms';
import { MatTextFieldComponent } from './fields/text-field.component';
import { MatTextareaFieldComponent } from './fields/textarea-field.component';
import { MatNumberFieldComponent } from './fields/number-field.component';
import { MatSelectFieldComponent } from './fields/select-field.component';
import { MatMultiselectFieldComponent } from './fields/multiselect-field.component';
import { MatCheckboxFieldComponent } from './fields/checkbox-field.component';
import { MatRadioFieldComponent } from './fields/radio-field.component';
import { MatDateFieldComponent } from './fields/date-field.component';
import { MatSliderFieldComponent } from './fields/slider-field.component';
import { MatAutocompleteFieldComponent } from './fields/autocomplete-field.component';

/**
 * Field type registry for the reference adapter (Angular Material).
 * Passed to provideJsonForms({ fieldTypes: MATERIAL_FIELD_TYPES }).
 */
export const MATERIAL_FIELD_TYPES: FieldTypeRegistry = {
  text: MatTextFieldComponent,
  password: MatTextFieldComponent,
  email: MatTextFieldComponent,
  textarea: MatTextareaFieldComponent,
  number: MatNumberFieldComponent,
  select: MatSelectFieldComponent,
  multiselect: MatMultiselectFieldComponent,
  checkbox: MatCheckboxFieldComponent,
  radio: MatRadioFieldComponent,
  date: MatDateFieldComponent,
  slider: MatSliderFieldComponent,
  autocomplete: MatAutocompleteFieldComponent,
};
