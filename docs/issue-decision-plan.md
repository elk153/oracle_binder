# Issue decision plan

Review of the open GitHub issues against the `dev` branch on 22 Nov 2026 (app version 2026.11.7). This is a working document for review: each issue has what exists today, what is unclear, the options, and a recommendation. Nothing here is decided yet. Once a choice is made in a fine-tuning session, it becomes a `D-0xx` entry in [DECISIONS.md](../DECISIONS.md) and this file can be updated or deleted.

## Closed during this review

| Issue | Why it was closed |
| --- | --- |
| #34 Convert all javascript to typescript | Done by D-058 (release 2026.11.2). Every file in `src/` is `.ts`/`.tsx`, `tsconfig.json` has `allowJs: false`. Only `eslint.config.js` stays JS, on purpose. |
| #27 Remove/adapt hover on icons | Done in commit `a751364` (8 Nov). Card action icons and the flip button open on click/tap only (`ENABLE_CARD_ACTION_HOVER = false` in `CardTile.tsx`). |

## Overview of the open issues

Size: **S** = an afternoon, one or two files. **M** = a few sessions, several files. **L** = a project of its own, needs phases. **XL** = several projects.

| # | Issue | Size | Clear enough to start? | Recommendation in one line |
| --- | --- | --- | --- | --- |
| 26 | Swap binder and decks icons | S | No: order or drawings? | Clarify, then a 10-minute change |
| 30 | Auth (Keycloak) | – | Already decided | Close as "not planned" (D-038 deferred, D-067 social sign-in shipped) |
| 35 | Speed up the UI | S–M | Yes | Optimistic favorites heart first, then Binder/Deck icons |
| 5 | Share option | S (phase 1) | Mostly | Share button using the URL the app already builds |
| 28 | Home page mulligan | S–M | No: which hand? | "Mulligan" button that redraws 7 from the daily set |
| 12 | Versions autres langues | M–L | No: app text or card text? | Clarify first; two very different jobs |
| 29 | Value tracker | L | Yes, in phases | Phase 1 totals from Scryfall prices, no database change |
| 32 | Offline capability | L | Yes, in phases | Phase 1 read-only installable app (PWA) |
| 33 | Native app version | L–XL | Depends on #32 | PWA first, Capacitor wrapper if a store app is still wanted |
| 31 | Standalone Docker package | XL | No: what is "standalone"? | Clarify the goal; start with a front-end image only |

## Suggested order

```text
Wave 1 – quick wins        #26, #30 (close), #35
Wave 2 – small features    #5 (phase 1), #28
Wave 3 – medium features   #29 phase 1, #12 (after clarification)
Wave 4 – platform work     #32 phase 1 → #33 → #31, and #29 phases 2–3
```

Why this order: wave 1 and 2 are small, visible improvements that each teach one React/TanStack concept. Wave 3 adds real features on top of existing data. Wave 4 changes how and where the app runs; #32 (offline/PWA) is the foundation for #33 (native app), and #31 (Docker) is the largest and least defined.

---

## #26 Swap binder and decks icons

**Today:** the order is Favorites → Binder → Decks in both places it appears: the navbar (`src/features/navigation/navItems.ts`) and the card action icons (`CARD_ACTIONS` in `src/features/card-browser/CardTile.tsx`). The icons are `BinderIcon` and `DecksIcon` in `src/assets/icons/navigation/`. An earlier "change icons order" commit (`2e9e9ac`, 28 Oct) predates the issue (7 Nov), so it did not resolve it.

**Unclear:** "swap" can mean two things.

| Option | What changes | Files |
| --- | --- | --- |
| A. Swap the order | Favorites → Decks → Binder, in the navbar and on each card | `navItems.ts`, `CardTile.tsx` |
| B. Swap the drawings | The binder drawing is used for Decks and the other way round (if the current pictures feel mismatched) | `navItems.ts`, `CardTile.tsx` (imports only) |

**Recommendation:** decide A or B. Either way change both places together, so the navbar and the card icons keep the same order and meaning.

**Questions for you:**
- Order or drawings?
- Should the Scan item move too (it sits between Search and Favorites)?

---

## #30 Auth (look at Keycloak)

