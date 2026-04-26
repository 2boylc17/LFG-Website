const base = 'http://localhost:3000';
const profileBody = { username: 'user1', bio: 'bio1', playStyle: 'style1', platforms: ['platform1', 'platform2'] };
const emptyFriends = { friends: [], incomingRequests: [], outgoingRequests: [] };

function interceptFriends(body = emptyFriends) {
  cy.intercept('GET', '**/api/settings/friends', { statusCode: 200, body }).as('getFriends');
}

function visitProfile(path = '/profile/user1', asUser = null) {
  cy.visit(`${base}${path}`, asUser ? { onBeforeLoad: (win) => win.localStorage.setItem('username', asUser) } : {});
}

function waitForProfile() {
  cy.wait('@getProfile');
  cy.wait(500);
}

describe('profile_page', () => {
  beforeEach(() => {
    cy.intercept('HEAD', '**/api/auth/validate', { statusCode: 200 }).as('validateRequest');
    cy.intercept('GET', '**/api/settings/public/user1', { statusCode: 200, body: profileBody }).as('getProfile');
    visitProfile();
    cy.clearCookies();
  });

  it('Renders profile page and displays content', () => {
    waitForProfile();
    cy.get('.profile-page').should('be.visible');
    cy.get('.profile-card').should('be.visible');
    cy.get('h1').should('contain', 'Player Profile');
    cy.get('.profile-back-link').should('be.visible');
    cy.get('.profile-username').should('contain', 'user1');
    cy.get('.profile-value').should('contain', 'bio1');
    cy.get('.profile-value').should('contain', 'style1');
    cy.get('.profile-platform-chip').should('have.length', 2);
  });

  it('Shows error for unknown user', () => {
    cy.intercept('GET', '**/api/settings/public/user2', { statusCode: 404, body: { message: 'User not found' } }).as('getProfile');
    visitProfile('/profile/user2');
    waitForProfile();
    cy.get('.error').should('contain', 'User not found');
  });

  it('Shows fallbacks when bio, playStyle, and platforms are empty', () => {
    cy.intercept('GET', '**/api/settings/public/user4', { statusCode: 200, body: { username: 'user4', bio: '', playStyle: '', platforms: [] } }).as('getEmpty');
    visitProfile('/profile/user4');
    cy.wait('@getEmpty');
    cy.wait(500);
    cy.get('.profile-value').should('contain', 'No bio set');
    cy.get('.profile-value').should('contain', 'Not set');
    cy.get('.profile-value').should('contain', 'None selected');
  });

  it('Back link variants respect returnTo param', () => {
    waitForProfile();
    cy.get('.profile-back-link').should('contain', 'Back to Games').and('have.attr', 'href', '/games');
    visitProfile('/profile/user1?returnTo=/group/id1');
    waitForProfile();
    cy.get('.profile-back-link').should('contain', 'Back to Group').and('have.attr', 'href', '/group/id1');
    visitProfile('/profile/user1?returnTo=/friends');
    waitForProfile();
    cy.get('.profile-back-link').should('contain', 'Back to Friends').and('have.attr', 'href', '/friends');
  });

  it('Friend button reflects relationship status', () => {
    interceptFriends();
    visitProfile('/profile/user1', 'user1');
    waitForProfile();
    cy.get('.profile-add-friend-btn').should('not.exist');
    interceptFriends();
    visitProfile('/profile/user1', 'user3');
    waitForProfile();
    cy.get('.profile-add-friend-btn').should('contain', 'Send Friend Request');
    interceptFriends({ friends: [{ username: 'user1' }], incomingRequests: [], outgoingRequests: [] });
    visitProfile('/profile/user1', 'user3');
    waitForProfile();
    cy.get('.profile-add-friend-btn').should('contain', 'Friends').and('be.disabled');
    interceptFriends({ friends: [], incomingRequests: [], outgoingRequests: [{ username: 'user1' }] });
    visitProfile('/profile/user1', 'user3');
    waitForProfile();
    cy.get('.profile-add-friend-btn').should('contain', 'Request Sent').and('be.disabled');
    interceptFriends({ friends: [], incomingRequests: [{ username: 'user1' }], outgoingRequests: [] });
    visitProfile('/profile/user1', 'user3');
    waitForProfile();
    cy.get('.profile-add-friend-btn').should('contain', 'Respond in Friends').and('be.disabled');
  });

  it('Sending friend request shows success or error', () => {
    interceptFriends();
    cy.intercept('POST', '**/api/settings/friends/request/user1', { statusCode: 200, body: { message: 'msg1', relationStatus: 'outgoing' } }).as('sendRequest');
    visitProfile('/profile/user1', 'user3');
    waitForProfile();
    cy.get('.profile-add-friend-btn').click();
    cy.wait('@sendRequest');
    cy.get('.profile-success').should('contain', 'msg1');
    cy.get('.profile-add-friend-btn').should('contain', 'Request Sent');
    interceptFriends();
    cy.intercept('POST', '**/api/settings/friends/request/user1', { statusCode: 400, body: { message: 'err1' } }).as('sendRequestFail');
    visitProfile('/profile/user1', 'user3');
    waitForProfile();
    cy.get('.profile-add-friend-btn').click();
    cy.wait('@sendRequestFail');
    cy.get('.error').should('contain', 'err1');
  });
});
