# Scripture integrity audit

The OEB import is followed by a structural audit of every imported book. It checks parser diagnostics, chapter and verse ordering, gaps and duplicates, unusual verse identifiers, empty verses, verses outside chapters, and headings which cross a chapter boundary.

Run it independently with:

```sh
npm run audit:scripture
```

The OEB source contains known historical and editorial irregularities. They are recorded in `resources/bible/oeb-integrity-baseline.json`, including their file, location, severity, and explanation. The audit fails when:

- a new finding appears;
- a known finding disappears;
- an expected book file is missing; or
- an unexpected book file appears.

This strict comparison makes both regressions and upstream corrections visible. Never refresh the baseline merely to make the audit pass. Review the relevant source, decide whether a documented source patch is appropriate, and only then deliberately regenerate it:

```sh
node scripts/audit-scripture-integrity.mjs --write-baseline
```

Source text corrections remain documented separately in `docs/source-text-patches.md` and applied by the import pipeline before this audit runs.
