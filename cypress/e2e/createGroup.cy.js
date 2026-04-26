describe('create_group_page', () => {
  const gameBody = [{ _id: '507f1f77bcf86cd799439011', name: 'game1', platforms: [{ name: 'PC' }, { name: 'PlayStation' }], genres: [{ name: 'Action' }] }];

  function visitCreateGroup() {
    cy.intercept('GET', '**/api/games/list', { statusCode: 200, body: gameBody }).as('getGames');
    cy.visit('http://localhost:3000/createGroup/game1');
    cy.clearCookies();
  }

  function fillForm(name, desc) {
    cy.get('.create-group-field').eq(0).find('input').type(name);
    cy.get('.create-group-field').eq(1).find('input').type(desc);
    cy.get('.create-group-field').eq(3).find('select').select('PC');
    cy.get('.create-group-field').eq(4).find('select').select('No Experience Required');
    cy.get('.create-group-field').eq(5).find('select').select('No Mic');
    cy.get('.create-group-field').eq(6).find('select').select('North America');
  }

  it('Renders and shows error states', () => {
    visitCreateGroup();
    cy.wait('@getGames');
    cy.wait(500);
    cy.get('h2').should('contain', 'Create a New Group');
    cy.get('.create-group-game').should('contain', 'game1');
    cy.intercept('GET', '**/api/games/list', { statusCode: 200, body: [] }).as('getGamesEmpty');
    cy.visit('http://localhost:3000/createGroup/game1');
    cy.wait('@getGamesEmpty');
    cy.wait(500);
    cy.get('.error').should('contain', 'Game not found');
    cy.intercept('GET', '**/api/games/list', { statusCode: 500, body: { message: 'Server error' } }).as('getGamesFail');
    cy.visit('http://localhost:3000/createGroup/game1');
    cy.wait('@getGamesFail');
    cy.wait(500);
    cy.get('.error').should('be.visible');
  });

  it('Tag management: add, remove, and deduplication', () => {
    visitCreateGroup();
    cy.wait('@getGames');
    cy.wait(500);
    cy.get('.create-group-tag-input-row input').type('tag1');
    cy.get('.create-group-tag-add').click();
    cy.get('.create-group-tag-chip').should('have.length', 1).and('contain', 'tag1');
    cy.get('.create-group-tag-input-row input').type('tag1');
    cy.get('.create-group-tag-add').click();
    cy.get('.create-group-tag-chip').should('have.length', 1);
    cy.get('.create-group-tag-chip').click();
    cy.contains('.create-group-tag-empty', 'No tags added.').should('be.visible');
  });

  it('Form submission: password validation, API error, success, and payload', () => {
    visitCreateGroup();
    cy.wait('@getGames');
    cy.wait(500);
    cy.get('.create-group-field').eq(0).find('input').type('group2');
    cy.get('.create-group-field').eq(1).find('input').type('text2');
    cy.get('.create-group-field').eq(2).find('select').select('Password Protected');
    cy.get('input[name="group-create-password"]').type('   ');
    cy.get('.create-group-field').eq(4).find('select').select('PC');
    cy.get('.create-group-field').eq(5).find('select').select('No Experience Required');
    cy.get('.create-group-field').eq(6).find('select').select('No Mic');
    cy.get('.create-group-field').eq(7).find('select').select('North America');
    cy.get('button[type="submit"]').click();
    cy.contains('.create-group-message', 'Error: Set a group password for Password Protected join.').should('be.visible');
    cy.intercept('POST', '**/api/groups/add/**', { statusCode: 400, body: { message: 'Not logged in' } }).as('addGroupFail');
    visitCreateGroup();
    cy.wait('@getGames');
    cy.wait(500);
    fillForm('group1', 'text1');
    cy.get('button[type="submit"]').click();
    cy.wait('@addGroupFail');
    cy.contains('.create-group-message', 'Error: Not logged in').should('be.visible');
    cy.intercept('POST', '**/api/groups/add/**', { statusCode: 200, body: { groupId: '507f1f77bcf86cd799439012' } }).as('addGroupSuccess');
    visitCreateGroup();
    cy.wait('@getGames');
    cy.wait(500);
    fillForm('group3', 'text3');
    cy.get('.create-group-tag-input-row input').type('tag3');
    cy.get('.create-group-tag-add').click();
    cy.get('button[type="submit"]').click();
    cy.wait('@addGroupSuccess').its('request.body').should('deep.equal', {
      name: 'group3', description: 'text3', gameName: 'game1', platform: 'PC',
      experience: 'No Experience Required', microphone: 'No Mic', region: 'North America',
      joinRequirement: 'auto', joinPassword: '', tags: ['tag3'],
    });
    cy.url().should('include', '/group/507f1f77bcf86cd799439012');
  });
});