**Today:** Keycloak was looked at and written up in D-038, D-039 and D-040, then deferred on 21 Nov. D-067 re-assessed it on 22 Nov: Keycloak needs its own SMTP for verification and password reset, so it does not solve email delivery. Release 2026.11.7 shipped GitHub and Discord sign-in through Supabase (D-067 to D-070). The investigation the issue asked for is done.

**Options:**

| Option | Meaning |
| --- | --- |
| A. Close as "not planned" | Point to D-038 and D-067. Reopen if #31 ever needs a self-hosted identity provider. |
| B. Keep open | Only useful if Keycloak is still wanted for a specific reason (e.g. sharing users with your other app on the Pikapod). |

**Recommendation:** A. Even #31 does not need Keycloak, because self-hosted Supabase includes its own auth server.

**Open in D-070:** turning off the Email provider in the Supabase dashboard is still a pending step (see the 2026.11.7 changelog). That is tracked in DECISIONS.md, not in this issue.

---

## #35 Speed up the UI (optimistic icon updates)

**Today:** every icon action waits for the server before the screen changes.
- Favorites heart (`useToggleFavorite` in `src/features/favorites/useFavorites.ts`): sends the insert/delete, waits, then *invalidates* the favorites query, which triggers a second request. The heart changes after two round trips. D-011 already said "Optimistic updates come later".
- Binder and Deck actions (`useBinderCopies.ts`, `useDeckManagement.ts`): wait for the server, then patch the cache in `onSuccess` with the row the server returns. One round trip, but still a visible pause.

**Concept:** an *optimistic update* changes the cache in `onMutate` (before the request), keeps a snapshot, and puts the snapshot back in `onError` if the server refuses. TanStack Query documents two ways: patch the cache, or show the pending value from the mutation's `variables` without touching the cache.

| Option | Scope | Effort | Notes |
| --- | --- | --- | --- |
| A. Favorites heart only | `useToggleFavorite` | S | Biggest gain, simplest case: on/off, no server-generated id. Good first lesson. |
| B. A + binder/deck counts on the icons | `useBinderCopies`, `useDeckManagement` | M | Harder: new copies and entries get their id from the database, and some actions use atomic database functions that also change other rows (D-034). Needs temporary ids or a pending state. |
| C. Pending state via `variables` | Any of the above | S per action | No rollback code, but only the component that started the action sees the pending state. |

**Recommendation:** A now. Then measure whether Binder/Deck still feel slow before doing B. The Realtime echo filter (`markLocalRealtimeChange`) must keep working with the optimistic change; check that during the session.

**Questions for you:**
- Is the slow feeling only the icons, or also page loads (Binder, Decks, Favorites)? If page loads, that is a different fix (prefetching, cache) and maybe a separate issue.

---

## #5 Share option

**Today:** no share feature. But the app already keeps search state in the URL: `q`, the advanced `s_` parameters, and `?card=<id>` opens a card's details. So a link to a Scryfall search or a card is already shareable by copying the address bar.

**Limitation:** collection searches (`source=collection`), Binder and Decks show private data protected by row-level security. A link to them only works for the owner.

| Option | What it gives | Effort |
| --- | --- | --- |
| A. Share button | A button on the search results and in the card details. On phones it opens the system share sheet (Web Share API, `navigator.share`); on desktop it copies the link to the clipboard and shows a notice. Hidden or disabled for collection searches. | S |
| B. Public deck/binder links | A deck or binder can be shared read-only with anyone who has the link. Needs a share token column or table, an RLS policy for public read, a new public route. | M–L |
| C. Link previews | A card image and title when the link is pasted in a chat (Open Graph tags). The app is a single-page app, so this needs a Netlify function to render tags per link. | M |

**Recommendation:** A as this issue. B is a separate, larger feature worth its own issue (it also touches the database and security rules).

**Questions for you:**
- Is sharing a deck list with friends (B) the real goal behind this issue?

---

## #28 Home page mulligan

**Today:** Home shows up to seven cards from one booster-focused set chosen per UTC day (`CardBrowserPage` in mulligan mode, set list in `mulliganSets.ts`). The same seven cards appear all day; there is no way to draw again.

