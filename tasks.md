# Storefront engine implementation tasks

Status: T001–T102 complete (2026-10-28). Implementation commit `619fad2bbc4af0c09f74266b9b977402416d7f1d` was pushed to `origin/main` and verified against the remote. Baseline application: `8c80ae6`; implementation starts at documentation commit `8915ba9`. See [the evidence report](docs/implementation-progress.md) and [baseline measurements](docs/implementation-baseline.md). Completion is assessed against the final compatibility/registry/static decisions in that report, which supersede the provisional internal refactors below.

## How to execute this checklist

1. Work through P00–P15 in order. Each phase depends on the preceding phase; task-specific dependencies identify additional prerequisites and make individual handoffs explicit.
2. Keep each task's code, examples, tests, and relevant documentation together. Proposed file paths may be refined when responsibility stays clear.
3. Check a task only after its acceptance evidence exists. Record the commit and relevant test/manual evidence in the phase log; do not check tasks merely because a schema field was added.
4. Preserve the five templates, all v1 stores, mock checkout, Fuse search relevance, cart persistence, and current preview-card consumers throughout the work.
5. Exclude builder interfaces/storage, backend services, payments, and remote plugin execution. When a feature needs an API capability, implement the contract, adapter, mock, and explicit unsupported state.
6. Run focused tests while implementing; run the full existing suite at architectural checkpoints and the final release gate. Do not replace behavior tests with snapshots that only mirror implementation objects.

Every task lists its requirement IDs, prerequisites, likely files, concrete steps, and acceptance evidence. E01–E14 are defined in the implementation plan. Shared foundation/release tasks support all requirements.

## Phase navigation

