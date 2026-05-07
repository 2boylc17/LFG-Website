describe('cookie_consent_banner', () => {
  // Visit without consent set so the banner is always visible for these tests
  function visitWithoutConsent(path = '/games') {
    cy.visit(`http://localhost:3000${path}`, {
      onBeforeLoad(win) {
        win.localStorage.removeItem('cookie-consent');
        win.localStorage.removeItem('username');
      },
    });
  }

  // Visit with consent already recorded so the banner should not appear
  function visitWithConsent(path = '/games') {
    cy.visit(`http://localhost:3000${path}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('cookie-consent', 'necessary');
      },
    });
  }

  it('shows the consent banner when no choice has been made', () => {
    visitWithoutConsent();

    cy.get('.cookie-consent-banner').should('be.visible');
    cy.contains('.cookie-consent-description', 'This site uses cookies').should('be.visible');
    cy.contains('button', 'Accept Necessary Cookies').should('be.visible');
  });

  it('does not show the banner when consent is already stored', () => {
    visitWithConsent();

    cy.get('.cookie-consent-banner').should('not.exist');
  });

  it('shows and hides cookie details when toggling', () => {
    visitWithoutConsent();

    cy.get('#cookie-consent-details').should('not.exist');
    cy.contains('button', 'Show details').click();
    cy.get('#cookie-consent-details').should('be.visible');
    cy.contains('.cookie-consent-category', 'Necessary').should('be.visible');
    cy.contains('.cookie-consent-required-badge', 'Always active').should('be.visible');

    cy.contains('button', 'Hide details').click();
    cy.get('#cookie-consent-details').should('not.exist');
  });

  it('dismisses the banner and persists consent on accept', () => {
    visitWithoutConsent();

    cy.contains('button', 'Accept Necessary Cookies').click();
    cy.get('.cookie-consent-banner').should('not.exist');

    cy.window().its('localStorage').invoke('getItem', 'cookie-consent').should('eq', 'necessary');
  });

  it('does not show the banner again after accepting and reloading', () => {
    visitWithoutConsent();

    cy.contains('button', 'Accept Necessary Cookies').click();
    cy.get('.cookie-consent-banner').should('not.exist');

    cy.reload();
    cy.get('.cookie-consent-banner').should('not.exist');
  });

  it('has accessible role and label on the banner', () => {
    visitWithoutConsent();

    cy.get('[role="dialog"][aria-label="Cookie consent"]').should('exist');
    cy.get('[aria-describedby="cookie-consent-desc"]').should('exist');
  });

  it('details toggle exposes aria-expanded state correctly', () => {
    visitWithoutConsent();

    cy.get('.cookie-consent-details-toggle').should('have.attr', 'aria-expanded', 'false');
    cy.get('.cookie-consent-details-toggle').click();
    cy.get('.cookie-consent-details-toggle').should('have.attr', 'aria-expanded', 'true');
  });
});
