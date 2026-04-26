describe('friends_page', () => {
  const friend1 = { _id: 'id1', username: 'user1', bio: 'text1' };
  const friend2 = { _id: 'id2', username: 'user2', bio: 'text2' };

  const friendsBody = (overrides = {}) => ({
    friends: [friend1],
    incomingRequests: [],
    outgoingRequests: [],
    ...overrides,
  });

  const interceptFriends = (body, alias = 'getFriends') => {
    cy.intercept('GET', '**/api/settings/friends', { statusCode: 200, body }).as(alias);
  };

  const visitFriends = (extraSetup) => {
    cy.visit('http://localhost:3000/friends', {
      onBeforeLoad(win) {
        win.localStorage.setItem('username', 'user1');
        if (extraSetup) extraSetup(win);
      },
    });
  };

  const loadFriends = (body = friendsBody(), alias = 'getFriends', extraSetup) => {
    interceptFriends(body, alias);
    visitFriends(extraSetup);
    cy.wait(`@${alias}`);
  };

  const createFakeSocket = (threadPayload = { ok: true, messages: [] }) => {
    const handlers = {};
    return {
      connected: false,
      connect() {},
      on(eventName, handler) { handlers[eventName] = handler; },
      off(eventName) { delete handlers[eventName]; },
      emit(eventName, payload, callback) {
        if (eventName === 'dm:thread:get') callback(threadPayload);
      },
      trigger(eventName, payload) {
        if (handlers[eventName]) handlers[eventName](payload);
      },
    };
  };

  const openRequests = () => cy.get('.friend-requests-toggle-btn').click();
  const selectFriend = (username) => cy.contains('.messages-friend-item', username).click();

  beforeEach(() => {
    cy.intercept('HEAD', '**/api/auth/validate', { statusCode: 200 }).as('validateRequest');
  });

  it('Redirects to login when not logged in', () => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('http://localhost:3000/friends');
    cy.url().should('include', '/login');
  });

  it('Renders page, toggles requests panel, and shows API error', () => {
    loadFriends();
    cy.get('.friends-page').should('be.visible');
    cy.get('.friend-requests-shell').should('be.visible');
    openRequests();
    cy.get('.friend-requests-toggle-btn').should('contain', 'Hide Requests');
    cy.contains('.friends-empty', 'No pending friend requests.').should('be.visible');
    cy.intercept('GET', '**/api/settings/friends', { statusCode: 500, body: { message: 'Failed to load friends' } }).as('getFriendsError');
    visitFriends();
    cy.wait('@getFriendsError');
    cy.get('.error').should('be.visible');
  });

  it('Request panel shows requests and handles accept and reject', () => {
    loadFriends(
      friendsBody({ friends: [], incomingRequests: [{ _id: 'id3', username: 'user2', bio: 'text2' }], outgoingRequests: [{ _id: 'id4', username: 'user3' }] }),
      'getFriendsRequests'
    );
    openRequests();
    cy.get('.friend-name').should('contain', 'user2');
    cy.contains('.friends-empty', 'Pending sent requests: user3').should('be.visible');
    cy.intercept('POST', '**/api/settings/friends/request/*/accept', { statusCode: 200, body: { message: 'Request accepted' } }).as('acceptRequest');
    cy.contains('.friend-request-accept-btn', 'Accept').click();
    cy.wait('@acceptRequest');
    cy.contains('.friends-action-message', 'Request accepted').should('be.visible');
    loadFriends(friendsBody({ friends: [], incomingRequests: [{ _id: 'id3', username: 'user2', bio: 'text2' }] }), 'getFriendsReject');
    cy.intercept('POST', '**/api/settings/friends/request/*/reject', { statusCode: 500, body: { message: 'Failed to process request' } }).as('rejectRequest');
    openRequests();
    cy.contains('.friend-request-reject-btn', 'Reject').click();
    cy.wait('@rejectRequest');
    cy.contains('.friends-action-message', 'Failed to process request').should('be.visible');
  });

  it('Friends list interactions and chat view', () => {
    loadFriends(friendsBody({ friends: [] }), 'getFriendsEmpty');
    cy.contains('.friends-empty', 'No friends available to message yet.').should('be.visible');
    loadFriends(friendsBody({ friends: [friend1, friend2] }), 'getFriendsList');
    selectFriend('user2');
    cy.get('h2').should('contain', 'Chat with user2');
    cy.get('.messages-form input').should('not.be.disabled');
    cy.get('.messages-form button').should('be.visible');
    cy.get('.friend-card-top').should('contain', 'user2');
    cy.contains('a', 'Full Profile').should('be.visible');
    cy.intercept('POST', '**/api/settings/friends/remove/*', { statusCode: 200, body: { message: 'Friend removed' } }).as('removeFriend');
    cy.contains('.friend-remove-btn', 'Remove Friend').click();
    cy.contains('.friends-confirm-card', 'Remove Friend?').should('be.visible');
    cy.contains('.friends-confirm-actions button:not(.friend-remove-btn)', 'Cancel').click();
    cy.contains('.friends-confirm-card', 'Remove Friend?').should('not.exist');
    cy.contains('.friend-remove-btn', 'Remove Friend').click();
    cy.contains('.friends-confirm-actions .friend-remove-btn', 'Yes, Remove').click();
    cy.wait('@removeFriend');
    cy.contains('.friends-action-message', 'Friend removed').should('be.visible');
  });

  it('Shows loading state and loads thread messages from socket', () => {
    loadFriends(friendsBody({ friends: [friend1] }), 'getFriendsList');
    selectFriend('user1');
    cy.contains('Loading messages...').should('be.visible');
    const successSocket = createFakeSocket({ ok: true, messages: [{ _id: 'id5', senderUsername: 'user1', recipientUsername: 'user2', createdAt: '2026-01-01T00:00:00Z', text: 'text1' }] });
    loadFriends(friendsBody({ friends: [friend1] }), 'getFriendsList2', (win) => { win.__friendsTestSocket = successSocket; });
    selectFriend('user1');
    cy.contains('.messages-bubble-text', 'text1').should('be.visible');
    cy.contains('Loading messages...').should('not.exist');
    const errorSocket = createFakeSocket({ ok: false, message: 'Thread failed' });
    loadFriends(friendsBody({ friends: [friend1] }), 'getFriendsList3', (win) => { win.__friendsTestSocket = errorSocket; });
    selectFriend('user1');
    cy.contains('.error', 'Thread failed').should('be.visible');
    cy.contains('Loading messages...').should('not.exist');
  });

  it('Live socket messages are added, filtered, and deduplicated', () => {
    const socket = createFakeSocket({ ok: true, messages: [] });
    loadFriends(friendsBody({ friends: [friend1, friend2] }), 'getFriendsSocket', (win) => {
      win.__friendsLiveSocket = socket;
      win.__friendsTestSocket = socket;
    });
    selectFriend('user2');
    cy.window().its('__friendsLiveSocket').invoke('trigger', 'dm:message:new', { _id: 'm1', senderUsername: 'user2', recipientUsername: 'user1', createdAt: '2026-01-01T00:00:00.000Z', text: 'text2' });
    cy.contains('.messages-bubble-text', 'text2').should('be.visible');
    cy.window().its('__friendsLiveSocket').invoke('trigger', 'dm:message:new', { _id: 'm2', senderUsername: 'user3', recipientUsername: 'user4', createdAt: '2026-01-01T00:00:00.000Z', text: 'text3' });
    cy.contains('.messages-bubble-text', 'text3').should('not.exist');
    cy.window().its('__friendsLiveSocket').invoke('trigger', 'dm:message:new', { _id: 'm3', senderUsername: 'user2', recipientUsername: 'user1', createdAt: '2026-01-01T00:00:00.000Z', text: 'text4' });
    cy.window().its('__friendsLiveSocket').invoke('trigger', 'dm:message:new', { _id: 'm3', senderUsername: 'user2', recipientUsername: 'user1', createdAt: '2026-01-01T00:00:00.000Z', text: 'text4' });
    cy.get('.messages-bubble-text').contains('text4').should('have.length', 1);
  });
});
