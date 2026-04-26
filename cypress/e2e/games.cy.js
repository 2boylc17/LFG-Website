describe('games_page', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/games');
    cy.clearCookies();
  });

  it('shows game page fields', () => {
    cy.wait(500);

    cy.get('h1').should('contain', 'Games');
    cy.get('.games-search-input').should('be.visible');
    cy.get('.games-list').should('be.visible');
    cy.get('#page-size').should('be.visible').and('have.value', '6');
    cy.get('#games-tag-filter').should('be.visible');
    cy.get('#games-sort-order').should('be.visible').and('have.value', 'name-asc');
    cy.get('.games-list').should('exist');
  });

  it('changes number of games per page', () => {
    cy.wait(500);
    
    cy.get('#page-size').select('6').should('have.value', '6');
    cy.get('.game-card').its('length').should('be.lte', 6);
    
    cy.get('button.pg-prev').should('be.visible').and('be.disabled');
    cy.get('button.pg-next').should('be.visible').and('not.be.disabled').click();
    
    cy.get('.games-pagination-info').invoke('text').should('match', /^Page 2 of \d+$/);
    cy.get('button.pg-prev').should('be.visible').and('not.be.disabled').click();
    
    cy.get('.games-pagination-info').invoke('text').should('match', /^Page 1 of \d+$/);
    cy.get('button.pg-prev').should('be.disabled');
  });

  it('searches for a game', () => {
    cy.wait(500);

    cy.get('.games-search-input').should('be.visible').type('a');
    cy.get('.games-search-clear').should('be.visible');
    cy.get('.games-list').should('be.visible');
    cy.get('.game-card').its('length').should('be.gte', 1);

    cy.get('.games-search-input').clear().type('nonexistentgame');
    cy.get('.games-list').should('be.visible');
    cy.contains('.games-list p', 'No games match your search.').should('be.visible');
    cy.get('.games-search-clear').should('be.visible').click();
    cy.get('.games-search-input').should('have.value', '');
    cy.get('.games-search-clear').should('not.exist');
  });

  it('filters by tag', () => {
    cy.wait(500);

    cy.get('#games-tag-filter').should('be.visible');
    cy.get('#games-tag-filter option').its('length').then((initialCount) => {
      expect(initialCount).to.be.gte(1);
    });

    cy.get('#games-tag-search').should('be.visible').type('zzzzzzzzzz').should('have.value', 'zzzzzzzzzz');
    cy.get('#games-tag-filter option').its('length').should('eq', 1);

    cy.get('#games-tag-search').clear().should('have.value', '');
    cy.get('#games-tag-filter option').its('length').should('be.gte', 1);

    cy.get('#games-tag-search').type('a');
    cy.get('#games-tag-filter option').its('length').should('be.gte', 1);
    cy.get('#games-tag-filter option').eq(0).should('have.value', '');

    cy.get('#games-tag-filter').select('').should('have.value', '');
    cy.get('#games-tag-filter option').its('length').should('be.gte', 1);
    cy.get('#games-tag-search').clear().should('have.value', '');
    
  });

  it('changes sort order', () => {
    cy.wait(500);

    cy.get('#games-sort-order').should('be.visible').and('have.value', 'name-asc');
    cy.get('.game-card').should('have.length.gte', 1);
    cy.get('.game-card h2').then(($titles) => {
      const titles = $titles.map((i, el) => Cypress.$(el).text()).get();
      const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b));
      expect(titles).to.deep.equal(sortedTitles);
    });

    cy.get('#games-sort-order').select('name-desc').should('have.value', 'name-desc');
    cy.get('.game-card h2').then(($titles) => {
      const titles = $titles.map((i, el) => Cypress.$(el).text()).get();
      const sortedTitles = [...titles].sort((a, b) => b.localeCompare(a));
      expect(titles).to.deep.equal(sortedTitles);
    });

  });

  it('shows api error', () => {
    cy.intercept('GET', '**/api/games/list', { statusCode: 500 });
    cy.visit('/games');
    cy.wait(500);
    cy.contains('.error', 'Failed to load games').should('be.visible');
  });

  it('opens game page on click', () => {
    cy.wait(500);

    cy.get('.game-card').its('length').should('be.gte', 1);
    cy.get('.game-card .game-body').first().click();
    cy.url().should('match', /\/games\/.+/);
  });

});