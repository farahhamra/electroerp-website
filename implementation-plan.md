# Storefront engine implementation plan

Status: proposed; the capabilities described here have not been implemented by this document.

Baseline: commit `8c80ae6` (five templates and template preview screenshots). Scope: the 14 engine responsibilities remaining after removing builder responsibilities. The executable checklist is [tasks.md](tasks.md). Existing behavior is documented in [architecture](docs/architecture.md), [customization](docs/customization.md), and the [proposed API contract](docs/api-contract.md).

## 1. Outcome and boundaries

Extend the existing React, Vite, TypeScript, Tailwind, Fuse.js, and Zod storefront into an engine that renders complete, localized, configurable storefronts from versioned JSON. Preserve the distinct electronics, fashion, home, beauty, and outdoor compositions. Keep mock operation, accessible shopping interactions, static hosting, and the existing provider integration seam.

The engine owns schemas, interpretation, rendering, navigation, data requests, and machine-readable diagnostics. ElectroERP owns authoring and persistence. A builder can consume engine schemas and diagnostics without shipping its editing interface in the storefront bundle.

### Included requirements

| ID  | Engine capability                        | Current foundation and gap                                                                                                                                          | Primary delivery phase |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| E01 | Multi-page rendering                     | Only the homepage has configurable sections; story, shipping, and contact use fixed content.                                                                        | P03                    |
| E02 | More section types                       | Hero, products, categories, banner, text, FAQ, and benefits exist. Eight additional content families are needed.                                                    | P08                    |
| E03 | Flexible section layouts                 | Selected split/centered/grid/rail modes and spacing exist; no general column composition or consistent layout contract.                                             | P06                    |
| E04 | Responsive overrides                     | CSS responds automatically and a few column controls exist; no common device-specific override model.                                                               | P05                    |
| E05 | Complete typography                      | Two font families, body size, and optional heading weight exist; semantic type roles and detailed metrics are missing.                                              | P04                    |
| E06 | Structured business information          | Contact content can be typed into sections/footer, but there is no shared business model.                                                                           | P07                    |
| E07 | Link resolution                          | Links accept route strings and HTTPS; no stable entity references, contact destinations, or central route resolver.                                                 | P03, P07               |
| E08 | Dynamic product collections              | Existing sections select product/category/collection IDs, stock, price/name sort, and a limit from loaded products. Rich queries and remote pagination are missing. | P09                    |
| E09 | Product/category page customization      | Catalog/card controls exist, but product composition, specifications, gallery modes, and category landing pages need contracts.                                     | P10                    |
| E10 | Global theme configuration               | Semantic colors, radius, buttons, content width, and fonts exist; consistent component/spacing tokens and inheritance are incomplete.                               | P04                    |
| E11 | Multilingual and RTL rendering           | Locale formats money and sets `lang`; UI/content translation, localized routes, and direction handling are absent.                                                  | P11                    |
| E12 | SEO and sharing output                   | Startup sets one site title/description; hash routing and client-only metadata do not provide per-page crawler output.                                              | P12                    |
| E13 | Configuration validation and diagnostics | Zod and some catalog integrity checks exist; structured, source-aware diagnostics and cross-reference validation are missing.                                       | P01, P13               |
| E14 | Engine extension points                  | Templates have a lazy registry, but adding section types requires editing core schema/renderer switches.                                                            | P02                    |

### Explicitly outside this implementation

- Visual editing overlays, selection handles, drag-and-drop controls, and column editing UI.
- Page creation forms, business information panels, link pickers, and typography/theme editing panels.
- Asset uploading, image-library browsing/search, and asset-usage management.
- Saving reusable sections, synchronized section updates, and named theme-preset storage. The builder supplies expanded sections and effective theme values.
- Draft/publish storage, approval flows, undo/redo, design history, or builder deployment orchestration.
- A publishing audit interface, remote broken-link crawler, or automatic repair of merchant content. The engine returns actionable diagnostics for the builder to display.
- An ElectroERP backend, database, payment gateway, translation service, or production order service. Provider contracts and mock/stub implementations are included.
- Downloading and executing arbitrary plugins from JSON. Extensions are trusted application code included at build time.

Business policies, translations, contact details, and product facts remain merchant-supplied. Demo fixtures must be explicitly fictional. Contact information rendering does not imply a contact-form delivery service.

## 2. Baseline and refactoring targets

