# Agent Context

Working map of the app for AI coding agents. Checked against the repository source on 7 Nov 2026. Where this file and the source disagree, the source wins; update this file when the architecture or behavior changes.

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
- The app has one V2 layout. Home shows a daily seven-card set; search results support local color, rarity, type and sorting controls; card details show artwork, rules/legalities and printings with current EUR / foil EUR prices. Favorites are saved to Supabase and displayed in a paginated favorites page. The Binder tracks per-copy metadata, folders, loose copies and disposed-copy history. Decks supports managing Binder, proxy and virtual card entries, with All cards and deck-list views. Advanced search remains a placeholder.
- The V2 layout has a dark/light theme control. Theme state is shared through React context, defaults to dark on each page load, and is not persisted.
- No custom application backend or user database. Supabase Auth provides managed email/password signup and sign-in; account data is managed by Supabase. TanStack Query caches remote data in memory and persists some of it in browser `localStorage`.
- Binder copies track acquisition/location details and disposal status. Basic deck and card-entry management is implemented; full deck-building tools such as format validation, collection valuation and price history, sales and balance remain **goals, not features**. Never imply they exist.

## Commands and current status

Node 22 works. Install with `npm install`.

| Command | Purpose | Status |
| --- | --- | --- |
| `npm run dev` | Vite dev server | works |
| `npm run build` | production build into `dist/` | passes |
| `npm run preview` | serve the build | works |
| `npm run typecheck` | `tsc --noEmit` | passes |
| `npm run lint` | ESLint | **fails: 6 pre-existing errors, 0 warnings** (checked 6 Nov 2026) |

- No test framework or test script exists.
- Lint status varies as the code changes; rerun lint before attributing errors to a change.
- Run the narrowest check that fits. At minimum run `npm run typecheck` and `npm run build`.

## Routes

Defined in `src/app/router.tsx`. `/` redirects to `/v2/home`.

| Path | Renders |
| --- | --- |
| `/` | redirects to `/v2/home` |
| `/v2` | redirects to `/v2/home` (route loader) |
| `/v2/home` | daily seven-card set (`CardBrowserPage` in mulligan mode) |
| `/v2/login` | email/password signup and sign-in |
| `/v2/auth/callback` | completes email confirmation and returns to a safe `/v2/` path |
| `/v2/search?q=<name>` | Scryfall name search and local filters |
| `/v2/search/random` | daily set/mulligan browser |
| `/v2/favorites` | paginated signed-in user's favorites (`FavoritesPage`) |
| `/v2/binder` | per-copy Binder and binder-folder management; requires sign-in; defaults to the binder list; supports `?view=all|binders` and `?binder=<id>` (including `history`) |
| `/v2/decks` | protected deck page; defaults to the deck list; supports URL-backed All cards/Decks views, selected-deck filtering, deck covers, counts, create/rename/delete |
| `/v2/search/advanced` | placeholder page exported from `src/app/App.tsx` |
| `/v2/collection` | redirects to `/v2/binder` |

## V2 flow

