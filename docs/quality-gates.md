# Quality gates

The repository uses the same quality checks locally and in GitHub Actions.

Run the complete non-browser suite with:

```sh
composer ci:check
```

This verifies:

- TypeScript types;
- React Hooks and JSX accessibility linting;
- deterministic frontend formatting;
- PHP formatting and PHPStan analysis;
- the Pest application test suite;
- production dependency advisories;
- the production frontend build and bundle budgets; and
- the Open English Bible scripture-integrity baseline.

Run the real-browser functional and accessibility suite with:

```sh
npm run test:e2e
```

GitHub Actions builds the sibling `openbible-ink/usfm-parser` repository first,
runs every non-browser quality gate, installs Chromium, and then runs the full
Playwright suite. Generated Wayfinder files, build output, vendored code, and
scripture source files are deliberately excluded from frontend formatting and
linting. If a browser test fails, its trace, screenshot, video, and HTML report
are retained as a workflow artifact for seven days.

The PHP suite intentionally skips tests for disabled Fortify features (email
verification and two-factor authentication). Those skips describe product
configuration rather than untested enabled behaviour.

To apply safe frontend lint and formatting fixes locally, run:

```sh
npm run check:fix
```
