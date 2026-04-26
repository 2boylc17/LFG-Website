describe('settings_page', () => {
  const base = 'http://localhost:3000';
  const settingsBody = { bio: 'bio1', platforms: ['PC'], playStyle: 'Casual' };

  function visitSettings() {
    cy.visit(`${base}/settings`, {
      onBeforeLoad: (win) => win.localStorage.setItem('username', 'user1'),
    });
  }

  function waitForSettings() {
    cy.wait('@getSettings');
    cy.wait(500);
  }

  function openModal() {
    cy.contains('.settings-save-btn', 'Open Account Settings').click();
  }

  beforeEach(() => {
    cy.intercept('HEAD', '**/api/auth/validate', { statusCode: 200 }).as('validateRequest');
    cy.intercept('GET', '**/api/settings', { statusCode: 200, body: settingsBody }).as('getSettings');
    cy.intercept('PUT', '**/api/settings/profile', { statusCode: 200, body: { message: 'Profile saved.' } }).as('saveProfile');
    visitSettings();
    cy.clearCookies();
  });

  it('Redirects to login when not logged in', () => {
    cy.intercept('HEAD', '**/api/auth/validate', { statusCode: 401 }).as('validateUnauth');
    cy.visit(`${base}/settings`);
    cy.url().should('include', '/login');
  });

  it('Renders all fields and allows profile interactions', () => {
    waitForSettings();
    cy.get('.settings-page').should('be.visible');
    cy.get('.settings-title').should('contain', 'Settings');
    cy.get('#bio').should('be.visible');
    cy.get('.platform-grid').should('be.visible');
    cy.get('#playStyle').should('be.visible');
    cy.get('.settings-save-btn').first().should('contain', 'Save Profile');
    cy.contains('.platform-btn', 'Xbox').click().should('have.class', 'active');
    cy.contains('.platform-btn', 'Xbox').click().should('not.have.class', 'active');
    cy.get('#playStyle').select('Competitive').should('have.value', 'Competitive');
  });

  it('Opens and closes modal via button and backdrop', () => {
    waitForSettings();
    openModal();
    cy.get('.settings-modal').should('be.visible');
    cy.get('h2').should('contain', 'Account Settings');
    cy.get('.settings-modal-close').click();
    cy.get('.settings-modal').should('not.exist');
    openModal();
    cy.get('.settings-modal-backdrop').click({ force: true });
    cy.get('.settings-modal').should('not.exist');
  });

  it('Profile save: no changes, success, and error', () => {
    waitForSettings();
    cy.get('.settings-save-btn').first().click();
    cy.get('.settings-success').should('contain', 'No profile changes to save.');
    cy.get('#bio').clear().type('bio2');
    cy.get('.settings-save-btn').first().click();
    cy.wait('@saveProfile');
    cy.get('.settings-success').should('contain', 'Profile saved.');
    cy.intercept('PUT', '**/api/settings/profile', { statusCode: 500, body: { message: 'err1' } }).as('saveProfileFail');
    cy.get('#bio').clear().type('bio3');
    cy.get('.settings-save-btn').first().click();
    cy.wait('@saveProfileFail');
    cy.get('.settings-error').should('contain', 'err1');
  });

  it('Username form validation and submission', () => {
    waitForSettings();
    openModal();
    cy.contains('.settings-save-btn', 'Update Username').click();
    cy.get('.settings-error').should('contain', 'New username and current password are required.');
    cy.get('#newUsername').type('user1');
    cy.get('#usernamePassword').type('pass1');
    cy.contains('.settings-save-btn', 'Update Username').click();
    cy.get('.settings-error').should('contain', 'New username must be different from current username.');
    cy.intercept('PUT', '**/api/settings/username', { statusCode: 400, body: { message: 'err2' } }).as('updateUsernameFail');
    cy.get('#newUsername').clear().type('user2');
    cy.contains('.settings-save-btn', 'Update Username').click();
    cy.wait('@updateUsernameFail');
    cy.get('.settings-error').should('contain', 'err2');
    cy.intercept('PUT', '**/api/settings/username', { statusCode: 200, body: { username: 'user2' } }).as('updateUsername');
    cy.get('#newUsername').clear().type('user2');
    cy.contains('.settings-save-btn', 'Update Username').click();
    cy.wait('@updateUsername');
    cy.get('.settings-success').should('contain', 'Username updated. Please log in again.');
  });

  it('Password form validation and submission', () => {
    waitForSettings();
    openModal();
    cy.contains('.settings-save-btn', 'Update Password').click();
    cy.get('.settings-error').should('contain', 'All password fields are required.');
    cy.get('#currentPassword').type('pass1');
    cy.get('#newPassword').type('pass2');
    cy.get('#confirmPassword').type('pass3');
    cy.contains('.settings-save-btn', 'Update Password').click();
    cy.get('.settings-error').should('contain', 'New passwords do not match.');
    cy.get('#newPassword').clear().type('abc');
    cy.get('#confirmPassword').clear().type('abc');
    cy.contains('.settings-save-btn', 'Update Password').click();
    cy.get('.settings-error').should('contain', 'New password must be at least 6 characters.');
    cy.get('#currentPassword').clear().type('pass12');
    cy.get('#newPassword').clear().type('pass12');
    cy.get('#confirmPassword').clear().type('pass12');
    cy.contains('.settings-save-btn', 'Update Password').click();
    cy.get('.settings-error').should('contain', 'New password must be different from current password.');
    cy.intercept('PUT', '**/api/settings/password', { statusCode: 400, body: { message: 'err3' } }).as('updatePasswordFail');
    cy.get('#currentPassword').clear().type('pass1');
    cy.get('#newPassword').clear().type('pass2new');
    cy.get('#confirmPassword').clear().type('pass2new');
    cy.contains('.settings-save-btn', 'Update Password').click();
    cy.wait('@updatePasswordFail');
    cy.get('.settings-error').should('contain', 'err3');
    cy.intercept('PUT', '**/api/settings/password', { statusCode: 200, body: { message: 'Password updated.' } }).as('updatePassword');
    cy.get('#currentPassword').clear().type('pass1');
    cy.get('#newPassword').clear().type('pass2new');
    cy.get('#confirmPassword').clear().type('pass2new');
    cy.contains('.settings-save-btn', 'Update Password').click();
    cy.wait('@updatePassword');
    cy.get('.settings-success').should('contain', 'Password updated.');
  });
});
