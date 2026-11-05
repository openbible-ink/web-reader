# End-to-end browser tests

The Playwright suite exercises the application through a real Chromium browser and the real Laravel/Inertia frontend.

Run the suite with:

```sh
npm run test:e2e
```

The command builds the frontend, creates a fresh disposable SQLite database at `database/e2e.sqlite`, runs all migrations, seeds the OEB book catalogue, starts Laravel on port 8011, and executes the browser tests. It does not use or modify the development PostgreSQL database.

For interactive Playwright development:

```sh
npm run test:e2e:ui
```

Current journeys cover:

- loading scripture and confirming parsed verse content renders;
- opening the chapter outline and navigating to a semantic section URL;
- moving between chapters through the reader controls;
- registering and signing back into an account;
- creating a bookmark in the reader; and
- confirming the saved bookmark appears on the dashboard.

Failure screenshots, videos, and traces are written to `test-results/`. The HTML report is written to `playwright-report/`; both directories are ignored by Git.