| Existing location                                         | Current responsibility                                                 | Planned change                                                                                                        |
| --------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/core/schema.ts`                                      | v1 configuration, section union, catalog models, provider interface    | Preserve the v1 contract; expose version dispatch and re-export new modular contracts.                                |
| `src/core/presentation.ts`                                | Presentation defaults and section/link helpers                         | Preserve legacy defaults; move v2 layout/theme/link definitions into focused modules.                                 |
| `src/main.tsx`                                            | Fetching, theme application, head updates, fixed routes, root mounting | Reduce to browser bootstrapping; use a shared application root, resolved config, route table, and dedicated services. |
| `src/templates/registry.tsx`                              | Five lazy templates, homepage loop, section switch, section frame      | Retain lazy templates; extract generic page/section rendering and registration.                                       |
| `src/templates/types.ts`                                  | Seven native template slots                                            | Add a compatibility adapter and explicit capabilities for section/page-block overrides.                               |
| `src/templates/ConfigurableSections.tsx`                  | Shared section layouts                                                 | Reuse components through registered definitions and layout primitives.                                                |
| `src/templates/shared.tsx`, `src/components/Shared.tsx`   | Navigation/footer primitives, product cards, links                     | Centralize typed link resolution, localized copy, and theme behavior.                                                 |
| `src/core/sections.ts`                                    | Local product/category selection                                       | Keep v1 selection compatibility; delegate v2 queries to a shared collection evaluator.                                |
| `src/providers/data.ts`                                   | Mock/HTTP bootstrapping and orders                                     | Split provider creation, validation, capability negotiation, and query adapters.                                      |
| `src/context/StoreContext.tsx`                            | Catalog cache, search, cart                                            | Separate locale/config resolution and collection query state without duplicating cart authority.                      |
| `src/pages/Catalog.tsx`, `Product.tsx`, `Information.tsx` | Fixed page compositions                                                | Introduce configurable page templates and product blocks; migrate information routes.                                 |
| `public/store-config.schema.json`                         | Exported v1 editor schema                                              | Retain its v1 meaning; add a separate v2 schema and capability manifest.                                              |
| `scripts/export-config-schema.mjs`                        | Runtime-derived schema export                                          | Export deterministic versioned schemas from the same registered contracts used at runtime.                            |
| `scripts/capture-template-previews.mjs`                   | Five native homepage screenshots                                       | Keep preview IDs, dimensions, and manifest compatibility; refresh only after visual implementation changes.           |

Proposed modules are implementation targets, not existing APIs. Use `src/core/config/`, `src/core/routing/`, `src/core/theme/`, `src/core/collections/`, `src/core/i18n/`, `src/core/seo/`, `src/engine/`, and `src/sections/`. Avoid moving unrelated files merely to match a directory diagram.

## 3. Compatibility and configuration architecture

### 3.1 Versioned inputs, one rendering model

Introduce `version: 2`. Keep reading all checked-in v1 native stores and customization examples. Do not change the meaning of the existing v1 schema URL or rewrite merchant JSON silently.

The loading pipeline becomes:

```text
trusted extension registration + bootstrap
  -> version-specific input validation
  -> v1 normalization OR v2 normalization
  -> semantic validation against registries and available data
  -> normalized store definition + source-path map + diagnostics
  -> locale / route / theme resolution
  -> resolved page and section props
  -> shared renderer + selected template overrides
```

Separate raw input, normalized configuration, and resolved render props. For example, a localized title is an object in input but a string in template props. Preserve source paths through normalization so an error in an old `sections[2]` field is reported against that original field, not an invented v2 path.

Required compatibility behavior:

1. Keep existing template IDs, section IDs, navigation, cart storage keys, price minor units, checkout semantics, and five preview-card IDs.
2. Convert v1 homepage sections into a stable `home` page. Normalize automatic benefits once, preserving start/end/hidden and explicit-benefits suppression.
3. Generate legacy story/shipping/contact pages at their existing paths. Preserve merchant-provided content. Remove demo-only shipping claims from API mode through mode-aware fallback rendering; retain clear mock disclosures.
4. Map v1 theme/presentation fields to v2 tokens without changing their intended appearance. Unspecified overrides remain unspecified until resolution; explicit `false` and `0` survive.
5. Keep raw v1 relative links and media URL behavior through the compatibility adapter. New v2 media resolves against the configuration URL; provider product media resolves against its declared data base URL. Document both rather than changing old URLs accidentally.
6. Keep legacy category query URLs working and preserve existing search/cart/checkout flows. New category landing routes are additive.
7. Reject unknown future major versions with a version-specific diagnostic. Keep v1 migration available throughout this release; removal requires a separate major-version decision.

Export a pure `normalizeStoreConfig(input, context)` result and a separate opt-in migration utility. The utility writes a new file, includes migration diagnostics, and does not overwrite its input by default. Tests compare actual normalized/rendered behavior, not only snapshots of object shape.

During the refactor, retain a temporary adapter for components still consuming v1-shaped props. Switch a consumer to the normalized model only with its corresponding renderer changes, then remove that adapter after all consumers migrate. Each intermediate commit must remain runnable.

### 3.2 Proposed v2 document structure

| Field                            | Responsibility                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `version`, `storeId`, `template` | Schema version and stable store/template identity.                                                        |
| `brand`, `business`              | Branding and structured business facts.                                                                   |
| `currency`, `currencyDecimals`   | Existing single-store currency and minor-unit interpretation. Locale switching does not convert currency. |
| `i18n`                           | Default/supported locales, direction, fallback policy, and UI dictionary overrides.                       |
| `routing`                        | Hash/history mode, deployment base path, and trailing-slash policy.                                       |
| `theme`                          | Palette, semantic typography, spacing, layout, and component tokens.                                      |
| `navigation`, `footer`           | Localized labels, typed destinations, and business references.                                            |
| `pages`                          | Content pages with stable IDs, localized paths, sections, SEO, and limited chrome overrides.              |
| `commerce`                       | Catalog, category, product, and related-product composition/defaults.                                     |
| `collections`                    | Named, validated product-query definitions reusable by sections and page blocks.                          |
| `seo`                            | Site identity, canonical origin, default metadata, and indexing defaults.                                 |
| `checkout`                       | Existing checkout configuration; localized copy, unchanged order authority.                               |
| `extensions`                     | Required trusted extension IDs and compatible contract versions. No executable code.                      |

Use bounded schemas for text length, section count, nesting depth, arrays, numeric controls, and query sizes. Set and document concrete limits during P01; defaults should support realistic store pages without allowing accidental megabyte-scale style or DOM generation. Proposed starting limits: 100 pages, 100 section nodes per page, three column-container levels, six columns per container, and 50 items per gallery/testimonial/logo section. These are supported product limits, not universal business rules.

### 3.3 Diagnostic contract

```ts
type Diagnostic = {
  code: string // Stable, namespaced machine code; never parse the message.
  severity: 'error' | 'warning' | 'info'
  path: Array<string | number> // Original input path, not normalized-only fields.
  pointer: string // RFC 6901 JSON Pointer, including escaping.
  message: string
  pageId?: string
  sectionId?: string
  relatedPaths?: Array<Array<string | number>>
}

