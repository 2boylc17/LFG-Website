# LFG-Website

## Cypress Coverage

Run your Cypress E2E tests with frontend code coverage instrumentation:

```bash
npm run coverage:run
```

This runs app-focused specs in `cypress/e2e/*.cy.js` (for example, `games.cy.js`) and excludes Cypress demo/example specs.

Run everything in one command (starts app server, waits for health check, runs Cypress, then stops server):

```bash
npm run coverage:run:with-server
```

Run coverage for page specs under `cypress/e2e/pages/*.cy.js`:

```bash
npm run coverage:pages:with-server
```

Plain Cypress runs now collect coverage for app specs by default.

1. Start the app server:

```bash
npm run dev
```

2. In another terminal, run Cypress:

```bash
npx cypress run
```

3. Generate the HTML report:

```bash
npm run coverage:report
```

This generates:

- Terminal summary output from `nyc`
- HTML coverage report at `coverage/index.html`