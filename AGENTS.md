# Agent Context

Working map of the app for AI coding agents. Checked against the repository source on 2 Nov 2026. Where this file and the source disagree, the source wins; update this file when the architecture or behavior changes.

## How to work with me (read first)

The developer is learning React and TypeScript and wants to understand every change, not just receive code.

- Explain the reasoning *before* changing code, and name the concept used (e.g. "custom hook", "type guard", "route-relative navigation").
- Make small, single-purpose changes. For anything touching more than two files, show a short plan and wait for approval.
- Prefer the simplest approach that fits the existing code over clever abstractions.
- Ask before deleting files, adding dependencies, or converting files between JS and TS.
- After a change, say which command to run to check it and what a pass looks like.
- Do not claim something works unless you checked the source or ran the check.

## App at a glance

- React 19 + Vite SPA that finds Magic: The Gathering cards through the public Scryfall API (`https://api.scryfall.com`). Routing uses `react-router` 8 (`createBrowserRouter`).
- The app currently ships **two layouts** side by side, mounted at different URL prefixes:
  - **`/v1`: the original card browser.** Random card, name search, card detail overlay, rulings, legalities, printings, and per-printing EUR / foil EUR prices. Its result list uses the original card renderer and the `card-filters/` table.
  - **`/v2`: the current default card browser.** Home shows a daily seven-card set; search results support local color, rarity, type and sorting controls; card details show artwork, rules/legalities and printings with current EUR / foil EUR prices. Favorites are saved to Supabase and displayed in a paginated favorites page. The Binder tracks per-copy metadata, folders, loose copies and disposed-copy history. Decks supports card entry management, an All cards view, deck covers/counts, and deck create/rename/delete. Advanced search remains a placeholder.
- Both layouts have dark/light theme controls. Theme state is shared through React context, defaults to dark on each page load, and is not persisted.
- No custom application backend or user database. Supabase Auth provides managed email/password signup and sign-in; account data is managed by Supabase. TanStack Query caches remote data in memory and persists some of it in browser `localStorage`.
- Binder copies track acquisition/location details and disposal status. Separate collection records, full deck-building tools, price history, sales and balance remain **goals, not features**. Never imply they exist.

## Commands and current status

Node 22 works. Install with `npm install`.

| Command | Purpose | Status |
| --- | --- | --- |
| `npm run dev` | Vite dev server | works |
| `npm run build` | production build into `dist/` | passes |
| `npm run preview` | serve the build | works |
| `npm run typecheck` | `tsc --noEmit` | passes |
| `npm run lint` | ESLint | **fails: 18 pre-existing errors, 0 warnings** (checked 2 Nov 2026) |

- No test framework or test script exists.
- Current lint status (checked 2 Nov 2026): 18 errors, no warnings. Errors are unused parameters in `src/assets/IconCards.jsx` and `src/assets/IconSearch.jsx`, unused imports and conditional `useOracleText` calls in the inactive `original-card-renderer/CardDetails/CardDetails.jsx`, and unused parameters in renderer extras. Re-run lint before attributing errors to a change; the baseline can change.
- Run the narrowest check that fits. At minimum run `npm run typecheck` and `npm run build`.

## Routes

Defined in `src/app/router.tsx`. `/` redirects to `/v2/home`.

| Path | Renders |
| --- | --- |
| `/` | redirects to `/v2/home` |
| `/v1` | redirects to `/v1/random` |
| `/v1/random` | random card, via `CardsList` |
| `/v1/cards/:searchQuery` | name search results, via `CardsList` |
| `/v1/card/:cardId` | declares `CardOverlay` (see gotchas) |
| `/v2` | redirects to `/v2/home` (route loader) |
| `/v2/home` | daily seven-card set (`CardBrowserPage` in mulligan mode) |
| `/v2/login` | email/password signup and sign-in |
| `/v2/auth/callback` | completes email confirmation and returns to a safe `/v2/` path |
| `/v2/search?q=<name>` | Scryfall name search and local filters |
| `/v2/search/random` | daily set/mulligan browser |
| `/v2/favorites` | paginated signed-in user's favorites (`FavoritesPage`) |
| `/v2/binder` | per-copy Binder and binder-folder management; requires sign-in; supports `?view=all|binders` and `?binder=<id>` |
| `/v2/decks` | protected deck page with URL-backed All cards/Decks views, selected-deck filtering, deck covers, counts, create/rename/delete |
| `/v2/search/advanced` | placeholder page exported from `src/app/App.tsx` |
| `/v2/collection` | redirects to `/v2/binder` |

## v1 flow (original browser)

