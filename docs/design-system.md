# Storefront design system

Design guidance follows the UI/UX skill's built-in priorities. Its searchable catalog resources were unavailable in this session, so these are project design decisions rather than catalog search results.

Use warm off-white backgrounds, dark ink text, restrained accents, generous spacing, and large editorial headings. Product illustrations carry the visual weight. Avoid decorative dashboards, template controls, or ERP administration in the customer experience.

- **ORBIT:** DM Sans, off-white and graphite, small cobalt accents. Split product hero and compact technology collections.
- **STUDIO FORM:** Cormorant Garamond headings with DM Sans body text, warm neutral colors, an image-first editorial composition.
- **FORM & FIELD:** Cormorant Garamond headings, olive accents, soft corners and an arched hero frame.

Shared components use CSS variables for color, type, surface, and radius. Custom palettes must retain readable contrast. Navigation, field labels, focus indicators, status announcements, and keyboard interactions are shared across templates. Native dialogs and form controls preserve expected browser behavior. Motion uses short opacity/transform transitions and respects reduced-motion preferences.

Images reserve space to prevent layout shifts. Below-fold images are lazy-loaded, hero assets have high fetch priority, and fonts are self-hosted. Page widths and grids adapt across desktop, tablet, and mobile. The shopping experience includes clear loading, empty, unavailable, validation, failure, and demo-confirmation states.
