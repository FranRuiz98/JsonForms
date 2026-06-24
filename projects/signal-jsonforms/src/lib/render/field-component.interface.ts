import { InputSignal } from '@angular/core';
import { FieldConfig } from '../core/model';
import { FieldTree } from '../adapter/signal-forms.adapter';

/**
 * Contract implemented by every registered field component.
 * `field()` returns the FieldTree node (for [formField]); `field()()` its FieldState.
 */
export interface FieldComponent {
  field: InputSignal<FieldTree<unknown>>;
  config: InputSignal<FieldConfig>;
}
