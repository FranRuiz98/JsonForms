import { FieldTypeRegistry } from 'signal-jsonforms';
import { MatTextFieldComponent } from './fields/text-field.component';
import { MatNumberFieldComponent } from './fields/number-field.component';
import { MatSelectFieldComponent } from './fields/select-field.component';
import { MatCheckboxFieldComponent } from './fields/checkbox-field.component';

/**
 * Registro de tipos de campo del adaptador de referencia (Angular Material).
 * Se pasa a provideJsonForms({ fieldTypes: MATERIAL_FIELD_TYPES }).
 */
export const MATERIAL_FIELD_TYPES: FieldTypeRegistry = {
  text: MatTextFieldComponent,
  password: MatTextFieldComponent,
  number: MatNumberFieldComponent,
  select: MatSelectFieldComponent,
  checkbox: MatCheckboxFieldComponent,
};
