import { InputSignal } from '@angular/core';
import { FieldConfig } from '../core/model';
import { FieldTree } from '../adapter/signal-forms.adapter';
import type { OptionsState } from '../registry/types';

/**
 * Contract implemented by every registered field component.
 * `field()` returns the FieldTree node (for [formField]); `field()()` its FieldState.
 *
 * `options` is set by the renderer only for fields that declare dynamic/async
 * `options` in their config; selects should prefer it over `config.props.options`.
 */
export interface FieldComponent {
  field: InputSignal<FieldTree<unknown>>;
  config: InputSignal<FieldConfig>;
  options?: InputSignal<OptionsState | undefined>;
}
