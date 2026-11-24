# Scripture delivery

The parser remains the source-ingestion boundary; the reader does not parse whole
USFM books during normal use. `npm run scripture:compile` projects the supported
default OEB profile and parses every imported OEB and WEB source into versioned,
chapter-level semantic payloads.

Artifacts are written to `storage/app/private/scripture/v1` as pre-gzipped JSON.
They are derived files and are not committed. Both import commands regenerate the
affected edition automatically:

```sh
php artisan bible:import-oeb /path/to/oeb/source
php artisan bible:import-webp /path/to/engwebp_usfm.zip
```

Deployments and fresh checkouts must run the compiler after installing Node
dependencies. The CI quality gate does this before application and browser tests.

## Public contract

Web and native clients share this endpoint:

```text
GET /api/v1/editions/{edition}/books/{book}/chapters/{chapter}
```

It returns `open-bible-scripture-chapter` schema version `1.0.0`. The payload
contains edition, book and chapter identity plus a chapter-scoped `bible-ast`
document, including semantic nodes, IDs, source ranges, attributes, diagnostics
and rebuildable indexes. Responses are gzip encoded, cacheable, and addressed by
a content fingerprint in web-reader URLs.

OEB's default compiled profile is Commonwealth spelling, neutral/inclusive gender,
NRSV versification, “Gehenna”, and `ioudaioi`. If a reader changes one of those
preferences, the web application lazily loads the raw source and parser for that
chapter view. This compatibility path preserves all existing controls without
penalising the normal reader bundle.

## Original-language word study

WEB word attributes containing Strong’s identifiers are retained in the chapter
payloads. `php artisan bible:index-search --edition=webp` also projects the
identifiers into the verse search index, which powers the occurrence list in the
reader’s opt-in word-study cards. Run the indexer after importing or updating WEB.

Lexicon definitions are served locally from `resources/bible/strongs/lexicon.json`.
The data comes from the Open Scriptures Hebrew and Greek Strong’s dictionaries;
licensing and retrieval details are recorded beside the data in
`resources/bible/strongs/README.md`. The lexicon is loaded by the server on demand
and is never included in the reader JavaScript bundle.
