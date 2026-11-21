# Agent Context

Working map of the app for AI coding agents. Checked against the repository source on 21 Nov 2026; app version v2026.11.3. Where this file and the source disagree, the source wins; update this file when the architecture or behavior changes.

## How to work with me (read first)

The developer is learning React and TypeScript and wants to understand every change, not just receive code.

- Explain the reasoning *before* changing code, and name the concept used (e.g. "custom hook", "type guard", "route-relative navigation").
- Make small, single-purpose changes. For anything touching more than two files, show a short plan and wait for approval.
- Prefer the simplest approach that fits the existing code over clever abstractions.
- Ask before deleting files, adding dependencies, or converting files between JS and TS.
- After a change, say which command to run to check it and what a pass looks like.
- Do not claim something works unless you checked the source or ran the check.
- Never change the app version, create tags, or edit `CHANGELOG.md` unless asked. Rules are in "Versioning".

## App at a glance

- React 19 + Vite SPA that finds Magic: The Gathering cards through the public Scryfall API (`https://api.scryfall.com`). Routing uses `react-router` 8 (`createBrowserRouter`).
- The app has one V2 layout. Home shows a daily seven-card set; search results support local color, rarity, type and sorting controls; card details show artwork, rules/legalities and printings with current EUR / foil EUR prices. Favorites are saved to Supabase and displayed in a paginated favorites page. The Binder tracks per-copy metadata, folders, loose copies and disposed-copy history. Decks supports managing Binder, proxy and virtual card entries, with All cards and deck-list views. Advanced search is implemented for both sources: a form (`AdvancedSearchForm`) writes `s_` URL parameters, Scryfall results use `toScryfallQuery`, and collection results use the local `matchesAdvancedFilters` (D-050 to D-055).
- The V2 layout has a dark/light theme control. Theme state is shared through React context, defaults to dark on each page load, and is not persisted.
- No custom application backend or user database. Supabase Auth provides managed email/password signup and sign-in; account data is managed by Supabase. TanStack Query caches remote data in memory and persists some of it in browser `localStorage`.
- Binder copies track acquisition/location details and disposal status. Basic deck and card-entry management is implemented; full deck-building tools such as format validation, collection valuation and price history, sales and balance remain **goals, not features**. Never imply they exist.

## Commands and current status

Node 22 works. Install with `npm install`. `npm run build` needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (in `.env.local` or the environment, e.g. Netlify); `vite.config.ts` stops the build when either is missing, because without them the bundle drops Supabase and crashes on startup.

| Command | Purpose | Status |
| --- | --- | --- |
| `npm run dev` | Vite dev server | works |
| `npm run dev:phone` | Vite dev server on the local network over HTTPS (self-signed certificate from `@vitejs/plugin-basic-ssl`, `phone` mode), for testing on a phone; phones allow camera access only over HTTPS | works |
| `npm run build` | production build into `dist/` | passes |
| `npm run preview` | serve the build | works |
| `npm run typecheck` | `tsc --noEmit` | passes |
| `npm run lint` | ESLint | passes: 0 errors, 0 warnings (checked 21 Nov 2026) |
| `npm run lint:css` | stylelint on `src/**/*.css` (`stylelint.config.mjs`): no colors outside `tokens.css`/`splash.css`, no `!important` outside `base.css`, no element selectors | passes (checked 21 Nov 2026) |

- No test framework or test script exists. The only tests are dependency-free `node:test` cases in `tests/` for the advanced-search matcher, the binder colors and the scanner (frame geometry, collector-line parser, Otsu threshold, image math, sample truth parser, strip filters); run `node --experimental-strip-types --test "tests/**/*.test.ts"` (Node 22). They are not part of `typecheck`, and `tsconfig.json` does not include `tests/`. On 21 Nov 2026 all tests pass (100) and one is skipped on purpose: Gray's logo-contrast check, a documented D-056 exception.
- Lint status varies as the code changes; rerun lint before attributing errors to a change.
- Run the narrowest check that fits. At minimum run `npm run typecheck` and `npm run build`.

## Routes

Defined in `src/app/router.tsx`. `/` redirects to `/v2/home`. Both top-level routes use `RouteErrorPage` as `errorElement`: a code chunk that fails to load after a deploy shows a "new version" prompt with Reload, an unknown address shows "Page not found", and other errors show "Something went wrong" (details in development only).