1. `index.html` links root `style.css` and loads `/src/main.tsx`; it holds `#root` and the splash elements. `main.tsx` imports `src/theme.css` and mounts `AppProviders` in `StrictMode`.
2. `AppProviders.tsx` nests `ThemeProvider` > `PersistenceProvider` > `QueryDevToolsProvider` (receives `queryClient` as a prop) > `RouterProvider`.
3. `src/app/App.jsx` is the v1 layout route. It owns search and card queries, `FloatingNavBar`, outlet context (`scryfallCards`, `isLoadingCards`, `onCardSelect`), the splash transition, and the overlay.
4. `src/features/scryfall-card-renderer/CardsList/CardsList.jsx` renders results. Despite the folder name, it renders `original-card-renderer/Card/Card.jsx` for each item. It uses `card-filters/` to filter and sort the current Scryfall result set; filter values are synchronized to URL search parameters using `nuqs`.
5. Clicking a card calls `navigate("card/<id>", { state: { fromList: true } })`. `App.jsx` renders `CardOverlay` in `.top-layer` using its own fetched/selected card.

### Gotchas to preserve

- The routed `CardOverlay` from the router receives no `card` prop and returns `null`. The visible overlay is rendered by `App.jsx`. Understand this before changing card-route rendering.
- **Navigation is route-relative** (recent change "changed to relative navigation"): `navigate("random")`, `navigate("cards/<name>")`, `navigate("card/<id>")`, and `isRandomRoute` uses `useResolvedPath("random")`. Do not replace these with absolute paths like `/random`; they resolve against the layout that renders them (`/v1` or `/v2`).
- Closing the overlay: if `location.state.fromList`, `navigate(-1)`; otherwise go to `cards/<encoded card name>`.
- Random: the seed (`Date.now()`) is part of the query key; submitting an empty search changes it.
- Keep route params URI-safe (`encodeURIComponent` / `decodeURIComponent`).
- Card symbols are prefetched in `App.jsx` with `usePreFetchUrl("cardSymbols", ".../symbology", Infinity)` and also read by `useOracleText`.
- Filters only operate on the cards already returned by the current Scryfall query; they do not issue advanced Scryfall searches.
- Theme context is provided above the router by `AppProviders`. The v1 floating navbar and v2 desktop/mobile navbars each have a theme toggle. The provider currently initializes to dark and does not save a selection across reloads.

## v2 flow (current default browser)

- `src/app/App.tsx` renders the V2 `NavBar`, prefetches Scryfall card symbols and set metadata, and renders child routes through `<Outlet />`. The Home route renders `CardBrowserPage` in mulligan mode.
- `src/features/card-browser/CardBrowserPage.tsx` handles `/v2/home`, `/v2/search`, and `/v2/search/random`. Home chooses a stable set per UTC day from released, non-digital, booster-focused Scryfall set types, requests unique cards in random order, and displays up to seven cards from the first result page. The set-type allowlist lives in `mulliganSets.ts`; Scryfall does not supply a direct booster-eligibility flag.
- Name search uses the paginated `useScryfallCardPages` hook with an explicit load-more button; filters and sorting apply to cards loaded so far, plus matching favorited printings not on the current Scryfall pages. The `source=collection` scope searches deduplicated favorite and owned Binder printings; disposed Binder copies are excluded. The daily set uses `useScryfallCardsSearch` for a single page of up to seven cards. `?card=<id>` opens the details overlay without replacing the current search URL.
- The protected `/v2/favorites` page uses `useFavoriteCards` to page Supabase favorites newest-first with a composite cursor, hydrates each batch of up to 75 card IDs through Scryfall's collection endpoint, preserves the Supabase ordering, and skips IDs no longer present in Scryfall. It reuses `CardFilters` to filter and sort currently loaded favorites.
- `src/features/binder/` contains the paged `useBinderCopies` query, copy add/edit/dispose/history controls, and `/v2/binder`. Binder folders use `binder_id = NULL` for virtual Loose; each copy retains `user_id`. The binder icon shows owned-copy count and opens a touch-, hover- and keyboard-accessible popover; clicking pins it open until it is closed, Escape is pressed, or the user clicks outside. The copy dialog and popover use an overlay-matched style, with scrollable content for long forms and histories. Adding, editing, disposing, restoring and deleting copies patch the TanStack Query cache. Binder copies assigned to decks show their deck name; D-034 disposal/deletion atomically converts the associated deck entry to virtual and invalidates deck-card data.
- `BinderPage.tsx` provides URL-backed `?view=all|binders` and `?binder=<id>` views, local filters, bulk and per-copy moves, binder CRUD, and rarity/supertype/date-ranked covers hydrated in bounded batches through the shared Scryfall collection service. Binder cards and folder covers reuse `CardTile` from the card browser.
- `CardDetailsOverlay.tsx` loads card rulings and printings through cached queries. In the card-content panel it shows mana cost beside power/toughness, loyalty or defense, then WUBRG color circles and a rarity pill; the rows appear between the type line and oracle text for each rendered face. Print entries show current Scryfall EUR / foil EUR prices and reuse `CardTile` for flip, favorites, binder and deck actions.
- `src/features/decks/` provides user-scoped deck queries/mutations, the shared card-action popover, and `/v2/decks`. The page uses URL-backed `?view=all|decks` and `?deck=<id>`, hydrates printings through the shared collection service, and reuses `CardFilters` and `CardTile`. Deck covers use rarity/type/date ranking; each shows its name and a rounded entry-count pill. The All cards view shows every entry (including the same printing in different decks) with its deck name and kind. Proxy entries have a dashed/hatched treatment and visible label; virtual entries are muted and visibly labeled. Deck deletion removes its entries via the existing database cascade; Binder copies remain in Binder.
- Supabase user-owned tables use the reusable `useRealtimeInvalidation` hook; Realtime payloads invalidate and refetch under RLS, while local mutation echoes are ignored after cache patching. Migration `20261028113029_binder_realtime` is applied to the linked project; a read-only check on 2 Nov 2026 confirmed `favorites`, `binders`, and `binder_cards` are in `supabase_realtime`. Cross-device UI behavior has not been separately tested.
- `src/features/navigation/` holds the responsive navbar. On mobile, tapping the search icon focuses and expands the input while hiding nav links; Enter or tapping the icon again submits, and Escape closes the field. Favorites, Binder, and the Decks page are functional; advanced search routes to a placeholder. Deck entries are managed through the shared card-tile action.
- `src/features/navigation/README.md` may not reflect the flat source layout; verify its instructions against the files before following them.

