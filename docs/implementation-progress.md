# Engine implementation and verification

The 14 engine capability areas are implemented. This report records the final scope, architecture decisions and verification; it supersedes the provisional module names and rendering strategy in the original plan. Publishing the source to the repository is the final release step. No website deployment has been performed.

## Requirement traceability

| ID  | Delivered capability                                           | Main implementation                                     | Evidence                                                                                                          |
| --- | -------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| E01 | JSON content pages, independent chrome, hash/history routing   | `core/config`, `app`, `engine/PageRenderer`             | Config tests; v2 page/browser tests; root/subpath static tests                                                    |
| E02 | Contact/map/gallery/testimonials/logos/video/table/promotions  | `sections/ExtraSections`                                | Rich bilingual example, gallery keyboard/contact/table browser tests, rendered static pages and visual capture    |
| E03 | Columns, proportions, alignment, media/background treatments   | `core/theme/styles`, `engine/SectionRenderer`           | Nested example, schema/depth checks, responsive browser assertions                                                |
| E04 | Independent mobile/tablet/desktop overrides                    | `core/theme/styles`                                     | Zero/false/inheritance unit tests; 767/768/1023/1024px browser checks                                             |
| E05 | Typography roles and registered fonts                          | `core/config/contracts`, `core/theme`, registry         | Font validation, dropdown/theme browser checks, Arabic rendering/captures                                         |
| E06 | Shared business/contact/location/hours data                    | `core/business`, contact/footer sections                | Hours/exception diagnostics, typed contact tests, contact page rendering                                          |
| E07 | Typed page/entity/anchor/contact/system destinations           | `core/routing`, shared links, provider references       | Reference/path/escaping tests, remote resolution and navigation regressions                                       |
| E08 | Complete/local and partial/API rule-based collections          | `core/collections`, `useCollection`, HTTP adapter       | Same-variant semantics, cursors, concurrency/cancellation/cache tests, API quick-add/browser tests, 10k benchmark |
| E09 | Product blocks/galleries/related queries and category sections | `ConfiguredProduct`, `EngineCatalog`, commerce defaults | Required-block validation, sparse inheritance unit tests, catalog/product/cart browser flows                      |
| E10 | Layered palettes/spacing/component styles                      | `core/theme`, page/section frames                       | Responsive and portal-style assertions, retained native/customized template tests                                 |
| E11 | Merchant/catalog/UI localization, ICU, locale routes, RTL      | `core/i18n`, `EngineApp`, StoreContext                  | Arabic checkout validation/confirmation and cart identity tests; all five RTL templates; bilingual static output  |
| E12 | Metadata, factual JSON-LD, generated HTML/sitemaps/snapshots   | `core/seo`, server entry, prerender script              | Escaping/metadata unit tests; 38-route root and subpath builds; hydration, assets, revisions and HTTP 404 checks  |
| E13 | Pure validation, field diagnostics and versioned artifacts     | `core/index`, config diagnostics/export                 | Semantic/unsafe input/schema drift tests; ESM bundle imported and validated in Node without UI/browser globals    |
| E14 | Trusted custom section/provider/font registrations             | `engine/registry`, `installed`, extension example       | Independent registry/version tests; custom provider + localized custom section browser test                       |

## Decisions made during implementation

1. **V1 compatibility:** retain its existing native render path; migrate explicitly to v2. This replaces the plan's proposed automatic conversion to one renderer and avoids changing deployed native layouts. V1 input errors still reference v1 fields. A migrated file is a new v2 source; its diagnostics reference that reviewable file, not a persistent reverse provenance map.
2. **Registry adapters:** native sections keep their existing seven template-slot adapters, and native mock/API bootstraps keep their compatibility dispatch. Namespaced new sections/providers register through the shared composition root without a central union/renderer edit. A new template still supplies a trusted module loader plus its allowed ID. The plan's wholesale removal of native switches was unnecessary for extensibility and was not performed.
3. **Commerce defaults:** merge sparse template → store → entity settings; arrays replace. Product regions remain constrained so required purchase blocks cannot disappear. Existing v1 entity pages retain their original layouts.
4. **Static output:** optional build-time history rendering uses the installed registry and shared React app, with public immutable snapshot references for hydration. The stock CLI handles native mock/API bootstraps; custom providers can supply equivalent snapshot build adapters. No production backend was added.
5. **Migration media:** v2 config-relative assets differ from legacy document-relative assets. The CLI requires a supplied original asset base to preserve absolute destinations when moving files; it does not guess a merchant's deployment URL.
6. **Budget:** the v1 loaded-JS increase is 5.7%; the feature-rich v2 example is 28.3% above the original v1 baseline. The additional cost is documented in [implementation-baseline.md](implementation-baseline.md), with optional v2 code split from v1. Collection evaluation meets the proposed latency budget.

These are implemented design choices, not claims that the original proposed internals were copied verbatim. The original checklist is marked against the delivered responsibilities and these decisions.

## Verification record

- Unit suite: 49 tests, covering existing search/cart/money/selection behavior and new configuration/query/SEO contracts.
- Production browser suite: 88 desktop/mobile scenarios, including the original five templates and customized examples, API stubs, locale switching, Arabic checkout, responsive boundaries and registered extensions.
- Static suite: 38 generated routes in each root and `/shop/` artifact; raw metadata, bilingual hydration, images, saved cart, direct links, runtime revision detection and HTTP 404.
- Pure contract build: ES module with Zod external, approximately 54KB before gzip; imported and used in Node without React or browser globals.
- Visual review: 45 captured native/RTL fixtures at three widths, with automated overflow/image/heading/error checks and representative manual inspection.
- Preview cards: all five regenerated, existing manifest contract preserved.
- TypeScript, schema drift, production build, format and whitespace checks pass at the final release gate.

Commands and measurements are reproducible from the README and [baseline report](implementation-baseline.md). Browser/API tests use local intercepted fixtures; no real ElectroERP API or external order was invoked.

## Integration boundaries

ElectroERP still owns the canvas, drag/drop controls, asset library, saved reusable definitions/themes, draft/publish/version-history storage, link-picker UI and publishing policy. The engine consumes their resulting JSON and exposes validation/capability metadata.

The proposed HTTP endpoints must be implemented by the eventual backend. That service owns authoritative inventory/prices, orders, idempotency, payments, authentication and real delivery policies. Server search and collection queries must conform to the documented semantics. Validation is offline; remote asset existence, complete accessibility auditing and deployment CSP/server rules require the integrating organization to verify its content and host.

English and Arabic engine dictionaries are bundled. Additional languages supply message overrides and merchant/catalog translations. Static crawler content must be regenerated when public data changes. Map/video loading depends on allowlisted providers and the host's network/CSP. Runtime code from JSON is never supported.

## Handoff

Use [engine-v2.md](engine-v2.md) for configuration/migration, [api-contract.md](api-contract.md) for proposed backend payloads, [extensions.md](extensions.md) for builder-facing contracts and registration, and [deployment.md](deployment.md) for static hosting. Template preview images remain a separate stable manifest from engine capabilities.
