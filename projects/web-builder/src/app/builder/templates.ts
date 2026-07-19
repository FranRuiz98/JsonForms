/** Starter templates the author can load as a new document. Each is a plain
 *  FormConfig (validated on load) that seeds the builder. */
import { FormConfig } from 'signal-jsonforms';

export interface Template {
  id: string;
  name: string;
  description: string;
  config: FormConfig;
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank form',
    description: 'An empty canvas to start from scratch.',
    config: { fields: [] },
  },
  {
    id: 'contact',
    name: 'Contact form',
    description: 'Name, email and a message with basic validation.',
    config: {
      fields: [
        { key: 'name', type: 'text', dataType: 'string', label: 'Full name', validators: [{ kind: 'required' }] },
        { key: 'email', type: 'text', dataType: 'string', label: 'Email', validators: [{ kind: 'required' }, { kind: 'email' }] },
        { key: 'message', type: 'text', dataType: 'string', label: 'Message', validators: [{ kind: 'required' }, { kind: 'minLength', value: 10 }] },
      ],
    },
  },
  {
    id: 'survey',
    name: 'Feedback survey',
    description: 'A rating select plus an optional comment shown conditionally.',
    config: {
      fields: [
        {
          key: 'rating', type: 'select', dataType: 'string', label: 'How was your experience?',
          validators: [{ kind: 'required' }],
          options: [
            { value: 'great', label: 'Great' },
            { value: 'ok', label: 'OK' },
            { value: 'bad', label: 'Bad' },
          ],
        },
        { key: 'comment', type: 'text', dataType: 'string', label: 'What could be better?', hidden: { expr: "valueAt('rating') == 'great'" } },
        { key: 'contactMe', type: 'checkbox', dataType: 'boolean', label: 'You may contact me', defaultValue: false },
      ],
    },
  },
  {
    id: 'profile',
    name: 'Profile with address',
    description: 'A nested address group and a two-column layout.',
    config: {
      layout: { columns: 2 },
      fields: [
        { key: 'firstName', type: 'text', dataType: 'string', label: 'First name', validators: [{ kind: 'required' }] },
        { key: 'lastName', type: 'text', dataType: 'string', label: 'Last name', validators: [{ kind: 'required' }] },
        {
          key: 'address', type: 'group', dataType: 'object', label: 'Address', colSpan: 2,
          layout: { columns: 2 },
          fields: [
            { key: 'street', type: 'text', dataType: 'string', label: 'Street', colSpan: 2 },
            { key: 'city', type: 'text', dataType: 'string', label: 'City' },
            { key: 'zip', type: 'text', dataType: 'string', label: 'ZIP' },
          ],
        },
      ],
    },
  },
  {
    id: 'signup-wizard',
    name: 'Signup wizard',
    description: 'A two-step wizard: account then profile.',
    config: {
      wizard: { linear: true, showStepper: true },
      steps: [
        {
          id: 'account', label: 'Account',
          fields: [
            { key: 'email', type: 'text', dataType: 'string', label: 'Email', validators: [{ kind: 'required' }, { kind: 'email' }] },
            { key: 'password', type: 'text', dataType: 'string', label: 'Password', validators: [{ kind: 'required' }, { kind: 'minLength', value: 8 }] },
          ],
        },
        {
          id: 'profile', label: 'Profile',
          fields: [
            { key: 'displayName', type: 'text', dataType: 'string', label: 'Display name', validators: [{ kind: 'required' }] },
            { key: 'newsletter', type: 'checkbox', dataType: 'boolean', label: 'Subscribe to the newsletter', defaultValue: true },
          ],
        },
      ],
    },
  },
];
