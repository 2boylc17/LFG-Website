describe('view_groups_page', () => {
  const groupBase = { platform: 'PC', experience: 'No Experience Required', microphone: 'No Mic', region: 'North America', tags: [], members: [] };
  const twoGroups = [
    { _id: '507f1f77bcf86cd799439011', name: 'group1', description: 'desc1', platform: 'PC', experience: 'No Experience Required', microphone: 'No Mic', region: 'North America', tags: ['Friendly'], members: [{ username: 'user1' }], createdAt: '2020-01-01T00:00:00.000Z' },
    { _id: '507f1f77bcf86cd799439012', name: 'group2', description: 'desc2', platform: 'PlayStation', experience: 'Experienced Players Only', microphone: 'Mic Required', region: 'Europe', tags: ['Competitive'], members: [{ username: 'user2' }, { username: 'user3' }], createdAt: new Date().toISOString() },
  ];

  function visitGroups(body = twoGroups) {
    cy.intercept('GET', '**/api/groups/list/**', { statusCode: 200, body }).as('getGroups');
    cy.visit('http://localhost:3000/games/game1');
    cy.clearCookies();
  }

  it('Renders, searches, filters, sorts, navigates, and shows create link', () => {
    visitGroups();
    cy.wait('@getGroups');
    cy.wait(500);
    cy.get('.page').should('be.visible');
    cy.get('h1').should('contain', 'game1 Groups');
    cy.get('.games-search-input').should('be.visible');
    cy.get('#groups-tag-filter').should('be.visible');
    cy.get('#groups-sort-order').should('be.visible');
    cy.get('.create-group-link').should('be.visible').and('have.attr', 'href', '/createGroup/game1');
    cy.get('.game-card').should('have.length', 2);
    cy.get('.games-search-input').type('group1');
    cy.wait(300);
    cy.get('.game-card').should('have.length', 1).and('contain', 'group1');
    cy.get('.games-search-clear').click();
    cy.wait(300);
    cy.get('.game-card').should('have.length', 2);
    cy.get('#groups-tag-filter').select('Europe');
    cy.get('.game-card').should('have.length', 1).and('contain', 'group2');
    cy.get('#groups-tag-filter').select('');
    cy.get('#groups-sort-order').select('name-asc');
    cy.get('.game-card').first().should('contain', 'group1');
    cy.get('#groups-sort-order').select('name-desc');
    cy.get('.game-card').first().should('contain', 'group2');
    cy.get('.game-card').first().find('.view-group-link').click();
    cy.url().should('include', '/group/');
  });

  it('Error and empty states, and unmatched search', () => {
    visitGroups([]);
    cy.wait('@getGroups');
    cy.wait(500);
    cy.contains('p', 'No groups found.').should('be.visible');
    cy.intercept('GET', '**/api/groups/list/**', { statusCode: 500, body: { message: 'Server unavailable' } }).as('getGroupsError');
    cy.visit('http://localhost:3000/games/game1');
    cy.wait('@getGroupsError');
    cy.wait(500);
    cy.get('.error').should('contain', 'Server unavailable');
    visitGroups();
    cy.wait('@getGroups');
    cy.wait(500);
    cy.get('.games-search-input').type('missing-group');
    cy.wait(300);
    cy.contains('p', 'No groups match your search.').should('be.visible');
  });

  it('Pagination controls move between pages', () => {
    const manyGroups = Array.from({ length: 7 }, (_, i) => ({ _id: `507f1f77bcf86cd79943902${i + 1}`, name: `group${i + 1}`, description: 'desc', ...groupBase }));
    visitGroups(manyGroups);
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
