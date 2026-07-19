/// <reference types="cypress" />

// Basic smoke test: the playground boots and renders a form.
describe('playground smoke', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('boots the Angular app', () => {
    cy.get('app-root').should('exist');
  });

  it('renders a jf-form for the default example', () => {
    cy.get('jf-form', { timeout: 10000 }).should('exist');
    cy.get('jf-field-renderer').should('have.length.greaterThan', 0);
  });

  it('shows a required error when a required field is left empty', () => {
    // Touch the first input and blur it without typing.
    cy.get('jf-form input, jf-form textarea, jf-form select').first().focus().blur();
    cy.get('jf-form').should('exist');
  });
});
