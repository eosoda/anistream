# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

AniStream serves anime viewers who want to discover locally available titles, resume episodes quickly, and watch from reliable configured sources. A secondary audience is the operator who maintains titles, episodes, providers, navigation, broadcasts, and platform health from the administrative panel.

## Product Purpose

The product combines a browsable anime catalog with progress-aware playback and an operational control panel. Success means that a viewer can move from discovery or a saved position to playback with minimal delay, while an operator can diagnose and correct catalog or provider problems without editing code.

## Positioning

AniStream only promotes titles that are available in its local catalog and connects discovery to playback sources returned by Kenjitsu. Preferences, episode progress, source selection among enabled Kenjitsu extensions, opening intervals, favorites, and local administration are parts of one continuous experience.

## Operating Context

- Viewers use the responsive web app on desktop, tablet, and mobile, frequently one-handed and on interrupted sessions.
- Operators use a denser authenticated admin workspace for monitoring, editing, importing, testing, and recovery.
- The application runs as a Next.js PWA and is commonly validated through Docker at `http://localhost:3000`.

## Capabilities and Constraints

- Public routes, anime and episode URLs, saved progress, favorites, source preferences, and existing API contracts must remain compatible.
- Kenjitsu is the single upstream for catalog metadata, episodes, and media; the local database stores the operational catalog, user state, extension settings, health history, and audit trail.
- Direct HLS playback, embed sources, quality selection across enabled Kenjitsu extensions, opening skip, keyboard shortcuts, and resume behavior must be preserved.
- The redesign must preserve or improve the mobile Lighthouse performance baseline of 95.
- Merge into `main` requires explicit human authorization after all implementation gates pass.

## Brand Commitments

- Keep the AniStream name, logo treatment, dark viewing environment, and orange playback accent.
- Evolve the existing identity rather than replace it.
- Public discovery should feel cinematic, playback should feel quiet, and administration should feel operational.
- Visible product language is Brazilian Portuguese; imported untranslated metadata should be normalized or clearly treated as source content.

## Evidence on Hand

- Real local anime, episode, provider, progress, and health data are available in the application and database.
- Existing artwork and posters are used as the primary visual material.
- Baseline UX and technical findings are archived under `.impeccable/critique/`.
- No testimonials, commercial benchmarks, or usage claims are available and none may be invented.

## Product Principles

1. Resume and play before asking the viewer to configure.
2. Show only actions and content that are currently usable.
3. Make operational state comparable and recoverable.
4. Preserve context across interruption, navigation, and source recovery.
5. Prefer clear product truth over decorative interface chrome.

## Accessibility & Inclusion

Target WCAG 2.2 AA for keyboard access, focus management, contrast, touch targets, forms, dialogs, asynchronous status, text scaling, and reduced motion. The supported responsive range starts at 320 CSS pixels and includes tablet, desktop, landscape playback, and 200% text zoom.
