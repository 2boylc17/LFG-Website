describe('create_group_page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/games/list', {
      statusCode: 200,
      body: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'game1',
          platforms: [{ name: 'PC' }, { name: 'PlayStation' }],
          genres: [{ name: 'Action' }],
        },
      ],
    }).as('getGames');

    cy.intercept('POST', '**/api/groups/add/**', {
      statusCode: 200,
      body: { groupId: '507f1f77bcf86cd799439012' },
    }).as('addGroupRequest');

    cy.visit('http://localhost:3000/createGroup/game1');
    cy.clearCookies();
  });

  it('All Fields Render', () => {
    cy.wait('@getGames');
    cy.wait(500);

    cy.get('h2').should('contain', 'Create a New Group');
    cy.get('.create-group-game').should('contain', 'game1');
  });

  it('Shows game not found error when game is missing from list', () => {
    cy.intercept('GET', '**/api/games/list', {
      statusCode: 200,
      body: [],
    }).as('getGames');

    cy.visit('http://localhost:3000/createGroup/game1');

    cy.wait('@getGames');
    cy.wait(500);
    cy.get('.error').should('contain', 'Game not found');
  });

  it('Shows API fetch error when games list fails to load', () => {
    cy.intercept('GET', '**/api/games/list', {
      statusCode: 500,
      body: { message: 'Internal server error' },
    }).as('getGames');

    cy.visit('http://localhost:3000/createGroup/game1');

    cy.wait('@getGames');
    cy.wait(500);
    cy.get('.error').should('be.visible');
  });

  it('Shows API error on failed group creation', () => {
    cy.intercept('POST', '**/api/groups/add/**', {
      statusCode: 400,
      body: { message: 'Not logged in' },
    }).as('addGroupRequest');

    cy.wait('@getGames');
    cy.wait(500);

    cy.get('.create-group-field').eq(0).find('input').type('group1');
    cy.get('.create-group-field').eq(1).find('input').type('text1');
    cy.get('.create-group-field').eq(3).find('select').select('PC');
    cy.get('.create-group-field').eq(4).find('select').select('No Experience Required');
    cy.get('.create-group-field').eq(5).find('select').select('No Mic');
    cy.get('.create-group-field').eq(6).find('select').select('North America');
    cy.get('button[type="submit"]').click();
    cy.wait('@addGroupRequest');
    cy.contains('.create-group-message', 'Error: Not logged in').should('be.visible');
  });

  it('Successful group creation navigates to the new group page', () => {
    cy.wait('@getGames');
    cy.wait(500);

    cy.get('.create-group-field').eq(0).find('input').type('group1');
    cy.get('.create-group-field').eq(1).find('input').type('text1');
    cy.get('.create-group-field').eq(3).find('select').select('PC');
    cy.get('.create-group-field').eq(4).find('select').select('No Experience Required');
    cy.get('.create-group-field').eq(5).find('select').select('No Mic');
    cy.get('.create-group-field').eq(6).find('select').select('North America');
    cy.get('button[type="submit"]').click();

    cy.wait('@addGroupRequest');
    cy.url().should('include', '/group/507f1f77bcf86cd799439012');
  });

  it('Shows password requirement error for password-protected join', () => {
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
  });

  it('Adds and removes a custom tag', () => {
    cy.wait('@getGames');
    cy.wait(500);

    cy.get('.create-group-tag-input-row input').type('tag1');
    cy.get('.create-group-tag-add').click();
    cy.get('.create-group-tag-chip').should('have.length', 1).and('contain', 'tag1');

    cy.get('.create-group-tag-chip').click();
    cy.contains('.create-group-tag-empty', 'No tags added.').should('be.visible');
  });

  it('Does not add duplicate tags', () => {
    cy.wait('@getGames');
    cy.wait(500);

    cy.get('.create-group-tag-input-row input').type('tag2');
    cy.get('.create-group-tag-add').click();
    cy.get('.create-group-tag-input-row input').type('tag2');
    cy.get('.create-group-tag-add').click();

    cy.get('.create-group-tag-chip').should('have.length', 1).and('contain', 'tag2');
  });

  it('Sends trimmed values and selected tags in payload', () => {
    cy.wait('@getGames');
    cy.wait(500);

    cy.get('.create-group-field').eq(0).find('input').type('  group3  ');
    cy.get('.create-group-field').eq(1).find('input').type('  text3  ');
    cy.get('.create-group-field').eq(3).find('select').select('PC');
    cy.get('.create-group-field').eq(4).find('select').select('No Experience Required');
    cy.get('.create-group-field').eq(5).find('select').select('No Mic');
    cy.get('.create-group-field').eq(6).find('select').select('North America');
    cy.get('.create-group-tag-input-row input').type('tag3');
    cy.get('.create-group-tag-add').click();
    cy.get('button[type="submit"]').click();

    cy.wait('@addGroupRequest').its('request.body').should('deep.equal', {
      name: 'group3',
      description: 'text3',
      gameName: 'game1',
      platform: 'PC',
      experience: 'No Experience Required',
      microphone: 'No Mic',
      region: 'North America',
      joinRequirement: 'auto',
      joinPassword: '',
      tags: ['tag3'],
    });
  });
});
