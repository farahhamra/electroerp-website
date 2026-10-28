# Proposed ElectroERP adapter contract

These endpoints are **adapter expectations**, not existing ElectroERP endpoints. Configure actual URLs when ElectroERP is available, or transform its response shape in `src/providers/data.ts`. Local development needs none of them.

An example public bootstrap:

```json
{
  "mode": "api",
  "configUrl": "https://store.example.com/api/config",
  "catalogUrl": "https://store.example.com/api/catalog",
  "productUrl": "https://store.example.com/api/product",
  "searchUrl": "https://store.example.com/api/search",
  "ordersUrl": "https://store.example.com/api/orders"
}
```

All GET requests accept JSON and support cancellation. Responses are validated against `src/core/schema.ts`. URLs may also be relative to the bootstrap JSON location. Configure CORS for cross-origin deployments; same-origin cookie credentials use normal Fetch defaults. No privileged authorization headers are built into the frontend.

| Operation                | Request                            | Expected response                                       |
| ------------------------ | ---------------------------------- | ------------------------------------------------------- |
| Store configuration      | `GET configUrl`                    | `StoreConfig`, as in `public/stores/electronics.json`   |
| Initial catalog          | `GET catalogUrl`                   | `{ "products": Product[], "categories": Category[] }`   |
| Product lookup           | `GET productUrl?slug=…` or `?id=…` | Full `Product`, or JSON `null` when it no longer exists |
| Server search (optional) | `GET searchUrl?q=…&limit=24`       | Ranked `Product[]`                                      |
| Place order request      | `POST ordersUrl`                   | `{ "id": "…", "status": "received", "message": "…" }`   |

Product lookup hydrates direct links and items in a saved bag that are outside the initial catalog. A network failure during bag hydration prevents startup from silently discarding those items; the retry screen appears. Deleted products return `null` and are removed during reconciliation. Search should implement the same relevance rules as local search, especially exact SKU/model priority and conservative matching of numeric identifiers.

The order request includes `Content-Type: application/json` and `Idempotency-Key: <uuid>`. Its JSON body is:

```json
{
  "storeId": "orbit-demo",
  "items": [{ "productId": "orbit-one", "variantId": "orbit-one-0", "quantity": 1 }],
  "customer": {
    "name": "Demo Customer",
    "email": "demo@example.com",
    "phone": "+1 202 555 0100",
    "address": "123 Example Street",
    "city": "Example City",
    "country": "United States"
  },
  "idempotencyKey": "generated-uuid"
}
```

Client totals are deliberately omitted. The server must reprice products and validate stock, variants, customer information, allowed delivery destinations, shipping, taxes, and abuse protections. It must honor idempotency for duplicate requests and return a non-2xx status for rejected orders. The UI retains the bag after a failed request and reuses the idempotency key when retrying unchanged details in the current checkout session.

No card data, payment gateway, ERP credentials, or database is part of this frontend. The current live-mode interface submits an order request for the store to confirm. Add a documented payment-provider redirect or hosted checkout workflow when that business requirement is defined.

## V2 configuration and catalog capabilities

V2 configuration responses follow [engine-v2.md](engine-v2.md). Add these optional bootstrap fields to the native HTTP adapter:

```json
{
  "catalogCoverage": "partial",
  "queryUrl": "https://store.example.com/api/products/query",
  "resolveUrl": "https://store.example.com/api/entities/resolve",
  "categoryUrl": "https://store.example.com/api/category",
  "routesUrl": "https://store.example.com/api/indexable-entities"
}
```

API coverage defaults to `partial`. Set `complete` only when the initial catalog contains the entire public inventory that local queries may filter. Mock catalogs are complete. A partial catalog without `queryUrl` has an explicit unavailable collection state; it is never presented as full inventory. Native v1 browsing retains its loaded-catalog behavior for compatibility.

Product/category records can add `slug`, entity `seo`, localized `translations`, and product `createdAt`, `updatedAt`, `specifications`. Datetimes are explicit ISO timestamps. Product IDs, variant IDs, SKUs and category IDs remain stable across locales. A translated product/category slug is one URL segment, not a full path. Localized entities returned by API search/query/lookup must already have their active-locale name/slug in the main fields; include translation maps for locale switching. Static enumeration uses base fields plus maps instead (see below).

`GET productUrl?slug=…&locale=ar`, `GET categoryUrl?slug=…&locale=ar` and `GET searchUrl?q=…&limit=24&locale=ar` use the active locale. Product lookup by `id` remains available for cart restoration and missing entity references. Return JSON `null` for a deleted/unknown entity. A network failure is not the same as a deleted item. V2 product visits refresh the lookup even when an initial product is available. Checkout is still required to revalidate authoritative stock and prices server-side.

### Collection queries

`POST queryUrl`, JSON body:

