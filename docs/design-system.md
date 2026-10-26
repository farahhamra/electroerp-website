# Storefront design system

Design guidance follows the UI/UX skill's built-in priorities. Its searchable catalog resources were unavailable in this session, so these are project design decisions rather than catalog search results.

Use warm off-white backgrounds, dark ink text, restrained accents, generous spacing, and large editorial headings. Product illustrations carry the visual weight. Avoid decorative dashboards, template controls, or ERP administration in the customer experience.

- **ORBIT:** DM Sans, layered utility/navigation rows, prominent search, a compact product grid and category index, and a dark directory footer.
- **STUDIO FORM:** Centered masthead, full-width magazine cover, staggered portrait collections, a spacious editorial edit, and an oversized wordmark footer.
- **FORM & FIELD:** Inline botanical navigation, a centered welcome above a room vignette, numbered room browsing, journal-style promotions, and an invitation footer.

Shared components use CSS variables for color, type, surface, and radius. Custom palettes must retain readable contrast. Each template owns its header, footer, homepage sections, catalog layout, and card treatment. Field labels, focus indicators, status announcements, and interaction primitives remain shared. Custom dropdowns use Radix select/menu primitives with themed popup surfaces and keyboard support. Native search dialogs preserve modal focus handling. Motion uses short opacity/transform transitions and respects reduced-motion preferences.

Images reserve space to prevent layout shifts. Below-fold images are lazy-loaded, hero assets have high fetch priority, and fonts are self-hosted. Page widths and grids adapt across desktop, tablet, and mobile. The shopping experience includes clear loading, empty, unavailable, validation, failure, and demo-confirmation states.
