# Configuration v2

V2 adds pages, responsive design, business records, dynamic collections, commerce composition, translations, SEO and trusted extensions. Existing v1 stores and the v1 schema URL remain supported. The engine renders public storefronts; ElectroERP owns editing, assets, saved presets, drafts, publication and version history.

Start the complete example with:

```sh
VITE_BOOTSTRAP_URL=examples/engine-v2.json npm run dev
```

The matching files are `public/stores/examples/engine-v2.json` and `public/catalogs/engine-v2.json`. They demonstrate English/Arabic, six content pages, all eight additional content families, columns, collections and product/category overrides. They use fictional business data and local artwork; map/video embeds are requested only after interaction. The five native and five customized v1 examples are retained.

## Contract and migration

Use `public/store-config.v2.schema.json` for editor autocomplete, `public/engine-capabilities.json` to discover installed definitions, and `validateStoreConfig` for semantic checks. JSON Schema alone cannot verify references, route collisions, hours or contrast. Run `npm run schema:export` after contract or registration changes; tests detect stale exports. V1 remains at `public/store-config.schema.json`.

```sh
npm run config:migrate -- public/stores/electronics.json /tmp/electronics-v2.json --asset-base https://shop.example.com/
```

Migration writes a new v2 document and adjacent `.diagnostics.json`; it refuses existing output/input overwrite. Supply the **original application document directory** as `--asset-base` to preserve v1 relative media destinations. Without it, review and adjust relative media before using the output. V2 configuration media resolve against the configuration document URL; catalog media resolve against the application base. Absolute HTTPS assets retain their URLs. An inline custom provider should supply absolute or application-root media paths.

V1 runs through its existing native rendering path. Migration explicitly creates home/story/shipping/contact page definitions and places automatic benefits once. This preserves existing deployed stores instead of silently routing them through a new layout. Merchant-authored delivery notices are retained; no new merchant shipping promise is invented. Locale-specific copy and business references must be supplied by the merchant.

## Pages, routes and destinations

Each page has a stable `id`, `title`, `paths` map, ordered `sections`, optional `design`/`seo`, and `enabled`, `header`, `footer` switches. `heading: "title"` renders the page title as h1; `heading: "hero"` requires exactly one enabled hero. A homepage at `/` is required. Page paths cannot contain queries/fragments, traversal, reserved system/entity routes or locale prefixes. Enabled path collisions are rejected, including decoded equivalents. IDs remain stable when translated URLs change.

```json
{
  "id": "about",
  "title": { "values": { "en-US": "Our approach", "ar": "نهجنا" } },
  "paths": { "en-US": "/about", "ar": "/عنّا" },
  "sections": [
    {
      "id": "intro",
      "type": "text",
      "title": "Made with care",
      "paragraphs": ["Merchant copy goes here."]
    }
  ]
}
```

`routing` supports `mode: "hash" | "history"`, `basePath` and `trailingSlash: "never" | "always"`. Hash is the compatibility default. Non-default locales use a locale prefix, such as `/ar/عنّا`. History hosting needs the rules in [deployment.md](deployment.md). System routes are `/catalog`, `/cart`, `/checkout`, `/products/:slug` and `/categories/:slug`; category IDs are used when no slug is supplied.

New links use `{ "label": "About", "destination": { "kind": "page", "pageId": "about" } }`. Supported destination forms:

| Kind                         | Fields                                                            |
| ---------------------------- | ----------------------------------------------------------------- |
| `page`                       | `pageId`                                                          |
| `product` / `category`       | `productId` / `categoryId`                                        |
| `section`                    | `pageId`, `sectionId`                                             |
| `system`                     | `route: catalog/cart/checkout`, optional bounded `query` map      |
| `path`                       | application-relative `path`, including query/fragment when needed |
| `external`                   | HTTPS `url`                                                       |
| `phone`, `email`, `whatsapp` | `contactId` or explicit `value`; optional WhatsApp `message`      |

Sections use the same resolver as navigation, footer, cards and locale routes. Anchors use a query parameter in hash mode and a fragment in history mode, wait for lazy content, and move keyboard focus. Missing required known targets fail validation. Unresolved partial-API product/category references produce warnings and disabled links; the provider can resolve them before rendering. Phone/WhatsApp numbers use international `+` notation. Unsafe protocols and traversal fail validation.

