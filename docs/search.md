# Production search

Search uses the `scripture_search_verses` table rather than parsing USFM at
request time. PostgreSQL stores separate generated `tsvector` columns for
verse text, section headings, and footnotes, each backed by a GIN index.

User notes have a weighted full-text vector for titles, Markdown bodies,
section titles, and selected text. Tags remain relational and are included by
an indexed user-scoped database query. Note results are paginated by
PostgreSQL; the application never loads a user's complete note collection to
build a results page.

## Building the scripture index

After importing or updating a translation, rebuild its search rows:

```sh
php artisan bible:index-search --edition=oeb
```

Omit `--edition` to rebuild every imported translation. A successful rebuild
rotates the edition's cache version so previously aggregated distribution data
cannot survive a content update.

## Distribution data

Ordinary word and phrase distributions are grouped and counted in PostgreSQL.
Only the final per-book totals are returned to PHP, and those totals are cached
for 15 minutes using a key that includes the translation, filters, scopes,
query, and index version.

## Regular expressions

Regex searches are deliberately a constrained advanced feature. Patterns are
limited to 120 characters, must contain at least two letters or numbers, and
cannot use lookarounds, backreferences, recursive controls, or obvious nested
quantifiers. PHP's PCRE match and recursion limits remain in place, and the
non-PostgreSQL fallback inspects no more than 5,000 candidate rows.

These restrictions protect the application and database from expressions
whose running time can grow catastrophically with input length.
