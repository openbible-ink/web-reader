# Public server rendering

The public library, book overview, and reader pages are rendered by Inertia's
SSR service. The Laravel response therefore contains useful headings,
scripture, links, metadata, and structured data before client-side JavaScript
runs.

## Build

```sh
npm run build:ssr
```

This creates both the browser assets and `bootstrap/ssr/ssr.js`.

## Production process

Run the SSR service as a supervised long-running process alongside the PHP
application:

```sh
php artisan inertia:start-ssr
```

The process manager should restart it after failure and after each deployment.
The SSR URL is configured with `INERTIA_SSR_URL` and defaults to
`http://127.0.0.1:13714`.

## Verification

The end-to-end suite starts both Laravel and the SSR service. Its public
rendering tests inspect the raw HTTP response, rather than the hydrated browser
DOM, and verify that scripture and library content are already present.

```sh
npm run test:e2e
```