## Data and state

- `src/hooks/useScryfallCardsSearch.ts`: TanStack Query hook, key `["scryfallCards", route, params, seed]`, enabled only when a route is given, 24 h `staleTime`. It uses `src/services/createApiClient.ts`, which normalizes `card` responses to `[card]` and `list`/`catalog` responses to `data`, and throws on Scryfall errors.
- `src/hooks/useFetchUrl.ts`: fetches auxiliary Scryfall URLs, key `["fetchedUrl", purpose, url]`, validates HTTP status and that the response contains a `data` array, then returns that array. A missing URL returns an empty array.
- `src/services/fetchScryfallCards.ts` performs a validated, abortable Scryfall collection request bounded to 75 identifiers; favorites use it to hydrate each paginated set while preserving database ordering and skipping cards no longer found by Scryfall.
- `src/services/fetchScryfallCardsForIds.ts` deduplicates IDs and hydrates them sequentially in batches of at most 75 with a short inter-request gap. `useScryfallCardsForIds` caches these batches for Binder covers and personal search.
- Binder schema migrations create `binders` and per-copy `binder_cards`; loose copies remain user-owned through `binder_cards.user_id`. Every migration has a matching manual rollback in `supabase/rollback/`, and exposed user data tables require least-privilege grants, RLS policies, and pgTAP coverage.
- `useRealtimeInvalidation` listens to user-filtered changes for favorites, binders and binder copies; notifications are invalidation signals, not trusted data.
- `PersistenceProvider.tsx` persists only `fetchedUrl` queries and `scryfallCards` queries whose second key is `"cards/search"`, in `localStorage`. Random and single-card queries are not persisted.
- `queryProvider.ts`: `gcTime` is 24 h and must stay >= the persisted data's max age.
- `QueryDevToolsProvider.tsx` loads Devtools lazily and only when `import.meta.env.DEV`.
- `features/card-filters/` uses TanStack Table and `nuqs` to filter by color, rarity and type, sort by name/CMC/rarity/price, and keep filter state in the URL. It is used by both V1 and V2 browser results.
- Many files contain debug `console.log` calls (e.g. `createApiClient.js`, `useFetchUrl.js`). Do not add more; ask before removing.
- Prices are current per-printing Scryfall data, not history or collection valuation.

## Source layout

