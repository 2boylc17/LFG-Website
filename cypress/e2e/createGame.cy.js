describe('create_game_page', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/api/games/add', {
      statusCode: 200,
      body: { message: 'Game added successfully' },
    }).as('addGameRequest');

    cy.visit('http://localhost:3000/createGame');
    cy.clearCookies();
  });

  it('All Fields Render', () => {
    cy.wait(500);

    cy.get('h2').should('contain', 'Create a New Game');
    cy.get('input[type="text"]').should('have.length.at.least', 2);
    cy.get('input[type="file"]').should('exist');
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Add Game');
  });

  it('Shows error for empty game name', () => {
    cy.wait(500);

    cy.get('button[type="submit"]').click();
    cy.contains('p', 'Error: Game name cannot be empty').should('be.visible');
  });

  it('Shows error when genre or platform is empty', () => {
    cy.wait(500);

    cy.get('input[type="text"]').eq(0).type('Test Game');
    cy.get('button[type="submit"]').click();
    cy.contains('p', 'Error: Genre and platform cannot be empty').should('be.visible');
  });

  it('Successful game creation shows success message', () => {
    cy.wait(500);

    cy.get('input[type="text"]').eq(0).type('Test Game');
    cy.get('input[type="text"]').eq(1).type('Action, RPG');
    cy.get('input[type="text"]').eq(2).type('PC, PlayStation');
    cy.get('button[type="submit"]').click();
    cy.wait('@addGameRequest').its('response.statusCode').should('eq', 200);
    cy.contains('p', 'Game added successfully').should('be.visible');
  });

  it('Failed game creation shows error message', () => {
    cy.intercept('POST', '**/api/games/add', {
      statusCode: 400,
      body: { error: 'Game already exists' },
    }).as('addGameRequest');
    cy.wait(500);

    cy.get('input[type="text"]').eq(0).type('Duplicate Game');
    cy.get('input[type="text"]').eq(1).type('Action');
    cy.get('input[type="text"]').eq(2).type('PC');
    cy.get('button[type="submit"]').click();
    cy.wait('@addGameRequest');
    cy.contains('p', 'Error: Game already exists').should('be.visible');
  });
});
