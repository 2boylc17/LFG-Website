describe('view_group_page', () => {
  const groupId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    cy.intercept('GET', `**/api/groups/id/${groupId}`, {
      statusCode: 200,
      body: {
        _id: groupId,
        name: 'Test Group',
        description: 'A group for testing',
        platform: 'PC',
        experience: 'No Experience Required',
        microphone: 'No Mic',
        region: 'North America',
        joinRequirement: 'auto',
        members: [{ _id: '507f1f77bcf86cd799439021', username: 'alice' }],
        pendingMembers: [],
        owner: { _id: '507f1f77bcf86cd799439021', username: 'alice' },
        tags: [],
        createdAt: new Date().toISOString(),
        game: { name: 'Test Game', image: null },
      },
    }).as('getGroup');

    cy.visit(`http://localhost:3000/group/${groupId}`);
    cy.clearCookies();
  });

  it('All Fields Render', () => {
    cy.wait('@getGroup');
    cy.wait(500);

    cy.get('.view-group-page').should('be.visible');
    cy.get('.view-group-card').should('be.visible');
    cy.get('h1').should('contain', 'Test Group');
  });

  it('Group details display correctly', () => {
    cy.wait('@getGroup');
    cy.wait(500);

    cy.get('h1').should('contain', 'Test Group');
    cy.contains('p', 'A group for testing').should('be.visible');
  });

  it('Shows join button for non-member', () => {
    cy.wait('@getGroup');
    cy.wait(500);

    cy.contains('button', 'Join').should('be.visible');
  });

  it('Shows error for invalid group id', () => {
    cy.intercept('GET', '**/api/groups/id/invalid-id', {
      statusCode: 404,
      body: { message: 'Group not found' },
    }).as('getGroupError');

    cy.visit('http://localhost:3000/group/invalid-id');
    cy.wait('@getGroupError');
    cy.wait(500);

    cy.get('.error').should('be.visible');
  });
});
