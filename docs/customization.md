# Customizing a storefront

All customization lives in the store JSON loaded by `storefront.json`. The same configuration is accepted from ElectroERP's future config endpoint. There is no storefront editor, backend, or rebuild needed to change runtime JSON. Keep your catalog and product IDs stable when changing presentation so saved bags continue to work.

The original three stores still work without the new fields. Settings are optional and inherit the template's defaults. `src/core/schema.ts` and `src/core/presentation.ts` validate configuration on load. Invalid settings produce the recoverable loading error instead of rendering an inconsistent store.

## Start with a complete example

| Configuration                             | What it demonstrates                                                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `public/stores/examples/electronics.json` | Compact sticky electronics header, fashion footer, image-first split hero, curated product rail, list categories, custom footer columns |
| `public/stores/examples/fashion.json`     | Centered hero, two-column portrait product grid, single-column mobile catalog, sidebar filters, square outline buttons                  |
| `public/stores/examples/home.json`        | Fashion header with home branding, electronics category section, product rail, sidebar catalog, pill buttons                            |

Each example includes text, benefits, and FAQ sections, a disabled promotion, inherited card options, and configurable footer links. The products and checkout remain fictional.

To run one locally:

```sh
VITE_BOOTSTRAP_URL=examples/fashion.json npm run dev -- --port 5173 --strictPort
```

Alternatively change `public/storefront.json` (or the deployed `storefront.json`) to:

```json
{
  "mode": "mock",
  "configUrl": "stores/examples/fashion.json",
  "catalogUrl": "catalogs/fashion.json"
}
```

Bootstrap URLs are relative to the bootstrap file. Image URLs in a store or catalog are relative to the storefront document, as in the original demos.

Store JSON contains a relative `$schema` reference to `public/store-config.schema.json`, enabling autocomplete and validation in JSON-aware editors. Run `npm run schema:export` after changing the runtime schema. A unit test prevents the exported contract from drifting. Runtime checks additionally enforce unique section IDs and registered template IDs.

## Theme and branding

Existing colors, fonts, radius, name, tagline, description and logo remain configurable. Added controls:

| Field                 | Values / default                        | Effect                                                                             |
| --------------------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| `brand.logoWidth`     | 60–280; `160`                           | Logo width in pixels, constrained to the viewport                                  |
| `brand.showSymbol`    | `true`                                  | Decorative template brand symbol; a supplied logo replaces the wordmark            |
| `theme.contentWidth`  | 960–1600; `1280`                        | Maximum standard content width in pixels                                           |
| `theme.bodySize`      | 14–20; `15`                             | Base body size; template captions and headings retain their own scale              |
| `theme.headingWeight` | 300–800; omitted                        | Overrides heading weight; omission keeps template typography                       |
| `theme.buttonShape`   | `template`, `square`, `rounded`, `pill` | Shape of standard CTA buttons                                                      |
| `theme.buttonStyle`   | `solid`, `outline`                      | Standard primary CTA treatment                                                     |
| `theme.motion`        | `full`, `reduced`                       | Disable decorative transitions; OS reduced-motion preferences are always respected |

`DM Sans` and `Cormorant Garamond` are bundled locally. To use another font, ship its font files and declare `@font-face` in the stylesheet before referencing its family in JSON. Picking a family name alone does not download a font. Supply readable foreground/background and accent/accentText pairs; the engine does not automatically correct a merchant's palette.

## Header and footer

Set `presentation.header.template` and `presentation.footer.template` independently to `electronics`, `fashion`, or `home`. Omit either to inherit the top-level `template`. The base template still determines catalog/product-page styling. New template IDs must be registered in `src/templates/registry.tsx`.

```json
{
  "presentation": {
    "header": {
      "template": "electronics",
      "sticky": true,
      "density": "compact",
      "showAnnouncement": true,
      "showSearch": true,
      "showTagline": false,
      "searchLabel": "Find a product, model or SKU"
    },
    "footer": {
      "template": "fashion",
      "showCategories": false,
      "showDescription": true,
      "showWordmark": false,
      "showLocale": true
    }
  }
}
```

Defaults are a static, comfortable header with announcement/search/tagline visible, and all footer visibility flags enabled. `searchLabel` is the electronics wide-search copy. `showTagline` controls the electronics navigation note and the fashion note's fallback; the home header has no tagline slot. `showWordmark` controls fashion's large footer wordmark. Fashion's default footer has no category directory. These controls retain each template's distinct structure.

