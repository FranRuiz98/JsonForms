import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { DynamicContext, provideJsonForms } from 'signal-jsonforms';
import { MATERIAL_FIELD_TYPES } from 'signal-jsonforms-material';

/**
 * The builder's live preview renders through the real library. Material is the
 * global kit. A tiny example registry (one function) is provided so the
 * inspector's "fn" pickers are non-empty and the mechanism is demonstrable;
 * authors register their own functions / option sources / wrappers in their app.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideJsonForms({
      fieldTypes: MATERIAL_FIELD_TYPES,
      functions: {
        /** True when this field currently has a value (usable in hidden/disabled/readonly). */
        hasValue: (ctx: DynamicContext) => {
          const v = ctx.value();
          return v !== null && v !== undefined && v !== '';
        },
      },
    }),
  ],
};