type ValidationResult<T> =
  { ok: true; value: T; diagnostics: Diagnostic[] } | { ok: false; diagnostics: Diagnostic[] }
```

Structural errors block startup. Semantic errors such as duplicate routes, unknown required section types, or invalid required purchase blocks also block startup. Missing optional translations and unsupported optional presentation preferences produce documented warnings and deterministic fallbacks. A reference absent from a partial catalog is unresolved, not automatically broken.

Validation is pure and callable independently of React. Network resolution of references is a separate, cancellable operation; it must not turn every config load into a full catalog download. Customer UI shows a useful recovery state, while integration code receives structured details. Never include order/customer data in configuration diagnostics.

## 4. E14: Registries and trusted extension contracts

Create an engine factory, for example `createStorefrontEngine({ templates, sections, providers, fonts })`, configured before input validation. Built-in registrations use the same path as extensions.

Each section definition provides:

- A namespaced stable `type`, contract version, input schema, and schema-export metadata.
- A lazy renderer loader; an optional static-render preload path uses the same component.
- Supported layout settings, default settings, allowed children/contexts, and localization metadata.
- Optional pure semantic validation, data requirements, and SEO contribution hooks.
- A public settings schema/capability description for consumers. No editor form or control implementation.

Template registration retains all seven existing slots through adapters. A template may override registered sections or product blocks, with a shared fallback for unsupported types. Capability metadata must distinguish supported, ignored legacy, and unavailable options; an accepted setting must either take effect or produce a diagnostic.

Provider registrations implement typed capabilities and data-source schemas. Arbitrary data must not be interpreted as trusted JSX or HTML. Register new provider adapters at the composition root; core rendering uses the provider interface.

Reject duplicate IDs, incompatible versions, unsupported child types, and missing required extensions. Freeze a registry per engine instance; use separate instances in tests. A renderer failure is contained by a section boundary with an accessible unavailable state and structured reporting; malformed configuration is rejected before rendering.

Proof of extensibility: add a sample `demo:notice` section and a fixture provider by importing their registration modules in the composition root only. Neither the central schema nor the core rendering loop should need editing. Exported JSON Schema must include registered extension contracts and identify the registry build used to produce it.

## 5. E01 and E07: Pages, routes, and destinations

### 5.1 Page composition

A content page has `id`, localized `paths`, localized title, ordered `sections`, optional page theme/layout overrides, SEO, and chrome visibility. IDs survive title/slug changes. Pages cover About, Contact, FAQ, policies, and campaign/landing content without dedicated React page files.

Render pages with one `PageRenderer`; route resolution selects the page and locale. Page sections use the same registry as the homepage. Enforce unique page IDs, unique localized routes, page-wide section IDs (including nested sections), and a single accessible primary heading. Provide an explicit heading policy: page title supplies the `h1` unless one designated hero/title block owns it.

Reserve system paths for catalog, categories, products, cart, checkout, and not-found behavior. Validate collisions with reserved prefixes, locale prefixes, encoded equivalents, and normalized trailing slashes before publishing a usable config. Disabled pages do not register routes. External link resolution must not expose nonexistent/disabled page targets as working links.

Category and product pages use dynamic entity routes and dedicated commerce composition contracts. Cart/checkout retain shared transaction behavior and accessible forms; this project does not introduce an unrestricted checkout page builder.

### 5.2 Routing and hosting modes

- **Hash mode:** retain as the default for migrated v1 stores and static hosts without rewrites. Deep links remain usable under a subdirectory. Do not claim per-route search/social indexing from hash URLs.
- **History mode:** opt-in clean paths, with an explicit application base path. Document SPA fallback rules for interactive routes and static-file priority for generated pages. Use the same normalized route table in the browser and static generator.
- **Generated static pages:** P12 produces route HTML for indexable pages when history mode is selected. Builds do not introduce a production Node server.

All application links pass through one route builder. Replace hardcoded `/catalog` and product routes across templates, cards, search, checkout confirmation, and footer helpers. Preserve query parameters appropriately, encode segments once, and constrain generated paths to the deployment base.

For section destinations, use a typed `pageId` plus `sectionId`. History URLs use a normal fragment; hash mode stores the section target in a reserved route query parameter such as `section`. The navigation service scrolls after lazy content mounts, accounts for sticky headers, and moves focus to the target heading/container without forcing motion on reduced-motion users. Define reserved query names so catalog filters cannot collide.

### 5.3 Typed destination model

Separate localized link labels from their destination:

| Destination kind  | Required identity                        | Resolution                                                                         |
| ----------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `page`            | `pageId`                                 | Localized page route.                                                              |
| `product`         | `productId`                              | Locale-aware product route from known data or provider resolution.                 |
| `category`        | `categoryId`                             | Category landing route; legacy query links remain accepted by the adapter.         |
| `section`         | `pageId`, `sectionId`                    | Validated page-local anchor destination.                                           |
| `system`          | Named route plus validated query fields  | Catalog, cart, or checkout.                                                        |
| `phone` / `email` | Value or business-contact reference      | Normalized `tel:` / `mailto:` URL.                                                 |
| `whatsapp`        | International phone and optional message | Encoded HTTPS `wa.me` destination.                                                 |
| `external`        | Absolute HTTPS URL                       | Browser navigation with safe target/rel handling.                                  |
| `path`            | Validated internal path                  | Compatibility/advanced use; diagnostic when an internal target cannot be resolved. |

Reject `javascript:`, `data:`, protocol-relative URLs, path traversal, unsafe contact values, and unsupported protocols. Treat media URL policy separately: HTTPS in deployments, local relative assets, and explicit development-only localhost HTTP support. Never inject labels, query values, or translated content as raw HTML.

Keep the internal `StoreLink` primitive as the integration point. Reference resolution can be asynchronous when a product is outside the initial catalog; pre-resolve visible links in bounded batches and expose a safe non-link/loading fallback. Do not fabricate a product URL from its ID when the route requires a slug.

## 6. E03, E04, E05, and E10: Design configuration

### 6.1 Theme and typography

Define semantic tokens for background/surface/text/muted/accent/accent text/border/focus, spacing scale, content widths, radii, shadows, and controls. Component tokens cover buttons, links, inputs, dropdowns, cards, header, and footer, including hover/focus/disabled states. No arbitrary CSS strings, selectors, or JavaScript expressions in JSON.

Typography roles: `h1` through `h6`, `body`, `lead`, `caption`, `eyebrow`, `button`, `navigation`, and `input`. Each supports a registered font family, size, weight, line height, letter spacing, and bounded text-transform options. Use explicit units: font size in rem, unitless line height, letter spacing in em, and spacing tokens or bounded rem values. Font loading is separate from selecting a font name; supported font IDs refer to bundled or trusted registered font assets with documented fallback stacks and language coverage.

Apply tokens through a shared theme service and CSS variables. Preserve each template's layout and native defaults. An explicit global button or navigation type override must apply across all five templates, including Radix portals. Clean up removed tokens during configuration changes so previous settings cannot leak into the next store/config revision.

### 6.2 Inheritance and responsive resolution

Use a common responsive value shape:

```ts
type Responsive<T> = {
  base?: T
  mobile?: T
  tablet?: T
  desktop?: T
}
```

Use three documented ranges initially: mobile below 768px, tablet from 768px to below 1024px, desktop from 1024px. Breakpoints are engine constants in this release. Each device override merges with `base`, independently of other device overrides. Absence inherits; it never means zero/false. `null` is invalid unless the particular field explicitly allows it.

For a property, resolve layers in this order: engine default -> selected template default -> global theme -> page override -> section override -> permitted block override. At each layer apply its base value and then the active device value. The most specific explicit value wins. Global configuration is therefore overridable locally, while missing local values do not reset it.

Use CSS media queries and generated/scoped variables for presentation; avoid viewport-driven DOM copies or JavaScript resize trees. Support responsive typography, gap/padding, column count, media ratio/side, text/item alignment, and visibility. Hidden sections must leave the accessibility tree and contain no focusable targets. Disallow hiding required purchase/checkout controls through generic visibility settings.

RTL rules use logical start/end alignment and logical CSS properties. Keep SKU codes, phone numbers, prices where appropriate, and mixed-script content isolated with `dir="auto"`/`bdi`. Mirror directional navigation icons, not brand marks or product photography.

### 6.3 Layout primitives

Introduce shared section frames, stacks, grids, split media/text layouts, and a bounded `columns` container section. Column cells contain ordered registered sections, with schema-declared allowed contexts. The builder owns moving content; the engine interprets the resulting tree.

Support column counts, fractional track proportions, gap, horizontal/vertical alignment, maximum content width, full-width backgrounds with contained content, padding, solid/theme backgrounds, optional background media, and bounded overlays. Keep content and decorative background accessibility separate. Provide image fit and focal point controls with aspect-ratio reservation to avoid layout shifts.

Limit nesting to three column-container levels, six cells per container, and 100 total section nodes per page. Reject cycles if references are introduced by an extension; core configs remain trees. DOM order is reading/focus order. Do not implement visual reordering that makes keyboard reading order contradictory.

## 7. E06: Business information

Add a `business` object containing public trading/legal names as needed, named phone/email/WhatsApp contacts, social profiles, and locations. A location has a stable ID, localized label, structured postal address, optional coordinates/map destination, IANA time zone, and opening hours.

Opening hours support multiple intervals per day, closed days, explicitly 24-hour days, overnight intervals with an explicit next-day end, and dated exceptions. Reject conflicting intervals and invalid time zones. Keep calendar formatting locale-aware; show hours in the location time zone, not silently in the visitor's zone.

Contact sections, map sections, footer/header items, contact pages, and Organization/LocalBusiness metadata reference the same business IDs. Do not duplicate phone/address strings in every component. Missing optional fields omit their row; a section that requires a nonexistent location receives a field diagnostic.

Provide display components for contact methods, address, hours, and social links. A contact page composes these sections. API mode must not inherit fictional contact/shipping statements from hardcoded demo fallbacks. Mock fixtures keep explicit demo messaging. No contact-form backend is added.

## 8. E02: Additional sections

All new sections support stable IDs, enabled state, common layout/responsive controls, localized content, loading/empty/error states where applicable, and registered schemas. Shared defaults must look intentional in each of the five templates without making their headers/footers identical.

| Type                      | Configuration and behavior                                                                                              | Accessibility/data constraints                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `contact-details`         | Business/location references; select contact methods, address, social links, and opening hours; stacked or grid layout. | Semantic address/list markup; contact links use the destination resolver.                                  |
| `map`                     | Location reference, map link, optional poster, approved embed provider, zoom/height.                                    | Accessible title and text/address fallback; lazy or click-to-load embed; no exposed secret API keys.       |
| `gallery`                 | Image items with alt/caption/link, grid/rail layout, optional lightbox, ratio and crop controls.                        | Keyboard-operable lightbox, focus restoration, Escape, meaningful alt text, reserved dimensions.           |
| `testimonials`            | Merchant-authored quote, attribution, optional role/avatar/rating, grid/rail layout.                                    | No generated endorsements; omit absent ratings; do not automatically emit aggregate-rating SEO.            |
| `brand-logos`             | Logo assets, accessible brand names, optional links, grid/rail and sizing controls.                                     | Preserve aspect ratios; no mandatory auto-scrolling or inaccessible marquee.                               |
| `video`                   | Self-hosted media or approved provider ID, poster, caption tracks/transcript, aspect ratio and controls.                | No audible autoplay; keyboard controls; descriptive iframe title and load fallback; validate provider IDs. |
| `comparison-table`        | Localized columns, feature rows, text/boolean cells, optional product references and links.                             | Native table headers/caption; scroll containment on small screens; no loss of row labels.                  |
| `promotional-collections` | Cards referencing named collections, localized copy, image, destination, optional queried product previews.             | Reuse the collection service; deterministic loading/empty behavior and no invented prices or availability. |

Use explicit missing-content policies (`omit`, `message`, or configured fallback) only where a section supports them. Missing essential text/media is a validation error; an intentionally optional decorative image is not. Maps/video embeds use provider allowlists and documented CSP requirements, avoiding arbitrary iframe HTML. Gate heavy media/network work until visibility or user intent when appropriate; do not lazy-load the primary hero image by default.

## 9. E08: Product collections and provider evolution

### 9.1 Query definition and semantics

Define a serializable, bounded `CollectionQuery`; do not accept code predicates or arbitrary backend query syntax. A query supports ordered product IDs, category IDs, brand values, existing collection IDs, price min/max, availability, discounted-only, and created-date constraints. Combine different filter dimensions with AND; multiple values within one dimension use OR. Document this instead of introducing an unbounded recursive rule language.

Sort choices: featured/manual, price ascending/descending, localized name, newest, and discount percentage. Require `createdAt` for meaningful newest/date rules; optionally add `updatedAt`, category localized metadata, structured specifications, and descriptive product media. Missing dates sort last for newest and fail date filters; report incomplete date coverage rather than inventing dates.

Product/variant rules must be explicit:

- Prices remain integer minor units in the configured store currency. No client exchange-rate conversion.
- Variant-level price/stock/discount predicates must be satisfied by the same variant. A cheap out-of-stock variant cannot make an expensive in-stock product pass an in-stock price filter.
- Display and price sorting use the cheapest qualifying variant; ordinary unfiltered cards retain their documented starting-price behavior.
- A card's quick-add action must add the variant represented by its displayed qualifying price, or require explicit variant selection when the product's options demand it. Never show one variant's filtered price and silently add another.
- Discount exists only when `compareAtPrice > price`; compute the percentage from that qualifying variant. Define zero-price behavior without division by zero.
- Explicit product IDs preserve their order for manual/featured sort, deduplicate by ID, then intersect other rules. Other sorts intentionally reorder them.
- Stable ties use product ID. Localized name sort uses the selected locale. Missing IDs are diagnosed when the catalog is known complete.

Named collections live in config. Sections, category pages, and related-product blocks reference their IDs with bounded overrides. Provide a shared query normalizer and stable cache key so equivalent query objects share results.

### 9.2 Provider capabilities

Evolve the current provider through a compatibility adapter, keeping existing load/search/product/order methods working. Add explicit metadata for catalog coverage (`complete` or `partial`), supported query operators/sorts, locale support, entity resolution, and route enumeration.

Proposed operations:

```ts
interface QueryResult<T> {
  items: T[]
  nextCursor?: string
  total?: number // Only when known; never infer total from a page length.
  revision?: string
}

