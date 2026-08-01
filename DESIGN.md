# AniStream Design System

<!-- impeccable:design-schema 1 -->

## Direction contract

**THESIS:** AniStream is a viewing-led catalog: artwork creates anticipation, progress creates continuity, and controls step back until needed. It refuses the generic dark dashboard made from identical glass cards.

**OWN-WORLD:** Near-black theater surfaces, warm orange playback accents, poster-led discovery, restrained elevation, crisp status color, and compact operational rows.

**STORY:** Viewers recognize what is available, resume immediately, and understand fallback without technical noise. Operators scan health, compare records, and recover errors quickly.

**FIRST VIEWPORT:** Public pages lead with content and a single primary action. Watch pages lead with the player. Admin pages lead with status and tasks.

**FORM:** Existing brand evolution. Discovery, Watch, and Operate share tokens but use distinct density and composition.

## Surface modes

### Discovery

Image-led and cinematic. Use poster or backdrop imagery as content, not decoration. Carousels must differ by purpose: continuation is compact, ranking is ordered, and seasonal discovery is a grid. Keep metadata subordinate to title and action.

### Watch

Quiet and low-distraction. The player owns the hierarchy. Source, quality, opening, and troubleshooting controls appear contextually. Orange communicates progress or a primary playback action, not ambient decoration.

### Operate

Dense, flat, and comparable. Prefer tables, grouped rows, split panes, and sparse dividers over decorative cards. Status colors are semantic. Dangerous actions live in explicit risk areas.

## Color and material

- Page: `#0B0B0F`.
- Raised surface: `#14141C`.
- Interactive surface: `#181824`.
- Primary accent: `#FF6B00`; hover: `#FF8533`.
- Use semantic success, warning, danger, info, text, muted text, border, and focus tokens rather than arbitrary colors.
- Keep one dark theme across the product. Do not invert isolated sections.
- Blur is reserved for overlays that physically sit above content. It is not a default card material.
- Elevation uses either a border or a shadow unless a real overlay needs both.

## Typography

- Geist is the UI and reading face.
- Geist Mono is restricted to time, identifiers, URLs, diagnostics, and measured values.
- Interactive and administrative copy is at least 14px.
- Nonessential metadata is at least 12px.
- Headings use weight and spacing rather than gradient text or oversized scale.

## Shape and spacing

- Inputs: 8px radius.
- Controls and operational panels: 12px radius.
- Media cards and major dialogs: 16px radius.
- Pills are reserved for compact filters, status, or segmented controls.
- Touch targets are at least 44 by 44px where users tap directly.
- Tight spacing groups related information; section spacing separates tasks.

## Interaction and motion

- Motion communicates feedback, hierarchy, or state change.
- No decorative bounce, ping, or perpetual pulse.
- Animate transform and opacity by default; use property-specific transitions.
- Respect reduced motion without removing meaningful status feedback.
- Keyboard, touch, mouse, screen reader, and 200% zoom are first-class input modes.

## Accessibility

- Every field has a programmatic label, help/error relationship, and invalid state.
- Dialogs trap focus, respond to Escape, isolate the background, and return focus.
- Async updates use status or alert live regions.
- Search follows the ARIA combobox/listbox pattern.
- Active navigation uses `aria-current`; expandable controls expose `aria-expanded` and ownership.

## Responsive rules

- Validate 320, 360, 390, 768, 1024, 1280, and 1440px widths.
- Do not use global overflow clipping to hide layout defects.
- Mobile navigation contains four primary destinations plus More.
- Tablet layouts are intentionally composed rather than treated as compressed desktop.
- Fixed navigation, PWA banners, toasts, and player controls share a documented safe-area/layer scale.

## Content rules

- Product UI is Brazilian Portuguese.
- Use direct action labels and recovery-oriented error copy.
- Do not expose implementation providers or API credits as primary consumer content.
- Do not invent availability, performance, customer, or catalog claims.
