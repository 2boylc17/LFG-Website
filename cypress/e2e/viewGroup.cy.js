describe('view_group_page', () => {
  const groupId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const ownerId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const memberId = 'cccccccccccccccccccccccc';
  const requesterId = 'dddddddddddddddddddddddd';

  const groupBody = {
    _id: groupId,
    name: 'group',
    description: 'text',
    platform: 'PC',
    experience: 'No Experience Required',
    microphone: 'No Mic',
    region: 'North America',
    joinRequirement: 'auto',
    members: [{ _id: ownerId, username: 'owner' }],
    pendingMembers: [],
    owner: { _id: ownerId, username: 'owner' },
    tags: [],
    createdAt: new Date().toISOString(),
    game: { name: 'game', image: null },
  };

  const memberGroupBody = {
    ...groupBody,
    owner: { _id: memberId, username: 'member' },
    members: [
      { _id: ownerId, username: 'owner' },
      { _id: memberId, username: 'member' },
    ],
  };

  const ownerGroupBody = {
    ...groupBody,
    members: [
      { _id: ownerId, username: 'owner' },
      { _id: memberId, username: 'member' },
    ],
    pendingMembers: [{ _id: requesterId, username: 'requester' }],
  };

  function createFakeSocket(groupAck = { ok: true, history: [] }) {
    const handlers = {};
    return {
      connected: true,
      connect() {},
      disconnect() {},
      on(event, handler) { handlers[event] = handler; },
      off(event) { delete handlers[event]; },
      emit(event, _payload, callback) {
        if (event === 'group:join' && callback) callback(groupAck);
      },
      trigger(event, payload) {
        if (handlers[event]) handlers[event](payload);
      },
    };
  }

  function visitGroup({
    id = groupId,
    body = groupBody,
    statusCode = 200,
    alias = 'getGroup',
    username,
    socketAck,
  } = {}) {
    cy.intercept('GET', `**/api/groups/id/${id}`, { statusCode, body }).as(alias);
    cy.visit(`http://localhost:3000/group/${id}`, {
      onBeforeLoad(win) {
        if (username) win.localStorage.setItem('username', username);
        if (socketAck) win.__groupTestSocket = createFakeSocket(socketAck);
      },
    });
    cy.wait(`@${alias}`);
    cy.wait(500);
  }

  beforeEach(() => {
    cy.intercept('HEAD', '**/api/auth/validate', { statusCode: 200 }).as('validateAuth');
  });

  it('Renders group page and displays details', () => {
    visitGroup();
    cy.get('.view-group-page').should('be.visible');
    cy.get('.view-group-card').should('be.visible');
    cy.get('h1').should('contain', 'group');
    cy.contains('p', 'text').should('be.visible');
    cy.contains('button', 'Join').should('be.visible');
  });

  it('Shows Invalid group id when route has no group id', () => {
    cy.visit('http://localhost:3000/group');
    cy.contains('.error', 'Invalid group id').should('be.visible');
    cy.contains('Loading group...').should('not.exist');
    cy.get('.view-group-card').should('not.exist');
  });

  it('Shows error and stops loading when group fetch fails', () => {
    cy.intercept('GET', `**/api/groups/id/${groupId}`, { forceNetworkError: true }).as('getGroupFail');
    cy.visit(`http://localhost:3000/group/${groupId}`);
    cy.wait('@getGroupFail');
    cy.wait(500);

    cy.get('.error').should('be.visible');
    cy.contains('Loading group...').should('not.exist');
    cy.get('.view-group-card').should('not.exist');
  });

  it('Covers tags, join requirement variants, and image rendering', () => {
    visitGroup({ username: 'member' });
    cy.get('.view-group-required-tag-chip').should('have.length', 4);
    cy.contains('.view-group-required-tag-chip', 'PC').should('exist');
    cy.contains('.view-group-tag-empty', 'No optional tags.').should('be.visible');
    cy.contains('.view-group-game-name', 'game').should('be.visible');
    cy.contains('.view-group-game-image-fallback', 'No image').should('be.visible');

    visitGroup({
      body: { ...groupBody, tags: ['tag-a', 'tag-b'] },
      alias: 'getGroupTags',
      username: 'member',
    });
    cy.get('.view-group-tag-chip-optional').should('have.length', 2);

    visitGroup({
      body: { ...groupBody, joinRequirement: 'password' },
      alias: 'getGroupPassword',
      username: 'member',
    });
    cy.get('.view-group-join-password-input').should('be.visible');
    cy.get('.group-join-button').click();
    cy.get('.error').should('contain', 'Enter the group password');

    visitGroup({
      body: { ...groupBody, joinRequirement: 'request' },
      alias: 'getGroupRequest',
      username: 'member',
    });
    cy.contains('button', 'Request to Join').should('be.visible');

    visitGroup({
      body: {
        ...groupBody,
        game: {
          name: 'game',
          image: {
            contentType: 'image/png',
            data: { type: 'Buffer', data: [137, 80, 78, 71] },
          },
        },
      },
      alias: 'getGroupBufferImage',
      username: 'member',
    });
    cy.get('.view-group-game-image').should('have.attr', 'src').and('match', /^data:image\/png;base64,/);

    visitGroup({
      body: {
        ...groupBody,
        game: {
          name: 'game',
          image: { contentType: 'image/png', data: 'iVBORw0KGgo=' },
        },
      },
      alias: 'getGroupStringImage',
      username: 'member',
    });
    cy.get('.view-group-game-image').should('have.attr', 'src').and('eq', 'data:image/png;base64,iVBORw0KGgo=');
    cy.get('.view-group-game-image-fallback').should('not.exist');
  });

  it('Handles join flows including invalid id guard and API failure', () => {
    const invalidGroupBody = {
      ...groupBody,
      _id: 'invalid-id',
      members: [{ _id: ownerId, username: 'owner' }],
      owner: { _id: ownerId, username: 'owner' },
    };

    cy.intercept('POST', '**/api/groups/join/invalid-id', { statusCode: 200, body: { group: invalidGroupBody } }).as('joinInvalidGroup');
    visitGroup({ id: 'invalid-id', body: invalidGroupBody, alias: 'getInvalidJoinGroup', username: 'member' });
    cy.get('.group-join-button').click();
    cy.get('.error').should('contain', 'Invalid group id');
    cy.get('@joinInvalidGroup.all').should('have.length', 0);

    const joinedBody = {
      ...groupBody,
      members: [...groupBody.members, { _id: memberId, username: 'member' }],
    };
    cy.intercept('POST', `**/api/groups/join/${groupId}`, { statusCode: 200, body: { group: joinedBody } }).as('joinGroup');
    visitGroup({ id: groupId, body: groupBody, alias: 'getJoinTarget', username: 'member', socketAck: { ok: true, history: [] } });
    cy.get('.group-join-button').click();
    cy.wait('@joinGroup');
    cy.contains('button', 'Leave Group').should('be.visible');

    cy.intercept('POST', `**/api/groups/join/${groupId}`, { statusCode: 400, body: { message: 'Not logged in' } }).as('joinFail');
    visitGroup({ id: groupId, body: groupBody, alias: 'getJoinFailTarget', username: 'member' });
    cy.get('.group-join-button').click();
    cy.wait('@joinFail');
    cy.get('.error').should('contain', 'Not logged in');
  });

  it('Covers member actions: profile, leave, and chat behavior', () => {
    cy.intercept('POST', `**/api/groups/leave/${groupId}`, { statusCode: 200, body: { group: memberGroupBody } }).as('leaveGroup');

    visitGroup({
      body: memberGroupBody,
      alias: 'getMemberGroup',
      username: 'owner',
      socketAck: { ok: true, history: [] },
    });

    cy.contains('button', 'Leave Group').should('be.visible');
    cy.get('.view-group-card').contains('h2', 'Group Chat').should('be.visible');
    cy.contains('button', 'Join').should('not.exist');

    cy.contains('.view-group-member-row', 'owner').find('.view-group-profile-btn').click();
    cy.url().should('include', '/profile/owner');
    cy.go('back');
    cy.wait('@getMemberGroup');
    cy.wait(500);

    cy.get('.group-chat-log').should('be.visible');
    cy.contains('.group-chat-log', 'No messages yet.').should('be.visible');
    cy.get('.group-chat-form input[placeholder="Send a message"]').type('   ');
    cy.get('.group-chat-form button[type="submit"]').click();
    cy.get('.error').should('not.exist');

    cy.window().then((win) => {
      win.__groupTestSocket.trigger('group:message:new', {
        id: 'msg-other-group',
        groupId: 'ffffffffffffffffffffffff',
        senderUsername: 'member',
        text: 'wrong group message',
        createdAt: new Date().toISOString(),
      });
    });
    cy.contains('.group-chat-message', 'wrong group message').should('not.exist');

    cy.contains('button', 'Leave Group').click();
    cy.wait('@leaveGroup');
    cy.url().should('include', '/games');
  });

  it('Shows deleted-group state after user was already in the group', () => {
    visitGroup({
      body: memberGroupBody,
      alias: 'getMemberGroupDeleted',
      username: 'owner',
      socketAck: { ok: true, history: [] },
    });

    cy.contains('button', 'Leave Group').should('be.visible');
    cy.get('.view-group-card').contains('h2', 'Group Chat').should('be.visible');

    cy.intercept('GET', `**/api/groups/id/${groupId}`, {
      statusCode: 404,
      body: { message: 'Group is no longer available' },
    }).as('getDeletedGroup');

    cy.reload();
    cy.wait('@getDeletedGroup');
    cy.wait(500);

    cy.get('.error').should('contain', 'Group is no longer available');
    cy.get('.view-group-card').should('not.exist');
    cy.contains('button', 'Leave Group').should('not.exist');
  });

  it('Covers owner controls for remove member and request review', () => {
    const afterRemove = {
      ...ownerGroupBody,
      members: [{ _id: ownerId, username: 'owner' }],
    };
    const afterApprove = {
      ...ownerGroupBody,
      pendingMembers: [],
      members: [...ownerGroupBody.members, { _id: requesterId, username: 'requester' }],
    };

    cy.intercept('POST', `**/api/groups/remove-member/${groupId}/**`, { statusCode: 200, body: { group: afterRemove } }).as('removeMember');
    cy.intercept('POST', `**/api/groups/review-request/${groupId}/**`, { statusCode: 200, body: { group: afterApprove } }).as('approveRequest');

    visitGroup({
      body: ownerGroupBody,
      alias: 'getOwnerGroup',
      username: 'owner',
      socketAck: { ok: true, history: [] },
    });

    cy.contains('.view-group-member-row', 'owner').contains('.view-group-owner-badge', 'Group Owner').should('exist');
    cy.contains('.view-group-member-row', 'member').find('.view-group-remove-member-btn').should('be.visible').click();
    cy.wait('@removeMember');
    cy.contains('.view-group-member-row', 'member').should('not.exist');

    visitGroup({
      body: ownerGroupBody,
      alias: 'getOwnerGroupAgain',
      username: 'owner',
      socketAck: { ok: true, history: [] },
    });

    cy.contains('.view-group-member-row', 'requester').contains('.view-group-owner-badge', 'Pending').should('exist');
    cy.contains('.view-group-member-row', 'requester').find('.view-group-approve-member-btn').click();
    cy.wait('@approveRequest');
    cy.contains('.view-group-member-row.pending', 'requester').should('not.exist');
  });
});