```json
{
  "query": {
    "categoryIds": ["audio"],
    "brands": ["ORBIT"],
    "minPrice": 0,
    "maxPrice": 30000,
    "inStock": true,
    "discounted": true,
    "sort": "price-low",
    "limit": 24
  },
  "context": {
    "storeId": "orbit-demo",
    "locale": "en-US",
    "currency": "USD",
    "revision": "catalog-42"
  }
}
```

`productIds` is an ordered curated list (an empty list returns no products), `excludeIds` removes products, and `collectionIds` selects provider-defined memberships. Filter dimensions are ANDed; values within each array are ORed. A **single variant** must satisfy stock, price and discount predicates together. Prices are integer minor units in the store currency. Do not include a product merely because one cheap sold-out variant satisfies price while another expensive variant satisfies stock.

Return:

```json
{
  "items": [
    {
      "id": "orbit-one",
      "slug": "orbit-one",
      "name": "Orbit One Headphones",
      "brand": "ORBIT",
      "model": "ORB-H1",
      "categoryId": "audio",
      "categoryName": "Audio",
      "description": "Fictional sample headphones.",
      "details": ["Demonstration product"],
      "collectionIds": ["featured"],
      "images": ["https://store.example.com/images/headphones.svg"],
      "variants": [
        {
          "id": "orbit-one-0",
          "sku": "ORB-H1-G",
          "options": { "Color": "Graphite" },
          "price": 24900,
          "compareAtPrice": 29900,
          "stock": 10
        }
      ]
    }
  ],
  "variants": { "orbit-one": "orbit-one-0" },
  "total": 123,
  "nextCursor": "opaque-next-page",
  "revision": "catalog-42"
}
```

Every returned product must have a corresponding qualifying variant ID in `variants`; the adapter rejects IDs absent from that product. This controls the visible price and quick-add choice. `total` and `nextCursor` are optional; omit `nextCursor` at the end, and omit `total` if counting is not supported. Empty results use `items: []`, `variants: {}`. Page limit is 1–100; responses are bounded to 100 items.

Sort semantics: `featured` preserves curated order where supplied; `price-low`/`price-high` order by the cheapest qualifying variant; `discount` orders by greatest qualifying percentage discount and selects that variant; `newest` uses explicit creation timestamps with undated items last; `name` uses locale collation. Stable product IDs break ties. `createdAfter` excludes records without a usable creation timestamp. Do not infer “newest” from IDs or array positions.

Cursors are opaque, bound to filter/sort/store/locale/currency/revision, and must not mix pages from different snapshots. Return non-2xx for invalid/stale cursors; the customer can reset filters/reload. Requests are cancellable, deduplicated by normalized query/context, isolated by provider and locale, cached for 30 seconds, and limited to four concurrent remote collection calls. Settled caches are bounded to approximately 100 entries; active calls are retained until completion/cancellation. The API remains responsible for its own query limits and resource controls.

### Batched references

`POST resolveUrl` receives:

```json
{
  "references": [
    { "kind": "product", "id": "orbit-one" },
    { "kind": "category", "id": "audio" }
  ],
  "context": { "storeId": "orbit-demo", "locale": "en-US", "currency": "USD" }
}
```

Return `{ "products": Product[], "categories": Category[] }`. Omit unknown entities; supply the referenced product's category if absent from the initial catalog. The native adapter batches at most 25 references during configuration loading. Without this endpoint it can use product/category lookup by ID. References unresolved against partial inventory produce integration warnings and disabled links, rather than fabricated slugs.

### Complete static enumeration

`GET routesUrl?locale=en-US&cursor=…` returns `{ "products": Product[], "categories": Category[], "nextCursor"?: string, "revision"?: string }`. Return every public indexable entity over bounded pages. Supply default-locale base fields with complete `translations` maps, even when the request asks for a non-default locale; the generator merges translation maps by stable ID. Revision must remain consistent throughout an enumeration. The build rejects missing capability, repeated cursors and changing revisions instead of silently producing a featured-only sitemap. Use absolute URLs for generated deployments.

### Errors and conformance

Non-2xx responses reject the request. The adapter checks JSON shape, IDs/slugs and qualifying variant references. Remote collection/search failures show neutral customer messages; integration details are emitted through `storefront:diagnostics`. An aborted/stale request cannot overwrite a newer collection result. Order errors retain the bag and current retry idempotency key.

`src/core/collections/query.test.ts`, `service.test.ts`, `tests/engine-integration.spec.ts` and the existing API browser scenarios exercise same-variant matching, ordered curation, cursor rejection, deduplication, cancellation, fan-out bounds, partial-catalog feedback, remote reference loading, quick-add identity and order retry behavior. Use equivalent fixtures when implementing the actual ElectroERP endpoint. These tests use intercepted responses; no production ElectroERP API has been exercised.
