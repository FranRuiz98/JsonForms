/// <reference types="cypress" />

// Basic load-performance budget. Run via: npm run test:performance
describe('performance', () => {
  it('renders the initial form within a reasonable budget', () => {
    cy.visit('/');
    cy.get('jf-form', { timeout: 10000 }).should('exist');

    cy.window().then((win) => {
      const nav = win.performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (nav) {
        // DOMContentLoaded should be well under 5s for the demo bundle.
        expect(nav.domContentLoadedEventEnd).to.be.lessThan(5000);
      }
    });
  });
});
