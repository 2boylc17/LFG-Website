describe('navbar', () => {
  function visitLoggedOut(path = '/games') {
    cy.visit(`http://localhost:3000${path}`, {
      onBeforeLoad(win) {
        win.localStorage.removeItem('username');
      },
    });
  }

  function visitLoggedIn(path = '/games', username = 'owner') {
    cy.intercept('HEAD', '**/api/auth/validate', { statusCode: 200 }).as('validateAuth');
    cy.visit(`http://localhost:3000${path}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('username', username);
      },
    });
    cy.wait('@validateAuth');
  }

  it('shows title and logged-out actions', () => {
    visitLoggedOut();

    cy.contains('.navbar-title', 'LFG Website').should('be.visible');
    cy.contains('button', 'Login').should('be.visible');
    cy.contains('button', 'Register').should('be.visible');
    cy.get('.navbar-logout-btn').should('not.exist');
    cy.get('.navbar-settings-btn').should('be.visible');
  });

  it('navigates with login and register buttons', () => {
    visitLoggedOut();
    cy.contains('button', 'Login').click();
    cy.url().should('include', '/login');

    visitLoggedOut();
    cy.contains('button', 'Register').click();
    cy.url().should('include', '/login?mode=register');
  });

  it('shows username and can logout when logged in', () => {
    cy.intercept('POST', '**/api/auth/logout', { statusCode: 200, body: {} }).as('logout');
    visitLoggedIn('/games', 'owner');

    cy.contains('.username-label', 'owner').should('be.visible');
    cy.get('.navbar-logout-btn').click();
    cy.wait('@logout');
  });

  it('toggles sidebar from navbar button', () => {
    cy.viewport(390, 844);
    visitLoggedOut('/games');

    cy.get('main').should('not.have.class', 'sidebar-collapsed');
    cy.get('.navbar-toggle-btn').click();
    cy.get('main').should('have.class', 'sidebar-collapsed');
  });
});