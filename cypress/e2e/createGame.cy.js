describe('create_game_page', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/api/games/add', {
      statusCode: 200,
      body: { message: 'Game added successfully' },
    }).as('addGameRequest');

    cy.visit('http://localhost:3000/createGame');
    cy.clearCookies();
  });

  it('shows create game fields', () => {
    cy.wait(500);

    cy.get('h2').should('contain', 'Create a New Game');
    cy.get('input[type="text"]').should('have.length.at.least', 2);
    cy.get('input[type="file"]').should('exist');
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Add Game');
  });

  it('shows error for empty game name', () => {
    cy.wait(500);

    cy.get('input[type="text"]').eq(0).type('   ');
    cy.get('input[type="text"]').eq(1).type('Action, RPG');
    cy.get('input[type="text"]').eq(2).type('PC, PlayStation');
    cy.get('button[type="submit"]').click();
    cy.contains('p', 'Error: Game name cannot be empty').should('be.visible');
  });

  it('shows error when genre or platform is empty', () => {
    cy.wait(500);

    cy.get('input[type="text"]').eq(0).type('game1');
    cy.get('input[type="text"]').eq(1).type('   ');
    cy.get('input[type="text"]').eq(2).type('   ');
    cy.get('button[type="submit"]').click();
    cy.contains('p', 'Error: Genre and platform cannot be empty').should('be.visible');
  });

  it('shows success after game creation', () => {
    cy.wait(500);

    cy.get('input[type="text"]').eq(0).type('game1');
    cy.get('input[type="text"]').eq(1).type('Action, RPG');
    cy.get('input[type="text"]').eq(2).type('PC, PlayStation');
    cy.get('button[type="submit"]').click();
    cy.wait('@addGameRequest');
    cy.contains('p', 'Game added successfully').should('be.visible');
  });

  it('shows failed game creation error', () => {
    cy.intercept('POST', '**/api/games/add', {
      statusCode: 400,
      body: { error: 'Game already exists' },
    }).as('addGameRequest');
    cy.wait(500);

    cy.get('input[type="text"]').eq(0).type('game2');
    cy.get('input[type="text"]').eq(1).type('Action');
    cy.get('input[type="text"]').eq(2).type('PC');
    cy.get('button[type="submit"]').click();
    cy.wait('@addGameRequest');
    cy.contains('p', 'Error: Game already exists').should('be.visible');
  });

  it('formats genres and platforms in request payload', () => {
    cy.wait(500);

    cy.get('input[type="text"]').eq(0).type('game3', { delay: 0 });
    cy.get('input[type="text"]').eq(1).type(' Action , RPG ,  ', { delay: 0 });
    cy.get('input[type="text"]').eq(2).type(' PC, PlayStation ', { delay: 0 });
    cy.get('button[type="submit"]').click();

    cy.wait('@addGameRequest').its('request.body').should('deep.equal', {
      name: 'game3',
      genres: [{ name: 'Action' }, { name: 'RPG' }],
      platforms: [{ name: 'PC' }, { name: 'PlayStation' }],
      image: null,
    });
  });

  it('shows error for invalid image file type', () => {
    cy.wait(500);

    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('plain text file'),
      fileName: 'file.txt',
      mimeType: 'text/plain',
      lastModified: Date.now(),
    }, { force: true });

    cy.contains('p', 'Please upload a valid image file.').should('be.visible');
    cy.get('input[type="file"]').should('have.value', '');
  });

  it('resets form after successful creation', () => {
    cy.wait(500);

    cy.get('input[type="text"]').eq(0).type('game4');
    cy.get('input[type="text"]').eq(1).type('Action, RPG');
    cy.get('input[type="text"]').eq(2).type('PC, PlayStation');
    cy.get('button[type="submit"]').click();
    cy.wait('@addGameRequest');

    cy.get('input[type="text"]').eq(0).should('have.value', '');
    cy.get('input[type="text"]').eq(1).should('have.value', '');
    cy.get('input[type="text"]').eq(2).should('have.value', '');
    cy.contains('p', 'Game added successfully').should('be.visible');
  });

  it('includes image data when an image is uploaded', () => {
    cy.wait(500);

    cy.get('input[type="text"]').eq(0).type('game5');
    cy.get('input[type="text"]').eq(1).type('Action');
    cy.get('input[type="text"]').eq(2).type('PC');
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFAAH/l8J3GQAAAABJRU5ErkJggg==', 'base64'),
      fileName: 'image.png',
      mimeType: 'image/png',
      lastModified: Date.now(),
    }, { force: true });
    cy.get('button[type="submit"]').click();

    cy.wait('@addGameRequest').its('request.body.image').should('include', 'data:image/png;base64,');
  });
});
