# Reader performance budget

The production build is checked by `npm run performance:check`. The check measures
compressed JavaScript, because transfer size is a more useful early warning than
the uncompressed build output.

| Area                | Gzip budget | Current role                                  |
| ------------------- | ----------: | --------------------------------------------- |
| Application shell   |       60 kB | Inertia, routing and shared application UI    |
| Reader UI           |       25 kB | Reader controls and passage presentation      |
| OEB parser fallback |       20 kB | Lazy OEB non-default preference fallback only |

These are guardrails, not targets. A change that exceeds a budget should either be
split or accompanied by a deliberate budget review. The standard reader fetches a
precompiled, compressed semantic payload for only the requested chapter. Raw USFM
and the parser are loaded lazily only when an OEB preference differs from the
precompiled default profile.
