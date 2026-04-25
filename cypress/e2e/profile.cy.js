describe('profile_page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/settings/public/testuser', {
      statusCode: 200,
      body: {
        username: 'testuser',
        bio: 'Love gaming!',
        playStyle: 'Casual',
        platforms: ['PC', 'PlayStation'],
      },
    }).as('getProfile');

    cy.visit('http://localhost:3000/profile/testuser');
    cy.clearCookies();
  });

  it('All Fields Render', () => {
    cy.wait('@getProfile');
    cy.wait(500);

    cy.get('.profile-page').should('be.visible');
    cy.get('.profile-card').should('be.visible');
    cy.get('h1').should('contain', 'Player Profile');
    cy.get('.profile-back-link').should('be.visible');
  });

  it('Profile content displays correctly', () => {
    cy.wait('@getProfile');
    cy.wait(500);

    cy.get('.profile-username').should('contain', 'testuser');
    cy.get('.profile-value').should('contain', 'Love gaming!');
    cy.get('.profile-value').should('contain', 'Casual');
    cy.get('.profile-platform-chip').should('have.length', 2);
  });

  it('Shows error for unknown user', () => {
    cy.intercept('GET', '**/api/settings/public/unknownuser', {
      statusCode: 404,
      body: { message: 'User not found' },
    }).as('getProfile');

    cy.visit('http://localhost:3000/profile/unknownuser');
    cy.wait('@getProfile');
    cy.wait(500);

    cy.get('.error').should('contain', 'User not found');
  });

  it('Shows send friend request button when viewing another profile', () => {
    cy.intercept('GET', '**/api/settings/friends', {
      statusCode: 200,
      body: { friends: [], incomingRequests: [], outgoingRequests: [] },
    }).as('getFriends');

    cy.visit('http://localhost:3000/profile/testuser', {
      onBeforeLoad(win) {
        win.localStorage.setItem('username', 'anotheruser');
      },
    });

    cy.wait('@getProfile');
    cy.wait(500);

    cy.get('.profile-add-friend-btn').should('be.visible').and('contain', 'Send Friend Request');
  });
});
