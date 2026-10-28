# Engine contracts and trusted extensions

Extensions are bundled application code installed by the host developer. Store JSON can select registered types and require their versions. JSON cannot download modules, execute code, inject HTML/CSS, register arbitrary fonts or install providers.

## Framework-independent consumption

```sh
npm run contracts:build
```

This creates `dist-contracts/engine-contracts.js`, an ES module with `zod` external. It contains validation, normalization, schema export, registry metadata, typed destination resolution and collection evaluation. It imports no React renderer, DOM, localStorage or browser startup code. It is a build artifact for an integrator to copy/package; this repository does not publish an npm package.

```ts
import { validateStoreConfig, createStorefrontEngine, exportV2Schema } from './engine-contracts.js'

const engine = createStorefrontEngine()
const result = validateStoreConfig(publicStoreJson, {
  registry: engine,
  locale: 'en-US',
  mode: 'api',
  catalogCoverage: 'partial',
  products: publicProducts,
  categories: publicCategories,
  configUrl: 'https://shop.example.com/config/store.json',
})

if (!result.ok) {
  // Associate each diagnostic.pointer with a builder field.
  // Treat warnings separately from errors; publish policy belongs to ElectroERP.
  console.log(result.diagnostics)
} else {
  // result.value is an in-memory renderer model. Persist the source JSON instead.
  console.log(result.value.engine?.pages)
}
const schema = exportV2Schema(engine)
const capabilities = engine.capabilities()
```

`normalizeStoreConfig` returns the same value or throws `ConfigurationError` with diagnostics. `migrateV1` produces serializable v2 input (serialize through JSON to omit undefined legacy properties). `configSchema` remains the v1 parser; `v2Schema` validates resolved structural input, so consumers should use `validateStoreConfig` for localized raw JSON. Import exported TypeScript types from `src/core/index.ts` when integrating source.

The public schema/capability files describe **installedEngine**, including the illustrative `demo:notice` and `demo:fixture` registrations. The pure default registry contains built-in sections. A consumer validating custom types must install equivalent schemas/versions; do not assume a default registry knows application extensions.

## Add a section

Register at `src/engine/installed.ts`:

```tsx
import { z } from 'zod'
import { createStorefrontEngine } from './registry'
import { sectionBaseV2 } from '../core/config/contracts'

export const installedEngine = createStorefrontEngine({
  sections: [
    {
      type: 'acme:notice',
      version: 1,
      description: 'Merchant announcement',
      localizable: ['message'],
      schema: z.strictObject({
        ...sectionBaseV2,
        type: z.literal('acme:notice'),
        message: z.string().min(1).max(2000),
      }),
      load: () => import('../extensions/acme/Notice'),
    },
  ],
})
```

The lazy module exports a default React component accepting `{ section: EngineSection }`. Use `useStore`, `TypedLink` and shared commerce/media primitives. Render escaped text and accessible interactions. `localizable` declares extra text field names so localization and schema export agree. A section receives its enclosing responsive frame and an error boundary. Use stable namespaced type IDs; reject duplicate registrations; choose integer versions. A store can set `extensions: { "acme:notice": 1 }` to require the exact installed version.

See `src/extensions/examples/notice.tsx`: it works without modifying the central renderer or native section union. Remove its registration and fixture provider at the composition root to omit those examples from a production installation, then regenerate schema/capabilities. Each engine instance owns its registry; registrations do not leak across stores.

Built-in native sections intentionally keep their existing template-slot adapters; the seven native slots preserve the five distinct compositions. New custom section families use the registry loader. `StorefrontTemplate` modules remain registered in `src/templates/registry.tsx`; custom template IDs must also be declared in `createStorefrontEngine({ templates: [...] })`. Registration metadata does not load a missing template implementation.

## Add a data provider

Register a namespaced ID, version, Zod bootstrap schema and async factory under `providers`. The bootstrap's `mode` selects that ID. The factory returns the existing `DataProvider` interface with `mode: "mock" | "api"`, `loadStore`, `placeOrder` and optional capabilities/methods. Validate the supplied configuration using the same installed registry. Never resolve modules from a URL in JSON.

`demo:fixture` is a working example: its bootstrap embeds config/products/categories, uses complete local queries and returns a clearly marked demo order without transmitting data. HTTP/mock adapters retain their compatibility bootstrap formats; custom factories use the same public interface. Native mock/API adapters are always available, while the capability manifest's `providers` list describes additional registrations.

Declare complete versus partial catalog coverage honestly. Partial catalogs implement `queryProducts`; optional `searchProducts`, `getProduct`, `getCategory`, `resolveEntities` and `listIndexableRoutes` supply broader inventory. All network methods accept AbortSignal. The [API contract](api-contract.md) defines request, pagination, identity and error semantics.

## Fonts and diagnostics

Register `{ id, family, fallback }` in `fonts` and import the actual self-hosted font CSS from the application. JSON references the registered ID in typography settings. The registry supplies CSS variables; it does not upload/download arbitrary font resources. Built-ins are DM Sans, Cormorant Garamond and Noto Sans Arabic.

Listen for `window.addEventListener('storefront:diagnostics', event => ...)` in a trusted integration to collect configuration, collection and stale-snapshot diagnostics. Diagnostic messages are for integrators. Section/query failures render accessible neutral customer states. The capability/schema outputs are suitable inputs for a builder's own controls and field validation; the engine contains no editing canvas, asset manager, history or publish API.