**Unclear:** what "simulate a hand of cards" means.

| Option | What it does | Effort | Notes |
| --- | --- | --- | --- |
| A. Redraw from the daily set | A "Mulligan" button draws a new 7 (then 6, 5 … like a real mulligan) from today's set | S–M | To stay gentle with Scryfall, load one page of the set once (up to 175 cards) and shuffle locally, instead of one request per click. |
| B. London mulligan rules | Draw 7, then choose N cards to put on the bottom after N mulligans | M | Builds on A; adds a "keep" step. |
| C. Sample hand from one of my decks | On the Decks page, draw 7 from a chosen deck ("goldfishing") | M | Needs a deck of real size; deck entries are already loaded on that page. Useful for deck building. |

**Recommendation:** A on Home first (small, fun, teaches local state and shuffling). C is probably more useful for actual play and could be a follow-up issue.

**Questions for you:**
- Home redraw (A/B), deck sample hand (C), or both?
- Should the daily set stay the same for everyone each day, with only the hand changing?

---

## #12 Versions autres langues (other languages)

**Today:** the app text is English only (`<html lang="en">`), with no translation setup. Card language exists only as data: Binder copies store a language, and the scanner reads the printed language code (D-066).

**Unclear:** two very different jobs share this title.

| Option | What it means | Effort | Notes |
| --- | --- | --- | --- |
| A. Translate the app text (UI) | Buttons, labels, messages in French (and others) with a language switch | M–L | Every user-facing string moves into translation files. Library (e.g. react-i18next, new dependency) or a small own context like `ThemeContext`. |
| B. Show cards in another language | Search and show French printings: Scryfall's `lang:fr` search filter and the `printed_name` / `printed_text` fields | M | Scryfall has fewer images and texts for non-English printings; English fallback needed. Affects the card renderer pipeline (`normalizeCard.ts`). |
| C. Both | | L | |

**Recommendation:** pick one first. If the goal is "French-speaking friends can use it", A. If it's "my binder is full of French cards and I want to see them as they are", B.

**Questions for you:**
- App text, card text, or both? Which languages (FR only, or FR/DE/IT/ES/JA like the scanner)?
- If A: is a new dependency OK, or own small solution to learn the concept?

---

## #29 Value tracker

**Today:** card details show current EUR and foil EUR per printing, straight from Scryfall. Binder copies store a `purchase_price` and `disposal_price`, and each copy has a finish (non-foil/foil/etched). There is no total value anywhere and no price history. AGENTS.md lists "collection valuation and price history" as a goal, not a feature.

**Price source:** Scryfall already includes daily prices taken from Cardmarket (EUR) and TCGplayer (USD), free, in every card it returns. Both Cardmarket's and TCGplayer's own APIs are restricted for new developers (verify current status before relying on this). Recommendation: use Scryfall's prices.

**Phases:**

| Phase | What | Effort | Database? |
| --- | --- | --- | --- |
| 1. Current value | Total value per card, deck, binder and collection, computed in the browser from the cards already loaded (foil price for foil copies). Optional: compare with purchase price (profit/loss). | M | No |
| 2. Daily history | A `price_snapshots` table (user, date, scope, value) and a daily job: Supabase scheduled function (pg_cron + Edge Function) that fetches prices for owned cards in batches of 75 through Scryfall's collection endpoint and stores totals. Keep 30 days. | L | Yes: migration, rollback, RLS, pgTAP |
| 3. Chart on Home | A value-over-time chart from the snapshots | M | No |

**Things to decide:**
- Store a total per day per scope (small) or a price per card per day (bigger, but lets you see which card moved)?
- EUR only, or USD too?
- Proxies and virtual deck entries: count them in deck value or not?
- Chart: new dependency (e.g. a chart library) or a hand-drawn SVG line?

**Recommendation:** phase 1 as its own release; it is useful on its own and needs no database work. Phases 2 and 3 after.

---

## #32 Offline capability for the collection

**Today:** `public/manifest.webmanifest` and app icons exist, but there is no service worker, so the app does not load without network. TanStack Query keeps some data in `localStorage` (`PersistenceProvider.tsx`), which is limited to about 2 million characters; the card-name catalog is already left out because of that. Card images come from Scryfall's servers.