`navigation` continues to accept links with optional one-level `children`; dropdowns inherit theme and accessibility behavior. An empty navigation array omits links. Text is rendered as text, never executable HTML.

Extend `footer` to control its content:

```json
{
  "footer": {
    "text": "Objects for a considered everyday.",
    "eyebrow": "OUR WORLD",
    "cta": { "label": "Discover our collection", "href": "/catalog" },
    "links": [{ "label": "Get in touch", "href": "/contact" }],
    "categoriesTitle": "Explore",
    "linksTitle": "Customer care",
    "columns": [
      {
        "title": "About the brand",
        "links": [
          { "label": "Our story", "href": "/story" },
          { "label": "Delivery", "href": "/shipping" }
        ]
      }
    ],
    "socialLinks": [{ "label": "Instagram", "href": "https://www.instagram.com/your-brand" }],
    "copyright": "© Your brand. All rights reserved."
  }
}
```

A nonempty `columns` array replaces the default category/support directory. Otherwise `links`, `categoriesTitle`, and `linksTitle` control the native directory. `eyebrow` is used by the fashion/home footer; electronics uses its brand tagline above the directory. `socialLinks` adds a separate link row in all footers. Links accept storefront routes or HTTPS URLs. In mock mode, the demo purchase notice stays visible regardless of footer customization.

## Homepage composition

`sections` is an ordered array. Reorder it, duplicate sections with **unique IDs**, omit sections, or use `enabled: false`. IDs start with a letter and use letters, digits, underscores or hyphens. Product/category sections with no matching items render nothing.

Every section supports:

```json
{
  "id": "seasonal-selection",
  "type": "products",
  "enabled": true,
  "template": "fashion",
  "eyebrow": "THIS SEASON",
  "title": "A fresh perspective.",
  "style": {
    "tone": "surface",
    "spacing": "airy",
    "width": "contained"
  }
}
```

- `template` overrides the section's native presentation without changing the header, footer or base product-card style.
- `style.tone`: `template`, `surface`, `contrast`, `accent`. Non-template tones derive paired text/background colors from the store palette and scope them to that section.
- `style.spacing`: `template`, `none`, `compact` (32px), `comfortable` (64px), `airy` (responsive 64–112px). Explicit settings replace the section's outside vertical spacing.
- `style.width`: `template`, `contained` (standard content width), `full` (viewport width with responsive gutters).

Keep one hero as the main page heading. Other content sections use `h2`. A `layout` other than `template` selects a reusable layout described below; it takes precedence over the section's template. `template` remains the default for the original four section types.

### Hero and promotional banners

Both accept `layout: "template" | "split" | "centered"`. `split` places copy beside media, while `centered` stacks centered copy above a wide image. A banner can omit its image and becomes a copy-only promotion. Existing required fields remain `eyebrow`, `title`, `description`, and `cta`; heroes also require `image` and `imageAlt`.

Optional controls:

- `secondaryCta: { label, href }` adds another link in native and reusable layouts.
- `imageSide: "left" | "right"` sets image order in the reusable split layout, including mobile.
- `imageFit: "template" | "contain" | "cover"` and `imagePosition: { x: 0–100, y: 0–100 }` control image crop. Missing coordinates default to 50. Omit these to keep the native crop.
- Banner `imageAlt` defaults to empty for decorative imagery.
- Hero `footnote`, `imageLabel`, `edition`, and `caption` replace the relevant native template annotations. Electronics uses footnote/imageLabel/edition; fashion uses edition/caption; home uses imageLabel/caption. Reusable heroes use footnote/caption.
- Home's native hero accepts `companionCategoryIds` (up to two) for its side images; `[]` removes them. Omission selects two categories automatically.

### Products

```json
{
  "id": "selected-products",
  "type": "products",
  "layout": "grid",
  "eyebrow": "THE EDIT",
  "title": "Selected for you.",
  "description": "A few favorites from our collection.",
  "productIds": ["orbit-one", "orbit-mini"],
  "inStockOnly": true,
  "sort": "featured",
  "limit": 6,
  "columns": 3,
  "mobileColumns": 1,
  "card": { "imageRatio": "portrait", "quickAdd": false },
  "showCta": true,
  "cta": { "label": "Shop all audio", "href": "/catalog?category=audio" }
}
```

