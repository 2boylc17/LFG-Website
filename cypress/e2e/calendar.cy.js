describe('calendar_page', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/calendar', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('lfg-calendar-events');
      },
    });
    cy.clearCookies();
  });

  it('shows page and navigates months', () => {
    cy.wait(500);
    cy.get('.calendar-page').should('be.visible');
    cy.get('.calendar-grid').should('be.visible');
    cy.get('.calendar-nav-btn').should('have.length', 2);
    cy.get('.calendar-today-btn').should('be.visible').and('contain', 'Today');
    cy.get('h1').should('be.visible');
    cy.get('.calendar-weekday').should('have.length', 7);
    const currentMonth = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    cy.contains('.calendar-nav-btn', 'Next').click();
    cy.get('h1').should('not.contain', currentMonth);
    cy.contains('.calendar-nav-btn', 'Prev').click();
    cy.get('h1').should('contain', currentMonth);
    cy.contains('.calendar-nav-btn', 'Next').click();
    cy.contains('.calendar-nav-btn', 'Next').click();
    cy.get('.calendar-today-btn').click();
    cy.get('h1').should('contain', currentMonth);
    cy.get('.calendar-jump-group select').eq(0).select('0');
    cy.get('h1').should('contain', 'January');
    cy.get('.calendar-jump-group select').eq(1).select('2030');
    cy.get('h1').should('contain', '2030');
  });

  it('adds, edits, sorts, and removes events', () => {
    cy.wait(500);
    cy.get('.calendar-event-title-input').type('event-late', { delay: 0 });
    cy.get('.calendar-event-time-input').type('15:00', { delay: 0 });
    cy.get('.calendar-submit-btn').click();
    cy.get('.calendar-event-title-input').type('event-early', { delay: 0 });
    cy.get('.calendar-event-time-input').type('09:00', { delay: 0 });
    cy.get('.calendar-submit-btn').click();
    cy.get('.calendar-event-item').should('have.length', 2);
    cy.get('.calendar-event-item').first().should('contain', 'event-early');
    cy.get('.calendar-event-item').last().should('contain', 'event-late');
    cy.get('.calendar-event-title-input').type('event-notime', { delay: 0 });
    cy.get('.calendar-submit-btn').click();
    cy.contains('.calendar-event-item', 'event-notime').find('p').should('contain', 'Any time');
    cy.contains('.calendar-event-item', 'event-notime').find('.calendar-event-actions button').contains('Edit').click();
    cy.get('.calendar-submit-btn').should('contain', 'Save Event');
    cy.get('.calendar-event-title-input').clear().type('event-edited', { delay: 0 });
    cy.get('.calendar-event-time-input').clear().type('11:15', { delay: 0 });
    cy.get('.calendar-submit-btn').click();
    cy.contains('.calendar-event-item strong', 'event-edited').should('exist');
    cy.contains('.calendar-event-item', 'event-edited').find('.calendar-event-actions button').contains('Edit').click();
    cy.get('.calendar-cancel-btn').click();
    cy.get('.calendar-submit-btn').should('contain', 'Add Event');
    cy.get('.calendar-event-title-input').should('have.value', '');
    cy.contains('.calendar-event-item', 'event-early').find('.calendar-event-actions button').contains('Remove').click();
    cy.contains('.calendar-event-item', 'event-early').should('not.exist');
    cy.get('.calendar-event-item').should('have.length', 2);
  });

  it('keeps events after reload', () => {
    cy.wait(500);
    cy.get('.calendar-event-title-input').type('event-persist', { delay: 0 });
    cy.get('.calendar-event-time-input').type('08:45', { delay: 0 });
    cy.get('.calendar-submit-btn').click();
    cy.reload();
    cy.wait(500);
    cy.get('.calendar-event-item strong').should('contain', 'event-persist');
    cy.get('.calendar-event-item p').should('contain', '08:45');
  });
});
