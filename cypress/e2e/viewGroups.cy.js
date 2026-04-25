describe('view_groups_page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/groups/list/**', {
      statusCode: 200,
      body: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'group1',
          description: 'Casual play',
          platform: 'PC',
          experience: 'No Experience Required',
          microphone: 'No Mic',
          region: 'North America',
          tags: ['Friendly'],
          members: [{ username: 'user1' }],
          createdAt: '2020-01-01T00:00:00.000Z',
        },
        {
          _id: '507f1f77bcf86cd799439012',
          name: 'group2',
          description: 'Competitive play',
          platform: 'PlayStation',
          experience: 'Experienced Players Only',
          microphone: 'Mic Required',
          region: 'Europe',
          tags: ['Competitive'],
          members: [{ username: 'user2' }, { username: 'user3' }],
          createdAt: new Date().toISOString(),
        },
      ],
    }).as('getGroups');

    cy.visit('http://localhost:3000/games/game1');
    cy.clearCookies();
  });

  it('All Fields Render', () => {
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('.page').should('be.visible');
    cy.get('h1').should('contain', 'game1 Groups');
    cy.get('.games-search-input').should('be.visible');
    cy.get('#groups-tag-filter').should('be.visible');
    cy.get('#groups-sort-order').should('be.visible');
    cy.get('.create-group-link').should('be.visible');
    cy.get('.game-card').should('have.length', 2);
  });

  it('Search filters groups by name', () => {
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('.games-search-input').type('group1');
    cy.wait(300);
    cy.get('.game-card').should('have.length', 1);
    cy.get('.game-card').should('contain', 'group1');
  });

  it('Filter by tag filters groups', () => {
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('#groups-tag-filter').select('Europe');
    cy.get('.game-card').should('have.length', 1);
    cy.get('.game-card').should('contain', 'group2');
  });

  it('Sort order changes group ordering', () => {
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('#groups-sort-order').select('name-asc');
    cy.get('.game-card').first().should('contain', 'group1');
    cy.get('#groups-sort-order').select('name-desc');
    cy.get('.game-card').first().should('contain', 'group2');
  });

  it('Shows error when groups API fails', () => {
    cy.intercept('GET', '**/api/groups/list/**', {
      statusCode: 500,
      body: { message: 'Failed to load groups' },
    }).as('getGroups');

    cy.visit('http://localhost:3000/games/game1');
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

  it('Shows no groups found when API returns an empty list', () => {
    cy.intercept('GET', '**/api/groups/list/**', {
      statusCode: 200,
      body: [],
    }).as('getGroups');

    cy.visit('http://localhost:3000/games/game1');
    cy.wait('@getGroups');
    cy.wait(500);

    cy.contains('p', 'No groups found.').should('be.visible');
  });

  it('Shows no groups match message for unmatched search', () => {
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('.games-search-input').type('missing-group');
    cy.wait(300);
    cy.contains('p', 'No groups match your search.').should('be.visible');
  });

  it('Clear search button resets the list', () => {
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('.games-search-input').type('group1');
    cy.wait(300);
    cy.get('.game-card').should('have.length', 1);
    cy.get('.games-search-clear').click();
    cy.wait(300);
    cy.get('.games-search-input').should('have.value', '');
    cy.get('.game-card').should('have.length', 2);
  });

  it('Create group link points to the selected game slug', () => {
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('.create-group-link').should('have.attr', 'href', '/createGroup/game1');
  });

  it('Shows server message when group list request fails', () => {
    cy.intercept('GET', '**/api/groups/list/**', {
      statusCode: 500,
      body: { message: 'Server unavailable' },
    }).as('getGroups');

    cy.visit('http://localhost:3000/games/game1');
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('.error').should('contain', 'Server unavailable');
  });

  it('Pagination controls move between pages', () => {
    cy.intercept('GET', '**/api/groups/list/**', {
      statusCode: 200,
      body: [
        { _id: '507f1f77bcf86cd799439021', name: 'group1', description: 'desc', platform: 'PC', experience: 'No Experience Required', microphone: 'No Mic', region: 'North America', tags: [], members: [] },
        { _id: '507f1f77bcf86cd799439022', name: 'group2', description: 'desc', platform: 'PC', experience: 'No Experience Required', microphone: 'No Mic', region: 'North America', tags: [], members: [] },
        { _id: '507f1f77bcf86cd799439023', name: 'group3', description: 'desc', platform: 'PC', experience: 'No Experience Required', microphone: 'No Mic', region: 'North America', tags: [], members: [] },
        { _id: '507f1f77bcf86cd799439024', name: 'group4', description: 'desc', platform: 'PC', experience: 'No Experience Required', microphone: 'No Mic', region: 'North America', tags: [], members: [] },
        { _id: '507f1f77bcf86cd799439025', name: 'group5', description: 'desc', platform: 'PC', experience: 'No Experience Required', microphone: 'No Mic', region: 'North America', tags: [], members: [] },
        { _id: '507f1f77bcf86cd799439026', name: 'group6', description: 'desc', platform: 'PC', experience: 'No Experience Required', microphone: 'No Mic', region: 'North America', tags: [], members: [] },
        { _id: '507f1f77bcf86cd799439027', name: 'group7', description: 'desc', platform: 'PC', experience: 'No Experience Required', microphone: 'No Mic', region: 'North America', tags: [], members: [] },
      ],
    }).as('getGroups');

    cy.visit('http://localhost:3000/games/game1');
    cy.wait('@getGroups');
    cy.wait(500);

    cy.get('.games-pagination-info').should('contain', 'Page 1 of 2');
    cy.get('.pg-prev').should('be.disabled');
    cy.get('.pg-next').should('not.be.disabled').click();
    cy.get('.games-pagination-info').should('contain', 'Page 2 of 2');
    cy.get('.pg-next').should('be.disabled');
    cy.get('.pg-prev').should('not.be.disabled').click();
    cy.get('.games-pagination-info').should('contain', 'Page 1 of 2');
  });
});