Use actual **product IDs**, which may differ from slugs. `productIds` preserves supplied order, removes duplicates and ignores IDs missing from the loaded catalog. Omit it for all loaded products; `[]` intentionally selects none. `collectionId`, `categoryId`, and `inStockOnly` intersect with that selection. Sorting then runs before `limit` (1–24; default 4). Sort values: `featured` (catalog/curated order), `price-low`, `price-high`, `name`.

Layouts: `template` keeps the native editorial composition; `grid` is a regular grid; `rail` is a keyboard-focusable horizontal row with native scrolling and visible scrollbar. `columns` (1–4; default 4) applies to desktop grid/rail, capped at two on tablets. `mobileColumns` (1 or 2; default 2) applies to the grid. Rails show a partial next card on phones to indicate scrolling. Native template compositions retain their own columns.

`card` is a **sparse override** of `presentation.productCard`; unspecified values inherit the store. `showCta: false` removes the collection link. Without `cta`, it links to the selected collection/category or the whole catalog.

### Categories

Use `layout: "template" | "grid" | "list"`, `eyebrow`, `title`, optional `description`, optional ordered `categoryIds`, and `columns` (1–4; default 3). An empty category ID array hides the section. The grid caps at two columns on tablets/phones; the list uses image-and-description rows. All category links continue to filter the catalog.

### Text, FAQ and benefits

```json
[
  {
    "id": "brand-story",
    "type": "text",
    "layout": "split",
    "eyebrow": "OUR APPROACH",
    "title": "A little more considered.",
    "paragraphs": ["Your first paragraph.", "Your second paragraph."],
    "cta": { "label": "Our story", "href": "/story" }
  },
  {
    "id": "questions",
    "type": "faq",
    "title": "Good to know.",
    "items": [{ "question": "Is this a demo?", "answer": "Yes. No payment is collected." }]
  },
  {
    "id": "service-promises",
    "type": "benefits",
    "items": [{ "title": "Here to help", "description": "Contact our team for assistance." }]
  }
]
```

Text supports `centered` (default) or `split`, plain paragraphs, and an optional CTA. FAQ uses accessible native disclosure controls; more than one answer can remain open. Benefits can supply `items` or inherit the top-level `benefits` array.

`presentation.benefitsPosition` is `start`, `end` (default), or `hidden` for the automatic native benefits section. An enabled explicit benefits section suppresses that automatic section, preventing duplicates. `hidden` affects the automatic section only; explicit sections still render where placed.

## Product cards and catalog

`presentation.productCard` applies to homepage cards, catalog cards and related-product cards:

| Field          | Default    | Options                                                                    |
| -------------- | ---------- | -------------------------------------------------------------------------- |
| `imageRatio`   | `template` | `template`, `square`, `portrait` (3:4), `landscape` (4:3)                  |
| `imageFit`     | `template` | `template`, `contain`, `cover`                                             |
| `showCategory` | `true`     | Boolean                                                                    |
| `showBrand`    | `false`    | Boolean                                                                    |
| `showOptions`  | `true`     | Boolean                                                                    |
| `showBadge`    | `true`     | Boolean; sold-out labels remain visible for availability clarity           |
| `quickAdd`     | `true`     | Boolean; disabling removes the shortcut, leaving product detail navigation |

Products requiring size selection still open the product page from the quick action. Stock, pricing and variant rules are unaffected by presentation settings.

`presentation.catalog` accepts:

```json
{
  "layout": "toolbar",
  "columns": 3,
  "mobileColumns": 1,
  "defaultSort": "price-low",
  "showCategoryTabs": true,
  "filters": { "search": true, "brand": false, "price": true, "availability": true },
  "eyebrow": "OUR COLLECTION",
  "title": "Explore the possibilities.",
  "description": "Choose something for your everyday."
}
```

Layouts are `template` (default), left `sidebar`, or horizontal `toolbar`. Columns are optional (1–4); omission keeps the native grid. Explicit columns cap at two on tablets. Mobile supports one or two. Disabling all filter controls removes the filter panel. Hidden controls do not erase deep-linked URL filters; the toolbar offers Clear filters when the entire panel is hidden. URL sort overrides `defaultSort`. Category/search headings still reflect the selected category/query.

These are presentation controls, not product authorization or inventory filters. Curated sections and browsing operate on the loaded catalog. Large-catalog API search and product lookup remain available through the existing provider interface.
