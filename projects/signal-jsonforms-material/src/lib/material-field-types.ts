import { FieldTypeRegistry } from 'signal-jsonforms';
import { MatTextFieldComponent } from './fields/text-field.component';
import { MatNumberFieldComponent } from './fields/number-field.component';
import { MatSelectFieldComponent } from './fields/select-field.component';
import { MatCheckboxFieldComponent } from './fields/checkbox-field.component';

/**
 * Field type registry for the reference adapter (Angular Material).
 * Passed to provideJsonForms({ fieldTypes: MATERIAL_FIELD_TYPES }).
 */
export const MATERIAL_FIELD_TYPES: FieldTypeRegistry = {
  text: MatTextFieldComponent,
  password: MatTextFieldComponent,
  number: MatNumberFieldComponent,
  select: MatSelectFieldComponent,
  checkbox: MatCheckboxFieldComponent,
};
