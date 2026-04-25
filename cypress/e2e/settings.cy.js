describe('settings_page', () => {
  beforeEach(() => {
    cy.intercept('HEAD', '**/api/auth/validate', { statusCode: 200 }).as('validateRequest');

    cy.intercept('GET', '**/api/settings', {
      statusCode: 200,
      body: { bio: 'Test bio', platforms: ['PC'], playStyle: 'Casual' },
    }).as('getSettings');

    cy.intercept('PUT', '**/api/settings/profile', {
      statusCode: 200,
      body: { message: 'Profile saved.' },
    }).as('saveProfile');

    cy.visit('http://localhost:3000/settings', {
      onBeforeLoad(win) {
        win.localStorage.setItem('username', 'user1');
      },
    });
    cy.clearCookies();
  });

  it('Redirects to login when not logged in', () => {
    cy.visit('http://localhost:3000/settings');
    cy.url().should('include', '/login');
  });

  it('All Fields Render', () => {
    cy.wait('@getSettings');
    cy.wait(500);

    cy.get('.settings-page').should('be.visible');
    cy.get('.settings-title').should('contain', 'Settings');
    cy.get('#bio').should('be.visible');
    cy.get('.platform-grid').should('be.visible');
    cy.get('#playStyle').should('be.visible');
    cy.get('.settings-save-btn').first().should('contain', 'Save Profile');
  });

  it('Opens account settings modal', () => {
    cy.wait('@getSettings');
    cy.wait(500);

    cy.contains('.settings-save-btn', 'Open Account Settings').click();
    cy.get('.settings-modal').should('be.visible');
    cy.get('h2').should('contain', 'Account Settings');
  });

  it('Closes account settings modal', () => {
    cy.wait('@getSettings');
    cy.wait(500);

    cy.contains('.settings-save-btn', 'Open Account Settings').click();
    cy.get('.settings-modal').should('be.visible');
    cy.get('.settings-modal-close').click();
    cy.get('.settings-modal').should('not.exist');
  });

  it('Shows no changes message when profile is unchanged', () => {
    cy.wait('@getSettings');
    cy.wait(500);

    cy.get('.settings-save-btn').first().click();
    cy.get('.settings-success').should('contain', 'No profile changes to save.');
  });

  it('Saves profile successfully', () => {
    cy.wait('@getSettings');
    cy.wait(500);

    cy.get('#bio').clear().type('Updated bio text');
    cy.get('.settings-save-btn').first().click();
    cy.wait('@saveProfile');
    cy.get('.settings-success').should('contain', 'Profile saved.');
  });
});
