# Implementation baseline and measurements

Implementation starts from `8915ba994a139051e75367ac2993dd8b6facd698` (the plan/checklist commit). The preceding application baseline is `8c80ae6`; the intervening change was documentation. The five native stores, five customized stores, v1 schema and screenshot manifest are retained as compatibility fixtures.

Environment: Node v24.19.0, npm 11.9.0, Chromium 154.0.8037.57, Linux, AMD EPYC 9V74. Install with `npm ci --cache /workspace/.npm-cache` in the cloud workspace. Dependencies added for this implementation are IntlMessageFormat and the self-hosted Noto Sans Arabic family, with their lockfile dependencies.

The original unit suite passed 20 tests. The first baseline browser run passed 61/62, with a mobile checkbox click failing; subsequent full runs passed that scenario without removing the assertion. Production build and typecheck worked. The original v1 schema URL and template manifest content remain unchanged.

## Compatibility inventory

The complete v1 field reference remains in [customization.md](customization.md), with the authoritative shape in `src/core/schema.ts` and `presentation.ts`.

| Configuration group                                                    | Consumer and compatibility rule                                                                                |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| version/storeId/template/locale/currency                               | Provider version dispatch, template registry, StoreContext, Intl money and store-scoped cart                   |
| brand name/tagline/description/logo/width                              | Shared brand/navigation and each native header/footer; optional logo preserves wordmark fallback               |
| theme colors/fonts/radius/content width/body size/weight/button/motion | Root theme application and native/shared CSS; omitted controls retain template defaults                        |
| presentation header/footer selection and visibility                    | Independent template slots in Layout/registry; each template retains its composition                           |
| presentation section defaults/benefit placement                        | SectionFrame and native home assembly; explicit benefits prevent automatic duplication                         |
| presentation product-card metadata/crop/CTA                            | Shared ProductCard and per-section sparse overrides                                                            |
| presentation catalog layout/columns/filters/sort                       | Existing v1 Catalog; URL state and hidden-filter recovery retained                                             |
| navigation children/footer links/columns/socials/CTA                   | Shared StoreLink/NavigationDropdown/FooterDirectory/FooterLegal; all five template consumers retained          |
| hero/products/categories/banner native settings                        | Seven-slot template adapters; explicit layouts load ConfigurableSections; curated products keep supplied order |
| text/FAQ/benefits/settings/spacing/tone/width                          | Shared sections, SectionFrame and customization CSS; zero/false remain meaningful                              |
| product IDs/slugs/SKUs/models/variants/price/stock/media               | Search, cards, product, cart reconciliation and order provider; new metadata remains optional                  |
| checkout countries/fee/threshold/notice                                | Checkout/OrderSummary and money rules; fictional policies remain marked as demo data                           |

Native defaults intentionally differ by template; explicit reusable grid/split/centered/rail layouts share primitives. Layout-specific settings operate on the relevant layout (for example, columns control a grid, while a rail stays scrollable). V2 adds responsive rules without making v1 configuration fields mandatory. V1 information pages retain their URLs; API mode no longer appends demo-only shipping assertions.

V1 media use the application document base. V2 config assets use the configuration URL, and catalog assets use the application base. This difference is explicit in the migration CLI's `--asset-base` option. V1 rendering is retained; v2 migration is opt-in.

## Reproduce performance and visuals

Build an archive of the baseline outside the active source directory, install its dependencies (or share the compatible installed dependency tree), and run its production build. Then:

```sh
npm run build
node scripts/measure-engine.mjs --baseline /path/to/baseline --out /tmp/engine-measurements.json
node scripts/review-templates.mjs --baseline /path/to/baseline --out /tmp/engine-visual-review
```

`measure-engine` opens real production pages and sums gzip bytes of **all loaded JS chunks**, not only the entry chunk. It also records loaded fonts/CSS, screenshots and a deterministic 10,000-product collection benchmark (5 warmups, 30 measured samples per sort). Measurements exclude network throttling and are not Core Web Vitals claims. Re-run on your deployment's hardware and representative catalog.

Recorded results are in [engine-measurements.json](engine-measurements.json):

| Page                     | Loaded JS gzip | Change from baseline | Loaded CSS gzip | Loaded fonts |
| ------------------------ | -------------: | -------------------: | --------------: | -----------: |
| Baseline v1 electronics  |  160,362 bytes |                    — |    18,399 bytes | 36,932 bytes |
| Current v1 electronics   |  169,515 bytes |                +5.7% |    21,715 bytes | 36,932 bytes |
| Full v2 electronics demo |  205,676 bytes |               +28.3% |    21,715 bytes | 36,932 bytes |

V1 stays within the proposed 15% JS growth budget. The richer v2 fixture exceeds that baseline budget by a documented 45,314 bytes: it loads v2 validation/normalization, page/theme/section runtime, ICU localization and a collection section that v1 does not need. These remain split from the v1 startup path. This is a deliberate budget exception for the additional capabilities, not a claim that total loading cost decreased. Arabic font resources are requested when Arabic text is used. Media players/embeds and optional templates/sections remain lazy.

Collection p95 across the four measured sorts is 3.64–8.36ms for 10,000 fixture products, below the proposed 50ms target on this environment. This measures the evaluator, not provider/network latency. Remote query concurrency is capped at four; settled cache entries are bounded and expire after 30 seconds.

Visual capture produced 45 fixtures: five baseline native templates at 390/820/1440px; five current native templates at those widths; and all five current templates with the same Arabic v2 configuration at those widths. Automated inspection found no horizontal document overflow, broken loaded images, duplicate primary headings or page errors. Representative native and Arabic mobile/tablet/desktop captures were visually inspected. Existing customized-template browser tests cover their alternative layouts. These are Chromium checks, not a claim of exhaustive assistive-technology or cross-browser certification.

All five 1440×1080 preview-card images were regenerated. Four were byte-identical to their previous artifacts; the electronics capture changed with corrected inline text spacing. Template IDs, dimensions and manifest fields remain compatible.