| Path | Renders |
| --- | --- |
| `/` | redirects to `/v2/home` |
| `/v2` | redirects to `/v2/home` (route loader) |
| `/v2/home` | daily seven-card set (`CardBrowserPage` in mulligan mode) |
| `/v2/login` | email/password signup and sign-in |
| `/v2/auth/callback` | completes email confirmation and returns to a safe `/v2/` path |
| `/v2/search?q=<name>` | Search controls for source and simple/advanced mode, plus Scryfall name search and local filters |
| `/v2/search/random` | daily set/mulligan browser |
| `/v2/scan` | card scanner (`ScanPage`, D-061); public; `?mode=identify\|add` picks the mode (`test` too in development builds), Add mode asks signed-out users to sign in inside the page; shows the rear camera with a guide box for the info line (D-065) and recognizes a card by its collector line (D-062 prototype); in Identify mode a found card opens `/v2/search?q=<name>&card=<id>` (D-063) |
| `/v2/favorites` | paginated signed-in user's favorites (`FavoritesPage`) |
| `/v2/binder` | per-copy Binder and binder-folder management; requires sign-in; defaults to the binder list; supports `?view=all[binders` and `?binder=<id>` (including `history`) ] |
| `/v2/decks` | protected deck page; defaults to the deck list; supports URL-backed All cards/Decks views, selected-deck filtering, deck covers, counts, create/rename/delete |
| `/v2/search/advanced` | redirects to `/v2/search?s_mode=advanced` |
| `/v2/collection` | redirects to `/v2/binder` |

## V2 flow

