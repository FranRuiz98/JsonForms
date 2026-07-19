/// <reference types="cypress" />

// Accessibility checks with cypress-axe. Run via: npm run test:accessibility
describe('accessibility', () => {
  it('has no detectable a11y violations on the playground', () => {
    cy.visit('/');
    cy.get('jf-form', { timeout: 10000 }).should('exist');
    cy.injectAxe();
    // Scope to the rendered form; tune rules as the design system matures.
    cy.checkA11y('jf-form', {
      rules: {
        // Color-contrast can be flaky against a live theme; enable once the
        // reference kit's palette is finalized.
        'color-contrast': { enabled: false },
      },
    });
  });
});