- `src/main.tsx`, `src/app/` — entry, providers, router and the v1/v2 layouts.
- `src/features/scryfall-card-renderer/` — active renderer. `normalizeCard.js` maps raw Scryfall cards to the internal shape; `scryfallCardLayouts.js` and `components/` (one/split/toggle/flip/meld faces, `OracleText`, `extras/` for saga, class, case, leveler, mutate, prototype) consume that shape. Used in V1 and the V2 details overlay.
- `src/features/card-browser/` — V2 card search, daily mulligan, reusable card tile/actions, and card details/printings overlay.
- `src/features/binder/` — Binder copy data and mutations, copy metadata form/popover, binder-folder queries and the Binder page.
- `src/features/decks/` — user-scoped deck and deck-card queries/mutations, inline card action popover, and the Decks page.
- `src/features/original-card-renderer/Card/` — the older card tile, still used by the v1 results list.
- `src/features/card-filters/` — v1 result filtering, sorting, URL parsers and table setup.
- `src/features/navigation/` — V2 desktop/mobile navbar and theme toggle (see above).
- `src/components/FloatingNavBar/` — v1 navbar: name search, empty search for random, mobile keyboard/viewport handling, hides on scroll (`useScrollDirection`), and theme toggle. Also `Input/`.
- `src/hooks/`, `src/services/` — see Data and state.
- `src/theme.css` — theme tokens (dark/light), imported by `main.tsx`. `ThemeContext.ts` and `ThemeProvider.tsx` provide shared theme state and synchronize the document theme and browser theme color. `style.css` (root) is linked from `index.html`. `src/app/App.css` holds layer styles.
- `src/assets/` — inline SVG icon components. `public/` — site-root icons and favicons.
- `docs/` — notes (`app/` architecture and flow notes, `theme/theme.md`, `scryfall/CARD.json`, `file-conventions.md`, `external-resources.md`, and `nuqs-filter-guide.md`). Some notes lag the code; verify in source.

## Present but not wired in (do not edit as if live)

`src/components/Header/` (commented out in `App.jsx`), `src/features/original-card-renderer/CardDetails/` and `CardsList/`, `src/hooks/useCardSearch.js`, `src/hooks/useScrollDirection.js`, `src/services/getCardPrices.js`, and `src/services/getCardRulings.js`. The active V1 `CardsList` is under `scryfall-card-renderer/`; V2 tiles use `features/card-browser/CardTile`.

## Planned, not implemented

Full deck-building tools such as format validation, collection valuation and price history, sales and balance tracking, and true server-side/advanced search remain planned. The Decks page and basic per-card entry management are implemented, but this is not a complete deck-construction workflow. V2 search is a name search with local result filters, not advanced Scryfall search. The advanced-search page remains a placeholder.

## TypeScript

- **TypeScript today:** `src/main.tsx`, `src/app/App.tsx`, `src/app/AppProviders.tsx`, all files in `src/app/AppProviders/`, `src/app/router.tsx`, `src/hooks/`, theme and navigation components, and all files in `src/features/card-filters/`, `src/features/card-browser/`, `src/features/binder/`, `src/features/decks/`, and `src/features/favorites/`. Most renderer components and some services remain JS/JSX.
- `tsconfig.json`: `strict`, `allowJs: true`, `checkJs: false`, `verbatimModuleSyntax: true`, `allowImportingTsExtensions: true`, `include: ["src"]`. JS files are **not** type-checked, so passing `typecheck` does not type-check the JS/JSX files.
- Imports of `.ts`/`.tsx` files include the extension. Use `import type` for type-only imports.
- Convert one file at a time, only when asked. Avoid `any` and non-null assertions in TS files.
- `src/features/card-filters/types.ts` defines the narrow `ScryfallCard` shape used by filters; the renderer's normalized card shape is maintained separately in JavaScript.

## Tooling gotchas

- `package.json` lists both `react-router` ^8 and `react-router-dom` ^7, but the source imports only from `react-router`. `react-router-dom` appears unused; ask before removing.
- `AGENTS.md` is the shared repository-root context file. `CLAUDE.md` and `.github/copilot-instructions.md` point here; keep architecture and project conventions in this file rather than duplicating them.
- Mermaid diagram rules are in `.github/mermaid.instructions.md`.

## Conventions

- Always create a matching rollback SQL file alongside every forward Supabase migration, using the same migration filename with `_reverse` appended before `.sql` and placing it in `supabase/rollback/`. Keep rollback scripts out of `supabase/migrations/` so Supabase does not apply them as forward migrations.
- Keep the pipeline separated: raw Scryfall data enters through the hooks and client, `normalizeCard.js` maps it, renderer components consume the normalized shape only.
- Use `createApiClient` for Scryfall card/list endpoints. Auxiliary URL hooks use direct `fetch`; keep their query-key conventions when extending.
- Be gentle with Scryfall: no request loops or bursts. Check Scryfall's API docs for current rate-limit and header requirements before adding new fetch patterns.
- Keep new UI aligned with the tokens in `src/theme.css` and the component-local CSS pattern.
- Follow `docs/file-conventions.md` for naming and file types.
- Do not convert unrelated files, rename folders, or "clean up" unused files without being asked.
