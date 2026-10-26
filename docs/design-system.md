# Storefront design system

Design guidance follows the UI/UX skill's built-in priorities. Its searchable catalog resources were unavailable in this session, so these are project design decisions rather than catalog search results.

Use warm off-white backgrounds, dark ink text, restrained accents, generous spacing, and large editorial headings. Product illustrations carry the visual weight. Avoid decorative dashboards, template controls, or ERP administration in the customer experience.

- **ORBIT:** DM Sans, layered utility/navigation rows, prominent search, a compact product grid and category index, and a dark directory footer.
- **STUDIO FORM:** Centered masthead, full-width magazine cover, staggered portrait collections, a spacious editorial edit, and an oversized wordmark footer.
- **FORM & FIELD:** Inline botanical navigation, a centered welcome above a room vignette, numbered room browsing, journal-style promotions, and an invitation footer.

Shared components use CSS variables for color, type, surface, and radius. Custom palettes must retain readable contrast. Each template owns its header, footer, homepage sections, catalog layout, and card treatment. Field labels, focus indicators, status announcements, and interaction primitives remain shared. Custom dropdowns use Radix select/menu primitives with themed popup surfaces and keyboard support. Native search dialogs preserve modal focus handling. Motion uses short opacity/transform transitions and respects reduced-motion preferences.

Images reserve space to prevent layout shifts. Below-fold images are lazy-loaded, hero assets have high fetch priority, and fonts are self-hosted. Page widths and grids adapt across desktop, tablet, and mobile. The shopping experience includes clear loading, empty, unavailable, validation, failure, and demo-confirmation states.

## Merchant presentation controls

Template identity is the default. Explicit JSON settings can switch header/footer slots, native section templates, or use reusable split/centered media, grids, rails and category lists. Width, spacing and section tones use constrained values and paired semantic tokens. Product-card cropping and visible metadata can vary by store or section; sold-out information remains available.

New content blocks use plain text and native keyboard-accessible FAQ disclosures. Product rails keep native touch, keyboard and scrollbar interaction. A configured reduced-motion mode supplements OS preferences. Custom controls retain 44px touch targets and the existing focus behavior. The new options follow the UI/UX skill's built-in accessibility/layout priorities; no new database search result is claimed.

## Beauty and outdoor template directions

SEREIN (`beauty`) pairs Cormorant Garamond with DM Sans, warm plaster surfaces, restrained plum accents, a capsule header, sculptural amber-glass illustration, a ritual shelf and a framed farewell. NORTHLINE (`outdoor`) uses bold DM Sans, sharp rules, equipment indexes, a panoramic mountain illustration and a large expedition imprint. Each owns its header, footer and homepage composition as well as native card/catalog styles. Their layouts remain distinct under the same theme palette.

The artwork is original local SVG, with no external image dependencies. Product claims and inventory are explicitly fictional. Both use existing accessible navigation/dropdown primitives, responsive grids and reduced-motion behavior. The UI/UX skill's built-in priorities guide the designs; no database-derived palette or style match is claimed because its search resources are unavailable in this environment.
