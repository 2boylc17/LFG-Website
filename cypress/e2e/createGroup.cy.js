describe('create_group_page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/games/list', {
      statusCode: 200,
      body: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Test Game',
          platforms: [{ name: 'PC' }, { name: 'PlayStation' }],
          genres: [{ name: 'Action' }],
        },
      ],
    }).as('getGames');

    cy.intercept('POST', '**/api/groups/add/**', {
      statusCode: 200,
      body: { groupId: '507f1f77bcf86cd799439012' },
    }).as('addGroupRequest');

    cy.visit('http://localhost:3000/createGroup/test-game');
    cy.clearCookies();
  });

  it('All Fields Render', () => {
    cy.wait('@getGames');
    cy.wait(500);

    cy.get('h2').should('contain', 'Create a New Group');
    cy.get('.create-group-game').should('contain', 'Test Game');
  });

  it('Shows game not found error when game is missing from list', () => {
    cy.intercept('GET', '**/api/games/list', {
      statusCode: 200,
      body: [],
    }).as('getGames');
    cy.wait(500);

    cy.wait('@getGames');
    cy.get('.error').should('contain', 'Game not found');
  });

  it('Shows API fetch error when games list fails to load', () => {
    cy.intercept('GET', '**/api/games/list', {
      statusCode: 500,
      body: { message: 'Internal server error' },
    }).as('getGames');
    cy.wait(500);

    cy.wait('@getGames');
    cy.get('.error').should('be.visible');
  });

  it('Shows API error on failed group creation', () => {
    cy.intercept('POST', '**/api/groups/add/**', {
      statusCode: 400,
      body: { message: 'Not logged in' },
    }).as('addGroupRequest');

    cy.wait('@getGames');
    cy.wait(500);

    cy.get('.create-group-field').eq(0).find('input').type('My Group');
    cy.get('.create-group-field').eq(1).find('input').type('A test group description');
    cy.get('.create-group-field').eq(3).find('select').select('PC');
    cy.get('.create-group-field').eq(4).find('select').select('No Experience Required');
    cy.get('.create-group-field').eq(5).find('select').select('No Mic');
    cy.get('.create-group-field').eq(6).find('select').select('North America');
    cy.get('button[type="submit"]').click();
    cy.wait('@addGroupRequest');
    cy.contains('.error', 'Not logged in').should('be.visible');
  });
});
