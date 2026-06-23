import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { JSON_FORMS_CONFIG } from './tokens';
import { JsonFormsConfig } from './types';

/** Registra tipos de campo, validadores y funciones para los formularios JSON. */
export function provideJsonForms(config: JsonFormsConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: JSON_FORMS_CONFIG, useValue: config }]);
}