- `index.html` loads `/src/main.tsx`; `main.tsx` imports `src/theme.css` and mounts `AppProviders` in `StrictMode`.
- `AppProviders.tsx` nests `ThemeProvider` > `PersistenceProvider` > `QueryDevToolsProvider` (receives `queryClient` as a prop) > `RouterProvider`.
- `src/app/App.tsx` renders the V2 `NavBar`, prefetches Scryfall card symbols and set metadata, and renders child routes through `<Outlet />`. The Home route renders `CardBrowserPage` in mulligan mode.
- `src/features/card-browser/CardBrowserPage.tsx` handles `/v2/home`, `/v2/search`, and `/v2/search/random`. Home chooses a stable set per UTC day from released, non-digital, booster-focused Scryfall set types, requests unique cards in random order, and displays up to seven cards from the first result page. The set-type allowlist lives in `mulliganSets.ts`; Scryfall does not supply a direct booster-eligibility flag.
- Name search uses the paginated `useScryfallCardPages` hook with an explicit load-more button; filters and sorting apply to cards loaded so far, plus matching favorited printings not on the current Scryfall pages. The `source=collection` scope searches deduplicated favorite and owned Binder printings; disposed Binder copies are excluded. The daily set uses `useScryfallCardsSearch` for a single page of up to seven cards. `?card=<id>` opens the details overlay without replacing the current search URL.
- The protected `/v2/favorites` page uses `useFavoriteCards` to page Supabase favorites newest-first with a composite cursor, hydrates each batch of up to 75 card IDs through Scryfall's collection endpoint, preserves the Supabase ordering, and skips IDs no longer present in Scryfall. It reuses `CardFilters` to filter and sort currently loaded favorites.
- `features/favorites/useFavoriteCardAction.ts` shares favorite IDs and the toggle mutation across CardBrowser, Binder, and Decks; each page keeps ownership of its own user-facing notices.
- `src/features/binder/` contains the paged `useBinderCopies` query, copy add/edit/dispose/history controls, and `/v2/binder`. A physical copy has one storage location: a Binder folder, a deck, or Loose. Deck assignment is represented by a `kind='binder'` deck entry and clears `binder_cards.binder_id`; Loose means an owned copy with neither a folder nor an active deck assignment. Moving a deck copy into a Binder folder preserves its deck entry as virtual, while deleting the deck releases the physical copy to Loose. The add-copy dialog offers Loose, existing Binder folders, and existing decks. Proxy/virtual deck entries do not allocate physical copies. The binder icon shows owned-copy count and opens a touch-, hover- and keyboard-accessible popover; clicking pins it open until it is closed, Escape is pressed, or the user clicks outside. The copy dialog and popover use an overlay-matched style, with scrollable content for long forms and histories. Adding, editing, disposing, restoring and deleting copies patch the TanStack Query cache. D-034 disposal/deletion atomically converts the associated deck entry to virtual and invalidates deck-card data.
- `BinderPage.tsx` provides URL-backed `?view=all|binders` and `?binder=<id>` views; it defaults to the binder list, while selecting a binder opens its cards. It also provides a history filter for retained sold/lost/given-away copies, local filters, bulk and per-copy moves, binder CRUD, and rarity/supertype/date-ranked covers hydrated in bounded batches through the shared Scryfall collection service. Binder cards and folder covers reuse `CardTile` from the card browser.
- `CardDetailsOverlay.tsx` loads card rulings and printings through cached queries. In the card-content panel it shows mana cost beside power/toughness, loyalty or defense, then WUBRG color circles and a rarity pill; the rows appear between the type line and oracle text for each rendered face. Print entries show current Scryfall EUR / foil EUR prices and reuse `CardTile` for flip, favorites, binder and deck actions.
- `src/features/decks/` provides user-scoped deck queries/mutations, the shared card-action popover, and `/v2/decks`. The page uses URL-backed `?view=all|decks` and `?deck=<id>`; it defaults to the deck list, while selecting a deck opens its cards. It hydrates printings through the shared collection service and reuses `CardFilters` and `CardTile`. Deck covers use rarity/type/date ranking; each shows its name and a rounded entry-count pill. The All cards view shows every entry (including the same printing in different decks) with a kind pill below each card; Binder entries identify the linked physical copy. Proxy entries have a thin dashed accent outline and matching subtly tinted pill; virtual entries are muted and visibly labeled. Deck deletion removes its entries via the existing database cascade and releases physical Binder copies to Loose. D-037 browser checks on 4 Nov 2026 confirmed the authenticated Niv-Mizzet Reborn Binder copy in Farde noire was added to `test`, its entry persisted after reload, and the deck icon showed one entry. The exclusive-storage workflow was later browser-verified by adding a physical copy directly to a deck and moving it to a Binder folder, leaving its deck entry virtual. All cards, deck list, selected-deck and popover views were checked at 1440px and 390px with no horizontal overflow.
- Supabase user-owned tables use the reusable `useRealtimeInvalidation` hook; Realtime payloads invalidate and refetch under RLS, while local mutation echoes are ignored after cache patching. Migration `20261028113029_binder_realtime` is applied to the linked project; a read-only check on 2 Nov 2026 confirmed `favorites`, `binders`, and `binder_cards` are in `supabase_realtime`. Cross-device UI behavior has not been separately tested.
- `src/features/navigation/` holds the responsive navbar. On mobile, tapping the search icon focuses and expands the input while hiding nav links; Enter or tapping the icon again submits, and Escape closes the field. Favorites, Binder, and the Decks page are functional; advanced search routes to a placeholder. Deck entries are managed through the shared card-tile action.
- `src/features/navigation/README.md` may not reflect the flat source layout; verify its instructions against the files before following them.

