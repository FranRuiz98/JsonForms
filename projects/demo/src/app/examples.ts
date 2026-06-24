import { FormConfig } from 'signal-jsonforms';

/**
 * Example gallery for the playground. Each one increases complexity
 * to incrementally show how far the library can go:
 *   1) basic fields and validators
 *   2) full suite of standard validators
 *   3) dynamic logic: conditional visibility + cross-field validation (DSL)
 *   4) structure: nested groups + repeatable arrays with default values
 *   5) advanced: async validation + registered functions/validators (kind 'fn')
 *
 * Levels 1–4 are 100% self-contained in JSON (do not depend on the registry). Level
 * 5 references helpers declared in `app.config.ts` (uniqueUsername, hideForNonPro,
 * passwordStrength) to show the hybrid JSON + registry model.
 */
export interface PlaygroundExample {
  id: string;
  level: number;
  title: string;
  description: string;
  config: FormConfig;
}

export const EXAMPLES: PlaygroundExample[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Level 1 · Basic
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'contact',
    level: 1,
    title: 'Contact',
    description:
      'The bare minimum: text fields, a dropdown with a default value, and basic validators (required, email, minLength).',
    config: {
      version: '1',
      id: 'contact',
      fields: [
        {
          key: 'name',
          type: 'text',
          dataType: 'string',
          label: 'Name',
          validators: [{ kind: 'required' }],
        },
        {
          key: 'email',
          type: 'text',
          dataType: 'string',
          label: 'Email address',
          props: { placeholder: 'you@example.com' },
          validators: [
            { kind: 'required' },
            { kind: 'email', message: 'Invalid email' },
          ],
        },
        {
          key: 'subject',
          type: 'select',
          dataType: 'string',
          label: 'Subject',
          defaultValue: 'support',
          props: {
            options: [
              { value: 'support', label: 'Support' },
              { value: 'sales', label: 'Sales' },
              { value: 'other', label: 'Other' },
            ],
          },
        },
        {
          key: 'message',
          type: 'text',
          dataType: 'string',
          label: 'Message',
          props: { hint: 'Tell us how we can help you' },
          validators: [
            { kind: 'required' },
            { kind: 'minLength', value: 10, message: 'Minimum 10 characters' },
          ],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Level 2 · Standard validators
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'account',
    level: 2,
    title: 'Create account',
    description:
      'The full suite of serializable standard validators: minLength/maxLength, pattern (regex), min/max on numbers, and required on a checkbox.',
    config: {
      version: '1',
      id: 'account',
      fields: [
        {
          key: 'username',
          type: 'text',
          dataType: 'string',
          label: 'Username',
          props: { hint: 'Letters, numbers, and underscores' },
          validators: [
            { kind: 'required' },
            { kind: 'minLength', value: 3, message: 'Minimum 3 characters' },
            { kind: 'maxLength', value: 20, message: 'Maximum 20 characters' },
            {
              kind: 'pattern',
              value: '^[a-zA-Z0-9_]+$',
              message: 'Letters, numbers, and underscores only',
            },
          ],
        },
        {
          key: 'email',
          type: 'text',
          dataType: 'string',
          label: 'Email address',
          validators: [{ kind: 'required' }, { kind: 'email' }],
        },
        {
          key: 'password',
          type: 'text',
          dataType: 'string',
          label: 'Password',
          props: { hint: 'At least 8 characters' },
          validators: [
            { kind: 'required' },
            { kind: 'minLength', value: 8, message: 'Minimum 8 characters' },
          ],
        },
        {
          key: 'age',
          type: 'number',
          dataType: 'number',
          label: 'Age',
          props: { description: 'You must be of legal age.' },
          validators: [
            { kind: 'required' },
            { kind: 'min', value: 18, message: 'You must be of legal age' },
            { kind: 'max', value: 120, message: 'Invalid age' },
          ],
        },
        {
          key: 'country',
          type: 'select',
          dataType: 'string',
          label: 'Country',
          validators: [{ kind: 'required' }],
          props: {
            options: [
              { value: 'us', label: 'United States' },
              { value: 'uk', label: 'United Kingdom' },
              { value: 'ca', label: 'Canada' },
              { value: 'au', label: 'Australia' },
            ],
          },
        },
        {
          key: 'terms',
          type: 'checkbox',
          dataType: 'boolean',
          label: 'I accept the terms and conditions',
          validators: [{ kind: 'required', message: 'You must accept the terms' }],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Level 3 · Dynamic logic (expression DSL)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'dynamic',
    level: 3,
    title: 'Dynamic logic',
    description:
      'Conditional visibility and cross-field validation expressed directly in JSON with the expression DSL. Change the "account type" or check the subscription and watch new fields appear and become required.',
    config: {
      version: '1',
      id: 'dynamic',
      fields: [
        {
          key: 'accountType',
          type: 'select',
          dataType: 'string',
          label: 'Account type',
          defaultValue: 'personal',
          props: {
            options: [
              { value: 'personal', label: 'Personal' },
              { value: 'business', label: 'Business' },
            ],
          },
          validators: [{ kind: 'required' }],
        },
        {
          // hidden via DSL: only visible for business accounts.
          key: 'company',
          type: 'text',
          dataType: 'string',
          label: 'Company name',
          hidden: { expr: "model.accountType !== 'business'" },
          // "conditional" required via expr: only requires a value for business accounts.
          validators: [
            {
              kind: 'expr',
              expr: "model.accountType !== 'business' || !!value",
              message: 'Please enter the company name',
            },
          ],
        },
        {
          key: 'vatId',
          type: 'text',
          dataType: 'string',
          label: 'VAT / Tax ID',
          hidden: { expr: "model.accountType !== 'business'" },
        },
        {
          key: 'email',
          type: 'text',
          dataType: 'string',
          label: 'Email address',
          validators: [{ kind: 'required' }, { kind: 'email' }],
        },
        {
          // cross-field via DSL: must match the email above.
          key: 'emailConfirm',
          type: 'text',
          dataType: 'string',
          label: 'Confirm email',
          validators: [
            { kind: 'required' },
            {
              kind: 'expr',
              expr: 'value === model.email',
              message: 'Emails do not match',
            },
          ],
        },
        {
          key: 'subscribe',
          type: 'checkbox',
          dataType: 'boolean',
          label: 'I want to receive the newsletter',
        },
        {
          // disabled via DSL: the field is enabled when subscription is checked.
          key: 'frequency',
          type: 'select',
          dataType: 'string',
          label: 'Sending frequency',
          disabled: { expr: '!model.subscribe' },
          defaultValue: 'weekly',
          props: {
            hint: 'Check the subscription to choose the frequency',
            options: [
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ],
          },
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Level 4 · Structure (groups + arrays)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'order',
    level: 4,
    title: 'Order',
    description:
      'Data composition: nested groups (customer, shipping address) and a repeatable array of order lines with default values. Use "Add" / "Remove" to manage the lines.',
    config: {
      version: '1',
      id: 'order',
      fields: [
        {
          key: 'customer',
          type: 'group',
          label: 'Customer',
          fields: [
            {
              key: 'name',
              type: 'text',
              dataType: 'string',
              label: 'Full name',
              validators: [{ kind: 'required' }],
            },
            {
              key: 'email',
              type: 'text',
              dataType: 'string',
              label: 'Email',
              validators: [{ kind: 'required' }, { kind: 'email' }],
            },
          ],
        },
        {
          key: 'shipping',
          type: 'group',
          label: 'Shipping address',
          fields: [
            {
              key: 'street',
              type: 'text',
              dataType: 'string',
              label: 'Street and number',
              validators: [{ kind: 'required' }],
            },
            {
              key: 'city',
              type: 'text',
              dataType: 'string',
              label: 'City',
              validators: [{ kind: 'required' }],
            },
            {
              key: 'zip',
              type: 'text',
              dataType: 'string',
              label: 'Postal code',
              validators: [
                { kind: 'required' },
                { kind: 'pattern', value: '^[0-9]{4,5}$', message: 'Invalid postal code' },
              ],
            },
          ],
        },
        {
          key: 'items',
          type: 'array',
          label: 'Order lines',
          item: {
            key: 'line',
            type: 'group',
            fields: [
              {
                key: 'product',
                type: 'select',
                dataType: 'string',
                label: 'Product',
                validators: [{ kind: 'required' }],
                props: {
                  options: [
                    { value: 'book', label: 'Book' },
                    { value: 'pen', label: 'Pen' },
                    { value: 'mug', label: 'Mug' },
                  ],
                },
              },
              {
                key: 'qty',
                type: 'number',
                dataType: 'number',
                label: 'Quantity',
                defaultValue: 1,
                validators: [
                  { kind: 'required' },
                  { kind: 'min', value: 1, message: 'Minimum 1 unit' },
                ],
              },
              {
                key: 'notes',
                type: 'text',
                dataType: 'string',
                label: 'Notes',
              },
            ],
          },
        },
        {
          key: 'giftWrap',
          type: 'checkbox',
          dataType: 'boolean',
          label: 'Gift wrap',
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Level 5 · Advanced (async + registry)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'registration',
    level: 5,
    title: 'Full registration',
    description:
      'The full showcase combining everything: async validation via registry (the usernames "admin", "root", and "test" are taken — checked on field blur), a registered synchronous validator (password strength, kind "fn"), visibility via registered function, cross-field, groups, and arrays. The helpers live in app.config.ts.',
    config: {
      version: '1',
      id: 'user-registration',
      fields: [
        {
          key: 'username',
          type: 'text',
          dataType: 'string',
          label: 'Username',
          props: {
            placeholder: 'try "admin"',
            hint: 'Checked against the server on field blur',
          },
          validators: [{ kind: 'required' }],
          asyncValidators: [{ kind: 'uniqueUsername', debounce: 400 }],
        },
        {
          key: 'password',
          type: 'text',
          dataType: 'string',
          label: 'Password',
          props: { hint: 'Minimum 8 characters, mixing letters and numbers' },
          validators: [{ kind: 'required' }, { kind: 'fn', fn: 'passwordStrength' }],
        },
        {
          key: 'email',
          type: 'text',
          dataType: 'string',
          label: 'Email',
          props: { placeholder: 'you@example.com' },
          validators: [
            { kind: 'required', message: 'Email is required' },
            { kind: 'email', message: 'Invalid email' },
          ],
        },
        {
          key: 'emailConfirm',
          type: 'text',
          dataType: 'string',
          label: 'Confirm email',
          validators: [
            { kind: 'required' },
            { kind: 'expr', expr: 'value === model.email', message: 'Emails do not match' },
          ],
        },
        {
          key: 'age',
          type: 'number',
          dataType: 'number',
          label: 'Age',
          props: { description: 'You must be of legal age to register.' },
          validators: [
            { kind: 'required' },
            { kind: 'min', value: 18, message: 'You must be of legal age' },
          ],
        },
        {
          key: 'plan',
          type: 'select',
          dataType: 'string',
          label: 'Plan',
          validators: [{ kind: 'required' }],
          props: {
            options: [
              { value: 'free', label: 'Free' },
              { value: 'pro', label: 'Pro' },
            ],
          },
        },
        {
          // visibility via registered function: visible only if plan = 'pro'.
          key: 'company',
          type: 'text',
          dataType: 'string',
          label: 'Company (Pro only)',
          hidden: { fn: 'hideForNonPro' },
        },
        {
          key: 'address',
          type: 'group',
          label: 'Address',
          fields: [
            {
              key: 'street',
              type: 'text',
              dataType: 'string',
              label: 'Street',
              validators: [{ kind: 'required' }],
            },
            { key: 'city', type: 'text', dataType: 'string', label: 'City' },
          ],
        },
        {
          key: 'contacts',
          type: 'array',
          label: 'Contacts',
          item: {
            key: 'contact',
            type: 'group',
            fields: [
              {
                key: 'name',
                type: 'text',
                dataType: 'string',
                label: 'Name',
                validators: [{ kind: 'required' }],
              },
              {
                key: 'relation',
                type: 'select',
                dataType: 'string',
                label: 'Relation',
                props: {
                  options: [
                    { value: 'family', label: 'Family' },
                    { value: 'work', label: 'Work' },
                  ],
                },
              },
            ],
          },
        },
        {
          key: 'newsletter',
          type: 'checkbox',
          dataType: 'boolean',
          label: 'I want to receive news and updates',
        },
      ],
    },
  },
];
