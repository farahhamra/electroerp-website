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
