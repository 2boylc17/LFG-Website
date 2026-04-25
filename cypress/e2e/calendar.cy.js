describe('calendar_page', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/calendar');
    cy.clearCookies();
  });

  it('All Fields Render', () => {
    cy.wait(500);

    cy.get('.calendar-page').should('be.visible');
    cy.get('.calendar-grid').should('be.visible');
    cy.get('.calendar-nav-btn').should('have.length', 2);
    cy.get('.calendar-today-btn').should('be.visible').and('contain', 'Today');
    cy.get('h1').should('be.visible');
    cy.get('.calendar-weekday').should('have.length', 7);
  });

  it('Navigate to next month changes the displayed month', () => {
    cy.wait(500);

    cy.get('h1').invoke('text').then((initialMonth) => {
      cy.contains('.calendar-nav-btn', 'Next').click();
      cy.get('h1').invoke('text').should('not.eq', initialMonth);
    });
  });

  it('Navigate to previous month changes the displayed month', () => {
    cy.wait(500);

    cy.get('h1').invoke('text').then((initialMonth) => {
      cy.contains('.calendar-nav-btn', 'Prev').click();
      cy.get('h1').invoke('text').should('not.eq', initialMonth);
    });
  });

  it('Today button resets to current month', () => {
    cy.wait(500);

    cy.get('h1').invoke('text').then((todayMonth) => {
      cy.contains('.calendar-nav-btn', 'Next').click();
      cy.contains('.calendar-nav-btn', 'Next').click();
      cy.get('h1').invoke('text').should('not.eq', todayMonth);
      cy.get('.calendar-today-btn').click();
      cy.get('h1').invoke('text').should('eq', todayMonth);
    });
  });
});
