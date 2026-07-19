// Support file for Cypress component testing (loaded before component specs).
import './commands';
import { mount } from 'cypress/angular';

Cypress.Commands.add('mount', mount);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

export {};