- `index.html` loads `/src/main.tsx`; `main.tsx` imports `src/styles/tokens.css` and mounts `AppProviders` in `StrictMode`.
- `AppProviders.tsx` nests `ThemeProvider` > `PersistenceProvider` > `QueryDevToolsProvider` (receives `queryClient` as a prop) > `RouterProvider`.
- `src/app/App.tsx` renders the V2 `NavBar`, prefetches Scryfall card symbols, set metadata, and the card-name catalog, and renders child routes through `<Outlet />`. The card-name catalog refreshes at the next local 04:00 boundary. The Home route renders `CardBrowserPage` in mulligan mode.
- `src/features/card-browser/CardBrowserPage.tsx` handles `/v2/home`, `/v2/search`, and `/v2/search/random`. Home chooses a stable set per UTC day from released, non-digital, booster-focused Scryfall set types, requests unique cards in random order, and displays up to seven cards from the first result page. The set-type allowlist lives in `mulliganSets.ts`; Scryfall does not supply a direct booster-eligibility flag.
- `src/features/search/` contains the search-page source, simple/advanced mode controls, typed `AdvancedSearchFilters` URL parsers, and the Scryfall query builder. `source` remains the collection selector and `s_mode` selects the mode (default `simple`); simple search submits `q` from a labeled native-datalist name autocomplete, while advanced search uses `AdvancedSearchForm`, which keeps a local draft of the filters and writes the `s_` parameters to the URL (nuqs) when Search is pressed; the model and Scryfall query integration are described in D-050, D-051 and D-054, and a set filter (`s_set`, stored as a set code) is included. Advanced parameters use the `s_` prefix. Suggestions use the Scryfall card-name catalog or hydrated collection names, depending on source; the reusable component limits case-insensitive substring matches to 20 after four characters and can also consume set names for advanced search. Card filtering and sorting remain in `src/features/card-filters/` and are rendered by card browsers; collection search additionally filters by Binder/deck place and owned/proxy/virtual/favorite kind, with place sorting.
- Simple name search and advanced Scryfall search use the paginated `useScryfallCardPages` hook with an explicit load-more button; advanced filters build Scryfall syntax from `s_`-prefixed URL state, and price bounds request unique prints. Filters and sorting apply to cards loaded so far, plus matching favorited printings not on the current simple-name search pages. The `source=collection` scope searches deduplicated favorites, owned Binder copies, and all deck entries; disposed Binder copies are excluded, and `q` matches card names case-insensitively. With `source=collection` and `s_mode=advanced`, `matchesAdvancedFilters` (`src/features/search/`) applies the same filters locally to the hydrated collection cards (`q` is ignored); it mirrors `toScryfallQuery` and is described in D-052 and D-055. The daily set uses `useScryfallCardsSearch` for a single page of up to seven cards. `?card=<id>` opens the details overlay without replacing the current search URL.
- The protected `/v2/favorites` page uses `useFavoriteCards` to page Supabase favorites newest-first with a composite cursor, hydrates each batch of up to 75 card IDs through Scryfall's collection endpoint, preserves the Supabase ordering, and skips IDs no longer present in Scryfall. It reuses `CardFilters` to filter and sort currently loaded favorites.
- `features/favorites/useFavoriteCardAction.ts` shares favorite IDs and the toggle mutation across CardBrowser, Binder, and Decks; each page keeps ownership of its own user-facing notices.
- `src/features/binder/` contains the paged `useBinderCopies` query, copy add/edit/dispose/history controls, and `/v2/binder`. A physical copy has one storage location: a Binder folder, a deck, or Loose. Deck assignment is represented by a `kind='binder'` deck entry and clears `binder_cards.binder_id`; Loose means an owned copy with neither a folder nor an active deck assignment. Moving a deck copy into a Binder folder preserves its deck entry as virtual, while deleting the deck releases the physical copy to Loose. The add-copy dialog offers Loose, existing Binder folders, and existing decks. Proxy/virtual deck entries do not allocate physical copies. The binder icon shows owned-copy count and opens a touch-, hover- and keyboard-accessible popover; clicking pins it open until it is closed, Escape is pressed, or the user clicks outside. The copy dialog and popover use an overlay-matched style, with scrollable content for long forms and histories. Adding, editing, disposing, restoring and deleting copies patch the TanStack Query cache. D-034 disposal/deletion atomically converts the associated deck entry to virtual and invalidates deck-card data.
- `BinderPage.tsx` provides URL-backed `?view=all|binders` and `?binder=<id>` views; it defaults to the binder list, while selecting a binder opens its cards. It also provides a history filter for retained sold/lost/given-away copies, local filters, bulk and per-copy moves, and binder CRUD. Binder and Loose covers are card-shaped colored buttons (`BinderCover`) with the vector app logo (`/logo.svg`); a binder's color is `binders.color`, chosen from the twelve-color palette in `binderColors.ts` (D-056 and its amendment, D-057), and Loose has a fixed color. "Create binder" and "Modify" (name and color) open the same `BinderFormDialog`. Card lists in the binder views still reuse `CardTile` from the card browser, and deck covers are unchanged.
- `CardDetailsOverlay.tsx` loads card rulings and printings through cached queries. In the card-content panel it shows mana cost beside power/toughness, loyalty or defense, then WUBRG color circles and a rarity pill; the rows appear between the type line and oracle text for each rendered face. Print entries show current Scryfall EUR / foil EUR prices and reuse `CardTile` for flip, favorites, binder and deck actions.
- `src/features/decks/` provides user-scoped deck queries/mutations, the shared card-action popover, and `/v2/decks`. The page uses URL-backed `?view=all|decks` and `?deck=<id>`; it defaults to the deck list, while selecting a deck opens its cards. It hydrates printings through the shared collection service and reuses `CardFilters` and `CardTile`. Deck covers use rarity/type/date ranking; each shows its name and a rounded entry-count pill. The All cards view shows every entry (including the same printing in different decks) with a kind pill below each card; Binder entries identify the linked physical copy. Proxy entries have a thin dashed accent outline and matching subtly tinted pill; virtual entries are muted and visibly labeled. Deck deletion removes its entries via the existing database cascade and releases physical Binder copies to Loose. D-037 browser checks on 4 Nov 2026 confirmed the authenticated Niv-Mizzet Reborn Binder copy in Farde noire was added to `test`, its entry persisted after reload, and the deck icon showed one entry. The exclusive-storage workflow was later browser-verified by adding a physical copy directly to a deck and moving it to a Binder folder, leaving its deck entry virtual. All cards, deck list, selected-deck and popover views were checked at 1440px and 390px with no horizontal overflow.
- Supabase user-owned tables use the reusable `useRealtimeInvalidation` hook; Realtime payloads invalidate and refetch under RLS, while local mutation echoes are ignored after cache patching. Migration `20261028113029_binder_realtime` is applied to the linked project; a read-only check on 2 Nov 2026 confirmed `favorites`, `binders`, and `binder_cards` are in `supabase_realtime`. Cross-device UI behavior has not been separately tested.
- `src/features/scan/` holds the card scanner (D-061). `ScanPage` reads `?mode=` with a nuqs string-literal parser (pushes history, so Back returns to the mode choice). `useCamera` opens the rear camera (`facingMode: environment`, ideal 3840×2160) while the view is mounted, stops its tracks on unmount, and returns a `starting | live | error` state with a reason (insecure, unsupported, denied, not-found, in-use, unknown) and `retry`. `ScanCamera` shows the video (`playsInline muted`, `object-fit: cover` in a 4:3 landscape box) or the error message, draws `GuideFrame` over it and gives the instruction as `aria-live` text. Guide (D-065, replacing D-061's card outline): one centered 4:1 box, 90% of the view width, that the user fills with the info line held close (the iPhone then switches to macro), plus a small card sketch showing which part goes in the box; `guideFrame.ts` holds `VIEW_RATIO`, `GUIDE_BOX_RATIO`, `GUIDE_RECT` (fractions, reused by the OCR), `INFO_LINE_WIDTH_MM` and `GuideStatus` (`aiming | reading-collector | reading-title | found`; `reading-title` is the not-yet-built name fallback in the same box). Recognition prototype (D-062), stages 1 and 2: `frameGeometry.ts` maps the guide box to video pixels through the `object-fit: cover` crop (`getGuideRect`, pure, tested; 1944×486 px for a portrait 4K video); `useSteadyFrame` samples a 96×24 gray copy of the box every 250 ms and, after 3 samples with an average change below 20 (re-armed above 30, values tuned on a phone), cuts the box out of the full-resolution frame as the `collector` strip; a steady card shows `reading-collector`. `useCollectorReading` cleans the collector strip (`prepareStrip.ts`: enlarge, Otsu black and white, invert white-on-black text, white margin), reads it through `ocr.ts` and parses it with `parseCollectorLine.ts` into `{ setCode, collectorNumber }`. `ocr.ts` is the only file that touches tesseract.js: it loads it with a dynamic `import()` (own chunk), starts one English worker while the camera is live, and fetches the engine and language data from the jsDelivr CDN (library default, cached in IndexedDB); its `opencollective-postinstall` script is left blocked on purpose. `usePrintingLookup` looks the parsed set and number up with Scryfall's `/cards/:code/:number` through `createApiClient` (TanStack Query, same key shape as `useScryfallCardsSearch`, 24 h `staleTime`, `retry: false` so a misread 404 costs one request); `ScanCamera` derives the guide status from the three stages (`found` announces the card name; a failed reading or lookup returns to `aiming`). `ScanCamera` reports a found printing through `onFound` after the success color has shown for 700 ms (timer in an effect, cancelled if the card moves; `useEffectEvent` keeps the callback out of the dependencies). In Identify mode `ScanPage` then navigates to `/v2/search?q=<name>&card=<id>` (D-063), a normal history entry: the search runs for the name and the details overlay opens on the printing; Back returns to the scanner and restarts the camera. Add mode (D-064) renders `AddScanner`: a session setup (`AddSessionSetup`: target Loose/binder/deck, owned or proxy with proxy only for decks, optional copy defaults; types in `addSession.ts`; choice lists shared with `BinderCopyForm` through `binder/copyOptions.ts`), then a summary line with Change above the camera. A found card opens `AddConfirm` in `ScanCamera`'s `overlay` (the camera stays mounted, so the card is not offered again until it leaves the frame; cards found meanwhile are ignored): printing with Change printing (loads `prints_search_uri` through `useFetchUrl("cardPrints")` only when opened, shared with the details overlay), a finish range slider for owned copies (0–2 over `FINISHES`, `aria-valuetext`), a 1–20 quantity stepper, Add and Skip. Add closes the panel at once (scanning resumes) and saves in the background through `useScanAdd`: owned copies with `addCopy` (binder or Loose) or `addCopyToDeck` (deck), proxies with `addDeckCard`, one after another; the first failure stops and the notice reports "Added N of M". The `.page__notice` shows "Added N × name" with Undo for 8 s; Undo removes exactly that batch (proxies and deck copies through the new `deleteDeckCards` in `useDeckManagement`, deck entries before their copies so they are not turned virtual, then `removeOrDisposeCopy` with status null). A newer notice replaces an older one and its Undo. `useCamera` accepts optional `{ deviceId, highResolution }`; the default is the rear camera at 4K ideal (3840×2160; 1080p gave ~16 px text on an iPhone 13 Pro, 4K ~31 px); only the debug panel changes them. OCR reliability study (hotfix branch `2026.11.3a`, phase 0): `cameraInfo.ts` reads the stream's settings and capabilities (zoom, focus, torch, read as `unknown` and narrowed) and lists cameras; `imageMath.ts` has `toGray` and `laplacianVariance` (sharpness, tested); captures carry the video size and an estimated pixels per mm (box width / 28 mm info line); `scanSample.ts` defines the saved sample JSON (raw strips, truth, conditions, `guide`: `"code"` for box samples, missing on older card-guide samples that also hold a title strip) and `parseTruth`. A development-only third mode, Test (`?mode=test`, shown on the mode choice and accepted by the URL parser only when `import.meta.env.DEV`), renders `ScanCamera` with `testMode`: it shows `ScanDebug`, never reports a found card, and `useSteadyFrame`'s `holdCaptures` keeps each capture (no new capture even when the card moves) until the tester taps Reset (`reset()`); Identify and Add no longer show the debug panel. `ScanDebug` is a development-only panel loaded with `React.lazy` behind `import.meta.env.DEV` (not in the production build) that shows the camera facts with a camera picker and a 4K switch, the change value, crops with size, px/mm and sharpness, OCR text, parsed result, confidence, timings and the lookup result, and a Save sample form that downloads one JSON sample per capture. Phase 1: a development-only benchmark at `/v2/scan-bench` (route added in `router.tsx` only when `import.meta.env.DEV`, lazy-loaded, absent from the production build) loads sample files and reads each collector strip with the variants in `bench/benchVariants.ts` (current Otsu, gray, contrast stretch, Sauvola, and two-line split with per-line character sets), reporting correct, wrong and missing readings per variant and per guide and camera (resizing variants scale strips by guide, `stripHeight`, so the text is about 30 px); the pure filters are in `stripFilters.ts` (tested). Camera access needs HTTPS: use `npm run dev:phone` on a phone.
- `src/features/navigation/` holds the responsive navbar. Its Search item navigates to `/v2/search`; the source and mode controls live in `src/features/search/`. The theme toggle appears between Decks and Logout. Favorites, Binder, and the Decks page are functional. Deck entries are managed through the shared card-tile action.
- `src/features/navigation/README.md` may not reflect the flat source layout; verify its instructions against the files before following them.

## Data and state

- `src/features/card-browser/useScryfallCardsSearch.ts`: TanStack Query hook, key `["scryfallCards", route, params, seed]`, enabled only when a route is given, 24 h `staleTime`. It uses `src/services/createApiClient.ts`, which normalizes `card` responses to `[card]` and `list`/`catalog` responses to `data`, and throws on Scryfall errors.
- `src/hooks/useFetchUrl.ts`: fetches auxiliary Scryfall URLs, key `["fetchedUrl", purpose, url]`, validates HTTP status and that the response contains a `data` array, then returns that array. A missing URL returns an empty array. Both URL hooks accept a fixed stale time or a query-based stale-time function; the card-name catalog is stale at the next local 04:00 based on its `dataUpdatedAt`.
- `src/services/fetchScryfallCards.ts` performs a validated, abortable Scryfall collection request bounded to 75 identifiers; favorites use it to hydrate each paginated set while preserving database ordering and skipping cards no longer found by Scryfall.
- `src/services/fetchScryfallCardsForIds.ts` deduplicates IDs and hydrates them sequentially in batches of at most 75 with a short inter-request gap. `useScryfallCardsForIds` caches these batches for the Binder card lists and personal search.
- Binder schema migrations create `binders` and per-copy `binder_cards`; loose copies remain user-owned through `binder_cards.user_id`. Migration `20261107084804_exclusive_deck_copy_storage` enforces exclusive Binder/deck/Loose location, provides atomic copy-to-deck and location-change functions, and preserves pre-migration dual assignments in the private rollback table until rollback. Migration `20261115163138_binder_color` (D-056) adds `binders.color` (lowercase `#rrggbb`, default `#1f2a6b`, check constraint) and a column-level `update (color)` grant, because updates on `binders` are granted per column; it must be applied before an app version that reads or writes the color is deployed. Every migration has a matching manual rollback in `supabase/rollback/`, and exposed user data tables require least-privilege grants, RLS policies, and pgTAP coverage.
- `useRealtimeInvalidation` listens to user-filtered changes for favorites, binders and binder copies; notifications are invalidation signals, not trusted data.
- `PersistenceProvider.tsx` persists `fetchedUrl` queries except `cardNames`, plus `scryfallCards` queries whose second key is `"cards/search"`, in `localStorage`. The roughly 687 KB Scryfall card-name catalog is prefetched per app session but not persisted because the combined cache exceeds the 2-million-character safety threshold. Random and single-card queries are not persisted.
- `queryProvider.ts`: `gcTime` is 24 h and must stay >= the persisted data's max age.
- `QueryDevToolsProvider.tsx` loads Devtools lazily and only when `import.meta.env.DEV`.
- `features/card-filters/` uses TanStack Table and `nuqs` to filter by color, rarity, type, place and card kind, sort by name/CMC/rarity/price/place, and keep filter state in the URL. Place and kind filters are enabled only for collection search; other pages keep their existing controls.
- Many files contain debug `console.log` calls (e.g. `createApiClient.ts`, `useFetchUrl.ts`). Do not add more; ask before removing. The card renderer's logs were removed in D-058.
- Prices are current per-printing Scryfall data, not history or collection valuation.

## Source layout

- `src/main.tsx`, `src/app/` — entry, providers, V2 layout, router and the route error page (`RouteErrorPage.tsx`).
- `src/features/scryfall-card-renderer/` — shared card renderer. `types.ts` defines its raw input (`RawScryfallCard`) and normalized output (`NormalizedCard`); `normalizeCard.ts` maps raw Scryfall cards to the internal shape; `scryfallCardLayouts.ts` and `components/` (one/split/toggle/flip/meld faces, `OracleText`, `extras/` for saga, class, case, leveler, mutate, prototype) consume that shape. Each card of a meld trio shows the other two (a piece: its partner and the result; the result: both pieces), names first, then images from one `useScryfallCardsForIds` request; the renderer imports nothing from `card-browser`. Related cards open through the optional `onOpenCard(cardId)` prop, supplied by the page that owns the overlay (D-059). The V2 details overlay uses it.
- `src/features/card-browser/` — V2 card search and query hooks, daily mulligan, Scryfall rulings fetch, reusable card tile/actions, and card details/printings overlay.
- `src/features/binder/` — Binder copy data and mutations, copy metadata form/popover, binder-folder queries and the Binder page.
- `src/features/decks/` — user-scoped deck and deck-card queries/mutations, inline card action popover, and the Decks page.
- `src/features/card-filters/` — V2 browser and favorites filtering, sorting, URL parsers and table setup.
- `src/features/scan/` — card scanner page, camera hook, guide box (D-061, D-065; see above).
- `src/features/navigation/` — V2 desktop/mobile navbar and theme toggle (see above).
- `src/hooks/`, `src/services/` — see Data and state.
- `src/styles/tokens.css` — design tokens, imported by `main.tsx`: the dark/light theme colors plus the shape (radii), motion (two durations), focus ring, global z-index layers and identity colors (mana, rarity) that are the same in both themes. `ThemeContext.ts` and `ThemeProvider.tsx` provide shared theme state and synchronize the document theme and browser theme color. `src/styles/base.css`, imported right after the tokens, holds the body text size, the one global `:focus-visible` ring and the reduced-motion rule; components override the ring only for a different offset. `src/styles/forms.css`, imported next, holds the shared form field classes (`.field`, `.field__input` and their `--soft` variants for the Binder forms and popovers); a form's own class overrides only what differs. `src/styles/layout.css`, imported after it, holds the page classes the Search, Favorites, Binder and Decks pages share (`.page`, `.page__heading|title|toolbar|message|notice|notice-action`, `.page__control`, `.page__button`, `.page__label`, `.page__card-actions|card-action`, `.page__cover-card`, `.card-grid`, `.pagination` and `.pagination__button`); a page's own CSS adjusts them by being more specific or by coming later. Style a page's own controls with these classes, never with a page-wide `button`/`select`/`input` rule: such a rule also restyles every component rendered inside the page (D-053 Phase 4a). It is deliberately not in a `@layer`, because unlayered component rules such as `.browser-card` would beat it. `src/styles/splash.css` (the splash screen and page reset) is linked from `index.html`. `src/app/App.css` holds layer styles.
- `src/assets/icons/` — individual inline SVG React components, with navigation icons grouped under `navigation/`. `public/` contains site-root branding SVGs and favicons.
- `docs/` — `architecture/` guides (overview, state/data flows, and source reference), theme/Scryfall notes, file conventions, external resources, and filter guidance. Some historical notes may lag the code; verify in source.

## Planned, not implemented

The card scanner (`/v2/scan`) recognizes modern cards by their collector line (D-062 prototype, stages 1–2), opens them on the search page in Identify mode (D-063) and adds them to a binder, Loose or a deck with Undo in Add mode (D-064). Not implemented: the name fallback in the guide box with printing choice (D-065 step 2 / D-062 stage 3, also needed by D-063 for name-only results), the low-light help (D-065 step 3) and the optional cloud fallback. Full deck-building tools such as format validation, collection valuation and price history, sales and balance tracking, and true server-side/advanced search remain planned. The Decks page and basic per-card entry management are implemented features, but they do not yet provide a complete deck-construction workflow. V2 search is a name search with local result filters, not advanced Scryfall search. The advanced-search page remains a placeholder.

## TypeScript

- **All application code is TypeScript** (D-058): every file in `src/` is `.ts` or `.tsx`, and so is `vite.config.ts`. The only JavaScript file is `eslint.config.js`, which stays JS because a TS ESLint config needs the `jiti` dependency.
- `tsconfig.json`: `strict`, `allowJs: false`, `verbatimModuleSyntax: true`, `allowImportingTsExtensions: true`, `include: ["src", "vite.config.ts"]`. Do not add `.js`/`.jsx` files to `src/`: importing one fails `npm run typecheck` (TS7016).
- Imports of `.ts`/`.tsx` files include the extension. Use `import type` for type-only imports.
- Avoid `any` and non-null assertions. Narrow `unknown` API data with type guards (see `isCardBrowserCard`, `toImageUrl` in `MeldCard.tsx`).
- `src/features/card-filters/types.ts` defines the narrow `ScryfallCard` shape used by filters. The renderer owns its own types in `src/features/scryfall-card-renderer/types.ts`; `RawScryfallCard` lists only the fields `normalizeCard` reads, so any structurally compatible card (e.g. `CardBrowserCard`) can be passed to `CardRenderer`.

## Tooling gotchas

- `package.json` lists both `react-router` ^8 and `react-router-dom` ^7, but the source imports only from `react-router`. `react-router-dom` appears unused; ask before removing.
- `AGENTS.md` is the shared repository-root context file. `CLAUDE.md` and `.github/copilot-instructions.md` point here; keep architecture and project conventions in this file rather than duplicating them.
- Mermaid diagram rules are in `.github/mermaid.instructions.md`.

## Versioning

The app uses Calendar Versioning (CalVer): `YYYY.M.MICRO`, unpadded (e.g. `2026.11.0`, then `2026.11.1`).

- `YYYY.M` is the month of the release (UTC). `MICRO` counts releases within that month, starting at `0`.
- Do not pad the month: write `2026.8.0`, not `2026.08.0`. npm expects a SemVer-style version, which forbids leading zeros.
- The version says *when* a release shipped, not whether it is compatible. Breaking changes are called out in the changelog instead (see below).
- Roadmap milestones (for example "full deck-building tools") are named in `README.md` or `DECISIONS.md`; they are not encoded in the version.

**Single source of truth:** `version` in `package.json`. `package-lock.json` must match. Change both only with `npm version`; never hand-edit. Do not write the version number in prose elsewhere, except the stamped lines listed below.

**Bump rules** for versioning:

| Situation | Command |
| --- | --- |
| Another release in the same month | `npm version patch` (increments `MICRO`) |
| First release of a new month | `npm version YYYY.M.0` (explicit, e.g. `npm version 2026.12.0`) |

- Bump only when releasing, never per commit. Refactors, docs and tests ship in the next release.
- The month in the version is the month of the release (merge to `main` and tag), not the month the work started.
- The `minor` and `major` keywords of `npm version` carry no meaning here; do not use them.

**Public contract** (what the `### Breaking` changelog heading protects):

- URL structure and query params (`/v2/search?q=`, `?card=`, `?view=`, `?binder=`, `?deck=`, filter params) and `/v2/auth/callback`.
- Supabase schema, grants and RLS policies (tables, columns and constraints that user data depends on).
- Persisted browser data (`localStorage` keys written by `PersistenceProvider`).

Component structure, CSS and Scryfall response handling are not part of it. Any change to the contract is listed under `### Breaking` in that release's `CHANGELOG.md` section and recorded in `DECISIONS.md`.

**Release flow** (solo developer, no release branches):

1. Work on `dev`. `package.json` keeps the last released version.
2. Merge `dev` into `main` through a PR; `npm run typecheck` and `npm run build` must pass.
3. On `main`: update `CHANGELOG.md`, replace every `Release: pending (on dev)` in `DECISIONS_HISTORY.md` with the new `vYYYY.M.MICRO`, and commit; run `npm version patch` or `npm version YYYY.M.0` per the table above; run `git push --follow-tags`. This commits both package files and creates the annotated tag `vYYYY.M.MICRO`.
4. Hotfix: branch from the latest tag, fix, bump with `npm version patch` (or an explicit version if the month changed), merge back into `dev`.
5. Pre-release builds, only if needed: `2026.12.0-beta.1`.

A release that depends on a Supabase migration needs that migration applied to the linked project before the app is deployed.

**Other files** concerned by versioning:

| File | Rule |
| --- | --- |
| `package.json`, `package-lock.json` | Tracked version; `npm version` only |
| `CHANGELOG.md` | Keep a Changelog format; `Unreleased` on top, one section per release; breaking contract changes under `### Breaking` |
| `DECISIONS.md`, `DECISIONS_HISTORY.md` | Not versioned; dated entries. Implemented or superseded decisions move to `DECISIONS_HISTORY.md`; an implemented one gets `- Release: pending (on dev)` until it ships, then `- Release: vYYYY.M.MICRO` |
| `AGENTS.md` | Not versioned; once the first version tag exists, the header stamps the check date and the app version |
| `README.md`, `docs/` | No hardcoded version; dated notes; link to the changelog |
| Supabase migrations | Timestamp-named by the CLI, never part of the app version; each has a matching rollback in `supabase/rollback/`; the changelog says which release needs which migration |
| `supabase` CLI devDependency | Keep pinned to an exact version; bump deliberately |
| Other dependencies | Caret ranges plus lockfile; no separate versioning rule |
| `/v2` and any future layout prefix | UI layout names, not app versions; see "UI layouts are not app versions" |
| `CLAUDE.md`, `.github/copilot-instructions.md` | Pointers to this file; no version |

### UI layouts are not app versions

Route prefixes such as `/v2` name a UI layout, not a release. Never read them as part of the app version.

| Layout | Status |
| --- | --- |
| `/v2` | Only layout; active default |
| `/v1` | Removed (no routes listed above) |

- Adding, deprecating or removing a layout is judged by one test: does something users relied on stop working? If yes, list it under `### Breaking`.
- Removing a layout prefix without a redirect is a breaking change.
- Do not rename `/v2` or drop its prefix without a decision; it is a contract change.
- If a second layout is ever introduced, run it in parallel under its own prefix, keep the data pipeline (hooks, `createApiClient`, `normalizeCard`) shared rather than forked, and record each status change (active, maintained, deprecated, removed) in `DECISIONS.md`.

## Conventions

- Always create a matching rollback SQL file alongside every forward Supabase migration, using the same migration filename with `_reverse` appended before `.sql` and placing it in `supabase/rollback/`. Keep rollback scripts out of `supabase/migrations/` so Supabase does not apply them as forward migrations.
- Keep the pipeline separated: raw Scryfall data enters through the hooks and client, `normalizeCard.ts` maps it, renderer components consume the normalized shape only.
- Use `createApiClient` for Scryfall card/list endpoints. Auxiliary URL hooks use direct `fetch`; keep their query-key conventions when extending.
- Be gentle with Scryfall: no request loops or bursts. Check Scryfall's API docs for current rate-limit and header requirements before adding new fetch patterns.
- Keep new UI aligned with the tokens in `src/styles/tokens.css` and the component-local CSS pattern: no hard-coded colors, global z-index values, corner radii or the shared durations (`src/styles/splash.css` is the exception). Do not add per-component focus rings or reduced-motion transition overrides; `base.css` handles both (a `prefers-reduced-motion` block is still needed to cancel a hover transform).
- Follow `docs/file-conventions.md` for naming and file types, including the CSS rules (BEM class names, class selectors only, tokens, breakpoints); run `npm run lint:css` after CSS changes.
- Do not convert unrelated files, rename folders, or "clean up" unused files without being asked.
