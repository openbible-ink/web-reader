# Reader performance budget

The production build is checked by `npm run performance:check`. The check measures
compressed JavaScript, because transfer size is a more useful early warning than
the uncompressed build output.

| Area | Gzip budget | Current role |
| --- | ---: | --- |
| Application shell | 60 kB | Inertia, routing and shared application UI |
| Reader UI | 25 kB | Reader controls and passage presentation |
| USFM parser | 165 kB | Client-side semantic parsing of source books |

These are guardrails, not targets. A change that exceeds a budget should either be
split or accompanied by a deliberate budget review. Scripture source files are
fetched per book and cached by the reader, so they are not included in the shared
JavaScript budget.