## Data and state

- `src/features/card-browser/useScryfallCardsSearch.ts`: TanStack Query hook, key `["scryfallCards", route, params, seed]`, enabled only when a route is given, 24 h `staleTime`. It uses `src/services/createApiClient.ts`, which normalizes `card` responses to `[card]` and `list`/`catalog` responses to `data`, and throws on Scryfall errors.
- `src/hooks/useFetchUrl.ts`: fetches auxiliary Scryfall URLs, key `["fetchedUrl", purpose, url]`, validates HTTP status and that the response contains a `data` array, then returns that array. A missing URL returns an empty array.
- `src/services/fetchScryfallCards.ts` performs a validated, abortable Scryfall collection request bounded to 75 identifiers; favorites use it to hydrate each paginated set while preserving database ordering and skipping cards no longer found by Scryfall.
- `src/services/fetchScryfallCardsForIds.ts` deduplicates IDs and hydrates them sequentially in batches of at most 75 with a short inter-request gap. `useScryfallCardsForIds` caches these batches for Binder covers and personal search.
- Binder schema migrations create `binders` and per-copy `binder_cards`; loose copies remain user-owned through `binder_cards.user_id`. Migration `20261107084804_exclusive_deck_copy_storage` enforces exclusive Binder/deck/Loose location, provides atomic copy-to-deck and location-change functions, and preserves pre-migration dual assignments in the private rollback table until rollback. Every migration has a matching manual rollback in `supabase/rollback/`, and exposed user data tables require least-privilege grants, RLS policies, and pgTAP coverage.
- `useRealtimeInvalidation` listens to user-filtered changes for favorites, binders and binder copies; notifications are invalidation signals, not trusted data.
- `PersistenceProvider.tsx` persists only `fetchedUrl` queries and `scryfallCards` queries whose second key is `"cards/search"`, in `localStorage`. Random and single-card queries are not persisted.
- `queryProvider.ts`: `gcTime` is 24 h and must stay >= the persisted data's max age.
- `QueryDevToolsProvider.tsx` loads Devtools lazily and only when `import.meta.env.DEV`.
- `features/card-filters/` uses TanStack Table and `nuqs` to filter by color, rarity and type, sort by name/CMC/rarity/price, and keep filter state in the URL. It is used by the V2 browser and favorites page.
- Many files contain debug `console.log` calls (e.g. `createApiClient.js`, `useFetchUrl.js`). Do not add more; ask before removing.
- Prices are current per-printing Scryfall data, not history or collection valuation.

## Source layout

