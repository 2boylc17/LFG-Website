describe('calendar_page', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/calendar', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('lfg-calendar-events');
      },
    });
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

    const currentMonth = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    cy.contains('.calendar-nav-btn', 'Next').click();
    cy.get('h1').should('not.contain', currentMonth);
  });

  it('Navigate to previous month changes the displayed month', () => {
    cy.wait(500);

    const currentMonth = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    cy.contains('.calendar-nav-btn', 'Prev').click();
    cy.get('h1').should('not.contain', currentMonth);
  });

  it('Today button resets to current month', () => {
    cy.wait(500);

    const currentMonth = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    cy.contains('.calendar-nav-btn', 'Next').click();
    cy.contains('.calendar-nav-btn', 'Next').click();
    cy.get('h1').should('not.contain', currentMonth);
    cy.get('.calendar-today-btn').click();
    cy.get('h1').should('contain', currentMonth);
  });

  it('Selecting month and year updates the heading', () => {
    cy.wait(500);

    cy.get('.calendar-jump-group select').eq(0).select('0');
    cy.get('h1').should('contain', 'January');

    cy.get('.calendar-jump-group select').eq(1).select('2030');
    cy.get('h1').should('contain', '2030');
  });

  it('Adds an event with a time', () => {
    cy.wait(500);

    cy.get('.calendar-event-title-input').type('event1');
    cy.get('.calendar-event-time-input').type('09:30');
    cy.get('.calendar-submit-btn').click();

    cy.get('.calendar-event-item').should('have.length', 1);
    cy.get('.calendar-event-item strong').should('contain', 'event1');
    cy.get('.calendar-event-item p').should('contain', '09:30');
    cy.get('.calendar-day.selected .calendar-event-count').should('contain', '1 event');
  });

  it('Adds an event without a time and shows Any time', () => {
    cy.wait(500);

    cy.get('.calendar-event-title-input').type('event2');
    cy.get('.calendar-submit-btn').click();

    cy.get('.calendar-event-item strong').should('contain', 'event2');
    cy.get('.calendar-event-item p').should('contain', 'Any time');
  });

  it('Edits an event and saves the new values', () => {
    cy.wait(500);

    cy.get('.calendar-event-title-input').type('event3');
    cy.get('.calendar-event-time-input').type('10:00');
    cy.get('.calendar-submit-btn').click();

    cy.contains('.calendar-event-actions button', 'Edit').click();
    cy.get('.calendar-submit-btn').should('contain', 'Save Event');
    cy.get('.calendar-cancel-btn').should('be.visible');

    cy.get('.calendar-event-title-input').clear().type('event3-updated');
    cy.get('.calendar-event-time-input').clear().type('11:15');
    cy.get('.calendar-submit-btn').click();

    cy.get('.calendar-event-item strong').should('contain', 'event3-updated');
    cy.get('.calendar-event-item p').should('contain', '11:15');
    cy.get('.calendar-cancel-btn').should('not.exist');
  });

  it('Cancel edit resets the form back to add mode', () => {
    cy.wait(500);

    cy.get('.calendar-event-title-input').type('event4');
    cy.get('.calendar-submit-btn').click();

    cy.contains('.calendar-event-actions button', 'Edit').click();
    cy.get('.calendar-submit-btn').should('contain', 'Save Event');
    cy.get('.calendar-cancel-btn').click();

    cy.get('.calendar-submit-btn').should('contain', 'Add Event');
    cy.get('.calendar-event-title-input').should('have.value', '');
    cy.get('.calendar-event-time-input').should('have.value', '');
  });

  it('Removing the last event returns to empty state', () => {
    cy.wait(500);

    cy.get('.calendar-event-title-input').type('event5');
    cy.get('.calendar-submit-btn').click();
    cy.contains('.calendar-event-actions button', 'Remove').click();

    cy.contains('.calendar-event-list p', 'No events for this date yet.').should('be.visible');
    cy.get('.calendar-day.selected .calendar-event-count').should('not.exist');
  });

  it('Persists events after page reload', () => {
    cy.wait(500);

    cy.get('.calendar-event-title-input').type('event6');
    cy.get('.calendar-event-time-input').type('08:45');
    cy.get('.calendar-submit-btn').click();

    cy.reload();
    cy.wait(500);

    cy.get('.calendar-event-item strong').should('contain', 'event6');
    cy.get('.calendar-event-item p').should('contain', '08:45');
  });

  it('Sorts events by time when multiple events are added', () => {
    cy.wait(500);

    cy.get('.calendar-event-title-input').type('event7-late');
    cy.get('.calendar-event-time-input').type('15:00');
    cy.get('.calendar-submit-btn').click();

    cy.get('.calendar-event-title-input').type('event7-early');
    cy.get('.calendar-event-time-input').type('09:00');
    cy.get('.calendar-submit-btn').click();

    cy.get('.calendar-event-item').should('have.length', 2);
    cy.get('.calendar-event-item').first().should('contain', 'event7-early');
    cy.get('.calendar-event-item').last().should('contain', 'event7-late');
  });
});