// Conceptual interface; exact exported types are finalized in P01/P09.
queryProducts(query, context, signal?): Promise<QueryResult<Product>>
resolveEntities(references, context, signal?): Promise<ResolvedReference[]>
listIndexableRoutes(context, cursor?, signal?): Promise<QueryResult<RouteRecord>>
```

The complete mock catalog implements queries locally. HTTP mode delegates supported queries to an API adapter and validates its response. A partial catalog without the needed remote capability produces an explicit unsupported-query state; never silently pretend that filtering its first page searches the whole store. Legacy HTTP coverage is treated as unknown/partial unless explicitly declared complete.

For legacy integrations, keep loaded-product merchandising and existing local filters usable with an explicit loaded-subset scope; do not label them as complete-store queries or supply inferred totals. New v2 global collection queries require either complete local coverage or the appropriate remote capability. This preserves legacy rendering while making the data limits explicit.

Requests include store, locale, currency, normalized query, pagination, and available catalog revision. Abort obsolete requests; suppress stale responses; deduplicate concurrent identical requests; bound cache memory; reset pagination when filters/locale change. Only retry safe reads under a bounded policy. Keep order idempotency and customer data out of collection caches.

The actual ElectroERP API is unavailable. Update the proposed contract, provide mocked HTTP tests, and implement an adapter boundary. Backend query execution, pagination guarantees, and server-side stock/price authority are external responsibilities.

## 10. E09: Product and category composition

### 10.1 Product page

Introduce a typed product-block registry separate from unrestricted marketing sections. Initial blocks: gallery, title/brand/model, price, variant selector, availability, quantity/add-to-cart, description, specification groups, delivery/returns information, and related products.

Support ordered blocks in constrained `media`, `summary`, and `details` regions, gallery modes (thumbnails, stacked, rail), region proportions, sticky summary, and responsive behavior. Keep one authoritative selected-variant state for media, price, stock, and cart operations. A purchasable page must include exactly one functioning purchase flow; reject incompatible duplicates or omission. Prevent generic configuration from bypassing inventory validation.

Add structured specifications (`group`, `label`, `value`, optional unit) and richer media metadata through backward-compatible catalog adaptation. Existing `details` strings remain available as a fallback. Related products use the collection service, exclude the current product, and support category/brand/named collection rules with a documented empty fallback.

### 10.2 Category and catalog pages

Keep `/catalog` as the all-products view. Add category landing pages with title/description/media, optional registered sections before/after the product grid, filter/sort configuration, grid/card controls, pagination, and related category navigation. Configure global defaults and category-specific overrides by stable ID. Preserve legacy `/catalog?category=...` filtering and define canonical mapping to category routes.

Product/category overrides can be supplied as config maps keyed by stable IDs, with provider-resolved data for entities absent from the initial catalog. Unknown overrides receive the same complete/partial reference treatment as links. Avoid allowing product data to inject arbitrary page code.

## 11. E11: Localization and RTL

Use explicit locale codes and directions in `i18n`; English remains the default shipped storefront. Add an Arabic fixture and UI dictionary to prove RTL end to end. Additional merchant locales require content and UI translations; changing `locale` alone must not be described as translating the site.

Localized text input accepts either a string in the default locale or a `{ values: { [locale]: string } }` map. Resolve requested locale -> configured fallback locale -> default locale. Required text must exist in the default locale; empty translated text is intentional only for fields that allow empty content. Produce warnings for missing translations. Keep localization resolution out of individual templates by passing resolved strings.

Maintain separate translation domains for merchant content and engine UI: cart, checkout, validation, search announcements, availability, sorting, loading/error states, and accessibility labels. Use a mature small translation library with plural/interpolation support, selected in P01, rather than string concatenation for plural sentences. Keep stable message IDs and test plural categories. Never interpolate raw HTML.

Localize navigation, section content, business labels, product/category text, option labels, page metadata, and paths. Product/variant/category IDs, SKU/model codes, and stored cart identifiers stay stable. Provider operations receive locale; local search indexes resolved product fields for that locale while retaining SKU/model exact matching.

Locale-aware route generation uses a prefix for non-default locales and none for the default locale. A page's configured locale path excludes that prefix. Detect duplicate normalized paths within each locale. A locale switch navigates to the same page/entity when available, preserves compatible filters/cart state, and falls back to the target locale homepage when unavailable with a clear announcement. Avoid automatic geolocation redirects.

Set `lang` and `dir` before rendering where possible; SSR/static output must already contain them. Test logical spacing, asymmetric templates, arrows, dropdown portals, gallery controls, tables, checkout inputs, and mixed LTR codes in RTL. Respect reduced motion and maintain focus after switching.

## 12. E12: SEO, sharing, and static output

### 12.1 Metadata model

Support localized site/page/entity title, description, slug/path, canonical override within configured policy, social image with alt/dimensions, Open Graph/Twitter metadata, and robots index/follow directives. Defaults cascade site -> page type -> page/entity override. Include only available, validated data; social URLs must resolve to public absolute URLs using the configured site origin and base path.

Emit Organization/LocalBusiness, BreadcrumbList, and Product structured data where facts are present. Product offers must match displayed variant prices/currency/availability. Do not generate ratings, certifications, return guarantees, or stock claims absent from the data. Escape JSON-LD safely and prevent script-closing injection.

A route-aware head manager replaces stale tags on navigation and cleans up canonical/hreflang/robots/JSON-LD entries. Cart, checkout, internal search/filter variations, and not-found pages default to `noindex`. Canonicalize category filter aliases consistently, omit tracking parameters, and include reciprocal hreflang entries only for actual localized routes. Noindex is a crawler instruction, not access control.

### 12.2 Static rendering

Client-only head changes do not reliably populate search/social crawlers. Add an optional build-time static rendering command for history mode:

1. Read a versioned public store snapshot/config plus complete mock catalog or a route-enumeration provider capability.
2. Resolve all enabled indexable page/category/product routes and locales; paginate enumeration with duplicate/cursor-loop detection and explicit coverage reporting.
3. Load registered renderers and data without browser globals. Render the same React application through a server entry at build time, waiting for lazy content before final output.
4. Write one HTML document per route with content, metadata, correct `lang`/`dir`, and a safely serialized public hydration snapshot. Never serialize cart, customer data, API credentials, or server-only tokens.
5. Hydrate using the matching snapshot, then revalidate data. Preserve server/client markup consistency and detect revision mismatch without silently claiming the generated metadata is current.
6. Emit sitemap files (split when required by sitemap limits), a sitemap index if needed, and robots.txt. Respect noindex, canonical destinations, and real localized alternate routes. Emit a static 404 document and document server status/fallback handling.

History builds require an explicit deployment base so assets work from nested routes; preserve relative-base hash builds separately. Existing `npm run build` remains a valid client-only static build. The new command must clearly state its route coverage and fail on incomplete required enumeration; it must never report full SEO support after generating only the initially loaded products.

Static output is a public snapshot, not a new hosting backend. Config/catalog updates that change indexable content require regeneration and coordinated deployment. Document this alongside the existing runtime-JSON update path, including cache headers, atomic asset/config swaps, redirects managed by the host, and the fact that a generic SPA fallback cannot supply a real HTTP 404 by itself. Hash mode continues to work with explicitly limited per-page SEO.

## 13. E13: Validation and consumer contracts

Validation layers:

1. **Shape:** version, types, bounds, required fields, unknown keys, registered extension settings.
2. **Relationships:** unique IDs, route collisions, section anchors, business references, named collection references, page-block invariants.
3. **Capabilities:** registered templates/types/fonts, supported layouts, provider query/locale support, required static route enumeration.
4. **Content quality:** missing alt text, missing translations, empty essential copy, missing known media references, deterministic foreground/background contrast checks where calculable.
5. **Deployment:** invalid canonical origin/base path, non-public production media URLs, hash/static-render incompatibility, incomplete route coverage.

Errors block use of invalid required configuration; warnings identify recoverable omissions or uncertain quality. Unknown v2 keys produce errors instead of being silently stripped. For v1, preserve permissive compatibility where required and report unsupported fields as warnings. Specify stable ordering and codes so external consumers can group and display diagnostics.

Do not promise that schema validation proves a remote image exists, a public URL responds, or text over arbitrary photography is readable. Optional asynchronous checks can report known request failures, but a comprehensive publishing crawler and review interface remain outside this engine scope. Fixed color pairs can produce contrast warnings; photographic/gradient backgrounds receive an indeterminate result, not a false pass.

Publish versioned v1/v2 JSON Schemas, a capability manifest, migration notes, and framework-independent validation/normalization entry points. JSON Schema export cannot express every semantic invariant; document the separate validation function and verify both contract layers. The capability manifest includes section settings, allowed layout choices, locales, template overrides, provider support, and schema/engine compatibility versions. Keep the existing screenshot manifest separate and backward compatible.

## 14. Delivery sequence and milestones

Task IDs and detailed instructions live in [tasks.md](tasks.md). Execute in the listed order by default; explicit dependencies define the minimum safe order. Every phase ends with a usable checkpoint, not an unvalidated collection of new options.

| Phase | Deliverable                                        | Tasks     | Depends on | Exit evidence                                                             |
| ----- | -------------------------------------------------- | --------- | ---------- | ------------------------------------------------------------------------- |
| P00   | Baseline and compatibility inventory               | T001–T004 | None       | Reproducible existing checks and fixture matrix.                          |
| P01   | v2 contracts, normalization, diagnostic foundation | T005–T011 | P00        | All v1 fixtures normalize; v2 examples validate; source paths survive.    |
| P02   | Registries and extension seam                      | T012–T017 | P01        | Sample section/provider integrate without core switch edits.              |
| P03   | Configurable pages, routes, typed links            | T018–T025 | P02        | Multi-page store works in hash/history modes and under a base path.       |
| P04   | Theme and typography                               | T026–T030 | P03        | Global/local styles apply across five templates and portals.              |
| P05   | Responsive override resolver                       | T031–T035 | P04        | Independent mobile/tablet/desktop behavior, inherited values preserved.   |
| P06   | Layout primitives and columns                      | T036–T040 | P05        | Nested layouts validate, remain accessible, and do not overflow.          |
| P07   | Business model and contact links                   | T041–T046 | P06        | All contact surfaces use shared business facts.                           |
| P08   | Additional content sections                        | T047–T055 | P07        | All eight content families render with accessible failure states.         |
| P09   | Query collections and provider capabilities        | T056–T063 | P08        | Local/remote parity and honest partial-catalog behavior.                  |
| P10   | Product/category composition                       | T064–T070 | P09        | Configurable entity pages retain correct purchase behavior.               |
| P11   | Translation and RTL completion                     | T071–T077 | P10        | English/Arabic journeys, entity switching, and localized search pass.     |
| P12   | Metadata and static generation                     | T078–T086 | P11        | Raw generated HTML contains correct per-route content and metadata.       |
| P13   | Full diagnostics and public contracts              | T087–T091 | P12        | Field-specific diagnostics and deterministic schema/capability artifacts. |
| P14   | Integration docs and complete examples             | T092–T096 | P13        | ElectroERP can author valid configs from documented contracts.            |
| P15   | Cross-feature verification and release             | T097–T102 | P14        | Compatibility, UX, hosting, performance, and release checks pass.         |

Localization field contracts, direction-aware CSS, validation, and metadata identities start in earlier phases; P11–P13 complete them rather than bolting them onto incompatible models. Each phase includes relevant tests. Do not defer all verification until P15.

Suggested review batches: P00–P02 foundations; P03–P06 pages/design; P07–P08 content; P09–P10 commerce; P11 localization; P12 static SEO; P13–P15 integration/release. Keep individual commits reviewable within each batch.

## 15. Verification strategy

### Unit and contract tests

- Version dispatch, v1 normalization, explicit false/zero inheritance, source-path diagnostics, unknown-version behavior.
- Registry duplicate/version rejection, extension schema export, renderer capability fallback.
- Route normalization/collisions, base paths, localized paths, typed/contact links, anchor encoding, unsafe URL rejection.
- Theme precedence, device boundaries, token cleanup, typography bounds, font fallback.
- Business hours/time zones/overnight intervals and shared contact resolution.
- Collection rules, qualifying variants, stock/discount/date boundaries, stable sorting, cursor behavior, partial capability failures.
- Provider request/response validation, abort/stale results, locale cache separation, product-reference resolution.
- Product layout invariants, specifications, related-product exclusion, selected-variant/cart continuity.
- Translation fallback/plurals, exact SKU/model search per locale, locale route matching.
- Metadata inheritance, canonical/hreflang, robots, safe JSON-LD, static route completeness and snapshot parity.

### Browser and generated-output tests

Use existing Playwright tooling. Test all five templates for compatibility and common primitives; use representative templates for exhaustive per-feature combinations instead of an unbounded Cartesian matrix. Cover 390px mobile, 768px tablet, and 1440px desktop, plus 767/768 and 1023/1024 boundary tests for overrides.

Exercise keyboard navigation, visible focus, dropdown portals, focus restoration, anchors, lightbox/video controls, RTL, reduced motion, 200% zoom/reflow, empty/error states, loading cancellation, and horizontal overflow. Verify cart persistence, variant stock, mock checkout, and stubbed API order behavior after each relevant architectural refactor.

For static generation, fetch HTML without executing JavaScript and assert real route content/head tags, then hydrate it and assert no hydration errors. Serve root and subdirectory deployments; directly request nested routes, unknown routes, locale variants, robots.txt, and sitemap artifacts. External services are stubbed for deterministic tests.

### Performance and visual quality

Record a baseline before refactoring. Keep template/section chunks lazy, avoid eagerly loading every locale/font/media player, preserve hero loading priority, reserve image dimensions, and bound caches/query fan-out. Proposed acceptance budgets: representative initial compressed JS growth no more than 15% over recorded baseline without a documented cause; collection evaluation p95 below 50ms for 10,000 fixture products on the documented benchmark environment; no visible layout shift from new image/video placeholders. Use repeated measurements and record environment details rather than treating noisy single runs as proof.

Review matching-palette screenshots so template differentiation comes from composition. Refresh the five existing preview-card JPEGs after intentional homepage changes, preserving their manifest IDs and 1440 × 1080 dimensions. New screenshots supplement functional evidence; they do not replace it.

## 16. Risks, decisions, and completion criteria

| Risk                                                    | Required mitigation                                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Scope expands into a website builder                    | Keep the boundary in section 1; expose contracts, not authoring/storage UI.                        |
| Legacy stores change appearance                         | Normalize v1 separately, preserve defaults, compare all five templates and customization fixtures. |
| New controls are accepted but ignored by a template     | Publish capabilities, apply common primitives, test every template, diagnose unsupported controls. |
| Partial API data is treated as a full catalog           | Explicit coverage/capabilities; remote queries or visible unsupported states.                      |
| Runtime and static metadata diverge                     | One route/head resolver, public revisioned snapshots, regenerate on content changes.               |
| Dynamic config implies arbitrary script/style execution | Strict schemas, safe text rendering, approved embeds, trusted build-time extensions.               |
| Responsive overrides overwrite explicit values          | Defined precedence, sparse inputs, unit tests for false/zero and device independence.              |
| RTL and translated text break premium layouts           | Logical CSS from the start, long-text fixtures, Arabic end-to-end review across five templates.    |
| Provider migration disrupts orders/cart                 | Adapter compatibility, stable entity IDs/storage keys, transaction regression tests.               |
| User-configured layouts hide required purchase controls | Typed product regions and mandatory transaction invariants.                                        |

Decisions established for this plan: v2 input plus v1 adapter; three fixed device ranges; trusted build-time registries; typed destinations; complete/partial catalog declarations; English plus an Arabic verification fixture; optional build-time static generation for clean routes. These are proposed implementation decisions, not claims that the current engine already supports them.

Implementation is complete only when all E01–E14 requirements have passing acceptance evidence, all existing stores still run, contract/export docs match runtime behavior, mock mode works without external APIs, the static deployment path is documented and tested, and every task in `tasks.md` is checked with truthful evidence. Any unsupported ElectroERP backend capability must remain explicitly documented rather than simulated as production support.
