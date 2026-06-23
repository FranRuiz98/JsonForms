import { InputSignal } from '@angular/core';
import { FieldConfig } from '../core/model';
import { FieldTree } from '../adapter/signal-forms.adapter';

/**
 * Contrato que implementa cada componente de campo registrado.
 * `field()` devuelve el nodo FieldTree (para [formField]); `field()()` su FieldState.
 */
export interface FieldComponent {
  field: InputSignal<FieldTree<unknown>>;
  config: InputSignal<FieldConfig>;
}
