# Source text patches

Imported Bible source files are treated as upstream data. Any local textual
correction must be recorded in `resources/bible/oeb-source-patches.json` and
applied by `App\Services\OebSourcePatcher`; do not hand-edit files under
`public/bibles/oeb`.

## Import behaviour

`php artisan bible:import-oeb <source-directory>` performs these steps:

1. Reads each upstream `.usfm.db` file.
2. Applies every manifest entry targeting that filename.
3. Writes the patched result to `public/bibles/oeb`.
4. Reports the IDs of patches that were applied.

Every patch contains an exact `expected` source fragment and an exact
`replacement`. The import fails unless the expected fragment occurs exactly
once. This is deliberate: an updated upstream file may have corrected the
problem or changed enough that the old patch is no longer safe.

## Updating the OEB source

When importing a newer OEB revision:

1. Run the normal import command against the new upstream `source/` directory.
2. If every patch still matches, the command applies it and reports its ID.
3. If a patch fails, compare the new upstream passage with its manifest entry.
4. If upstream fixed the issue, remove the obsolete patch and import again.
5. If the issue remains but the surrounding text changed, update `expected`,
   `replacement`, and `introducedAgainstRevision` after reviewing the passage.
6. Run the application and parser test suites before committing the import.

The parser compatibility corpus under `../usfm-parser/test/corpus/oeb` remains
an unmodified upstream snapshot. Corrections belong to this import layer, not
to the parser corpus.