## Design and responsive inheritance

The existing `theme` palette/fonts and `presentation` controls remain. `theme.tokens` adds semantic palette entries, spacing, radius, shadow, typography roles and component styles. Tokens are sparse overrides; omitted fields preserve native defaults. Store → page → section scope applies from broad to specific. Within each scope, base values apply first, followed by the active device's values. Mobile overrides do not leak into tablet or desktop.

| Device  | Width            |
| ------- | ---------------- |
| mobile  | below 768px      |
| tablet  | 768–1023px       |
| desktop | 1024px and above |

```json
{
  "design": {
    "layout": {
      "base": { "gap": 2, "paddingBlock": 4, "align": "start" },
      "mobile": { "columns": 1, "gap": 0, "paddingBlock": 2 },
      "tablet": { "columns": 2 },
      "desktop": { "columns": 3 }
    },
    "background": { "color": "#f5f2ed", "image": "../../images/scene.svg", "overlay": 0.2 },
    "tokens": {
      "typography": {
        "h2": { "base": { "size": 2.5, "lineHeight": 1.1 }, "mobile": { "size": 1.8 } }
      }
    }
  }
}
```

Layout controls: columns (1–6), proportions (positive fractional tracks), gap, block/inline padding, max width, start/center/end alignment, vertical alignment, visibility, image ratio and image side. Distances use rem, ratios are unitless, radius uses px. Padding/max width apply to the section frame. Grid/proportion controls apply to grid/media layouts; a native rail remains a horizontal rail. Native template defaults and explicit legacy layout controls still work.

Typography roles: h1–h6, body, lead, caption, eyebrow, button, navigation and input. Each supports device-specific font ID, size in rem, weight, line height, letter spacing in em and transform. Fonts are registered build assets, not remote CSS URLs. Built-in IDs are `body`, `heading`, `arabic`; Noto Sans Arabic is bundled. Brand font assets must be imported by trusted application code.

Token palettes include background, foreground, surface, muted, accent, accentText, border and focus. Spacing tokens map to small action gaps (`xs`), form/variant gaps (`sm`), grids (`md`), heading separation (`lg`) and section padding (`xl`). Explicit section layout gaps take precedence. Component tokens cover button, input, card, dropdown, header and footer with radius, background, color, border, padding, hover background, focus color and disabled opacity. Global/page tokens reach Radix portals. Reduced motion uses the existing theme setting and system preference.

## Sections and composition

The seven existing families (`hero`, `products`, `categories`, `banner`, `text`, `faq`, `benefits`) retain their native template slots and per-section `template` override. A `columns` section has `cells: [{ sections: [...] }]`; the renderer preserves reading order and renders one DOM tree. Limit: 100 pages, 100 section nodes per page, three nested column levels, six cells. Reusing the same JSON is supported; saving and synchronizing reusable definitions belongs to the builder.

| Additional family         | Configuration and behavior                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `contact-details`         | Business `locationId`, optional `contactIds`, hours/social visibility                                                             |
| `map`                     | Location reference, bounded zoom/height, optional poster and click-to-load OpenStreetMap embed; directions link remains available |
| `gallery`                 | Image src/alt/caption/link items, grid or rail, optional native-dialog lightbox with arrows/Escape/focus restoration              |
| `testimonials`            | Supplied quote/name/role/image only; no generated ratings                                                                         |
| `brand-logos`             | Named images and optional typed links                                                                                             |
| `video`                   | Local/HTTPS file with optional caption tracks, or allowlisted YouTube/Vimeo ID, poster/transcript; click-to-load                  |
| `comparison-table`        | Column headings and row labels with matching string/boolean values; semantic table and horizontal overflow region                 |
| `promotional-collections` | Named collection cards, image/copy/link and optional live query preview                                                           |

`collection` renders a named `collectionId` or inline `query`, optional heading/description, and `empty: "message" | "omit"`. Optional image failures use a descriptive placeholder or omit decorative media. Collection errors have customer-safe feedback and separate integration diagnostics. Maps/videos still depend on the merchant's CSP and network allowing the selected provider.

## Business records