- `src/main.tsx`, `src/app/` — entry, providers, V2 layout and router.
- `src/features/scryfall-card-renderer/` — shared card renderer. `normalizeCard.js` maps raw Scryfall cards to the internal shape; `scryfallCardLayouts.js` and `components/` (one/split/toggle/flip/meld faces, `OracleText`, `extras/` for saga, class, case, leveler, mutate, prototype) consume that shape. The V2 details overlay uses it.
- `src/features/card-browser/` — V2 card search and query hooks, daily mulligan, Scryfall rulings fetch, reusable card tile/actions, and card details/printings overlay.
- `src/features/binder/` — Binder copy data and mutations, copy metadata form/popover, binder-folder queries and the Binder page.
- `src/features/decks/` — user-scoped deck and deck-card queries/mutations, inline card action popover, and the Decks page.
- `src/features/card-filters/` — V2 browser and favorites filtering, sorting, URL parsers and table setup.
- `src/features/navigation/` — V2 desktop/mobile navbar and theme toggle (see above).
- `src/hooks/`, `src/services/` — see Data and state.
- `src/theme.css` — theme tokens (dark/light), imported by `main.tsx`. `ThemeContext.ts` and `ThemeProvider.tsx` provide shared theme state and synchronize the document theme and browser theme color. `style.css` (root) is linked from `index.html`. `src/app/App.css` holds layer styles.
- `src/assets/icons/` — individual inline SVG React components, with navigation icons grouped under `navigation/`. `public/` contains site-root branding SVGs and favicons.
- `docs/` — `architecture/` guides (overview, state/data flows, and source reference), theme/Scryfall notes, file conventions, external resources, and filter guidance. Some historical notes may lag the code; verify in source.

## Planned, not implemented

Full deck-building tools such as format validation, collection valuation and price history, sales and balance tracking, and true server-side/advanced search remain planned. The Decks page and basic per-card entry management are implemented features, but they do not yet provide a complete deck-construction workflow. V2 search is a name search with local result filters, not advanced Scryfall search. The advanced-search page remains a placeholder.

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

## Versioning

The app uses Calendar Versioning (CalVer): `YYYY.M.MICRO`, unpadded (e.g. `2026.11.0`, then `2026.11.1`).

- `YYYY.M` is the month of the release (UTC). `MICRO` counts releases within that month, starting at `0`.
- Do not pad the month: write `2026.8.0`, not `2026.08.0`. npm expects a SemVer-style version, which forbids leading zeros.
- The version says *when* a release shipped, not whether it is compatible. Breaking changes are called out in the changelog instead (see below).
- Roadmap milestones (for example "full deck-building tools") are named in `README.md` or `DECISIONS.md`; they are not encoded in the version.

**Single source of truth:** `version` in `package.json`. `package-lock.json` must match. Change both only with `npm version`; never hand-edit. Do not write the version number in prose elsewhere, except the stamped lines listed below.

**Bump rules**

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
3. On `main`: update `CHANGELOG.md` and commit; run `npm version patch` or `npm version YYYY.M.0` per the table above; run `git push --follow-tags`. This commits both package files and creates the annotated tag `vYYYY.M.MICRO`.
4. Hotfix: branch from the latest tag, fix, bump with `npm version patch` (or an explicit version if the month changed), merge back into `dev`.
5. Pre-release builds, only if needed: `2026.12.0-beta.1`.

A release that depends on a Supabase migration needs that migration applied to the linked project before the app is deployed.

**Other files**

| File | Rule |
| --- | --- |
| `package.json`, `package-lock.json` | Tracked version; `npm version` only |
| `CHANGELOG.md` | Keep a Changelog format; `Unreleased` on top, one section per release; breaking contract changes under `### Breaking` |
| `DECISIONS.md` | Not versioned; dated entries; add `- Release: vYYYY.M.MICRO` when shipped |
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
- Keep the pipeline separated: raw Scryfall data enters through the hooks and client, `normalizeCard.js` maps it, renderer components consume the normalized shape only.
- Use `createApiClient` for Scryfall card/list endpoints. Auxiliary URL hooks use direct `fetch`; keep their query-key conventions when extending.
- Be gentle with Scryfall: no request loops or bursts. Check Scryfall's API docs for current rate-limit and header requirements before adding new fetch patterns.
- Keep new UI aligned with the tokens in `src/theme.css` and the component-local CSS pattern.
- Follow `docs/file-conventions.md` for naming and file types.
- Do not convert unrelated files, rename folders, or "clean up" unused files without being asked.