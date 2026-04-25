describe('friends_page', () => {
  beforeEach(() => {
    cy.intercept('HEAD', '**/api/auth/validate', { statusCode: 200 }).as('validateRequest');

    cy.intercept('GET', '**/api/settings/friends', {
      statusCode: 200,
      body: {
        friends: [
          { _id: '507f1f77bcf86cd799439011', username: 'alice', bio: 'Hey there' },
        ],
        incomingRequests: [],
        outgoingRequests: [],
      },
    }).as('getFriends');

    cy.visit('http://localhost:3000/friends', {
      onBeforeLoad(win) {
        win.localStorage.setItem('username', 'testuser');
      },
    });
    cy.clearCookies();
  });

  it('Redirects to login when not logged in', () => {
    cy.visit('http://localhost:3000/friends');
    cy.url().should('include', '/login');
  });

  it('All Fields Render', () => {
    cy.wait('@getFriends');
    cy.wait(500);

    cy.get('.friends-page').should('be.visible');
    cy.get('.friend-requests-shell').should('be.visible');
    cy.get('.friend-requests-toggle-btn').should('be.visible');
  });

  it('Opens friend requests panel on toggle', () => {
    cy.wait('@getFriends');
    cy.wait(500);

    cy.get('.friend-requests-toggle-btn').should('contain', 'Open Requests');
    cy.get('.friend-requests-toggle-btn').click();
    cy.get('.friend-requests-toggle-btn').should('contain', 'Hide Requests');
    cy.contains('.friends-empty', 'No pending friend requests.').should('be.visible');
  });

  it('Shows error when friends API fails', () => {
    cy.intercept('GET', '**/api/settings/friends', {
      statusCode: 500,
      body: { message: 'Failed to load friends' },
    }).as('getFriends');
    cy.wait(500);

    cy.wait('@getFriends');
    cy.get('.error').should('be.visible');
  });
});
