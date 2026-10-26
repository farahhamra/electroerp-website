# Premium Website Engine

One engine. Multiple templates. Unlimited storefront identities.

A frontend-only React + Vite + TypeScript storefront for ElectroERP. Includes three complete template compositions with independent headers, footers, and homepage sections, demonstrated by three fictional premium brands: **ORBIT** (electronics), **STUDIO FORM** (fashion), and **FORM & FIELD** (home/living). Styling uses Tailwind CSS v4 with shared semantic CSS tokens. Fuse.js powers local product search.

## Develop

Use Node.js 24 (Node >=22.12 and <25 is supported), then:

```sh
npm ci
npm run dev
```

The default storefront is ORBIT. No backend, database, credentials, or environment file is required. Fonts and original SVG product illustrations are bundled locally. Sample products, specifications, prices, destinations, and stock are fictional.

In the Codex cloud workspace, use `npm ci --cache /workspace/.npm-cache` because the default home-directory npm cache is unavailable. Use the existing checkout at `/workspace/electroerp-website`; each cloud task is already isolated, so a worktree is unnecessary.

## Validate

```sh
npm run typecheck
npm test
npm run test:e2e
npm run format:check
```

`test:e2e` builds production assets, starts a temporary preview server, and runs Chromium tests at desktop and mobile sizes. It uses `/usr/bin/chromium` when available. Otherwise run `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium executable. Unit tests exercise search relevance, SKU/model matching, inventory reconciliation, money, and shipping. Browser tests exercise templates, filtering, keyboard search, cart persistence, validation, checkout, and the adapter contract using intercepted API responses.

## Switch the storefront

Edit **`public/storefront.json`**:

```json
{
  "mode": "mock",
  "configUrl": "stores/fashion.json",
  "catalogUrl": "catalogs/fashion.json"
}
```

Use matching `electronics`, `fashion`, or `home` files. Reload the page after changing the JSON. The deployed `dist/storefront.json`, `dist/stores/*.json`, and `dist/catalogs/*.json` can also be replaced at runtime without rebuilding JavaScript. There is no store editor, ERP administration screen, or template selector exposed to customers.

Brand, colors, typefaces, radius, navigation, footer, optional announcement, homepage section order, promotional artwork, collections, currency, and sample delivery rules come from JSON. Section types are `hero`, `products`, `categories`, and `banner`; each template renders them differently. Remove or reorder entries as needed. Navigation entries support optional `children` for themed dropdown menus. Fonts must be available to the browser; the bundled choices are DM Sans and Cormorant Garamond. See [configuration and architecture](docs/architecture.md).

## Build and serve

```sh
npm run build
```

Serve **`dist/`** using your organization's static web server. The output is HTML, CSS, JavaScript, fonts, images, and public JSON. There is no Node.js server in production. Hash routing supports deep links without SPA rewrite rules and `base: './'` supports subdirectory hosting. Relative image paths resolve against the application document directory; bootstrap config/catalog URLs resolve against the bootstrap URL.

`npm run preview` is for validating the build, not a production server. For deployed caching, cache content-hashed assets indefinitely; revalidate `index.html`, `storefront.json`, and runtime configuration/catalog JSON when the store changes.

## ElectroERP integration

The API does not exist yet. The mock provider works independently and the configurable HTTP adapter is tested against stubbed responses. [The proposed adapter contract](docs/api-contract.md) describes config, catalog, search, product lookup, and order endpoints; it is **not a claim about an existing ElectroERP API**. Replace or map this adapter when the actual contract is available.

The demo checkout never collects payment or transmits customer data. It returns a clearly marked demo reference. Only product/variant IDs and quantities are stored in localStorage, scoped per store. A real integration must validate prices, stock, shipping, taxes, and orders on the server. Payments and legally approved shipping/return policies require business-specific integration before real sales.

## Project map

| Path                               | Purpose                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `src/core`                         | Validated models, search ranking, cart and money rules                       |
| `src/providers`                    | Mock and configurable HTTP data providers                                    |
| `src/context`                      | Store state, product cache and persistent bag                                |
| `src/components`                   | Shared navigation, search dialog, product cards                              |
| `src/templates`                    | Lazy template registry, independent navigation/footers and homepage sections |
| `src/pages`                        | Catalog, product, bag, checkout, informational routes                        |
| `public/stores`, `public/catalogs` | Runtime store configuration and mock data                                    |
| `tests`                            | Desktop/mobile functional browser tests                                      |

Animations respect reduced-motion preferences. Search has debouncing, cancellation, keyboard selection, focus restoration, and live result announcements. Layouts use responsive grids; product pages and checkout routes load on demand.

Sorting, brand filters, and checkout countries use the reusable accessible `Dropdown` component; navigation collections use `NavigationDropdown`. Both support keyboard interaction and inherit the current theme.
