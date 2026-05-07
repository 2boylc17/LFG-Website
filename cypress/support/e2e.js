// Enable code coverage collection during tests
import '@cypress/code-coverage/support'

// Suppress the cookie consent banner in all tests by default.
// Tests in cookieConsent.cy.js clear this explicitly to test the banner itself.
beforeEach(() => {
    cy.window().then((win) => {
        win.localStorage.setItem('cookie-consent', 'necessary');
    });
});