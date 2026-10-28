# Premium Website Engine

One engine. Multiple templates. Unlimited storefront identities.

A frontend-only React + Vite + TypeScript storefront for ElectroERP. Includes five complete template compositions with independent headers, footers, and homepage sections, demonstrated by five fictional premium brands: **ORBIT** (electronics), **STUDIO FORM** (fashion), **FORM & FIELD** (home/living), **SEREIN** (beauty/skincare), and **NORTHLINE** (outdoor/adventure). Styling uses Tailwind CSS v4 with shared semantic CSS tokens. Fuse.js powers local product search.

## Engine v2

The engine now supports configured content pages, nested layouts, eight additional section families, responsive typography/design tokens, shared business information, typed links, rule-based collections, configurable product/category pages, English/Arabic with RTL, route metadata and optional static HTML generation. Existing v1 stores and all five templates remain supported.

- [V2 configuration and migration](docs/engine-v2.md)
- [Proposed API contract](docs/api-contract.md)
- [Builder-facing contracts and trusted extensions](docs/extensions.md)
- [Static deployment](docs/deployment.md)
- [Implementation evidence and decisions](docs/implementation-progress.md)

Run the complete bilingual demo with `VITE_BOOTSTRAP_URL=examples/engine-v2.json npm run dev`. The [implementation plan](implementation-plan.md) and [task checklist](tasks.md) retain requirement traceability. Builder editing, asset management, draft/publish and history remain ElectroERP responsibilities.

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
npm run test:static
npm run contracts:build
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

Use matching `electronics`, `fashion`, `home`, `beauty`, or `outdoor` files. Reload the page after changing the JSON. The deployed `dist/storefront.json`, `dist/stores/*.json`, and `dist/catalogs/*.json` can also be replaced at runtime without rebuilding JavaScript. There is no store editor, ERP administration screen, or template selector exposed to customers.

Brand, colors, typefaces, radius, navigation, footer, optional announcement, homepage section order, promotional artwork, collections, currency, and sample delivery rules come from JSON. Native section types are `hero`, `products`, `categories`, and `banner`; each template renders them differently. Shared `text`, `faq`, and `benefits` sections are also available. Remove or reorder entries as needed. Navigation entries support optional `children` for themed dropdown menus. Fonts must be available to the browser; the bundled choices are DM Sans, Cormorant Garamond and Noto Sans Arabic. See [configuration and architecture](docs/architecture.md).

## Build and serve

```sh
npm run build
```

Serve **`dist/`** using your organization's static web server. The output is HTML, CSS, JavaScript, fonts, images, and public JSON. There is no Node.js server in production. Hash routing supports deep links without SPA rewrite rules and `base: './'` supports subdirectory hosting. V1 relative image paths resolve against the application document directory; v2 configuration media resolve against the configuration URL and catalog media against the application base. Bootstrap config/catalog URLs resolve against the bootstrap URL. See [deployment modes and generated SEO output](docs/deployment.md) for history routes.

`npm run preview` is for validating the build, not a production server. For deployed caching, cache content-hashed assets indefinitely; revalidate `index.html`, `storefront.json`, and runtime configuration/catalog JSON when the store changes.

## ElectroERP integration

The API does not exist yet. The mock provider works independently and the configurable HTTP adapter is tested against stubbed responses. [The proposed adapter contract](docs/api-contract.md) describes config, catalog, search, product/category lookup, collection queries, entity resolution, static enumeration and order endpoints; it is **not a claim about an existing ElectroERP API**. Replace or map this adapter when the actual contract is available.

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

## Customization

See [the customization guide](docs/customization.md) for independent header/footer templates, section layouts, spacing, curated products/categories, product-card controls, catalog filters and new text/FAQ/benefits sections. Existing JSON remains supported. Five complete customization examples live in `public/stores/examples/`; their matching bootstrap files are in `public/examples/`.

JSON editor autocomplete comes from `public/store-config.schema.json` for v1 and `public/store-config.v2.schema.json` for v2. Installed extensions and settings are listed in `public/engine-capabilities.json`. Regenerate these artifacts with `npm run schema:export`.

### New storefront presets

The `beauty` template uses a rounded apothecary navigation, sculptural product hero, ritual categories and a framed split footer. The `outdoor` template uses expedition navigation, a panoramic landscape hero, a numbered equipment grid and a bold field-manual footer. Both have their own catalog/card styling and honor the shared JSON controls. Their local artwork and product data are original fictional demonstrations.

Run either native preset without changing the default storefront:

```sh
VITE_BOOTSTRAP_URL=presets/beauty.json npm run dev
# or
VITE_BOOTSTRAP_URL=presets/outdoor.json npm run dev
```

Use `examples/beauty.json` or `examples/outdoor.json` instead to preview the alternate layouts. Their header, footer and native section slots can also be mixed with the other templates.

## Template preview card screenshots

Each template has a **1440 × 1080 JPEG (4:3)** of its actual desktop homepage, ready to use in a preview card:

| Template              | Screenshot                                                  |
| --------------------- | ----------------------------------------------------------- |
| Electronics / ORBIT   | [electronics.jpg](public/template-previews/electronics.jpg) |
| Fashion / STUDIO FORM | [fashion.jpg](public/template-previews/fashion.jpg)         |
| Home / FORM & FIELD   | [home.jpg](public/template-previews/home.jpg)               |
| Beauty / SEREIN       | [beauty.jpg](public/template-previews/beauty.jpg)           |
| Outdoor / NORTHLINE   | [outdoor.jpg](public/template-previews/outdoor.jpg)         |

[`public/template-previews.json`](public/template-previews.json) maps template IDs to display names, demo brands, image paths, dimensions, alt text, and matching configuration/catalog paths. Paths are relative to the manifest URL, so they also work under a deployment subdirectory. The files are copied into `dist/` during the normal build.

For an external preview card, resolve `image.src` against the URL from which you fetched the manifest. Render the image at `width: 100%; height: auto` to preserve its 4:3 composition, and use its supplied dimensions and alt text. These are viewport screenshots showing the navigation and hero, sized to remain readable when scaled into a card.

Regenerate after changing the templates, branding, or demo artwork:

```sh
npm run templates:previews
```

The command uses Playwright and the same Chromium executable selection as the browser tests. It creates an isolated production build, captures each native store with a fresh browser context, waits for fonts and images, and writes the five optimized JPEGs plus the manifest. It leaves the active `storefront.json` and normal `dist/` untouched. Run `npm run build` afterward to include the refreshed images in a deployment.