**What the issue asks**, and how hard each part is:

| Part | Effort | Notes |
| --- | --- | --- |
| See my cards offline | M | Service worker (e.g. `vite-plugin-pwa`, new dependency) caches the app files and card images; move the query cache from `localStorage` to IndexedDB (no size problem). |
| Change favorites offline | M | TanStack Query can keep paused mutations and replay them when back online. Favorites are simple on/off, so replaying is safe. |
| Change binders and decks offline | L | Copies get their id from the database, and moves use atomic database functions (D-034). Replaying them later can conflict with changes made on another device. Supabase has no built-in offline sync; dedicated sync tools exist but are a new service. |

**Recommendation:** phase 1 = installable, read-only offline app (also the first step of #33). Phase 2 = offline favorites. Decide on binder/deck offline edits only after using phase 1 for a while.

**Questions for you:**
- Where would you use it offline (game store with bad signal, travel)? That decides whether read-only is enough.

---

## #33 Native app version

**Today:** web app only. App Store icons are already in `public/` (D-001 noted they are only needed for a native iOS build).

| Option | Code reuse | Effort | Notes |
| --- | --- | --- | --- |
| A. Installable web app (PWA) | 100% | M | Comes with #32 phase 1. "Add to Home Screen", own icon, full screen. No store. |
| B. Capacitor | ~100% | L | Wraps the existing web app in a native iOS/Android shell, so it stays aligned with the web app automatically. Native camera access may help the scanner. Needs deep links for the GitHub/Discord sign-in redirect. |
| C. React Native / Expo | Logic only, UI rewritten | XL | No HTML/CSS: every screen, the card renderer and the scanner are rebuilt. Two apps to keep aligned. |
| D. Electron / Tauri | ~100% | M | Desktop apps only (Mac/Windows/Linux), not phones. |

Store publishing needs developer accounts (Apple charges a yearly fee; Google a one-time fee — verify current prices), plus review and signing.

**Recommendation:** A first (via #32). Then decide if a store app is still worth it; if yes, B, because it keeps one codebase, which answers "keep the native app aligned with the web app".

**Questions for you:**
- Phone (iOS, Android, both?) or desktop? The issue mentions Electron, which is desktop only.
- Is being in the App Store a goal in itself?

---

## #31 Standalone Docker package

**Today:** the front end is a static Vite build on Netlify; data and auth are hosted Supabase; card data comes from Scryfall. `npm run build` bakes `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` into the bundle.

**What "standalone" would involve:**

| Piece | How | Difficulty |
| --- | --- | --- |
| Front end | A small web-server container (nginx or Caddy) serving `dist/`. The Supabase settings must be read at start-up instead of baked in at build time, so one image works for any server. | M |
| Database and auth | Supabase's official self-hosting setup (Docker Compose with Postgres, auth, API, Realtime, Storage and more: around ten containers). Migrations applied with the Supabase CLI. | L |
| Sign-in | GitHub/Discord sign-in still needs internet and an OAuth app registered per server address. A fully offline setup would need email/password back, or a local identity provider (this is where Keycloak could return, see #30). | M–L |
| Card data | Scryfall is an external server. "No external servers at all" would mean mirroring Scryfall's bulk data and images locally, which is a large project. | XL |

**Recommendation:** clarify the goal first. A realistic first step is a front-end image that points at the hosted Supabase. Self-hosted Supabase is a second step. Full independence from Scryfall is probably not worth it.

**Questions for you:**
- Who would run it: you on a home server, or other people on theirs?
- Must it work without internet, or only without *your* hosted Supabase?

---

## Cross-issue notes

- **#32 → #33 → #31:** the PWA work in #32 is reused by #33 option A/B. #31's sign-in question links back to #30.
- **#29 and #5:** public deck links (#5 option B) could later show a deck's value from #29.
- **New dependencies** are likely for #12 (translation library), #29 (chart), #32 (PWA plugin) and #33 (Capacitor). Per AGENTS.md each one needs your approval first.
- **Database changes** (migration + rollback + RLS + pgTAP) are needed for #5 option B and #29 phase 2 only.
