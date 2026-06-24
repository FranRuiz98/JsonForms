import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { JSON_FORMS_CONFIG } from './tokens';
import { JsonFormsConfig } from './types';

/** Registers field types, validators, and functions for JSON forms. */
export function provideJsonForms(config: JsonFormsConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: JSON_FORMS_CONFIG, useValue: config }]);
}
