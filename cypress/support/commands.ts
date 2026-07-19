/// <reference types="cypress" />

// cypress-axe adds cy.injectAxe() and cy.checkA11y() for accessibility testing.
import 'cypress-axe';

// ---------------------------------------------------------------------------
// Custom commands for the signal-jsonforms playground.
// ---------------------------------------------------------------------------

/** Selects a playground example by its visible title (buttons in the sidebar). */
Cypress.Commands.add('selectExample', (title: string) => {
  cy.contains('button', title).click();
  cy.get('jf-form', { timeout: 10000 }).should('exist');
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Opens a playground example by its title and waits for the form to render. */
      selectExample(title: string): Chainable<void>;
    }
  }
}

export {};
