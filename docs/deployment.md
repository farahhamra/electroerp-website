# Static deployment

There is no production Node server or database. Choose a hash-routed SPA, history-routed SPA, or generated history site. The existing web server serves HTML, CSS, JS, fonts and public JSON.

## Hash SPA

```sh
npm run build
```

Serve `dist/`. V1 and v2 hash routing work without rewrites. Keep config/catalog/bootstrap locations consistent; normal builds use relative asset URLs. Browser head updates do not provide crawler-visible per-route HTML in this mode.

## History SPA

Set v2 `routing.mode: "history"` and the deployment `basePath`. Match the Vite build base:

```sh
npm run build -- --base /shop/
```

Serve `dist/` at `/shop/`; rewrite non-file storefront paths to `/shop/index.html`. The SPA can display an unknown-page state, but a blanket rewrite ordinarily returns HTTP 200. Use generated output below when proper crawler HTML and HTTP 404 behavior matter.

## Generated history site

```sh
npm run build:static -- --bootstrap public/examples/engine-v2.json --history --origin https://shop.example.com --out dist-static
# Or host the same store under a subdirectory:
npm run build:static -- --bootstrap public/examples/engine-v2.json --history --origin https://shop.example.com --base /shop/ --out dist-static
```

`--history` explicitly converts a hash input into a separate history artifact; the original source JSON is untouched. V2 input and an HTTPS public origin (`seo.siteUrl` or `--origin`) are required. Use a clean output directory or a previously generated output containing `route-coverage.json`. The generator stages all files before replacing an existing generated output and restores the previous directory if the final rename fails. Source/system directories and unknown existing outputs are refused.

Output includes:

- Rendered HTML for enabled content pages, catalog, all supplied products/categories, and supported locale routes.
- Canonical/alternate/robots/Open Graph/Twitter tags and escaped factual JSON-LD.
- `sitemap.xml`, numbered sitemap chunks, `robots.txt`, and a revision-bearing `route-coverage.json`.
- `app.html` for cart/checkout SPA routes and `404.html` for real unknown URLs.
- Immutable public config/catalog snapshots under `snapshots/<revision>/`, referenced by each page for matching hydration.
- `generated-store.json`, `generated-catalog.json`, a public bootstrap and hashed application assets.

No customer details, carts, credentials, cookies or order history are serialized. The catalog is public inventory. Large catalogs use a shared external snapshot instead of repeating full catalog data in every HTML page. Snapshot revisions are content hashes, not authorization tokens.

After hydration the normal provider loads runtime data and reconciles the bag. API product visits revalidate the product lookup; order submission always relies on the external server's stock/pricing decision. A changed runtime revision emits `deployment.snapshot_stale`: regenerate and deploy the artifact to update crawler-visible content. Missing pinned files emit `deployment.snapshot_unavailable` and recover with a client render. Keep old immutable snapshots while cached HTML may still reference them; deploy the whole artifact atomically and revalidate HTML/bootstrap.

## API enumeration

A complete catalog can generate all routes directly. A partial API catalog **must** supply `routesUrl`; the build rejects missing enumeration, cursor loops or changing revisions. Enumeration returns complete public entities for each locale, not just a list of URLs. Return base entity values with `translations` maps for localized fields. The build merges those maps by stable ID and validates each rendered snapshot.

Use absolute HTTPS API endpoint URLs for a generated deployment, especially when the source bootstrap is local or the artifact moves to a different base path. The generator preserves the configured live query/search/product/order endpoints. Its generated public configuration/catalog are snapshots; refreshing them and regenerating SEO output is a deployment responsibility. Custom provider factories can run the SPA, but the stock generator currently accepts the native mock/API bootstrap contract; a custom build adapter must supply equivalent public snapshot data.

## Example Nginx rules

For a generated store at `/`, with output copied into `/srv/store`:

```nginx
server {
    root /srv/store;
    index index.html;
    location ~ ^/(?:ar/)?(?:cart|checkout)/?$ {
        try_files /app.html =404;
    }
    location / {
        try_files $uri $uri/index.html =404;
    }
    error_page 404 /404.html;
    location = /404.html { internal; }
}
```

For `/shop/`, copy the output into `/srv/www/shop`:

```nginx
server {
    root /srv/www;
    index index.html;
    location ~ ^/shop/(?:ar/)?(?:cart|checkout)/?$ {
        try_files /shop/app.html =404;
    }
    location /shop/ {
        try_files $uri $uri/index.html =404;
    }
    error_page 404 /shop/404.html;
    location = /shop/404.html { internal; }
}
```

Replace `ar` with your configured non-default locale alternatives. These examples deliberately return 404 for unknown content paths while serving transactional routes with 200. Configure your server's canonical trailing-slash policy to match the store. On a subdirectory installation, the domain owner should expose or reference the generated robots/sitemap policy at the site's root as appropriate; crawlers conventionally fetch `/robots.txt`.

Cache hashed assets and immutable snapshots long-term; revalidate HTML, bootstrap and mutable public JSON. Allow only the image/font/media/connect/frame origins actually configured. Maps use OpenStreetMap; videos use YouTube's privacy-enhanced host or Vimeo. The current runtime emits style tags for JSON design overrides and inline theme variables, so a CSP must permit those generated styles (or the host integration must add nonces). No arbitrary inline scripts from store JSON are supported.

## Verification

```sh
npm run test:static
```

This builds isolated root and `/shop/` artifacts and checks raw HTML metadata, English/Arabic hydration without console/page errors, image URLs, direct product routes, saved-cart restoration, transactional fallback and HTTP 404. It runs a temporary test server; no deployment is performed. Chromium is the automated browser target. Validate the production web server's routing/cache/CSP settings during deployment.
