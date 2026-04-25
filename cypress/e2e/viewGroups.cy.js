describe('view_groups_page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/groups/list/**', {
      statusCode: 200,
      body: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Alpha Squad',
          description: 'Casual play',
          platform: 'PC',
          experience: 'No Experience Required',
          microphone: 'No Mic',
          region: 'North America',
          tags: ['Friendly'],
          members: [{ username: 'alice' }],
          createdAt: new Date(Date.now() - 1000).toISOString(),
        },
        {
          _id: '507f1f77bcf86cd799439012',
          name: 'Beta Team',
          description: 'Competitive play',
          platform: 'PlayStation',
          experience: 'Experienced Players Only',
          microphone: 'Mic Required',
          region: 'Europe',
          tags: ['Competitive'],
          members: [{ username: 'bob' }, { username: 'carol' }],
          createdAt: new Date().toISOString(),
        },
      ],
    }).as('getGroups');

    cy.visit('http://localhost:3000/games/test-game');
    cy.clearCookies();
  });

  it('All Fields Render', () => {
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('.page').should('be.visible');
    cy.get('h1').should('contain', 'test game Groups');
    cy.get('.games-search-input').should('be.visible');
    cy.get('#groups-tag-filter').should('be.visible');
    cy.get('#groups-sort-order').should('be.visible');
    cy.get('.create-group-link').should('be.visible');
    cy.get('.game-card').should('have.length', 2);
  });

  it('Search filters groups by name', () => {
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('.games-search-input').type('Alpha');
    cy.wait(300);
    cy.get('.game-card').should('have.length', 1);
    cy.get('.game-card').should('contain', 'Alpha Squad');
  });

  it('Filter by tag filters groups', () => {
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('#groups-tag-filter').select('Europe');
    cy.get('.game-card').should('have.length', 1);
    cy.get('.game-card').should('contain', 'Beta Team');
  });

  it('Sort order changes group ordering', () => {
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('#groups-sort-order').select('name-asc');
    cy.get('.game-card').first().should('contain', 'Alpha Squad');
    cy.get('#groups-sort-order').select('name-desc');
    cy.get('.game-card').first().should('contain', 'Beta Team');
  });

  it('Shows error when groups API fails', () => {
    cy.intercept('GET', '**/api/groups/list/**', {
      statusCode: 500,
      body: { message: 'Failed to load groups' },
    }).as('getGroups');

    cy.visit('http://localhost:3000/games/test-game');
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('.error').should('be.visible');
  });

  it('Clicking Join Group navigates to the group page', () => {
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('.game-card').first().find('.view-group-link').click();
    cy.url().should('include', '/group/');
  });
});
