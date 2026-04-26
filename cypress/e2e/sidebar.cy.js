describe('sidebar', () => {
  function visitLoggedOut(path = '/games') {
    cy.visit(`http://localhost:3000${path}`, {
      onBeforeLoad(win) {
        win.localStorage.removeItem('username');
      },
    });
  }

  function visitLoggedIn(path = '/games', username = 'owner', requestCountResponse = { statusCode: 200, body: { count: 2 } }) {
    cy.intercept('HEAD', '**/api/auth/validate', { statusCode: 200 }).as('validateAuth');
    cy.intercept('GET', '**/api/settings/friends/request-count', requestCountResponse).as('requestCount');
    cy.visit(`http://localhost:3000${path}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('username', username);
      },
    });
    cy.wait('@validateAuth');
    cy.wait('@requestCount');
  }

  it('shows sidebar items and can collapse', () => {
    visitLoggedOut('/games');

    cy.get('.sidebar').should('be.visible');
    cy.get('#gamesBox').should('be.visible');
    cy.get('#friendsBox').should('be.visible');
    cy.get('#calendarBox').should('be.visible');

    cy.get('.sidebar-toggle-btn').click();
    cy.get('.sidebar').should('have.class', 'sidebar-closed');
    cy.get('#gamesBox').should('not.exist');
  });

  it('handles logged-out navigation (games and protected tabs)', () => {
    visitLoggedOut('/friends');
    cy.get('#gamesBox').click();
    cy.url().should('include', '/games');

    visitLoggedOut('/games');
    cy.get('#friendsBox').click();
    cy.url().should('include', '/login');

    visitLoggedOut('/games');
    cy.get('#calendarBox').click();
    cy.url().should('include', '/login');
  });

  it('handles logged-in navigation and request badge', () => {
    visitLoggedIn('/games', 'owner', { statusCode: 200, body: { count: 2 } });
    cy.get('.sideBox-request-badge').should('contain', '2');

    cy.get('#friendsBox').click();
    cy.url().should('include', '/friends');

    visitLoggedIn('/games', 'owner', { statusCode: 200, body: { count: 2 } });
    cy.get('#calendarBox').click();
    cy.url().should('include', '/calendar');
  });

  it('handles non-ok request count and incoming count events', () => {
    // Covers Sidebar line 33: if request-count API is not OK, keep count unchanged (default 0).
    visitLoggedIn('/games', 'owner', { statusCode: 500, body: {} });
    cy.get('.sideBox-request-badge').should('not.exist');

    cy.window().then((win) => {
      win.dispatchEvent(new win.CustomEvent('friends:incoming-count', { detail: { count: 5 } }));
    });
    cy.get('.sideBox-request-badge').should('contain', '5');

    cy.window().then((win) => {
      win.dispatchEvent(new win.CustomEvent('friends:incoming-count', { detail: { count: 0 } }));
    });
    cy.get('.sideBox-request-badge').should('not.exist');
  });
});