| Phase                                                                | Deliverable                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------- |
| [P00](#p00--establish-a-trustworthy-baseline)                        | Establish a trustworthy baseline                        |
| [P01](#p01--define-v2-contracts-and-compatibility)                   | Define v2 contracts and compatibility                   |
| [P02](#p02--replace-hardcoded-extension-switches)                    | Replace hardcoded extension switches                    |
| [P03](#p03--render-pages-and-resolve-navigation)                     | Render pages and resolve navigation                     |
| [P04](#p04--implement-global-themes-and-complete-typography)         | Implement global themes and complete typography         |
| [P05](#p05--add-independent-responsive-controls)                     | Add independent responsive controls                     |
| [P06](#p06--add-flexible-layouts-and-column-composition)             | Add flexible layouts and column composition             |
| [P07](#p07--centralize-business-information)                         | Centralize business information                         |
| [P08](#p08--implement-the-eight-additional-content-families)         | Implement the eight additional content families         |
| [P09](#p09--add-dynamic-collections-and-scalable-provider-contracts) | Add dynamic collections and scalable provider contracts |
| [P10](#p10--configure-product-and-category-page-composition)         | Configure product and category page composition         |
| [P11](#p11--complete-multilingual-and-rtl-rendering)                 | Complete multilingual and RTL rendering                 |
| [P12](#p12--add-seo-output-and-build-time-static-rendering)          | Add SEO output and build-time static rendering          |
| [P13](#p13--complete-diagnostics-and-exportable-contracts)           | Complete diagnostics and exportable contracts           |
| [P14](#p14--prepare-complete-examples-and-electroerp-handoff)        | Prepare complete examples and ElectroERP handoff        |
| [P15](#p15--verify-cross-feature-quality-and-release)                | Verify cross-feature quality and release                |

## P00 — Establish a trustworthy baseline

Exit gate: the existing engine is reproducible, its supported behavior is inventoried, and compatibility fixtures are protected.

### T001 — Record repository and tooling baseline

- [x] Complete T001.
- **Requirements:** all. **Depends on:** none.
- **Files:** `package.json`, lockfile, Vite/Playwright configuration, new `docs/implementation-baseline.md`.

**Steps**

1. Record commit, Node/npm/Chromium versions and install instructions.
2. Install using the existing lockfile; use the documented workspace npm cache when necessary.
3. Run typecheck, unit tests, production build/browser tests, and format check.
4. Record actual results and any pre-existing failures without presenting them as introduced regressions.

- **Accept when:** another developer can reproduce the recorded baseline, with no unexplained failures or changed dependencies.

### T002 — Inventory current configuration behavior

- [x] Complete T002.
- **Requirements:** E01–E14 compatibility. **Depends on:** T001.
- **Files:** `src/core/schema.ts`, `presentation.ts`, `public/stores/`, `public/stores/examples/`, `docs/implementation-baseline.md`.

**Steps**

1. List every current schema/presentation field and its renderer consumer.
2. Identify fields accepted but ignored by particular templates, including footer differences.
3. Record route/link/media-base behavior and automatic-benefits placement.
4. Mark intentional future bug fixes separately from behaviors that must remain stable.

- **Accept when:** the inventory covers all five native stores and all five customization examples and distinguishes supported controls from silent no-ops.

### T003 — Protect compatibility fixtures

- [x] Complete T003.
- **Requirements:** E01, E05, E07, E08, E10, E13. **Depends on:** T002.
- **Files:** new `src/core/config/__fixtures__/`, `src/core/configuration.test.ts`, existing browser tests.

**Steps**

1. Preserve representative v1 inputs before migrating public demos.
2. Include explicit false/zero, missing optional settings, curated product order, section overrides, and legacy contact URLs.
3. Add behavior assertions for normalization-sensitive defaults and legacy route destinations.
4. Keep existing commerce/search tests as regression evidence rather than duplicating them.

- **Accept when:** a changed default, lost curated order, or removed v1 route causes a meaningful failure.

### T004 — Capture visual and performance measurements

- [x] Complete T004.
- **Requirements:** E03–E05, E10, release quality. **Depends on:** T003.
- **Files:** `scripts/capture-template-previews.mjs`, existing template tests, baseline document.

**Steps**

1. Capture five native and representative customized pages at mobile/tablet/desktop widths.
2. Record initial compressed JS, loaded chunks/fonts, hero loading, and overflow.
3. Record a deterministic catalog benchmark setup and hardware/runtime details.
4. Keep baseline captures outside shipped assets unless intentionally used for regression fixtures.

- **Accept when:** later template and performance comparisons have repeatable inputs and measured values.

## P01 — Define v2 contracts and compatibility

Exit gate: raw v1/v2 input becomes one normalized model with stable field diagnostics; contracts anticipate routing, localization, extensions, and static rendering.

### T005 — Define module ownership and public types

- [x] Complete T005.
- **Requirements:** all. **Depends on:** T004.
- **Files:** new `src/core/config/types.ts`, `src/engine/types.ts`, `docs/architecture.md`.

**Steps**

1. Separate input, normalized, and locale-resolved types.
2. Define engine construction, validation, resolution, and rendering boundaries.
3. Specify stable IDs, source-path tracking, extension versions, and provider context.
4. Select and document the small plural/interpolation library used later; assess bundle size and static-render compatibility before adding it.

- **Accept when:** contracts have no browser-global dependencies and existing components can migrate through explicit adapters.

### T006 — Preserve v1 and implement version dispatch

- [x] Complete T006.
- **Requirements:** E13 and compatibility. **Depends on:** T005.
- **Files:** new `src/core/config/v1.ts`, `version.ts`; `src/core/schema.ts` facade.

**Steps**

1. Preserve the current v1 parsing/default semantics.
2. Dispatch using the literal version before parsing the full document.
3. Return explicit missing/unsupported-version diagnostics.
4. Keep legacy imports working during the refactor and prevent unsupported major versions from being parsed as v1.

- **Accept when:** all legacy fixtures parse and unknown versions fail with the correct code/path.

### T007 — Implement the v2 document and shared value schemas

- [x] Complete T007.
- **Requirements:** all contract foundations. **Depends on:** T006.
- **Files:** new `src/core/config/v2.ts`, shared content/media/localization schemas, v2 fixtures.

**Steps**

1. Define the plan's top-level fields and stable page/section identities.
2. Add localized text, typed destination, responsive value, media-reference, and extension requirement contracts.
3. Enforce strict unknown-key handling and documented bounds, including 100 pages/section nodes and bounded nesting.
4. Add minimal valid, richly configured, and invalid fixtures without implementing every renderer yet.

- **Accept when:** valid v2 fixtures parse, invalid fields have precise locations, and defaulting does not fill sparse overrides prematurely.

### T008 — Build structured diagnostics and path mapping

- [x] Complete T008.
- **Requirements:** E13. **Depends on:** T007.
- **Files:** new `src/core/config/diagnostics.ts`, validation tests.

**Steps**

1. Implement stable code/severity/path/pointer/message records and result unions.
2. Map Zod issues without leaking implementation-only fields.
3. Encode JSON Pointer escaping and related paths correctly.
4. Sort/deduplicate diagnostics deterministically and introduce source-path provenance for normalization.

- **Accept when:** nested array errors, keys containing `/` or `~`, and migrated fields point to the original input consistently.

### T009 — Normalize v1 into the new model

- [x] Complete T009.
- **Requirements:** E01, E05, E07, E08, E10, E13. **Depends on:** T008.
- **Files:** new `src/core/config/normalize-v1.ts`, normalizer entry point, compatibility tests.

**Steps**

1. Convert homepage sections and legacy information pages to stable page definitions.
2. Map theme/presentation fields, legacy links, locale, and product-section selectors.
3. Preserve automatic-benefits position and legacy URL bases.
4. Retain mode-aware legacy information fallback markers without copying demo assertions into API content.

- **Accept when:** all protected v1 fixtures resolve to equivalent page order, theme values, collection selection, and destinations with correct source diagnostics.

### T010 — Add an explicit migration utility

- [x] Complete T010.
- **Requirements:** E13 and integration. **Depends on:** T009.
- **Files:** new `scripts/migrate-store-config.mjs`, migration examples and tests.

**Steps**

1. Accept input/output paths and use the same normalization pipeline.
2. Write reviewable v2 JSON and a diagnostic report.
3. Refuse input overwrite by default; report unsupported/lossy values.
4. Verify idempotent normalization and document relative media/link behavior when output location changes.

- **Accept when:** migrating every v1 fixture yields valid v2 output without silently losing supported settings or changing resolved media URLs.

### T011 — Stabilize config loading and contracts checkpoint

- [x] Complete T011.
- **Requirements:** E13 and all foundation consumers. **Depends on:** T010.
- **Files:** `src/providers/data.ts`, config loader, `src/main.tsx`, config tests.

**Steps**

1. Route config reads through version dispatch/normalization, retaining a temporary prop adapter for renderers not yet migrated.
2. Preserve aborts and startup retry behavior.
3. Return structured integration diagnostics separately from customer-facing recovery copy.
4. Run the existing regression suite plus normalization tests before beginning renderer changes.

- **Accept when:** mock/HTTP fixtures still load, malformed input is recoverable, and legacy store behavior remains intact.

## P02 — Replace hardcoded extension switches

Exit gate: built-in and trusted custom section/provider definitions share a registry contract and exported settings schema.

### T012 — Implement registry infrastructure

- [x] Complete T012.
- **Requirements:** E14, E13. **Depends on:** T011.
- **Files:** new `src/engine/registry.ts`, `create-engine.ts`, registry tests.

**Steps**

1. Register section/template/provider/font definitions before validation.
2. Enforce namespaced custom IDs and compatible versions.
3. Reject duplicate registrations and freeze engine instances.
4. Expose lookup/capability APIs without exposing mutable global state.

- **Accept when:** independent engine instances cannot leak registrations and duplicate/missing/incompatible extensions produce deterministic diagnostics.

### T013 — Register existing sections and template adapters

- [x] Complete T013.
- **Requirements:** E14 and template compatibility. **Depends on:** T012.
- **Files:** `src/templates/registry.tsx`, `types.ts`, new `src/sections/builtins.ts`.

**Steps**

1. Wrap the seven current section families in definitions.
2. Adapt all seven native template slots without flattening their compositions.
3. Preserve shared lazy module promises and explicit cross-template overrides.
4. Publish supported layout/settings metadata for each definition.

- **Accept when:** five templates and configured overrides render through registration while loading only the required template modules.

### T014 — Introduce a generic section renderer

- [x] Complete T014.
- **Requirements:** E01, E14. **Depends on:** T013.
- **Files:** new `src/engine/SectionRenderer.tsx`, extracted section frame, `src/templates/registry.tsx`.

**Steps**

1. Resolve definitions and template overrides through the registry.
2. Pass resolved props and typed render/data context.
3. Remove the central type switch once equivalent paths exist.
4. Add lazy loading and per-section error boundaries with meaningful accessible states.

- **Accept when:** existing sections still behave correctly and a failed optional renderer does not crash the full shopping journey.

### T015 — Register provider adapters and export metadata

- [x] Complete T015.
- **Requirements:** E14, E13. **Depends on:** T014.
- **Files:** `src/providers/data.ts`, new provider registry, `scripts/export-config-schema.mjs`.

**Steps**

1. Register current mock/HTTP factories behind typed bootstrap schemas.
2. Add provider capability descriptors without claiming new query support yet.
3. Compose config JSON Schema from the selected section registry.
4. Include engine/schema/extension build versions in exported metadata.

- **Accept when:** schema exports describe the same enabled definitions as runtime validation and provider creation still supports existing bootstraps.

### T016 — Prove external section and data-source integration

- [x] Complete T016.
- **Requirements:** E14. **Depends on:** T015.
- **Files:** new `src/extensions/examples/`, integration fixtures/tests.

**Steps**

1. Add a `demo:notice` section with custom settings and validation.
2. Add a fixture provider adapter that supplies data through the public interface.
3. Register both at the composition root only.
4. Test unknown/disabled extension versions and document how to omit examples from production bundles.

- **Accept when:** no edits to the central renderer or central section union are needed to activate either example.

### T017 — Verify registry compatibility and isolation

- [x] Complete T017.
- **Requirements:** E14, E13. **Depends on:** T016.
- **Files:** registry/schema tests, existing template browser tests.

**Steps**

1. Test malformed extension settings, unsupported contexts, duplicate IDs, and renderer failures.
2. Verify schema-export determinism.
3. Re-run all five native/customization template paths and existing commerce flows.
4. Record bundle-loading changes against baseline.

- **Accept when:** the registry refactor has passing compatibility evidence and no hidden eager loading of unused templates.

## P03 — Render pages and resolve navigation

Exit gate: configurable pages and typed links work in both routing modes, with preserved legacy URLs and safe section navigation.

### T018 — Implement page and route-table validation

- [x] Complete T018.
- **Requirements:** E01, E07, E13. **Depends on:** T017.
- **Files:** new `src/core/routing/pages.ts`, `routes.ts`, route tests.

**Steps**

1. Validate page IDs, locale paths, page-wide section IDs, and enabled state.
2. Reserve system/entity/locale prefixes.
3. Normalize encoding, separators, trailing slashes, and base paths before checking collisions.
4. Build one deterministic route table suitable for browser and static rendering.

- **Accept when:** duplicate/encoded-equivalent/reserved paths fail with both conflicting source locations identified.

### T019 — Extract an environment-independent application root

- [x] Complete T019.
- **Requirements:** E01, E12 foundation. **Depends on:** T018.
- **Files:** new `src/app/App.tsx`, browser bootstrap; `src/main.tsx`, provider initialization, context.

**Steps**

1. Separate fetched store initialization from React composition.
2. Inject routing/location and data rather than reading `document` during pure rendering.
3. Move storage/window access behind browser-only effects/adapters.
4. Keep error boundaries, Suspense, order behavior, and initial loading intact.

- **Accept when:** importing the application/model modules in Node does not access browser globals and normal browser startup is unchanged.

### T020 — Render configured pages and legacy information routes

- [x] Complete T020.
- **Requirements:** E01. **Depends on:** T019.
- **Files:** new `src/engine/PageRenderer.tsx`, page schemas, `src/pages/Information.tsx`.

**Steps**

1. Render any enabled content page from its ordered sections.
2. Implement page title/hero heading ownership and optional chrome visibility.
3. Route home/story/shipping/contact through normalized page definitions.
4. Add About, FAQ, policy, and campaign fixtures with different compositions.

- **Accept when:** new pages require JSON changes only, each page has one primary heading, and legacy routes still render expected merchant content.

### T021 — Add hash/history router selection and base paths

- [x] Complete T021.
- **Requirements:** E01, E07, E12 foundation. **Depends on:** T020.
- **Files:** routing adapter, `src/main.tsx`, `vite.config.ts`, hosting fixtures.

**Steps**

1. Keep hash mode as legacy default.
2. Add explicit history mode and validated deployment base path.
3. Route all system/entity/content paths through the shared builder.
4. Preserve query state, back/forward navigation, direct loads, and not-found behavior.

- **Accept when:** identical stores work at root and `/shop/`, nested reloads work with documented host rules, and asset URLs remain valid.

### T022 — Implement typed destination resolution

- [x] Complete T022.
- **Requirements:** E07. **Depends on:** T021.
- **Files:** new `src/core/routing/links.ts`, link schemas, resolver tests.

**Steps**

1. Resolve page/product/category/section/system/external/path destinations.
2. Handle missing, disabled, and unresolved targets without inventing URLs.
3. Validate protocols, traversal, URL encoding, target/rel, and allowed query fields.
4. Add a bounded asynchronous entity-resolution seam for partial catalogs; business contact kinds finish in P07.

- **Accept when:** valid known targets resolve consistently and unsafe or unresolved required links return actionable diagnostics.

### T023 — Migrate every internal link consumer

- [x] Complete T023.
- **Requirements:** E07, E11 foundation. **Depends on:** T022.
- **Files:** `src/components/Shared.tsx`, navigation/search components, template shared helpers, all five templates and commerce pages.

**Steps**

1. Make StoreLink accept resolved/typed destinations while adapting legacy hrefs.
2. Replace hardcoded product/catalog/cart paths.
3. Preserve modifier-click, new-tab semantics, active states, and external navigation.
4. Search for remaining direct route construction and justify any exception.

- **Accept when:** base-path and locale-aware links work from every navigation surface, including search results and checkout confirmation.

### T024 — Implement section-anchor navigation and focus

- [x] Complete T024.
- **Requirements:** E07, E04. **Depends on:** T023.
- **Files:** new anchor navigation service/hook, page/section renderers, layout styles.

**Steps**

1. Encode typed anchors as fragments in history mode and reserved route parameters in hash mode.
2. Wait for lazy target content, then scroll/focus safely.
3. Account for sticky headers, reduced motion, disabled/hidden sections, and back navigation.
4. Cancel pending work when navigation changes.

- **Accept when:** same-page/cross-page anchors work with keyboard and deep links in both modes without fragment/router conflicts.

### T025 — Complete multi-page navigation checkpoint

- [x] Complete T025.
- **Requirements:** E01, E07. **Depends on:** T024.
- **Files:** new `tests/pages.spec.ts`, routing unit tests, existing browser tests.

**Steps**

1. Exercise page order, nested sections, missing routes, direct reloads, and disabled page links.
2. Verify chrome overrides and primary headings.
3. Run root/subdirectory and hash/history cases.
4. Re-run legacy navigation, cart, and search regressions.

- **Accept when:** all route/link modes pass and adding a simple page is demonstrated without a new React route component.

## P04 — Implement global themes and complete typography

Exit gate: documented tokens and semantic type roles apply consistently without erasing template identity.

### T026 — Define semantic tokens and typography roles

- [x] Complete T026.
- **Requirements:** E05, E10. **Depends on:** T025.
- **Files:** new `src/core/theme/schema.ts`, token fixtures, legacy mapping.

**Steps**

1. Define palette, spacing, widths, radius/shadow, and component state tokens.
2. Define h1–h6/body/lead/caption/eyebrow/button/navigation/input metrics and units.
3. Apply bounds and registered font IDs.
4. Map legacy colors, font names, weight, radius, and button styles without changing default appearance.

- **Accept when:** rich theme inputs validate and invalid units/fonts/states produce field-specific errors.

### T027 — Implement layered theme resolution and lifecycle

- [x] Complete T027.
- **Requirements:** E05, E10. **Depends on:** T026.
- **Files:** new `src/core/theme/resolve.ts`, `apply.ts`, theme provider/hook.

**Steps**

1. Resolve engine/template/global/page/section/block layers.
2. Preserve sparse settings and explicit zero/false.
3. Apply scoped CSS variables and clean up removed keys on changes.
4. Ensure portal-mounted controls receive the correct store/page tokens.

- **Accept when:** precedence and token-removal tests pass, and changing config cannot retain a previous theme's overrides.

### T028 — Apply tokens across templates and shared controls

- [x] Complete T028.
- **Requirements:** E05, E10. **Depends on:** T027.
- **Files:** all template CSS, `src/styles.css`, `customization.css`, dropdown/control/card components.

**Steps**

1. Replace conflicting hardcoded style values with semantic fallback tokens.
2. Apply typography metrics to headings, navigation, buttons, inputs, captions, and body copy.
3. Cover hover/focus/disabled styles and contrast tones.
4. Preserve native template structure and same-palette visual differentiation.

- **Accept when:** explicit global settings affect all five templates and dropdown portals while default compositions remain distinct.

### T029 — Implement font registration and loading behavior

- [x] Complete T029.
- **Requirements:** E05, E11 foundation. **Depends on:** T028.
- **Files:** font registry, font imports/assets, theme documentation.

**Steps**

1. Register current bundled fonts and appropriate fallback stacks.
2. Add a licensed self-hosted Arabic-capable font for the RTL fixture.
3. Load only required families/weights and document trusted custom registration.
4. Handle missing/unsupported glyph coverage without layout-breaking blank text.

- **Accept when:** configured families actually load, fallback behavior is visible/tested, and font names are not treated as an upload/remote-CSS feature.

### T030 — Verify theme and typography integration

- [x] Complete T030.
- **Requirements:** E05, E10. **Depends on:** T029.
- **Files:** theme unit tests, new theme browser tests, visual fixtures.

**Steps**

1. Test heading levels, line height, letter spacing, button/nav overrides, and section tones.
2. Test local overrides and removed settings.
3. Check long content, 200% zoom, focus visibility, and portals in five templates.
4. Compare baseline screenshots and record intentional differences.

- **Accept when:** supported theme fields demonstrably render and no template silently ignores a newly supported control.

## P05 — Add independent responsive controls

Exit gate: every supported responsive property follows one documented inheritance model and boundary set.

### T031 — Implement responsive value resolution

- [x] Complete T031.
- **Requirements:** E04. **Depends on:** T030.
- **Files:** new `src/core/theme/responsive.ts`, responsive schemas/tests.

**Steps**

1. Define base/mobile/tablet/desktop values and fixed 768/1024 boundaries.
2. Apply base plus the active device at each inheritance layer.
3. Keep tablet/desktop independent from mobile overrides.
4. Reject invalid nulls/ranges and preserve explicit values.

- **Accept when:** unit tests cover missing values, false/zero, specificity, and each boundary without ambiguous cascade behavior.

### T032 — Generate responsive styles without duplicate trees

- [x] Complete T032.
- **Requirements:** E04, E10. **Depends on:** T031.
- **Files:** style generation/scoping module, section/page wrappers, responsive CSS.

**Steps**

1. Translate validated values into scoped variables/media rules.
2. Keep names deterministic and bounded.
3. Support static rendering without window-width reads.
4. Remove obsolete generated styles on config changes and avoid per-render stylesheet accumulation.

- **Accept when:** one content DOM tree supports all widths with no hydration mismatch or leaking style rules.

### T033 — Connect responsive controls to rendering

- [x] Complete T033.
- **Requirements:** E04, E05. **Depends on:** T032.
- **Files:** theme/section frames, typography consumers, card/grid/media primitives.

**Steps**

1. Enable typography, padding/gap, alignment, columns, media sizing/side, and visibility overrides.
2. Map existing mobileColumns/columns through compatibility normalization.
3. Ensure hidden sections leave focus/accessibility traversal.
4. Preserve essential purchase/checkout controls regardless of optional marketing visibility.

- **Accept when:** each advertised responsive setting affects actual rendered output and hidden content cannot trap keyboard focus.

### T034 — Migrate direction-sensitive CSS and interactions

- [x] Complete T034.
- **Requirements:** E04, E11 foundation. **Depends on:** T033.
- **Files:** shared/template CSS, navigation/gallery arrows, form/card components.

**Steps**

1. Use logical margins/padding/borders/start/end alignment.
2. Add explicit direction context to controls and portals.
3. Identify icons requiring mirroring and preserve product/logo imagery.
4. Isolate phone/SKU/model strings for mixed-direction text.

- **Accept when:** an RTL smoke fixture has usable navigation and forms before full translation work starts.

### T035 — Verify responsive boundaries and accessibility

- [x] Complete T035.
- **Requirements:** E04. **Depends on:** T034.
- **Files:** responsive unit/browser tests, representative long-text fixtures.

**Steps**

1. Check 390, 767, 768, 1023, 1024, and 1440px cases.
2. Verify no global horizontal overflow, clipping, or duplicate content.
3. Test visibility, focus order, reduced motion, and zoom.
4. Exercise five-template smoke coverage and exhaustive representative settings.

- **Accept when:** device overrides act independently and no supported viewport hides required customer actions.

## P06 — Add flexible layouts and column composition

Exit gate: bounded section trees support useful layout variety with stable reading order.

### T036 — Define the layout and container contracts

- [x] Complete T036.
- **Requirements:** E03, E13. **Depends on:** T035.
- **Files:** new layout schemas, `columns` section definition, registry context metadata.

**Steps**

1. Specify stack/grid/split layouts, proportions, gap, width, alignment, padding, and background fields.
2. Define column cells with ordered child sections.
3. Enforce three container levels, six cells, 100 nodes/page, and allowed child contexts.
4. Validate IDs across the entire page tree.

- **Accept when:** valid nested layouts parse and excessive depth/nodes/duplicate nested IDs report exact source paths.

### T037 — Build reusable layout primitives

- [x] Complete T037.
- **Requirements:** E03, E04. **Depends on:** T036.
- **Files:** new `src/components/layout/`, extracted section frame/styles.

**Steps**

1. Implement contained content/full background, stack, grid, and split primitives.
2. Apply responsive proportions/alignment.
3. Preserve DOM reading order and allow children to shrink without overflow.
4. Expose predictable class/token hooks for template overrides.

- **Accept when:** primitives support asymmetrical layouts and small-screen collapse without changing logical reading order.

### T038 — Implement columns rendering and legacy layout adapters

- [x] Complete T038.
- **Requirements:** E03, E14. **Depends on:** T037.
- **Files:** new columns renderer, existing configurable sections, legacy normalizer.

**Steps**

1. Render child sections recursively through the registry.
2. Pass page/section context and inherited theme values.
3. Adapt current split/centered/grid/rail settings to the common primitives.
4. Prevent unbounded nesting or accidental duplicate section anchors.

- **Accept when:** pages can mix rich column arrangements and existing section layouts still match their intended defaults.

### T039 — Add background and media treatments

- [x] Complete T039.
- **Requirements:** E03, E04. **Depends on:** T038.
- **Files:** media/background primitives, layout schema, image helpers.

**Steps**

1. Add solid/theme backgrounds, decorative images, and bounded overlays.
2. Apply image fit, focal point, aspect ratio, and responsive side/ratio.
3. Reserve media dimensions and distinguish decorative/informative alt behavior.
4. Handle missing optional media without leaving broken image placeholders.

- **Accept when:** configured treatments render across themes with stable geometry and correct accessibility semantics.

### T040 — Verify complex layout compositions

- [x] Complete T040.
- **Requirements:** E03, E04. **Depends on:** T039.
- **Files:** layout unit/browser tests, multi-page fixtures.

**Steps**

1. Exercise two/three-column, 1:2 split, nested, full-background/contained-content examples.
2. Test invalid nesting and unknown child types.
3. Check mobile/RTL reading order and section anchors.
4. Verify that these compositions remain usable with long translations.

- **Accept when:** layout variation is functional, bounded, accessible, and independently configurable from colors.

## P07 — Centralize business information

Exit gate: all contact surfaces reference one structured business model with correct links and hours.

### T041 — Implement business/location/contact schemas

- [x] Complete T041.
- **Requirements:** E06, E13. **Depends on:** T040.
- **Files:** new `src/core/business/schema.ts`, config schema, fixtures.

**Steps**

1. Define named contact methods, social profiles, and stable location IDs.
2. Add localized labels, structured addresses, coordinates/map destinations, and time zones.
3. Distinguish optional display fields from required referenced fields.
4. Add fictional multi-location fixtures.

- **Accept when:** one business record can supply footer, page, map, and future SEO data without duplicated facts.

### T042 — Implement hours validation and display rules

- [x] Complete T042.
- **Requirements:** E06, E11. **Depends on:** T041.
- **Files:** new business hours helpers/tests, opening-hours display component.

**Steps**

1. Model split intervals, closed/24-hour days, overnight next-day ends, and dated exceptions.
2. Validate overlap, ordering, dates, and IANA zones.
3. Format day/time labels by locale while retaining location time zone.
4. Document DST and exception precedence if current-open status is exposed.

- **Accept when:** overnight, holiday, closed, and multi-interval examples render correctly without depending on the visitor's time zone.

### T043 — Add phone, email, WhatsApp, and business references

- [x] Complete T043.
- **Requirements:** E06, E07. **Depends on:** T042, T022.
- **Files:** destination schemas/resolver, business reference resolution/tests.

**Steps**

1. Resolve values or named business references to tel/mailto/wa.me links.
2. Normalize international numbers without changing display labels.
3. Encode messages/addresses safely and reject control characters/unsafe schemes.
4. Validate missing contact/location references with original paths.

- **Accept when:** contact links are actionable on desktop/mobile and malicious/malformed values cannot create unsafe destinations.

### T044 — Build shared business display components

- [x] Complete T044.
- **Requirements:** E06. **Depends on:** T043.
- **Files:** new address/contact/hours/social components, template footer/header helpers.

**Steps**

1. Render semantic address/contact lists with consistent typography.
2. Support selection/order of referenced contact fields.
3. Omit absent optional rows without empty labels.
4. Connect configurable header/footer contact blocks while preserving each template composition.

- **Accept when:** updating one business fact updates every configured surface, including cross-template header/footer selections.

### T045 — Replace hardcoded contact and shipping fallback claims

- [x] Complete T045.
- **Requirements:** E01, E06. **Depends on:** T044, T020.
- **Files:** normalized legacy pages, `src/pages/Information.tsx`, mock/API fixtures.

**Steps**

1. Bind configured contact pages to business components.
2. Use merchant shipping/policy content where supplied.
3. Restrict fictional/no-shipping demo copy to mock mode.
4. Provide neutral empty guidance for missing API business information without inventing support details.

- **Accept when:** API fixtures display no unconditional fictional demo statements and mock checkout/store disclosures remain clear.

### T046 — Verify business integration

- [x] Complete T046.
- **Requirements:** E06, E07. **Depends on:** T045.
- **Files:** business unit tests, contact/footer browser tests.

**Steps**

1. Test multiple locations and hours exceptions.
2. Verify contact destinations and absent-field behavior.
3. Exercise all five footers and a configurable contact page.
4. Check RTL addresses, mixed-direction phone/email text, and keyboard links.

- **Accept when:** all public business information is consistent, accessible, and traceable to a configured source.

## P08 — Implement the eight additional content families

Exit gate: every new family has a registered schema, renderer, example, and meaningful accessibility/error checks.

### T047 — Implement contact-details sections

- [x] Complete T047.
- **Requirements:** E02, E06. **Depends on:** T046.
- **Files:** new `src/sections/contact-details/`, registry, examples.

**Steps**

1. Add business/location references and selected field groups.
2. Support stacked/grid layouts and localized heading/copy.
3. Reuse business display components and responsive primitives.
4. Validate missing required references and optional-empty behavior.

- **Accept when:** the same contact section works on homepage/contact/campaign pages without duplicated data logic.

### T048 — Implement map sections

- [x] Complete T048.
- **Requirements:** E02, E06, E07. **Depends on:** T047.
- **Files:** new `src/sections/map/`, approved embed helper, CSP documentation.

**Steps**

1. Support location text/map link and optional static poster.
2. Add approved provider embeds by structured settings, never raw iframe HTML.
3. Load embeds lazily or on request with reserved size and descriptive title.
4. Render a usable address/directions fallback when blocked or disabled.

- **Accept when:** maps work without secret client keys, do not block page load, and retain a meaningful fallback under blocked network access.

### T049 — Implement galleries and accessible lightboxes

- [x] Complete T049.
- **Requirements:** E02, E03, E04. **Depends on:** T048.
- **Files:** new `src/sections/gallery/`, shared lightbox/media components.

**Steps**

1. Add media items, alt/caption/link, ratio/crop, grid/rail options.
2. Implement optional keyboard lightbox with focus trap/restoration and Escape.
3. Preserve dimensions, lazy loading, and reduced motion.
4. Test broken image fallback and duplicate/empty item validation.

- **Accept when:** gallery browsing works with keyboard/touch in LTR/RTL and no lightbox leaves focus behind the overlay.

### T050 — Implement testimonials

- [x] Complete T050.
- **Requirements:** E02. **Depends on:** T049.
- **Files:** new `src/sections/testimonials/`, schema/fixtures/tests.

**Steps**

1. Model quote, attribution, optional role/avatar/rating.
2. Render grid/rail with semantic quotations and readable long text.
3. Validate rating bounds and omit absent ratings/images.
4. Mark demonstration endorsements fictional and avoid automatic aggregate-rating metadata.

- **Accept when:** merchant-supplied content renders faithfully with optional fields absent and no fabricated claims.

### T051 — Implement brand-logo sections

- [x] Complete T051.
- **Requirements:** E02, E03. **Depends on:** T050.
- **Files:** new `src/sections/brand-logos/`, media fixtures/tests.

**Steps**

1. Model name/image/optional typed link and sizing.
2. Render grid/rail preserving each logo's ratio.
3. Provide accessible names and sensible missing-image behavior.
4. Avoid mandatory animation; keep focusable linked logos usable at narrow widths.

- **Accept when:** different-shaped logos align intentionally and links use the central resolver.

### T052 — Implement video sections

- [x] Complete T052.
- **Requirements:** E02, E04. **Depends on:** T051.
- **Files:** new `src/sections/video/`, shared embed/media helpers.

**Steps**

1. Support self-hosted video and approved provider IDs with poster/aspect ratio.
2. Add caption-track/transcript configuration and accessible control labels.
3. Prevent audible autoplay; gate heavy requests appropriately.
4. Validate source/provider settings and show a playable link/text fallback on failure.

- **Accept when:** keyboard controls, captions/transcripts, loading states, CSP restrictions, and reduced-motion behavior are verified.

### T053 — Implement comparison tables

- [x] Complete T053.
- **Requirements:** E02, E09 foundation. **Depends on:** T052.
- **Files:** new `src/sections/comparison-table/`, fixtures/tests.

**Steps**

1. Define localized columns, feature rows, text/boolean cells, and optional entity references.
2. Render native table/caption/header associations.
3. Contain horizontal scrolling on mobile without losing labels.
4. Define unavailable entity/cell fallback and reject inconsistent row widths.

- **Accept when:** table relationships are accessible and long/missing values do not break the page layout.

### T054 — Implement promotional collection presentation

- [x] Complete T054.
- **Requirements:** E02, E08 foundation. **Depends on:** T053.
- **Files:** new `src/sections/promotional-collections/`, collection reference schema.

**Steps**

1. Add cards with named collection references, media, localized copy, and typed destinations.
2. Render static promotional information without fabricating query results.
3. Define the data-requirement interface and loading/empty/error slots for P09.
4. Validate missing collection references at config level.

- **Accept when:** collection promotions render correctly and explicitly await the shared query service for optional live previews.

### T055 — Validate all new section families together

- [x] Complete T055.
- **Requirements:** E02, E03, E04. **Depends on:** T054.
- **Files:** new section gallery fixtures, `tests/sections.spec.ts`, schema tests.

**Steps**

1. Include every section type in a multi-page fixture.
2. Test empty/malformed content, network/media errors, and extension boundaries.
3. Check keyboard, responsive, RTL smoke, and reduced-motion states.
4. Smoke-test visual consistency in all five templates.

- **Accept when:** all eight families have evidence beyond schema acceptance; final promotional-query behavior is tracked in T062.

## P09 — Add dynamic collections and scalable provider contracts

Exit gate: complete local catalogs and paginated APIs produce equivalent declared query behavior; partial data never masquerades as full results.

### T056 — Extend catalog metadata compatibly

- [x] Complete T056.
- **Requirements:** E08, E09, E11. **Depends on:** T055.
- **Files:** product/category schemas and adapters, mock catalogs, contract tests.

**Steps**

1. Add optional created/updated timestamps, localized entity text/slugs, rich media, and structured specification groups.
2. Adapt existing string images/details without changing IDs/variants.
3. Validate timestamps, media bases, unique localized slugs, and field bounds.
4. Populate representative fictional data without inventing dates for unchanged legacy inputs.

- **Accept when:** old catalogs still load and new date/specification/localization data is explicit and validated.

### T057 — Define query and pagination contracts

- [x] Complete T057.
- **Requirements:** E08, E13. **Depends on:** T056.
- **Files:** new `src/core/collections/schema.ts`, provider types, named collection config.

**Steps**

1. Specify allowed filters, AND/OR semantics, ordered IDs, sort choices, and page-size bounds.
2. Define complete/partial coverage and supported operator/sort capabilities.
3. Define cursor response/optional total/revision and context keys.
4. Document same-variant price/stock/discount matching and missing-date behavior.

- **Accept when:** request/response examples unambiguously define what a matching product, result count, and next page mean.

### T058 — Implement the complete-catalog evaluator

- [x] Complete T058.
- **Requirements:** E08. **Depends on:** T057.
- **Files:** new collection normalizer/evaluator, `src/core/sections.ts`, query unit tests.

**Steps**

1. Apply ordered ID/category/brand/collection/date/variant predicates.
2. Sort with stable ID tie-breaks and localized name collation.
3. Return qualifying variant/price metadata needed by cards without mutating products.
4. Implement deterministic mock pagination and preserve legacy selectors through adapters.

- **Accept when:** tests cover cheap sold-out versus expensive stocked variants, discounts/zero prices, missing dates, duplicate IDs, and stable pagination.

### T059 — Implement remote query and entity-resolution adapters

- [x] Complete T059.
- **Requirements:** E08, E07, E14. **Depends on:** T058, T022.
- **Files:** provider adapters/registry, `docs/api-contract.md`, intercepted HTTP fixtures.

**Steps**

1. Add capability-aware query requests and validated paginated responses.
2. Add bounded entity lookup for links/overrides outside initial data.
3. Pass locale/store/currency and revision context.
4. Mark legacy API coverage partial/unknown unless explicitly complete. Preserve legacy loaded-subset views with explicit scope, and reject unsupported v2 global queries instead of using a misleading local subset.

- **Accept when:** stubbed API behavior matches the proposed contract and incomplete capabilities produce an explicit integration state.

### T060 — Add query caching and request lifecycle

- [x] Complete T060.
- **Requirements:** E08, E11. **Depends on:** T059.
- **Files:** new query service/hook, store cache integration, request lifecycle tests.

**Steps**

1. Normalize keys across store/locale/currency/query/page/revision.
2. Deduplicate identical reads and bound cache size/expiry.
3. Abort obsolete requests, ignore stale responses, and reset pages on filter/locale changes.
4. Keep customer/order state out of caches and avoid automatic mutation retries.

- **Accept when:** rapid filter/locale changes cannot display old results, duplicate reads share work, and tests verify cache isolation/eviction.

### T061 — Connect product sections and catalog filters

- [x] Complete T061.
- **Requirements:** E08. **Depends on:** T060.
- **Files:** product-section renderers, `src/pages/Catalog.tsx`, filter URL integration.

**Steps**

1. Resolve named/inline queries through the shared service.
2. Add brand, price range, stock, newest, and discount rules to sections.
3. Use provider capabilities for controls/pagination and keep each card's quick-add variant consistent with its displayed qualifying price; require selection where options demand it.
4. Show clear loading/empty/error/unsupported states and preserve legacy URL filters.

- **Accept when:** section and catalog results agree for equivalent queries in complete mock and paginated API fixtures.

### T062 — Finish promotional collection previews

- [x] Complete T062.
- **Requirements:** E02, E08. **Depends on:** T061, T054.
- **Files:** promotional collections renderer, data requirements, browser tests.

**Steps**

1. Resolve optional preview products through shared queries.
2. Bound fan-out/deduplicate repeated collection requests.
3. Use qualifying prices/stock and correct destinations.
4. Apply configured empty behavior without leaving dead cards.

- **Accept when:** promotions reflect actual collection rules and degrade predictably when a collection is empty or remote queries fail.

### T063 — Verify provider parity and query performance

- [x] Complete T063.
- **Requirements:** E08, E13. **Depends on:** T062.
- **Files:** collection/provider contract tests, browser pagination tests, benchmark fixture.

**Steps**

1. Run the same semantic cases against local and stubbed remote providers.
2. Test partial catalog capability errors, cursors, duplicate pages, and aborted requests.
3. Benchmark 10,000 products against the documented p95 target.
4. Re-run exact SKU/model search and cart reconciliation tests.

- **Accept when:** query results are honest, stable, bounded, and do not regress search or shopping behavior.

## P10 — Configure product and category page composition

Exit gate: layout flexibility includes entity pages while purchase state remains authoritative and accessible.

### T064 — Define product blocks and category overrides

- [x] Complete T064.
- **Requirements:** E09, E14, E13. **Depends on:** T063.
- **Files:** new commerce composition schemas/registries, config overrides.

**Steps**

1. Define media/summary/details regions and allowed product block types.
2. Define global and per-entity overrides by stable ID.
3. Enforce required purchase-flow blocks and reject conflicting duplicates.
4. Define category pre/post-grid sections and filter/grid defaults.

- **Accept when:** valid compositions are configurable and a layout cannot remove or duplicate required transaction controls silently.

### T065 — Extract shared product state and render blocks

- [x] Complete T065.
- **Requirements:** E09. **Depends on:** T064.
- **Files:** `src/pages/Product.tsx`, new product context/blocks, cart integration.

**Steps**

1. Keep one selected variant/quantity state across all blocks.
2. Extract title/price/options/stock/purchase/description components.
3. Render ordered blocks in configured regions.
4. Preserve existing deep links, add-to-cart feedback, stock validation, and size-selection behavior.

- **Accept when:** changing layout does not desynchronize displayed price, media, stock, or the variant added to the cart.

### T066 — Add gallery modes and specification blocks

- [x] Complete T066.
- **Requirements:** E09, E03, E04. **Depends on:** T065.
- **Files:** product gallery/specification blocks, shared media/lightbox primitives.

**Steps**

1. Implement thumbnails/stacked/rail gallery modes and responsive region ratios.
2. Sync selected-variant media with accessible gallery controls.
3. Render grouped specifications with localized labels/units and old details fallback.
4. Handle missing optional media/specification groups without empty headings.

- **Accept when:** all gallery modes work by keyboard/touch and specifications remain readable on mobile/RTL layouts.

### T067 — Add configurable related products and policy content

- [x] Complete T067.
- **Requirements:** E09, E08. **Depends on:** T066.
- **Files:** related/delivery blocks, collection query integration, page links.

**Steps**

1. Support category/brand/named-query related rules.
2. Exclude current product and deduplicate results.
3. Define empty/error fallback and bounded result count.
4. Bind delivery/returns blocks to merchant content or typed policy-page destinations.

- **Accept when:** related results follow configured rules and policy content contains no unconditional demo or fabricated merchant claims.

### T068 — Implement category landing routes and composition

- [x] Complete T068.
- **Requirements:** E09, E01, E07. **Depends on:** T067.
- **Files:** new category page, route resolver, catalog grid/filter components.

**Steps**

1. Resolve category identity and localized route from provider data.
2. Render category title/media plus registered pre/post-grid sections.
3. Apply global/category-specific grid/filter/sort settings and remote pagination.
4. Keep legacy catalog category queries functional and record their canonical destination.

- **Accept when:** known and remotely resolved category pages load directly and display the correct collection without duplicating catalog filtering logic.

### T069 — Define template defaults for entity pages

- [x] Complete T069.
- **Requirements:** E09, E10. **Depends on:** T068.
- **Files:** all five template definitions/styles, commerce presets.

**Steps**

1. Express native product/category layouts as defaults through the new contracts.
2. Honor explicit global/page overrides consistently.
3. Preserve template-specific gallery/grid/summary treatment.
4. Document unavailable optional overrides through capabilities.

- **Accept when:** same-palette comparisons remain distinct and configured entity-page controls work across five templates.

### T070 — Verify customizable commerce journeys

- [x] Complete T070.
- **Requirements:** E09. **Depends on:** T069.
- **Files:** product/category browser tests, block schema tests, existing checkout tests.

**Steps**

1. Test several block orders, gallery modes, missing specifications, and related rules.
2. Exercise stock changes, invalid variant combinations, cart persistence, and direct product reloads.
3. Test partial API catalogs/category pagination.
4. Run mock and stubbed API checkout regression journeys.

- **Accept when:** entity-page customization has no loss of transaction correctness or accessibility.

## P11 — Complete multilingual and RTL rendering

Exit gate: English and Arabic fixtures provide coherent translated content, UI, routes, data queries, and customer journeys.

### T071 — Implement locale resolution and dictionaries

- [x] Complete T071.
- **Requirements:** E11. **Depends on:** T070, T005, T007.
- **Files:** new `src/core/i18n/`, locale provider, UI dictionaries.

**Steps**

1. Resolve supported locale/direction from the route and configuration.
2. Implement requested/fallback/default content resolution.
3. Integrate the selected translation library with plural/interpolation support.
4. Validate dictionary keys and set lang/dir without a visible direction flash where possible.

- **Accept when:** missing translations fall back predictably and required default-locale content cannot silently disappear.

### T072 — Translate engine UI and accessible messages

- [x] Complete T072.
- **Requirements:** E11. **Depends on:** T071.
- **Files:** shared components, pages, hooks, English/Arabic UI dictionaries.

**Steps**

1. Replace hardcoded customer-facing labels/copy in cart, checkout, search, filters, loading, and errors.
2. Include ARIA labels/live announcements and validation errors.
3. Use plural messages instead of concatenated counts.
4. Preserve stable IDs and technical codes used by business logic.

- **Accept when:** a full Arabic journey has translated interactive and assistive copy, including error and empty states.

### T073 — Resolve merchant and catalog translations

- [x] Complete T073.
- **Requirements:** E11, E08. **Depends on:** T072.
- **Files:** resolved config/catalog adapters, search indexing, provider contexts.

**Steps**

1. Resolve section/navigation/business/metadata and product/category/option labels centrally.
2. Rebuild memoized local search indexes per locale and revision.
3. Retain exact SKU/model behavior and stable product/variant IDs.
4. Pass locale into remote lookups/queries and prevent cache mixing.

- **Accept when:** translated names are searchable while SKU/model ranking and cart identity remain unchanged across locales.

### T074 — Implement localized routes and locale switching

- [x] Complete T074.
- **Requirements:** E11, E07. **Depends on:** T073.
- **Files:** routing/localization resolver, accessible locale selector, navigation helpers.

**Steps**

1. Prefix non-default locales and resolve per-locale page/entity slugs.
2. Reject locale path collisions and unsafe encoded segments.
3. Switch to the equivalent page/entity preserving compatible filters and cart.
4. Announce a fallback to locale home when an equivalent route is unavailable; support back/forward history.

- **Accept when:** copied localized deep links load directly and switching never loses cart contents or sends users to a fabricated route.

### T075 — Complete five-template RTL behavior

- [x] Complete T075.
- **Requirements:** E11, E04. **Depends on:** T074, T034.
- **Files:** template/shared CSS, dropdown/media controls, commerce forms.

**Steps**

1. Review asymmetrical header/footer/page compositions in RTL.
2. Fix portal direction, arrows, tables, gallery controls, and mixed-script data.
3. Verify phone/email/SKU entry remains legible.
4. Check long Arabic content and font fallback without reversing photography or logos.

- **Accept when:** all five templates support correct reading/focus order and intentional composition in RTL.

### T076 — Create complete bilingual examples

- [x] Complete T076.
- **Requirements:** E11 and all content families. **Depends on:** T075.
- **Files:** new v2 bilingual store/catalog fixtures and bootstraps.

**Steps**

1. Translate representative content pages, commerce entities, business facts, and every new section.
2. Add deliberate missing optional translations to demonstrate fallback warnings.
3. Include localized paths and metadata for P12.
4. Keep examples fictional and independent of external services.

- **Accept when:** fixtures demonstrate real multilingual rendering rather than only switching number formats or direction.

### T077 — Verify localized end-to-end behavior

- [x] Complete T077.
- **Requirements:** E11. **Depends on:** T076.
- **Files:** i18n unit tests, new locale browser suite, search/provider tests.

**Steps**

1. Test fallback/plural/bidi cases and locale route collisions.
2. Exercise localized search, filters, product variants, cart, and checkout.
3. Verify focus/scroll after switching and direct locale reloads in both router modes.
4. Check stale response suppression after rapid switching.

- **Accept when:** English and Arabic journeys pass without untranslated essential UI, identity loss, or cross-locale query leakage.

## P12 — Add SEO output and build-time static rendering

Exit gate: crawler-visible HTML, metadata, sitemaps, and hosting instructions are real and tested; hash-mode limitations remain explicit.

### T078 — Define SEO schema and inheritance

- [x] Complete T078.
- **Requirements:** E12, E13. **Depends on:** T077.
- **Files:** new `src/core/seo/schema.ts`, metadata resolver/tests.

**Steps**

1. Add site/page/entity localized metadata and indexing directives.
2. Resolve defaults, canonical origin/base path, social media URLs/alt/dimensions.
3. Define noindex defaults for transactional/search/not-found views and canonical filter aliases.
4. Validate public absolute sharing URLs and supported canonical override policy.

- **Accept when:** metadata resolves deterministically for content/product/category/localized routes without leaking tracking query parameters.

### T079 — Implement route-aware head management

- [x] Complete T079.
- **Requirements:** E12. **Depends on:** T078.
- **Files:** head model/renderer, application route integration.

**Steps**

1. Render title/description/canonical/robots/OG/Twitter tags from one head model.
2. Add reciprocal hreflang only for available locale routes.
3. Replace/remove stale tags during client navigation.
4. Keep the model usable without a DOM for static generation.

- **Accept when:** moving between product, policy, cart, and locales leaves exactly the correct head entries.

### T080 — Implement factual structured data

- [x] Complete T080.
- **Requirements:** E12, E06, E09. **Depends on:** T079.
- **Files:** JSON-LD builders/serializer, business/product metadata tests.

**Steps**

1. Emit Organization/LocalBusiness and breadcrumbs from configured facts.
2. Emit Product offers consistent with visible currency/prices/stock.
3. Omit unknown ratings/certifications/policies rather than fabricating them.
4. Escape script-breaking characters and test malicious-looking merchant strings as inert data.

- **Accept when:** structured data matches rendered content and cannot break out of its script element.

### T081 — Implement complete static route enumeration

- [x] Complete T081.
- **Requirements:** E12, E08, E14. **Depends on:** T080.
- **Files:** static route enumerator, provider capability/adapter, build fixtures.

**Steps**

1. Enumerate enabled indexable content/category/product routes for each available locale.
2. Use complete mock catalogs or explicit paginated provider enumeration.
3. Detect duplicate routes, cursor loops, inconsistent revisions, and incomplete coverage.
4. Exclude noindex/disabled/noncanonical aliases and emit a coverage report.

- **Accept when:** a partial featured catalog cannot falsely produce a successful full-store SEO build.

### T082 — Add a server render entry used only at build time

- [x] Complete T082.
- **Requirements:** E12. **Depends on:** T081, T019.
- **Files:** new `src/entry-server.tsx`, static render loader, Vite build configuration.

**Steps**

1. Render the shared application with injected store snapshot/route/locale.
2. Preload or await registered lazy renderers and data.
3. Collect route head/content with no browser-global access.
4. Serialize only public hydration data with safe escaping and explicit revision identity.

- **Accept when:** generated markup contains real content and head tags, not only a loading shell, and no customer/cart/credential data is serialized.

### T083 — Implement the static-generation command

- [x] Complete T083.
- **Requirements:** E12. **Depends on:** T082.
- **Files:** new `scripts/prerender-store.mjs`, package script, build output tests.

**Steps**

1. Read input snapshot/bootstrap and validate history-mode deployment settings.
2. Write route HTML with explicit nested asset base paths and a static 404 document.
3. Emit sitemap(s)/index and robots.txt respecting limits, canonical rules, and locale alternates.
4. Build in temporary output and report/fail incomplete required coverage before replacing successful output.

- **Accept when:** the command produces a self-contained static artifact without a production Node server and clearly rejects unsupported hash/partial-enumeration inputs.

### T084 — Hydrate snapshots and revalidate safely

- [x] Complete T084.
- **Requirements:** E12, E11. **Depends on:** T083.
- **Files:** browser bootstrap, store initialization, public snapshot schema.

**Steps**

1. Choose hydrateRoot for generated pages and client mounting for normal builds.
2. Use the same route/locale/data snapshot for the first render.
3. Revalidate current data after hydration with stale-response protection.
4. Detect/report build/runtime revision mismatch and document regeneration requirements without exposing stale stock as authoritative.

- **Accept when:** generated pages hydrate without warnings or duplicated markup and newer runtime data updates through the normal provider lifecycle.

### T085 — Document and exercise static hosting modes

- [x] Complete T085.
- **Requirements:** E12, E01, E07. **Depends on:** T084.
- **Files:** new `docs/deployment.md`, example host rules, deployment smoke tests.

**Steps**

1. Document hash-only, history SPA, and generated-history deployments.
2. Provide root/subdirectory asset and static-file-first fallback examples.
3. Explain real HTTP 404 handling, redirects, canonical origin, caching, and atomic config/artifact updates.
4. Explain why runtime JSON updates alone cannot refresh crawler-visible snapshots.

- **Accept when:** a deployer can serve nested generated routes and transactional SPA routes with correct status/asset behavior using an existing static web server.

### T086 — Verify crawler output and hydration

- [x] Complete T086.
- **Requirements:** E12. **Depends on:** T085.
- **Files:** static output tests, browser hydration suite, hosting fixtures.

**Steps**

1. Fetch generated HTML without JavaScript and inspect content/head/lang/dir.
2. Validate canonical/hreflang/sitemaps/robots and noindex cases.
3. Test English/Arabic product/category/content pages at root and subpath.
4. Hydrate and complete navigation/cart flows; assert zero hydration or missing-asset errors.

- **Accept when:** sharing/crawler claims are demonstrated by raw HTML and both build modes remain usable.

## P13 — Complete diagnostics and exportable contracts

Exit gate: consumers can validate config and understand supported capabilities without importing an editor or the full storefront UI.

### T087 — Complete cross-reference and capability validation

- [x] Complete T087.
- **Requirements:** E13, E14. **Depends on:** T086.
- **Files:** config semantic validators, source-path maps, negative fixtures.

**Steps**

1. Check all pages/anchors/business/collection/entity references.
2. Validate template/layout/font/locale/provider capabilities and product-block invariants.
3. Distinguish missing known entities from unresolved partial-catalog references.
4. Verify original source locations for v1 migration and nested v2 input.

- **Accept when:** every invalid required relationship produces a stable field-level error and uncertain remote references are not falsely marked broken.

### T088 — Add bounded content-quality diagnostics

- [x] Complete T088.
- **Requirements:** E13. **Depends on:** T087.
- **Files:** quality checks, diagnostics documentation, fixtures/tests.

**Steps**

1. Report missing required copy/media/alt and optional translation gaps.
2. Check calculable foreground/background contrast pairs, including supported tones.
3. Report photographic/gradient contrast as indeterminate and distinguish URL syntax from network existence.
4. Keep remote link crawling, publishing review UI, and auto-repair outside scope.

- **Accept when:** warnings are actionable and reproducible without falsely claiming a full accessibility or publishing audit.

### T089 — Expose pure validation and normalization APIs

- [x] Complete T089.
- **Requirements:** E13, E14. **Depends on:** T088.
- **Files:** new public core entry point, package export/build configuration if needed, consumer smoke fixture.

**Steps**

1. Export version dispatch, normalization, validation, and registry metadata without React/DOM imports.
2. Return consistent result unions and documented diagnostic codes.
3. Separate optional async reference checks from pure parsing.
4. Demonstrate use in an independent Node/browser consumer fixture without adding builder code.

- **Accept when:** a consumer can obtain original-field diagnostics and normalized config without mounting the storefront or bundling template renderers.

### T090 — Export versioned schemas and capabilities

- [x] Complete T090.
- **Requirements:** E13, E14. **Depends on:** T089.
- **Files:** `scripts/export-config-schema.mjs`, `public/store-config.schema.json`, new v2 schema/capability manifest.

**Steps**

1. Keep the existing schema URL tied to v1.
2. Export v2 from registered runtime input schemas.
3. Publish settings/layout/template/provider/locale/extension compatibility metadata.
4. Add deterministic drift checks and document semantic checks JSON Schema cannot express.

- **Accept when:** generated artifacts match the selected engine registry and changing a runtime setting without updating exports fails verification.

### T091 — Verify diagnostics and failure presentation

- [x] Complete T091.
- **Requirements:** E13. **Depends on:** T090.
- **Files:** diagnostic unit/contract tests, startup/section error browser tests.

**Steps**

1. Build an invalid-config matrix across every major subsystem.
2. Assert severity, stable code, escaped pointer, original path, and related locations.
3. Test customer startup recovery and contained renderer failures.
4. Confirm logs/diagnostics exclude customer/order payloads and do not expose raw backend secrets.

- **Accept when:** consumers receive clear machine-readable failures and customers receive accessible recovery states without technical data dumps.

## P14 — Prepare complete examples and ElectroERP handoff

Exit gate: a developer can supply valid engine configuration from documentation, while API dependencies and builder ownership remain explicit.

### T092 — Create comprehensive v2 store examples

- [x] Complete T092.
- **Requirements:** E01–E14 demonstration. **Depends on:** T091.
- **Files:** `public/stores/examples/`, catalogs/bootstraps, example index documentation.

**Steps**

1. Add multipage, layout-rich, business, collection, commerce, bilingual, and SEO examples.
2. Cover all new section families without forcing them into every native homepage.
3. Keep stable v1 fixtures for compatibility and clearly label config versions.
4. Validate every referenced asset/entity/page and keep demos locally runnable.

- **Accept when:** examples jointly demonstrate every requirement with no external backend or private asset dependency.

### T093 — Update configuration and migration guides

- [x] Complete T093.
- **Requirements:** all integration contracts. **Depends on:** T092.
- **Files:** `docs/customization.md`, `docs/architecture.md`, new migration/config-reference docs.

**Steps**

1. Document actual final schemas, defaults, precedence, limits, routes, links, and theme units.
2. Include v1-to-v2 examples and migration command behavior.
3. Explain localization, partial catalog semantics, product invariants, and unsupported capabilities.
4. Ensure examples are checked against exported schemas and semantic validation.

- **Accept when:** documentation describes implemented behavior rather than the provisional names in this plan.

### T094 — Publish proposed provider and extension guides

- [x] Complete T094.
- **Requirements:** E08, E12, E14. **Depends on:** T093.
- **Files:** `docs/api-contract.md`, new extension/provider integration guides.

**Steps**

1. Document query operators, pagination, revisions, locale context, entity lookup, and route enumeration.
2. Distinguish existing legacy methods from new optional/required capabilities.
3. Show sample trusted section/provider registration and schema export.
4. State explicitly that the real ElectroERP backend is not implemented by these adapters.

- **Accept when:** a backend/extension author can implement against concrete payloads, error semantics, and conformance tests.

### T095 — Provide builder-facing consumption examples

- [x] Complete T095.
- **Requirements:** E13, E14; boundary enforcement. **Depends on:** T094.
- **Files:** integration examples and capability manifest documentation.

**Steps**

1. Show schema discovery and validation-result consumption.
2. Map errors to original JSON fields and explain unresolved references.
3. Show expanded sections/themes as input without saved-section/preset storage semantics.
4. Document preview screenshot manifest separately from the engine capability manifest.

- **Accept when:** ElectroERP can consume engine contracts without this repository adding editor UI, draft persistence, or publication workflows.

### T096 — Update previews and top-level discovery

- [x] Complete T096.
- **Requirements:** template compatibility and handoff. **Depends on:** T095.
- **Files:** README, preview capture script, `public/template-previews/`, preview manifest.

**Steps**

1. Link new guides/examples and document build/migration/static commands.
2. Regenerate all five preview-card screenshots after intentional visual changes.
3. Preserve template IDs, image dimensions, manifest field compatibility, and relative URL semantics.
4. Verify shipped dist includes the expected optimized artifacts.

- **Accept when:** existing preview-card consumers still work and screenshots match the implemented native templates.

## P15 — Verify cross-feature quality and release

Exit gate: every E01–E14 capability has evidence, old stores remain compatible, and no deferred work is represented as complete.

### T097 — Run the full compatibility matrix

- [x] Complete T097.
- **Requirements:** all; backward compatibility. **Depends on:** T096.
- **Files:** existing/new unit and browser suites, verification report.

**Steps**

1. Run all native v1 stores and customization examples.
2. Run comprehensive v2 pages/content/commerce/locale fixtures.
3. Cover root/subpath, hash/history, complete mock/partial API providers.
4. Resolve unexpected differences and record intentional migration fixes.

- **Accept when:** previous search/cart/checkout/navigation behavior and all supported v2 paths pass together.

### T098 — Perform accessibility and responsive review

- [x] Complete T098.
- **Requirements:** E02–E05, E09, E11. **Depends on:** T097.
- **Files:** accessibility/browser tests, visual review report.

**Steps**

1. Audit keyboard order, headings/landmarks, labels, errors, dialogs, tables, and media controls.
2. Test reduced motion, focus visibility/restoration, zoom/reflow, and long translated text.
3. Review all five templates in LTR/RTL at mobile/tablet/desktop sizes.
4. Fix observed issues and rerun affected checks rather than accepting screenshots alone.

- **Accept when:** no known blocking accessibility/overflow issue remains in a supported configuration.

### T099 — Verify performance and dependency boundaries

- [x] Complete T099.
- **Requirements:** E08, E10, E12, E14. **Depends on:** T098.
- **Files:** benchmark/bundle reports, lazy loader/cache implementation as needed.

**Steps**

1. Compare compressed initial JS against the recorded baseline and proposed 15% growth budget.
2. Measure query p95 on the 10,000-product fixture.
3. Verify lazy template/section/locale/font/media loading and bounded cache/request fan-out.
4. Confirm pure contract consumers exclude template UI and document justified budget changes with measurements.

- **Accept when:** agreed budgets pass or evidence-backed revisions are documented, with no unexplained eager-loading regression.

### T100 — Verify safe configuration and static deployment

- [x] Complete T100.
- **Requirements:** E07, E12–E14. **Depends on:** T099.
- **Files:** adversarial config fixtures, generated-output/hosting tests, deployment guide.

**Steps**

1. Test unsafe schemes, traversal, malformed embeds, excessive nesting, and script-like content.
2. Inspect static hydration payloads for public-data-only serialization.
3. Test generated HTML/404/assets/sitemaps under documented server rules.
4. Test revision mismatch/regeneration and ensure hash-mode SEO limitations remain visible in documentation.

- **Accept when:** validated content cannot introduce arbitrary execution and deployment instructions match actual artifacts/status behavior.

### T101 — Complete requirement traceability and release notes

- [x] Complete T101.
- **Requirements:** all. **Depends on:** T100.
- **Files:** verification report, migration/release notes, this checklist and implementation plan status.

**Steps**

1. Map E01–E14 to final code/contracts and passing evidence.
2. Record remaining provider/backend obligations explicitly.
3. Confirm all schemas/docs/examples/screenshots match final behavior.
4. Mark only completed tasks and describe any accepted deferrals as incomplete scope, not implemented support.

- **Accept when:** a reviewer can assess every requested capability and compatibility consequence without reading conversation history.

### T102 — Run final checks and publish the completed changes

- [x] Complete T102.
- **Requirements:** all. **Depends on:** T101.
- **Files:** final repository diff and release artifacts.

**Steps**

1. Run typecheck, unit tests, browser tests, formatting, schema drift checks, static-generation checks, and targeted package/export checks.
2. Inspect git diff/status for accidental fixtures, credentials, generated junk, or unrelated edits.
3. Commit reviewable changes with validation evidence and push to the agreed repository branch when authorized.
4. Verify the remote commit and report completed capabilities, migration instructions, and material limits truthfully.

- **Accept when:** the remote revision is verified, checks are recorded, and deployment remains an explicit separate action unless requested.

## Requirement-to-task coverage

| Requirement                    | Primary implementation tasks      | Acceptance checkpoints |
| ------------------------------ | --------------------------------- | ---------------------- |
| E01 Multi-page rendering       | T009, T018–T021, T045, T068       | T025, T097             |
| E02 Additional section types   | T047–T054, T062                   | T055, T098             |
| E03 Flexible layouts           | T036–T039, T066                   | T040, T098             |
| E04 Responsive overrides       | T031–T034, T037–T039              | T035, T040, T098       |
| E05 Complete typography        | T026–T029, T033                   | T030, T098             |
| E06 Business information       | T041–T045, T047–T048              | T046, T080             |
| E07 Link resolution            | T018, T021–T024, T043, T059, T074 | T025, T046, T100       |
| E08 Dynamic collections        | T056–T062                         | T063, T070, T099       |
| E09 Product/category layouts   | T056, T064–T069                   | T070, T098             |
| E10 Global theme configuration | T026–T029, T032, T069             | T030, T035, T099       |
| E11 Localization/RTL           | T029, T034, T056, T071–T076       | T077, T086, T098       |
| E12 SEO/static output          | T019, T078–T085                   | T086, T100             |
| E13 Validation/diagnostics     | T006–T011, T018, T087–T090        | T091, T101             |
| E14 Extension points           | T012–T016, T059, T064, T089–T090  | T017, T094–T095, T099  |

## Phase evidence log

Evidence applies to the implementation commit containing this log. T102 records the verified remote implementation revision `619fad2bbc4af0c09f74266b9b977402416d7f1d`. Original file/module proposals are superseded by the final module map and decisions in docs/implementation-progress.md.

| Phase | Status                                       | Implementation                                                 | Verification evidence                                                                    |
| ----- | -------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| P00   | Complete                                     | Baseline report, retained fixtures, measurement/review scripts | Original 20 unit tests, archived baseline build, 45 visual fixtures                      |
| P01   | Complete with explicit v1 migration decision | core/config, migration script                                  | Ten v1 stores migrate; diagnostics/version/media contracts tested                        |
| P02   | Complete with native adapter decision        | engine registry/installed, public exports                      | Independent registry tests, custom section/provider browser flow                         |
| P03   | Complete                                     | app/routing/page renderer                                      | V2 pages, existing navigation, hash browser and root/subpath history tests               |
| P04   | Complete                                     | theme/config/registry                                          | Sparse typography/tokens, portal-style browser check, Arabic fonts                       |
| P05   | Complete                                     | responsive CSS generation                                      | Zero/false unit checks; 767/768/1023/1024px assertions                                   |
| P06   | Complete                                     | columns/section frames                                         | Rich nested example, bounds tests and responsive visual fixtures                         |
| P07   | Complete                                     | business records/contact/footer                                | Hours/contact diagnostics and actionable contact browser tests                           |
| P08   | Complete                                     | extra section families                                         | Rich bilingual page, gallery/table/contact interactions, static HTML                     |
| P09   | Complete                                     | collection evaluator/service/provider                          | Variant semantics, cursors, concurrency, cancellation, API browser tests; p95 under 50ms |
| P10   | Complete                                     | product/category composition                                   | Required-block/override tests, five-template commerce regression suite                   |
| P11   | Complete                                     | locale resolution/ICU/RTL                                      | Arabic cart/checkout, locale identity, five-template RTL, bilingual static hydration     |
| P12   | Complete                                     | SEO/server entry/static generator                              | 38 routes each at root/subpath; crawler tags, hydration, revisions, HTTP 404             |
| P13   | Complete                                     | pure validation/schema/capability exports                      | Semantic/adversarial/drift tests; pure ESM Node consumer smoke                           |
| P14   | Complete                                     | examples and integration guides                                | V2 demo, API/extension/migration/deployment guides, five refreshed previews              |
| P15   | Complete; remote verified                    | release verification                                           | 49 unit + 88 browser tests; static root/subpath; type/build/format/contract checks       |
