import { FormConfig } from 'signal-jsonforms';

/**
 * Example gallery for the playground. Each one increases complexity
 * to incrementally show how far the library can go:
 *   1) basic fields and validators
 *   2) full suite of standard validators
 *   3) dynamic logic: conditional visibility + cross-field validation (DSL)
 *   4) structure: nested groups + repeatable arrays with default values
 *   5) advanced: async validation + registered functions/validators (kind 'fn')
 *   6) layout: column grids (layout.columns + colSpan) and collapsible sections
 *   7) everything: layout + logic + structure + async combined (checkout)
 *   8) computed: read-only fields derived reactively from others (DSL)
 *   9) migration: a legacy v0 definition upgraded to the current format on load
 *  10) array totals: per-row computed values + an aggregated grand total
 *  11) clearOnHide + stacked wrappers: hidden fields reset their value, and a
 *      field is wrapped by two stacked wrappers (card + default)
 *
 * Levels 1–4, 6, 8 and 11 are 100% self-contained in JSON (do not depend on the registry).
 * Levels 5, 7, 9 and 10 reference helpers/migrations declared in `app.config.ts`
 * (uniqueUsername, hideForNonPro, passwordStrength, sumLines, the v0→v1 migration)
 * to show the hybrid JSON + registry model. Level 11 uses the `card` wrapper
 * registered there, stacked on top of `default`.
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

  // ─────────────────────────────────────────────────────────────────────────
  // Level 6 · Layout (columns + collapsible sections)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'profile',
    level: 6,
    title: 'Team profile',
    description:
      'Layout in the JSON: a two-column root grid, fields that span the full width with colSpan, and collapsible sections (groups) with their own internal grid. Notice how disabled/hidden conditions reach the role field from inside a section.',
    config: {
      version: '1',
      id: 'profile',
      layout: { columns: 2 },
      fields: [
        { key: 'firstName', type: 'text', dataType: 'string', label: 'First name', validators: [{ kind: 'required' }] },
        { key: 'lastName', type: 'text', dataType: 'string', label: 'Last name', validators: [{ kind: 'required' }] },
        {
          key: 'email',
          type: 'text',
          dataType: 'string',
          label: 'Email address',
          colSpan: 2,
          validators: [{ kind: 'required' }, { kind: 'email' }],
        },
        {
          key: 'role',
          type: 'select',
          dataType: 'string',
          label: 'Role',
          defaultValue: 'member',
          props: {
            options: [
              { value: 'member', label: 'Member' },
              { value: 'manager', label: 'Manager' },
              { value: 'admin', label: 'Admin' },
            ],
          },
          validators: [{ kind: 'required' }],
        },
        {
          key: 'startDate',
          type: 'text',
          dataType: 'string',
          label: 'Start date',
          props: { placeholder: 'YYYY-MM-DD', hint: 'ISO date format' },
        },
        {
          key: 'address',
          type: 'group',
          label: 'Home address',
          collapsible: true,
          colSpan: 2,
          layout: { columns: 2 },
          fields: [
            { key: 'street', type: 'text', dataType: 'string', label: 'Street', colSpan: 2, validators: [{ kind: 'required' }] },
            { key: 'city', type: 'text', dataType: 'string', label: 'City', validators: [{ kind: 'required' }] },
            {
              key: 'zip',
              type: 'text',
              dataType: 'string',
              label: 'ZIP',
              validators: [{ kind: 'pattern', value: '^[0-9]{4,5}$', message: 'Invalid ZIP code' }],
            },
          ],
        },
        {
          key: 'management',
          type: 'group',
          label: 'Management (managers & admins)',
          collapsible: true,
          collapsed: true,
          colSpan: 2,
          layout: { columns: 2 },
          fields: [
            {
              key: 'teamSize',
              type: 'number',
              dataType: 'number',
              label: 'Team size',
              disabled: { expr: "model.role !== 'manager' && model.role !== 'admin'" },
              props: { hint: 'Enabled for managers and admins' },
            },
            {
              key: 'budget',
              type: 'number',
              dataType: 'number',
              label: 'Budget (k€)',
              hidden: { expr: "model.role !== 'admin'" },
              props: { description: 'Admins only.' },
            },
          ],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Level 7 · Everything (layout + logic + structure + async)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'checkout',
    level: 7,
    title: 'Checkout',
    description:
      'The grand finale: two-column layout, collapsible sections, conditional visibility (DSL), conditional-required fields, cross-field validation, an array of order lines with a three-column item grid, and async username validation via the registry. Try "admin" as the username and switch the payment method.',
    config: {
      version: '1',
      id: 'checkout',
      layout: { columns: 2 },
      fields: [
        {
          key: 'username',
          type: 'text',
          dataType: 'string',
          label: 'Username',
          colSpan: 2,
          props: { placeholder: 'try "admin"', hint: 'Checked against the server on blur' },
          validators: [{ kind: 'required' }],
          asyncValidators: [{ kind: 'uniqueUsername', debounce: 400 }],
        },
        {
          key: 'email',
          type: 'text',
          dataType: 'string',
          label: 'Email',
          validators: [{ kind: 'required' }, { kind: 'email' }],
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
          key: 'shipping',
          type: 'group',
          label: 'Shipping address',
          collapsible: true,
          colSpan: 2,
          layout: { columns: 2 },
          fields: [
            { key: 'fullName', type: 'text', dataType: 'string', label: 'Full name', colSpan: 2, validators: [{ kind: 'required' }] },
            { key: 'street', type: 'text', dataType: 'string', label: 'Street', colSpan: 2, validators: [{ kind: 'required' }] },
            { key: 'city', type: 'text', dataType: 'string', label: 'City', validators: [{ kind: 'required' }] },
            {
              key: 'zip',
              type: 'text',
              dataType: 'string',
              label: 'ZIP',
              validators: [{ kind: 'required' }, { kind: 'pattern', value: '^[0-9]{4,5}$', message: 'Invalid ZIP code' }],
            },
            {
              key: 'country',
              type: 'select',
              dataType: 'string',
              label: 'Country',
              defaultValue: 'us',
              props: {
                options: [
                  { value: 'us', label: 'United States' },
                  { value: 'ca', label: 'Canada' },
                  { value: 'uk', label: 'United Kingdom' },
                ],
              },
              validators: [{ kind: 'required' }],
            },
          ],
        },
        {
          key: 'sameAsShipping',
          type: 'checkbox',
          dataType: 'boolean',
          label: 'Billing address same as shipping',
          colSpan: 2,
        },
        {
          key: 'billing',
          type: 'group',
          label: 'Billing address',
          collapsible: true,
          colSpan: 2,
          layout: { columns: 2 },
          hidden: { expr: 'model.sameAsShipping' },
          fields: [
            { key: 'street', type: 'text', dataType: 'string', label: 'Street', colSpan: 2 },
            { key: 'city', type: 'text', dataType: 'string', label: 'City' },
            {
              key: 'zip',
              type: 'text',
              dataType: 'string',
              label: 'ZIP',
              validators: [{ kind: 'pattern', value: '^[0-9]{4,5}$', message: 'Invalid ZIP code' }],
            },
          ],
        },
        {
          key: 'lines',
          type: 'array',
          label: 'Order lines',
          colSpan: 2,
          item: {
            key: 'line',
            type: 'group',
            layout: { columns: 3 },
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
                label: 'Qty',
                defaultValue: 1,
                validators: [{ kind: 'required' }, { kind: 'min', value: 1, message: 'Minimum 1' }],
              },
              { key: 'giftWrap', type: 'checkbox', dataType: 'boolean', label: 'Gift wrap' },
            ],
          },
        },
        {
          key: 'payMethod',
          type: 'select',
          dataType: 'string',
          label: 'Payment method',
          defaultValue: 'card',
          colSpan: 2,
          props: {
            options: [
              { value: 'card', label: 'Credit card' },
              { value: 'paypal', label: 'PayPal' },
              { value: 'transfer', label: 'Bank transfer' },
            ],
          },
          validators: [{ kind: 'required' }],
        },
        {
          key: 'cardNumber',
          type: 'text',
          dataType: 'string',
          label: 'Card number',
          colSpan: 2,
          props: { placeholder: '16 digits' },
          hidden: { expr: "model.payMethod !== 'card'" },
          validators: [
            { kind: 'expr', expr: "model.payMethod !== 'card' || !!value", message: 'Card number is required' },
          ],
        },
        {
          key: 'paypalEmail',
          type: 'text',
          dataType: 'string',
          label: 'PayPal email',
          colSpan: 2,
          hidden: { expr: "model.payMethod !== 'paypal'" },
          validators: [
            { kind: 'expr', expr: "model.payMethod !== 'paypal' || !!value", message: 'PayPal email is required' },
          ],
        },
        {
          key: 'coupon',
          type: 'text',
          dataType: 'string',
          label: 'Coupon code',
          colSpan: 2,
          props: { hint: 'Optional' },
        },
        {
          key: 'terms',
          type: 'checkbox',
          dataType: 'boolean',
          label: 'I accept the terms and conditions',
          colSpan: 2,
          validators: [{ kind: 'required', message: 'You must accept the terms' }],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Level 8 · Computed (derived read-only values)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'computed',
    level: 8,
    title: 'Computed values',
    description:
      'Read-only fields whose value is derived reactively from others with the DSL. Type a name to see "Full name", and change price/quantity/tax to watch subtotal → tax → total recompute down the chain. Computed fields are automatically read-only.',
    config: {
      version: '1',
      id: 'pricing',
      layout: { columns: 2 },
      fields: [
        { key: 'firstName', type: 'text', dataType: 'string', label: 'First name' },
        { key: 'lastName', type: 'text', dataType: 'string', label: 'Last name' },
        {
          key: 'fullName',
          type: 'text',
          dataType: 'string',
          label: 'Full name (computed)',
          colSpan: 2,
          computed: { expr: "model.firstName + ' ' + model.lastName" },
        },
        {
          key: 'unitPrice',
          type: 'number',
          dataType: 'number',
          label: 'Unit price (€)',
          defaultValue: 10,
          validators: [{ kind: 'min', value: 0 }],
        },
        {
          key: 'quantity',
          type: 'number',
          dataType: 'number',
          label: 'Quantity',
          defaultValue: 1,
          validators: [{ kind: 'min', value: 1 }],
        },
        {
          key: 'subtotal',
          type: 'number',
          dataType: 'number',
          label: 'Subtotal (€)',
          computed: { expr: 'model.unitPrice * model.quantity' },
        },
        {
          key: 'taxRate',
          type: 'number',
          dataType: 'number',
          label: 'Tax rate (%)',
          defaultValue: 21,
          validators: [{ kind: 'min', value: 0 }, { kind: 'max', value: 100 }],
        },
        {
          key: 'tax',
          type: 'number',
          dataType: 'number',
          label: 'Tax (€)',
          computed: { expr: 'model.subtotal * model.taxRate / 100' },
        },
        {
          key: 'total',
          type: 'number',
          dataType: 'number',
          label: 'Total (€)',
          colSpan: 2,
          computed: { expr: 'model.subtotal + model.tax' },
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Level 9 · Migration (legacy v0 definition, upgraded on load)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'legacy',
    level: 9,
    title: 'Legacy (v0)',
    description:
      'A definition written for an OLDER format version: it declares "version": "0" and uses "title" instead of "label". A migration registered in app.config.ts upgrades it to the current format on load — the editor shows the original v0 JSON while the form renders correctly with labels.',
    config: {
      version: '0',
      id: 'legacy-form',
      fields: [
        { key: 'name', type: 'text', dataType: 'string', title: 'Your name', validators: [{ kind: 'required' }] },
        {
          key: 'email',
          type: 'text',
          dataType: 'string',
          title: 'Email',
          validators: [{ kind: 'required' }, { kind: 'email' }],
        },
        {
          key: 'role',
          type: 'select',
          dataType: 'string',
          title: 'Role',
          props: {
            options: [
              { value: 'dev', label: 'Developer' },
              { value: 'pm', label: 'Manager' },
            ],
          },
        },
      ],
    } as unknown as FormConfig,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Level 10 · Array totals (per-row computed + aggregated grand total)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'invoice',
    level: 10,
    title: 'Invoice (array totals)',
    description:
      'Computed values inside array items: each order line derives its own "line total" from quantity × unit price (read-only), and the grand total — a registered function — sums every line. Add or remove lines and edit quantities to watch all totals recompute.',
    config: {
      version: '1',
      id: 'invoice',
      layout: { columns: 2 },
      fields: [
        {
          key: 'customer',
          type: 'text',
          dataType: 'string',
          label: 'Customer',
          colSpan: 2,
          validators: [{ kind: 'required' }],
        },
        {
          key: 'lines',
          type: 'array',
          label: 'Order lines',
          colSpan: 2,
          item: {
            key: 'line',
            type: 'group',
            layout: { columns: 4 },
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
                label: 'Qty',
                defaultValue: 1,
                validators: [{ kind: 'required' }, { kind: 'min', value: 1 }],
              },
              {
                key: 'unitPrice',
                type: 'number',
                dataType: 'number',
                label: 'Unit price (€)',
                defaultValue: 0,
                validators: [{ kind: 'min', value: 0 }],
              },
              {
                // per-row computed: model = the item, so qty/unitPrice are siblings.
                key: 'lineTotal',
                type: 'number',
                dataType: 'number',
                label: 'Line total (€)',
                computed: { expr: 'model.qty * model.unitPrice' },
              },
            ],
          },
        },
        {
          // aggregate computed via a registered function summing lines[].lineTotal.
          key: 'grandTotal',
          type: 'number',
          dataType: 'number',
          label: 'Grand total (€)',
          colSpan: 2,
          computed: { fn: 'sumLines' },
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Level 11 · clearOnHide + stacked wrappers
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'job-application',
    level: 11,
    title: 'clearOnHide + wrappers',
    description:
      'Two quick wins. clearOnHide: pick an employment status, fill the field that appears, then switch status — the now-hidden value is reset to its default instead of lingering in the model (watch the model panel). Stacked wrappers: the "Cover letter" field is wrapped by ["card", "default"], so the card (outermost) draws a highlighted box and the default wrapper still adds the hint inside.',
    config: {
      version: '1',
      id: 'job-application',
      fields: [
        {
          key: 'status',
          type: 'select',
          dataType: 'string',
          label: 'Employment status',
          defaultValue: 'employed',
          props: {
            options: [
              { value: 'employed', label: 'Employed' },
              { value: 'student', label: 'Student' },
              { value: 'unemployed', label: 'Unemployed' },
            ],
          },
          validators: [{ kind: 'required' }],
        },
        {
          // Visible only for "employed"; its value is cleared when hidden.
          key: 'employer',
          type: 'text',
          dataType: 'string',
          label: 'Current employer',
          hidden: { expr: "model.status !== 'employed'" },
          clearOnHide: true,
          props: { hint: 'Cleared automatically if you change status' },
        },
        {
          // Visible only for "student"; its value is cleared when hidden.
          key: 'school',
          type: 'text',
          dataType: 'string',
          label: 'School / University',
          hidden: { expr: "model.status !== 'student'" },
          clearOnHide: true,
          props: { hint: 'Cleared automatically if you change status' },
        },
        {
          // Stacked wrappers: card (outermost) + default (hint/description) + control.
          key: 'coverLetter',
          type: 'text',
          dataType: 'string',
          label: 'Cover letter',
          wrapper: ['card', 'default'],
          props: {
            badge: 'Highlighted',
            hint: 'Wrapped by ["card", "default"] — the badge comes from the card wrapper',
          },
          validators: [{ kind: 'required' }, { kind: 'minLength', value: 20 }],
        },
      ],
    },
  },
];
