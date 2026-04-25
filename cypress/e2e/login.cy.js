describe('login_page', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: { message: 'Login successful', username: 'testuser' },
    }).as('loginRequest');

    cy.intercept('POST', '**/api/auth/register', {
      statusCode: 201,
      body: { message: 'User registered successfully', username: 'testuser' },
    }).as('registerRequest');

    cy.visit('http://localhost:3000/login');
    cy.clearCookies();
  });

  it('All Fields Render', () => {
    cy.wait(500);

    cy.get('h2').should('contain', 'Welcome Back');
    cy.get('.login-copy').should('be.visible');
    cy.get('input.login-input[type="text"]').should('be.visible');
    cy.get('input.login-input[type="password"]').should('be.visible');
    cy.get('button.login-submit').should('be.visible').and('contain', 'Login');
    cy.get('button.login-toggle').should('be.visible');
  });

  it('Toggle to register mode', () => {
    cy.wait(500);

    cy.get('button.login-toggle').click();
    cy.get('h2').should('contain', 'Create Account');
    cy.get('button.login-submit').should('contain', 'Register');
  });

  it('Shows required field error', () => {
    cy.wait(500);

    cy.get('button.login-submit').click();
    cy.contains('.login-error', 'Enter a username and password').should('be.visible');
  });

  it('Shows short password error in register mode', () => {
    cy.wait(500);

    cy.get('button.login-toggle').click();
    cy.get('input.login-input[type="text"]').type('testuser');
    cy.get('input.login-input[type="password"]').type('123');
    cy.get('button.login-submit').click();
    cy.contains('.login-error', 'Password must be at least 6 characters').should('be.visible');
  });

  it('Successful login navigates to home', () => {
    cy.wait(500);

    cy.get('input.login-input[type="text"]').type('testuser');
    cy.get('input.login-input[type="password"]').type('password123');
    cy.get('button.login-submit').click();
    cy.wait('@loginRequest').its('response.statusCode').should('eq', 200);
    cy.url().should('eq', 'http://localhost:3000/');
  });

  it('Failed login shows error message', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 400,
      body: { message: 'Invalid username or password' },
    }).as('loginRequest');
    cy.wait(500);

    cy.get('input.login-input[type="text"]').type('testuser');
    cy.get('input.login-input[type="password"]').type('wrongpassword');
    cy.get('button.login-submit').click();
    cy.wait('@loginRequest');
    cy.contains('.login-error', 'Invalid username or password').should('be.visible');
  });

  it('Successful registration navigates to home', () => {
    cy.wait(500);

    cy.get('button.login-toggle').click();
    cy.get('input.login-input[type="text"]').type('newuser');
    cy.get('input.login-input[type="password"]').type('password123');
    cy.get('button.login-submit').click();
    cy.wait('@registerRequest').its('response.statusCode').should('eq', 201);
    cy.url().should('eq', 'http://localhost:3000/');
  });

  it('Failed registration shows error message', () => {
    cy.intercept('POST', '**/api/auth/register', {
      statusCode: 400,
      body: { message: 'Username already exists' },
    }).as('registerRequest');
    cy.wait(500);

    cy.get('button.login-toggle').click();
    cy.get('input.login-input[type="text"]').type('existinguser');
    cy.get('input.login-input[type="password"]').type('password123');
    cy.get('button.login-submit').click();
    cy.wait('@registerRequest');
    cy.contains('.login-error', 'Username already exists').should('be.visible');
  });
});
