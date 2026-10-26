# Configuration and architecture

## Runtime composition

1. `main.tsx` loads `storefront.json` (or the public `VITE_BOOTSTRAP_URL`).
2. `createProvider` selects mock or HTTP mode and loads validated configuration and catalog JSON.
3. Store theme fields become CSS custom properties. The template registry loads the selected template module. It supplies its own header, footer, hero, product section, categories, promotional section, and benefits. Sections still render in JSON order.
4. React context owns catalog state, memoized search, cart state, and totals. Feature routes are lazy-loaded.
5. Checkout submits product IDs, variant IDs, quantities, customer details, and an idempotency key through the provider interface.

`src/core/schema.ts` is the authoritative runtime contract. Unsupported configuration produces a retry state instead of a partially broken page. Unsupported template IDs show an explicit unavailable state.

## Templates

The template is a complete composition, separate from the configurable color palette:

| ID            | Navigation                                                 | Homepage and catalog                                                                                                    | Footer                                                                  |
| ------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `electronics` | Utility bar, wide search control, second navigation row    | Product-led hero, compact product grid, indexed category tiles, sidebar filtering                                       | Dark service directory with category and support columns                |
| `fashion`     | Centered masthead, understated collection navigation       | Magazine cover, staggered portrait collections, editorial product edit, full-width catalog with horizontal filters      | Studio statement, compact links, oversized wordmark                     |
| `home`        | Botanical wordmark, inline navigation, rounded bag control | Centered welcome and room vignette, numbered room index, journal feature, curated favorites, right-hand catalog filters | Large invitation, circular call to action, room and service directories |

Implement the `StorefrontTemplate` interface in `src/templates/types.ts` to add a template. Register a lazy module loader in `src/templates/registry.tsx`, add its styles, and reference its ID in store JSON. Each module owns all seven presentation slots. Shared primitives handle links, bags, search, and product interactions without forcing a common header/footer composition. The active template is downloaded on demand. Additional section types should be added to the discriminated schema and renderer together.

`src/templates/templates.css` defines template-specific catalog, card, and product-detail layouts using the same semantic theme tokens. Checkout and cart behavior remain shared. The demo JSON files have different section orders, and merchants can still reorder or omit sections.

### Navigation and dropdowns

Navigation entries optionally accept one level of `children`:

```json
{
  "label": "Collections",
  "href": "/catalog",
  "children": [
    { "label": "Clothing", "href": "/catalog?category=clothing" },
    { "label": "Bags", "href": "/catalog?category=bags" }
  ]
}
```

A parent with children renders a `NavigationDropdown` with a View all link and its configured children. A parent without children stays a normal link. Desktop and mobile navigation use the same configuration.

`src/components/Dropdown.tsx` is the shared controlled select used for sorting, brands, and checkout country. It accepts an ID, value, options, change callback, placeholder, and form accessibility properties. The empty-string option supports resetting filters; a placeholder can represent an unselected required field. `NavigationDropdown.tsx` applies the same surface treatment to actual navigation links.

Both use Radix primitives for focus management, keyboard navigation, typeahead, Escape, outside dismissal, and collision-aware portals. Popup surfaces inherit the current store's CSS variables even when rendered outside the template DOM. Country errors use `aria-invalid` and `aria-describedby`; validation focuses the trigger. No visible native select menu remains. The dropdown implementation loads with catalog/checkout, independently of the navigation menu.

The example assets are original SVG illustrations, not photographs of real products. Replace `images` and optional variant `image` URLs with business photography when available. Provide useful alt descriptions for hero images. Product image alt text is generated from product names and selected options; decorative category and banner images have empty alt text.

## Catalog and money

Each product has stable `id` and `slug` fields, a category ID, optional collection IDs, and at least one variant. Every variant has a unique ID within its product, SKU, option map, integer price, and nonnegative stock. Variant options can represent size, color, capacity, or other attributes; the UI displays valid combinations supplied by the provider. Add a variant `image` to show its exact appearance. The supplied demo color variants share illustrative artwork.

Prices use integer minor units. `24900` with USD and `currencyDecimals: 2` displays as `$249.00`. The cart clamps quantities to known available stock and discards unavailable/invalid entries when restoring. Production inventory can change after loading; the order API must make the final stock and price decision.

The initial UI copy is English. Locale/currency formatting is configurable, but translated interfaces and RTL layouts are not implemented. Default countries and delivery prices are illustrative demo settings, not real selling commitments. Taxes and payment processing are intentionally not simulated as real commerce.

## Search

`createProductSearch` creates one Fuse index for each catalog version. It weights SKU (28%), model (24%), name (26%), brand (14%), and category (8%). Normalized exact SKU/model matches rank first, followed by exact/prefix product names. Multiple query tokens must all match. Tokens containing digits require literal matching against normalized identifiers or names, preventing fuzzy substitution of a different model number. Queries shorter than two characters do not return suggestions.

The React hook waits 180 ms after input changes. API requests receive an AbortSignal, and stale results are discarded. The native dialog supplies modal focus handling; the combobox supports Arrow Up/Down, Enter, and Escape. Search errors and empty states are visible to customers.

API mode can serve a small initial catalog and use server search for the larger inventory. Search returns full products, cached by the provider for detail navigation. Direct product links and cart restoration use product lookup. Category browsing currently filters the loaded catalog; add catalog pagination to the provider and catalog page if full-inventory category browsing is needed at scale.

## State and privacy

Only the bag is persisted. Its localStorage key is `electroerp:cart:<storeId>`, and it contains product IDs, variant IDs, and quantities. Different demo stores do not share carts. Blocked or corrupted localStorage does not prevent browsing. Customer information stays in component memory in mock mode and is submitted only in API mode. Confirmation details are session-local and do not survive a full reload.

All configuration and browser environment variables are public. Do not embed ERP secrets, privileged keys, or service credentials in JSON or `VITE_*` variables. Authentication, order validation, and payment handling belong to the organization's external services.