`business` contains name, contacts, socials and locations. A location has a stable ID, label, structured address, IANA time zone, optional coordinates/map URL, `hours` keyed mon–sun and `exceptions` keyed real ISO dates. Each hours entry supports `closed`, `allDay`, or intervals `{ start: "09:00", end: "18:00", nextDay: false }`. Overnight intervals require `nextDay`; overlapping/contradictory intervals fail validation. Displayed times are the location's supplied local wall times, never the visitor's converted time zone. The time-zone label is displayed; the engine does not infer a live “open now” claim.

Bind footer details through `footer.business: { locationId, contactIds, showHours, showSocials }`; content sections and SEO use the same records. Navigation contact links use typed contact IDs. Omitted data is omitted from the display.

## Collections and commerce layouts

Named `collections` map IDs to queries. Filters are ANDed across dimensions and ORed within lists: productIds, excludeIds, categoryIds, brands, collectionIds, minPrice, maxPrice, inStock, discounted and createdAfter. Prices use minor units. **One variant must satisfy all price/stock/discount conditions.** Result `variants` selects the displayed and quick-add variant. `featured` preserves explicit curated order; other sorts are price-low, price-high, name, newest and discount. Ties use stable IDs; missing dates sort last. No date is inferred from array position or product ID.

Queries use limit 1–100 and opaque cursors bound to query/store/locale/currency/revision. A stale local cursor is rejected. Complete catalogs evaluate locally; partial catalogs require `queryProducts`, never a misleading search of the initial subset. Remote reads deduplicate, cache for 30 seconds, isolate locale/store/query context, cancel when all subscribers leave, and run at most four requests at once. See [api-contract.md](api-contract.md).

`commerce.product` supplies store defaults; sparse `commerce.products[productId]` overrides inherit template and store settings. Nested objects merge and arrays replace. Fashion defaults to a stacked gallery and sticky summary; home uses a rail; beauty emphasizes a framed summary; outdoor places specifications alongside purchase details. Explicit settings take precedence. Regions are `media`, `summary`, `details`. Available blocks: gallery, title, price, variants, availability, purchase, description, specifications, delivery, related. Required transaction blocks must appear exactly once; duplicate blocks and hidden purchase layouts fail validation. Galleries support thumbnails, stacked and rail. Related products support category/brand/query selection, always excluding the current product. Delivery uses the configured checkout notice and only links to a configured shipping page.

`commerce.category` and `commerce.categories[categoryId]` control columns, image visibility, base query and before/after sections. Category ID remains an enforced filter. The shared catalog supports price, stock, discount, brand, search, sorting and pagination. Cart/checkout retain constrained transaction flows.

## Localization, SEO and validation

`i18n` declares default/fallback locale, enabled locale codes/labels/direction and optional message overrides. Localizable merchant text accepts a string or `{ values: { "en-US": "...", "ar": "..." } }`. Default-locale text is required in maps; missing active translations warn and fall back. Paths, IDs, colors, URLs and business contact values are not translated text. Catalog `translations[locale]` overrides display fields, slug, details, specifications and entity SEO; variants support translated labels/options. Stable IDs preserve bags across locale switches. Engine UI uses ICU messages/plurals with English and Arabic dictionaries; new UI languages supply `i18n.messages`.

SEO fields include title, description, image/alt/dimensions, canonical, index and follow. Page/entity settings override site defaults. Catalog filters, cart, checkout and unknown pages are noindex. Metadata includes canonical/locale alternates, Open Graph, Twitter and factual Organization/LocalBusiness/Product/Breadcrumb JSON-LD. Client updates support browsing; **crawler-visible page HTML requires the optional history-mode static build**. Regenerate it when public content changes.

`validateStoreConfig` returns `{ ok, value?, diagnostics }`. Diagnostics have code, severity, path, escaped JSON pointer, message and optional related paths, sorted/deduplicated deterministically. Errors block rendering; warnings cover uncertain remote references, missing translations and low fixed-color contrast; informational diagnostics identify image backgrounds needing visual review. Validation is deterministic and offline. It cannot prove that an external asset exists, audit every text/background combination or replace a publishing review. Browser integration diagnostics use the `storefront:diagnostics` event; shoppers see recovery copy.
