# V2 Navigation — desktop header + mobile floating bar

The V2 navbar renders a desktop header and a mobile floating bar, with one
shared visual language driven by the tokens in `src/theme.css`.

## Files

```text
src/features/navigation/
├── NavBar.tsx               — root component, search routing and auth actions
├── NavBarDesktop.tsx        — desktop header
├── NavBarMobile.tsx         — mobile floating bar
├── NavSearchField.tsx       — shared quick-search / random input
├── navItems.ts              — navigation destinations
├── NavThemeToggle.tsx       — theme control
├── navbar-shared.css        — shared surface, icon and label styles
├── navbar-desktop.css       — desktop positioning
└── navbar-mobile.css        — mobile positioning

src/assets/icons/navigation/
└── individual SVG icon components
```

In the current V2 app, the Binder item opens `/v2/binder`; the former
`/v2/collection` path redirects there.

## How the "reuse the floating bar" ask was implemented

`navbar-shared.css` owns the shared visual treatment: the glass gradient surface,
the gold hairline border, `box-shadow: var(--eerie-glow)`, the blur, and
the icon/label glow mechanic. Both `<header class="nav-surface">` (desktop)
and `<nav class="nav-surface">` (mobile) point at the exact same class —
they only differ in `navbar-desktop.css` / `navbar-mobile.css`, which set
`position`, `top` vs `bottom`, width, and the hide-transform direction
(slides up off-screen on desktop, down on mobile). Change the surface once,
both bars update.

`useScrollVisibility` is the same hook for both; only the thresholds differ
slightly since a bottom bar under a thumb behaves differently than a header
under a cursor.

## The glow mechanic (the "Ring inscription" effect)

The navigation SVG components are drawn as two layers:

- `.nc-trace` — an outline that's always faintly present (never fully
  invisible, so the icon reads at rest)
- `.nc-core` — the sunken interior, filled with `var(--sublayer-bg)`
  (black) at rest

When a `.nav-item` gets `.is-active`, `.nc-core` switches to
`var(--text-accent)` (your aquamarine) with a layered `drop-shadow` glow,
and `.nc-trace` picks up a matching stroke color and soft glow. The nav
label uses the same idea via layered `text-shadow` — dim/engraved at rest,
glowing once active. This reads correctly in both your light and dark
`data-theme` blocks since it's driven entirely by CSS variables, not
hardcoded colors.

## Typography

```css
--font-display: "Cinzel", "Iowan Old Style", serif;   /* used sparingly, not wired in below */
--font-ui: "Manrope", "Inter", system-ui, sans-serif; /* nav labels — this is what's used */
```

Nav labels use `--font-ui` at uppercase + small tracking (`letter-spacing:
0.06em`) — enough medieval-plaque feel to fit the theme without
sacrificing legibility at 0.7rem. `--font-display` is left as a token for
a logotype/brand mark elsewhere in the app; it's deliberately **not**
used on the nav items themselves, since a heavy serif at icon-label size
fights the "must remain very readable" requirement. Load both via
`@font-face` or Google Fonts in your root stylesheet; fallbacks are
system-safe if you don't.

## Assumptions made (flag if wrong)

- **Routing:** `react-router` (`useNavigate`). `NavBar` is mounted in the
  `/v2` layout, so its relative search destinations resolve under `/v2`.
- **Search behavior:** empty submit → `search/random`, non-empty →
  `search?q=<term>`. These destinations are route-relative to the V2 layout.
  Search keeps other query parameters, including active filters. The handler
  lives in `NavBar.tsx`.
- **Breakpoint:** 861px is the desktop/mobile split (matches common
  tablet-portrait cutoffs). Change the `min-width` in both CSS files if
  your app uses a different one.
- **`color-mix()`** is used for glow opacity blending — supported in all
  current evergreen browsers. If you need older Safari support, swap
  those for precomputed `rgba()` values.

## Usage

```jsx
// src/app/App.tsx, inside the /v2 route
import NavBar from "../features/navigation/NavBar.tsx";

function AppV2() {
  return (
    <>
      <NavBar />
      <main>{/* routed content */}</main>
    </>
  );
}
```

Since both bars are `position: fixed`, give your main content wrapper
top/bottom padding so it doesn't sit underneath either bar, e.g.:

```css
main { padding-top: 5.5rem; padding-bottom: 5rem; }
```
