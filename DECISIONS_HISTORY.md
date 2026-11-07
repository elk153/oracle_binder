# Implemented Decision History

Implemented decisions are retained here with their original IDs. Current and unresolved decisions remain in [DECISIONS.md](./DECISIONS.md).

## D-001: Logo and icon set for the web app

- Status: Implemented
- Date: 2026-10-25
- Decision: The logo was traced from the uploaded raster into a vector SVG with CSS variables for all colors. A full icon set was generated from it: SVGs, favicon.ico, 180/192/512/1024 px PNGs in transparent, dark (#000000) and light (#ffffff) versions where relevant.
- Why: One vector source keeps every size consistent and lets the colors be edited in one place. The Apple-sized canvas (logo about 70% of the height) leaves room for iOS corner masking. A separate tight crop (about 92%) keeps the favicon readable at small sizes.
- Alternatives considered: A hand-drawn SVG would be cleaner but less faithful to the original. Inline SVG components via SVGR would allow runtime recoloring but need a new dependency. Both were not chosen for now.
- Consequences: Files live in public/. The CSS variables only work when the SVG is inlined, not through <img> or as a favicon. A maskable PWA icon and an og:image are not covered yet. The App Store icons are only needed for a native iOS build. Schema changes never go through the MCP; they follow D-014.
- Source: “[Branding] Logo and icon set”

## D-002: Theme toggle buttons in both navigation bars

- Status: Implemented
- Date: 2026-10-25
- Decision: Each navigation bar gets its own round button that switches between the dark and light theme through the existing useTheme() hook. The icon shows the theme you will switch to (sun in dark mode, moon in light mode).
- Why: The theme state, the data-theme attribute and the theme tokens already existed, so the simplest fix was a button that calls setTheme. Separate components per bar let each match its own visual style (glowing two-layer icons in the NavBar, plain filled icons in the FloatingNavBar).
- Alternatives considered: One shared button component (less duplication, but the two bars look different). A toggleTheme function in the context (needs two more files). Saving the choice in localStorage (left for later; needs an early script to avoid a flash). Putting the FloatingNavBar button between the text field and "Go for it" (needs changes to Input.jsx).
- Consequences: The FloatingNavBar now follows the app theme instead of the OS setting. The choice is lost on reload. The NavBar mobile bar and the FloatingNavBar on narrow phones are wider or tighter and need a visual check. Each toggle contains the same one-line "pick the other theme" logic.
- Source: "[Theme] Dark/light toggle in navigation bars"

## D-003: V2 card browser data and integration boundary

- Status: Implemented
- Date: 2026-10-26
- Decision: Implement the first card-browser flow under `/v2` and leave V1's
  card browsing behavior intact. Keep filters in the URL and apply them to the
  TanStack Query-cached result set; do not issue a Scryfall request for each
  filter change. Use existing dependencies, convert only the touched browser
  and navigation surfaces to TypeScript, and keep the new styling local to
  those features.
- Why: V2 is the target shell and its navbar already offers the search entry
  point. Reusing the query cache and the existing layout-aware card renderer
  avoids duplicate data requests and renderer logic while limiting risk to the
  working V1 app.
- Alternatives considered: Replacing V1, integrating the feature into both
  versions, filtering only a new server query per filter, adding a card-state
  library, and reorganizing all app CSS. These were not selected because V1
  must remain available, local filtering satisfies the requested cache-first
  behavior, existing packages already cover routing/query/table needs, and a
  broad migration is unnecessary.
- Consequences: Implemented. `/` opens the V2 home page, which displays seven
  cards from the daily mulligan set. V2 search filters only the first
  175-card Scryfall result page. The search-source toggle is URL-backed.
  The daily mulligan uses an explicit non-digital set-type allowlist because
  the Scryfall Set object has no booster-eligibility field; one
  `unique=cards`, random-ordered search request supplies the seven displayed
  cards.
- The details overlay uses one flip control beneath the artwork to switch the
  artwork and rendered face, gives the details column less width than the
  printings column, and shows flip/favorites/collection/decks actions on
  printing tiles. Favorites, collection and deck actions remain
  under-construction notices until those features have storage. Collection-mode
  search also remains an under-construction notice.
- The desktop navbar search border follows its content width. On mobile, the
  search icon expands and focuses the input; navigation links hide while it is
  focused. Enter or a second tap on the search icon submits, and Escape closes
  the field.
- Source: "[V2 Card Browser](./docs/card-browser-v2.md)"

## D-006: Favorites table keyed to a card printing, with owner-only RLS

- Status: Implemented
- Date: 2026-10-27
- Decision: Create `public.favorites (user_id, scryfall_id, created_at)` with primary key `(user_id, scryfall_id)`, an index on `(user_id, created_at desc)`, RLS enabled, and select/insert/delete policies for `authenticated` users on their own rows. `anon` has no access. `scryfall_id` is the Scryfall card id, which identifies one printing. There is no `profiles` table.
- Why: The composite key prevents duplicates and indexes lookups by user. The second index serves "latest added first". `user_id` defaults to `auth.uid()`, so the browser never sends it.
- Alternatives considered: Favoriting the card across printings via `oracle_id` (dedupes, but loses the printing). A `profiles` table now (nothing to store yet). Snapshotting card JSON (goes stale).
- Consequences: Two printings of one card are two favorites. A nullable `oracle_id` column can be added later without breaking anything. The migration is applied and verified in the project: the table, key, index, RLS policies and grants match this decision, and an anonymous Data API read is denied. The pgTAP owner-isolation suite is authored but still needs to run against a local Supabase database. Use the migration workflow in D-014, never the SQL editor.
- Source: "[Supabase] Auth and favorites plan"

## D-007: Supabase client and AuthProvider

- Status: Implemented
- Date: 2026-10-27
- Decision: Add `@supabase/supabase-js`, create a single client in `src/services/supabaseClient.ts`, and add an `AuthProvider` with a `useAuth` hook. The provider sits inside `PersistenceProvider` and around `RouterProvider`. On sign-out it removes the favorites queries.
- Why: The library already stores the session and refreshes tokens. A context plus a hook matches the existing `ThemeProvider` pattern.
- Alternatives considered: Reading the session separately in each component (duplicated logic). A state library (new dependency, unnecessary). Auth UI packages (less to learn, less control).
- Consequences: The existing `@supabase/supabase-js` dependency and `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` configuration are used by the shared client. `AuthProvider` exposes session, user, loading state and sign-out through `useAuth`; sign-out removes favorites queries from the React Query cache. Implemented; sign-in UI and user-facing auth routes are covered by D-008.
- Source: "[Supabase] Auth and favorites plan"

## D-008: Email and password authentication

- Status: Implemented
- Date: 2026-10-27
- Decision: Add `/v2/login` with email/password sign-in and signup, plus `/v2/auth/callback` for email confirmation. After authentication, navigate to `next` only when it starts with `/v2/` and contains no `//` or backslash; otherwise use `/v2/home`.
- Why: Use Supabase's built-in password authentication rather than passwordless OTP, while keeping a dedicated route for account access.
- Alternatives considered: Passwordless email OTP (D-008's previous implementation); literal usernames (not supported as a native Supabase Auth identifier).
- Consequences: Supabase email confirmation must be enabled/configured as desired, and the callback URL must be in the Auth redirect allow-list. Email confirmation links are for signup verification only; normal sign-in uses the password. Password reset and profile management are outside this decision. Implemented.
- Source: "[Supabase] Auth and favorites plan"

## D-009: RequireAuth layout route

- Status: Implemented
- Date: 2026-10-27
- Decision: Wrap `/v2/favorites`, `/v2/binder` and `/v2/decks` in a `RequireAuth` layout route. It renders nothing while the session loads, an inline sign-in invitation linking to `/v2/login?next=<current path>` when signed out, and `<Outlet />` when signed in.
- Why: An invitation fits your request better than a silent redirect, and the loading state avoids a flash.
- Alternatives considered: Redirecting to the login route (loses the page context). Guarding inside each page (duplicated).
- Consequences: This guard is UX only. Security is enforced by RLS, never by the client. Implemented.
- Source: "[Supabase] Auth and favorites plan"

## D-010: Paginated card source for the card browser

- Status: Implemented
- Date: 2026-10-27
- Decision: Define a `CardSource` shape (`cards`, `isLoading`, `isFetchingNextPage`, `hasNextPage`, `fetchNextPage`, `error`). Implement it for Scryfall search with `useInfiniteQuery`, following `next_page` while `has_more` is true. Add a "Load more" button. Keep the current daily-set mode as a single page and leave V1 untouched.
- Why: One source shape lets search, favorites, collections and decks share the card browser. A button is the simplest trigger and keeps Scryfall requests polite.
- Alternatives considered: Infinite scroll with an intersection observer (a new dependency, can come later). A separate browser per page (duplicates the filter code).
- Consequences: Search results can be paged beyond the first 175 cards, but local filters and sorts cover only cards loaded so far. The daily set remains limited to seven cards and V1 is unchanged. The paginated hook reads Scryfall's `has_more` and `next_page` metadata directly, and uses a query-key prefix that `PersistenceProvider` does not persist. Implemented.
- Source: "[Supabase] Auth and favorites plan"

## D-011: Favorite hooks and the heart toggle

- Status: Implemented
- Date: 2026-10-27
- Decision: Add `useFavoriteIds` (a query for the user's `scryfall_id` set) and `useToggleFavorite` (a mutation that inserts or deletes, then invalidates). Optimistic updates come later. The heart on `CardTile` replaces the under-construction notice. For anonymous users it shows the sign-in invitation.
- Why: One id set lets every tile show its heart without a request per card.
- Alternatives considered: Checking each visible card with `.in(...)` (more requests). Starting optimistic (more concepts at once).
- Consequences: The favorite-ID query pages through results in bounded batches to avoid API row caps. Favorites are never persisted to `localStorage`; they are loaded for the current authenticated user and refreshed after successful toggles. Anonymous users receive a sign-in invitation that returns to the current page. Implemented.
- Source: "[Supabase] Auth and favorites plan"

## D-012: Favorites page on the shared card source

- Status: Implemented
- Date: 2026-10-27
- Decision: Implement `CardSource` for favorites. Each page reads up to 75 rows ordered by `created_at desc, scryfall_id desc`, continuing from the last row with a composite cursor. It resolves them through Scryfall's `POST /cards/collection`, re-orders them by the Supabase order, and skips ids Scryfall no longer returns. Page size is a single constant.
- Why: Scryfall accepts at most 75 identifiers per request. Cursor paging stays correct when favorites are added or removed between pages.
- Alternatives considered: Offset paging (rows can shift). Relying on Scryfall's response order (not guaranteed).
- Consequences: The favorites hook issues one Scryfall collection request for each loaded page and skips missing cards without changing Supabase pagination. The composite cursor avoids skipping favorites with tied timestamps. "No sort selected" means latest added. Collections and decks can implement the same `CardSource` later. Implemented.
- Source: "[Supabase] Auth and favorites plan"

## D-014: Schema tracked as migration files and applied with the Supabase CLI

- Status: Implemented
- Date: 2026-10-27
- Decision: Keep every schema change as a timestamped SQL file in `supabase/migrations/`, created with `supabase migration new` and applied with `supabase db push` (dry run first). The CLI is pinned as a dev dependency and invoked through `npx`. Local Docker is optional for testing; the dashboard is for reading and experiments, not for schema changes.
- Why: Files in git give a reviewable history and one source of truth. `db push` also records each migration in the project's migration history, so later automation knows what is already applied. Pasting into the SQL editor would leave that history empty.
- Alternatives considered: SQL editor plus committed files (simple, but files and database drift, and later automation would try to re-run them). Hand-written GitHub Actions running `db push` (needs the access token and database password stored as GitHub secrets). A local Docker stack (best for testing, heavy for now).
- Consequences: The Supabase CLI is pinned as a dev dependency, and `supabase/MIGRATIONS.md` documents setup, local pgTAP testing, dry-run, apply, and history verification. `supabase login` and `supabase link` are one-time local setup; local database testing requires Docker, but remote migration application does not. Rollbacks are new forward migrations. Each migration still needs approval per AGENTS.md. If the schema is changed in the dashboard, `supabase db pull` captures it as a file. Implemented; no remote schema changes were made as part of this workflow setup.
- Source: "[Supabase] Migrations and GitHub"

## D-016: Generated TypeScript types for the database

- Status: Implemented
- Date: 2026-10-27
- Decision: Generate `src/types/database.ts` from the linked Supabase project's `public` schema with `supabase gen types typescript --linked --schema public` and pass `Database` to `createClient<Database>()` in D-007.
- Why: `npm run typecheck` then catches wrong table or column names at compile time.
- Alternatives considered: Hand-written row types (drift from the schema). No types (no checks).
- Consequences: `src/types/database.ts` is generated and committed, and must be regenerated after schema migrations. The pinned CLI workflow is documented in `supabase/MIGRATIONS.md`. TypeScript catches Supabase table and column mismatches in typed files; JS/JSX files stay unchecked, as in AGENTS.md. Implemented.
- Source: "[Supabase] Migrations and GitHub"

## D-017: Email and password authentication replaces magic-link sign-in

- Status: Implemented
- Date: 2026-10-27
- Decision: Use Supabase's native email/password signup and sign-in on `/v2/login`; keep `/v2/auth/callback` for signup email confirmation and return users only to validated `/v2/` paths.
- Why: Passwordless magic-link sign-in was not working reliably during testing. The password flow supports regular sign-in without requiring a magic link each time.
- Alternatives considered: Continue troubleshooting passwordless magic links (D-013, not working); literal username/password authentication (requires a custom username identity mapping because Supabase's native password identifier is email or phone).
- Consequences: Signup confirmation emails may still be sent when email confirmation is enabled in Supabase Auth. SMTP delivery configuration is not required for normal password sign-in. Existing D-008 routes implement this flow; remote Auth settings are managed separately.
- Source: "[Supabase] Auth and favorites plan"

## D-018: Cross-device favorites refresh and printing availability

- Status: Implemented
- Date: 2026-10-27
- Decision: Keep favorites synchronized across signed-in devices using Supabase Realtime notifications to refresh the authenticated user's favorites. In the card browser, also surface the user's favorited printing when it is absent from the current Scryfall name-search results. Deduplicate by Scryfall printing ID and apply the existing local filters and sorting to the combined results. Leave the daily seven-card set and unrelated searches unchanged.
- Why: The current favorite-ID query only refreshes after local mutations or when it becomes stale; it does not notify another open device. Search results are also returned independently by Scryfall and may not include the exact printing saved as a favorite.
- Alternatives considered: Rely on periodic or focus-triggered refetching (not immediate on an already-open device). Refresh only the favorite heart state (does not make the missing printing available in the browser).
- Consequences: A reusable user-owned-table Realtime invalidation hook, bounded Scryfall hydration, and merging of matching missing favorite printings are implemented. Notifications invalidate/refetch under RLS and do not trust event payloads; local favorite mutation echoes are ignored. The D-031 migration is applied; a read-only linked-project query on 2026-11-02 confirmed the three user-owned tables are in `supabase_realtime`. Cross-device behavior has not been separately exercised. Search pagination, printing-ID deduplication and local filtering are preserved.
- Source: "[Supabase Realtime: Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)"; "[Supabase Realtime: Subscribing to Database Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)"

## D-019: Select between Scryfall and personal collection search

- Status: Implemented
- Date: 2026-10-27
- Decision: Add a search-scope toggle with two modes: "Scryfall" searches the public Scryfall catalog, and "Personal collection" searches only the signed-in user's owned card sources. Initially, the personal scope includes Favorites; when the collection feature is implemented, include Collection there as well. Keep Scryfall as the default scope.
- Why: Searching a user's own cards is a different task from searching the full Scryfall catalog, and should not require them to remember which page contains each card.
- Alternatives considered: Keep independent search experiences on separate pages (less discoverable). Search Scryfall and personal sources together by default (mixes owned and unowned results).
- Consequences: The navbar's URL-backed source toggle preserves the selected scope through searches. Personal results combine favorites and owned Binder copies, deduplicated by Scryfall printing ID and read through RLS-protected queries; disposed copies are omitted. No separate collection feature is implied.
- Source: User request, 2026-10-27

## D-023: Replace Collection with Binder

- Status: Implemented
- Date: 2026-10-28
- Decision: Rename the nav item label to "Binder", rename `CollectionIcon.tsx` to `BinderIcon.tsx`, change the route from `/v2/collection` to `/v2/binder`, and redirect the old path. Rename the `CardAction` value `collection` to `binder`.
- Why: The feature is a binder; "collection" implies a different, undefined thing.
- Alternatives considered: Keep the route and change only the label (path and label drift apart); no redirect (breaks existing links).
- Consequences: The Binder route stays behind `RequireAuth`, and the old `/v2/collection` URL redirects to it. The card-action value is `binder`; personal-collection search scope remains distinct. This decision also establishes the shared implementation context for D-023 onward: reuse or commonalize suitable Binder components when implementing decks, and keep the existing application styles instead of creating a new UI style. Check: `npm run typecheck` and `npm run build` pass; `/v2/binder` is protected and `/v2/collection` redirects to it.
- Source: "[Binder & Decks] Planning"

## D-024: Card details: P/T, color pills, rarity pill

- Status: Implemented
- Date: 2026-10-28
- Decision: In the card-content panel, place mana cost beside power/toughness (and loyalty/defense when present), then color circles and a rarity pill on the next row, between type line and oracle text. This applies per face. Extend `CardBrowserCard` and `isCardBrowserCard` in `types.ts` for the fields needed.
- Why: The overlay currently shows none of these. Color circles give a quick visual cue, with accessible labels preserving their meaning; the rarity remains a text pill.
- Alternatives considered: Mana symbol images only (color-only, harder to read); showing P/T only below the rules text (requested next to mana cost).
- Consequences: Renderer metadata is opt-in for the details overlay, leaving other renderer surfaces unchanged. Color circles use the Magic colors and have accessible labels; stat and rarity pills share a height. Check: `npm run typecheck`, `npm run build`, and targeted lint pass; browser verification covers a single-face creature, a double-faced card, a colorless card, and a multicolor card.
- Source: "[Binder & Decks] Planning"

## D-025: Binder groundwork: hydration, DB types, updated_at

- Status: Implemented
- Date: 2026-10-28
- Decision: Extract the bounded Scryfall collection hydration from `useFavoriteCards` into a shared helper (D-018). Generate `src/types/database.ts` and pass `Database` to `createClient` (D-016). Add one shared SQL function `set_updated_at()` in a migration.
- Why: Binder pages need the same hydration as favorites. Typed tables catch column mistakes early. One trigger function serves every new table.
- Alternatives considered: Copy the hydration into binder code (duplication); skip generated types (untyped rows); the `moddatetime` extension (extra moving part).
- Consequences: The shared fetcher keeps the 75-card request bound, cancellation, validation, and error behavior; favorites ordering, missing-card handling, and keyset pagination are unchanged. `Database` types and `createClient<Database>` were already generated and verified against the linked schema. The migration is present in linked migration history.
- Source: "[Binder & Decks] Planning"

## D-026: Binder schema migration

- Status: Implemented
- Date: 2026-10-28
- Decision: One migration creates `binders (id, user_id, name, created_at, updated_at)` and `binder_cards` (one row per copy: `id`, `user_id`, nullable `binder_id` with `ON DELETE SET NULL`, `scryfall_id`, `rarity`, `status`, `acquisition_type`, `acquisition_format`, `condition`, `finish`, `language`, `purchase_price`, `acquired_at`, `location`, `notes`, `disposed_at`, `disposal_price`, timestamps). Use `text` plus `check` constraints. Binder names are unique per user, case-insensitive. RLS on both tables, update granted only on editable columns, and policies verify that `binder_id` belongs to the user. Add RLS tests.
- Why: Per-copy rows hold per-copy metadata. `SET NULL` implements "deleting a binder moves cards to loose". `rarity` on each copy allows covers without Scryfall calls.
- Alternatives considered: Enums (harder to change); quantity column (no per-copy metadata); composite foreign key for ownership (more complex than a policy check).
- Consequences: `binder_cards.user_id` explicitly owns loose copies; cards attached to a binder must reference a binder owned by the same user. Grants exclude ownership and card-identity updates; timestamp triggers use the shared D-025 function. A paired manual rollback is in `supabase/rollback/`. The pgTAP tests cover grants, RLS isolation, ownership, and deleting a binder to move its cards to loose. The migration is present in linked migration history.
- Source: "[Binder & Decks] Planning"

## D-027: Binder copies query and icon state

- Status: Implemented
- Date: 2026-10-28
- Decision: Add `useBinderCopies`, one paged-loop query for all of the user's copies (as in `useFavoriteIds`), and derive `Map<scryfallId, copies[]>` with `useMemo`. `CardTile` shows the binder icon active with a copy count, and the favorite icon stays independent so both can be active.
- Why: One query serves icon state, hover content and binder views, with no per-card queries.
- Alternatives considered: A counts-only query plus lazy per-card loading (extra queries on hover); a database view (not needed yet).
- Consequences: Query key `["binderCopies", userId]`; data loads in bounded PostgREST pages and is indexed in a memoized `Map`. The count includes owned copies only; history remains available in the popover. Signed-out users are invited to sign in. Typecheck/build pass and responsive UI was inspected.
- Source: "[Binder & Decks] Planning"

## D-028: Add-copy overlay and mutations

- Status: Implemented
- Date: 2026-10-28
- Decision: Clicking the binder icon opens and pins the copies popover; choosing **Add another copy** opens the add-copy dialog (defaults prefilled, all metadata optional, one-tap save). Mutations return the written row (`.insert().select().single()`) and patch the cache with `setQueryData` instead of refetching.
- Why: Multiple copies are allowed, and avoiding a refetch after each change follows the "minimize queries" goal.
- Alternatives considered: Invalidate and refetch as favorites does (extra query per change); optimistic updates (more complexity, can come later).
- Consequences: The accessible controlled form uses typed fields, defaults new copies to owned/loose, and stores rarity from the selected Scryfall card. The dialog matches the card-details overlay styling and keeps Save/Cancel reachable while the form scrolls on short screens. Insert/update return rows and patch the cache; a local Realtime echo does not trigger a redundant refetch. Database writes were not exercised in browser verification to avoid changing the signed-in user's live data.
- Source: "[Binder & Decks] Planning"

## D-029: Copy popover: view, edit, dispose, delete

- Status: Implemented
- Date: 2026-10-28
- Decision: Hovering or keyboard-focusing the binder icon opens a transient popover; clicking or tapping it pins the popover open until it is closed, Escape is pressed, or the user clicks outside. The popover lists the card's copies with their metadata. Modify/save/cancel switch a copy into edit mode. Per copy: **Delete** removes the row after a confirm; **Mark sold/lost/given away** changes `status` and sets `disposed_at`, keeping the data. A History toggle shows disposed copies, and **Restore** returns one to owned.
- Why: Deleting loses data; disposing keeps history that feeds the future sales and balance goals.
- Alternatives considered: Hover-only metadata (not reachable on touch or keyboard); delete-only (loses history).
- Consequences: Default Binder views and counts include only owned copies; History shows disposed copies. The card-content-style popover bounds its height to the viewport and scrolls the copy list. Status actions set `disposed_at`, restore clears disposal metadata, and permanent deletion requires confirmation. Edit failures leave the copy in edit mode and show an error notice. Browser inspection confirmed the popover and form; database writes were not exercised against live user data.
- Source: "[Binder & Decks] Planning"

## D-030: Binder page: all-cards view and binder list

- Status: Implemented
- Date: 2026-10-28
- Decision: `/v2/binder` offers two views through NUQS (`?view=all|binders`, `?binder=<id>`). The all-cards view reuses `CardFilters` and the shared hydration. The binder list shows each binder with a cover chosen by rarity rank, then the Legendary supertype, then oldest added. A virtual "Loose" binder is always present and cannot be renamed or deleted. Users can create, rename and delete binders (with a confirm that states how many cards move to loose) and move copies, singly or in bulk.
- Why: Covers computed from loaded copies avoid fetching every card. Loose as `NULL` keeps rules simple.
- Alternatives considered: A stored cover id (needs manual upkeep); one table of all cards only (no binders).
- Consequences: `/v2/binder` has URL-backed all-cards/binder-list views, local filters, bulk moves, binder CRUD, and a virtual Loose binder. Card entries and folder covers reuse the card-browser `CardTile`; covers are hydrated in sequential Scryfall collection batches and ranked by rarity, Legendary supertype, then oldest copy. Typecheck/build pass; deleting binders was not performed against live user data.
- Source: "[Binder & Decks] Planning"

## D-031: Realtime refresh and personal search scope

- Status: Implemented
- Date: 2026-10-28
- Decision: Implement the reusable Realtime invalidation hook from D-018 and apply it to favorites and binder tables, with a migration adding them to the `supabase_realtime` publication. Update D-019's personal scope to include binder copies, deduplicated by Scryfall printing ID.
- Why: Another open device should see binder changes, and personal search should cover what the user owns.
- Alternatives considered: Refetch on window focus only (not immediate).
- Consequences: The reusable Realtime hook invalidates the appropriate user-scoped query keys for favorites, binders and binder copies; local cache-patched mutation echoes are ignored. The migration and paired manual rollback are present, with a pgTAP publication test. Linked migration history and a read-only publication query on 2026-11-02 confirm the migration is applied and all three tables are members of `supabase_realtime`. Cross-device UI behavior has not been separately verified; D-018/D-019 code is implemented.
- Source: "[Binder & Decks] Planning"

## D-032: Binder release checkpoint

- Status: Implemented
- Date: 2026-10-28
- Decision: Stop and verify before decks: run `typecheck` and `build`, test by hand on desktop and mobile, and update `AGENTS.md` (binder becomes a feature, decks remain a goal) and `DECISIONS.md` statuses.
- Why: Decks build on the binder, so it must be stable and documented first.
- Alternatives considered: Document everything at the end (context drifts and errors compound).
- Consequences: Typecheck and production build pass; desktop (1440px) and mobile (390px) browser checks covered Binder views, personal search, shared card tiles, the pinned copy popover and scrollable add-copy dialog without writing to the signed-in user's live data. Targeted lint passes; full lint has 18 unrelated pre-existing errors (checked 2026-11-02). Linked migration history and publication membership are verified; cross-device UI behavior has not been separately tested. The local pgTAP suite was not run because a local database was unavailable at the last attempt. Deck work remains out of scope.
- Source: "[Binder & Decks] Planning"

## D-033: Deck schema migration

- Status: Implemented (migration applied; local pgTAP verification pending)
- Date: 2026-11-02
- Decision: One migration creates `decks (id, user_id, name, format, notes, timestamps)` and `deck_cards (id, user_id, deck_id ON DELETE CASCADE, kind binder|proxy|virtual, binder_card_id nullable, scryfall_id, timestamps)`. A partial unique index on `binder_card_id` allows one binder copy in one deck only. A check ties `kind = 'binder'` to a non-null `binder_card_id`. RLS policies verify ownership of `deck_id` and `binder_card_id`.
- Why: The database, not the UI, guarantees the one-deck rule.
- Alternatives considered: Separate tables per kind (more queries); a `quantity` column (cannot link copies).
- Consequences: The migration, paired manual rollback, and pgTAP tests are authored; linked migration history confirms `20261102174623` is applied. The schema uses owner-scoped RLS, least-privilege grants, timestamp triggers, and indexes for deck/card lookup, foreign-key deletion, and unique binder-copy assignment. `src/types/database.ts` was regenerated from the linked public schema. Typecheck and linked schema lint pass. The linked advisors reported no deck-specific security warnings; unused-index notices are expected before deck queries are in use. Local pgTAP remains unverified because no database was listening on port 54322. Acceptance check (pending local pgTAP): verify cross-user access denial, binder/proxy/virtual constraints, and that one binder copy cannot be assigned to two decks.
- Source: "[Binder & Decks] Planning"

## D-034: Delete or dispose a copy that is in a deck

- Status: Implemented (migration applied; local pgTAP verification pending)
- Date: 2026-11-04
- Decision: Add a Postgres function called through Supabase RPC that deletes or disposes a binder copy and, in the same transaction, converts its `deck_cards` row to `virtual`. The binder confirm dialog from D-029 then mentions the deck.
- Why: Two steps must succeed or fail together; the client cannot guarantee that.
- Alternatives considered: Two client calls (can leave a broken deck row); `ON DELETE CASCADE` (a card silently vanishes from the deck).
- Consequences: Added an authenticated-only `SECURITY INVOKER` RPC that verifies ownership, performs the deck conversion and Binder status/delete operation atomically, and accepts only editable copy metadata. The Binder confirmation explains that a deck entry remains as virtual; both direct disposal controls and the edit form's status transition use the RPC. The paired rollback and pgTAP coverage include deletion, disposal, privilege boundaries, and a forced failure to verify rollback. The migration is applied, as confirmed by the user; generated database types include its nullable disposal status. Typecheck/build pass; local pgTAP verification remains pending until a local database is available.
- Source: "[Binder & Decks] Planning"

## D-035: Deck flows

- Status: Implemented (typecheck/build pass; authenticated positive control verified 2026-11-04)
- Date: 2026-10-28
- Decision: Enable the deck icon: add a binder copy (picker shows only copies not in a deck), add a proxy or a virtual card, switch a card between binder/proxy/virtual, move a copy between decks as an explicit action, and assign an owned copy to a virtual card. Binder copies show an "In deck: X" badge. Reuse or commonalize the Binder copy picker, form, popover and card actions where suitable instead of creating parallel components; retain the existing application styles.
- Why: Decks should behave like the binder, as requested.
- Alternatives considered: A separate deck-only interface (duplicate logic).
- Consequences: `useDeckManagement` loads user-scoped decks and entries, and patches the TanStack Query cache after create/add/update mutations. The shared `CardTile` deck action is available in Browser, Favorites, Binder and card-printing details; its popover creates decks, adds Binder/proxy/virtual entries, and changes an entry's kind, Binder copy or destination deck. Assigned Binder copies are excluded from other copy pickers, while the Binder copy popover displays the assigned deck name. D-034 invalidates deck entries when Binder copies are disposed or deleted. No schema change was needed. In the authenticated positive control on 2026-11-04, the Niv-Mizzet Reborn Binder copy was added to the existing `test` deck; it persisted after reload and the deck icon showed one entry. Typecheck and build pass; full lint still reports 18 pre-existing errors.
- Source: "[Binder & Decks] Planning"

## D-036: Deck pages and proxy/virtual visuals

- Status: Implemented (authenticated desktop/mobile checks and typecheck/build pass; light/dark contrast not separately checked)
- Date: 2026-11-04
- Decision: Add a decks page mirroring the binder page (all view and deck list, covers by the same rule, NUQS state, `CardFilters` reuse). Reuse/commonalize Binder page and `CardTile` components where their behavior matches, and preserve the existing application styles. Proxies use a thin dashed accent outline and a matching subtle pill; virtual cards use a distinct muted style. Both must also be identifiable without relying on color alone.
- Why: Same logic and visuals keep the app consistent.
- Alternatives considered: Badges only (not what was requested).
- Consequences: `/v2/decks` now provides URL-backed All cards and Decks views, selected-deck filtering, shared Scryfall hydration, `CardFilters`/`CardTile` reuse, rarity/type/date-ranked covers, and rounded card-count pills beside deck names. The All cards view preserves every deck entry and shows a pill below each card; Binder entries name their folder or Loose. Proxy entries use a thin dashed outline and subtly tinted pill; virtual entries use muted styling. Decks can be created, renamed and deleted; deletion removes deck entries through the existing `ON DELETE CASCADE` while leaving linked Binder copies intact. No schema change was needed. Authenticated desktop and 390px mobile checks on 2026-11-04 covered All cards, deck list, selected deck, entry pills and the deck popover without horizontal overflow. Light/dark visual contrast was not separately checked.
- Source: "[Binder & Decks] Planning"

## D-037: Deck release checkpoint

- Status: Implemented
- Date: 2026-11-04
- Decision: Verify and document: run `typecheck` and `build`, test by hand on desktop and mobile, and update `AGENTS.md` (decks become a feature) and `DECISIONS.md` statuses.
- Why: Same reason as D-032.
- Alternatives considered: Skip the checkpoint (documentation drifts from the source).
- Consequences: Closes the roadmap in D-020. Decks is now documented as an implemented feature; full deck-construction tools remain planned. `CardTile`, `CardFilters`, Binder copy controls and the established styles are reused. `npm run typecheck` and `npm run build` pass; build retains the >500 kB chunk advisory. `npm run lint` remains at 18 pre-existing errors and 0 warnings. Authenticated desktop checks at 1440px and mobile checks at 390px covered All cards, deck list, selected-deck filtering, entry pills and the deck action popover with no horizontal overflow. The Niv-Mizzet Reborn Binder-copy-to-`test` positive control persisted after reload and updated the deck icon count. The current `/v2/decks` feature is documented in `AGENTS.md`; local pgTAP verification remains pending as recorded in D-033/D-034.
- Source: "[Binder & Decks] Planning"

## D-041: Exclusive storage location for physical Binder copies

- Status: Implemented (migration applied; local pgTAP verification pending)
- Date: 2026-11-07
- Decision: An owned physical copy has exactly one storage location: one Binder folder, one deck, or Loose. The add-copy flow may assign the copy directly to an existing deck. Moving an assigned copy to a Binder folder preserves the deck entry as virtual; deleting its deck releases the physical copy to Loose. RPC argument types must retain nullability where a null Binder/deck ID represents the other storage destination. This supersedes the earlier deck-deletion behavior recorded in D-036.
- Why: A physical copy cannot simultaneously be stored in a Binder folder and assigned to a deck. Making storage transitions atomic keeps the database and UI consistent.
- Alternatives considered: Keeping duplicate ownership/location fields and reconciling them in the client (permits contradictory states); adding a copy to Loose or a Binder first and requiring a second assignment step (unnecessary user work).
- Consequences: Migration `20261107084804_exclusive_deck_copy_storage` and its manual rollback implement the invariant and atomic RPCs. The user confirmed the migration was applied. Authenticated browser verification added a copy directly to a deck and moved it to a Binder folder; the deck entry remained virtual. Typecheck/build pass; local pgTAP verification remains pending.
- Source: "Exclusive deck-copy storage workflow"

## D-042: Default Binder and Decks pages to their lists

- Status: Implemented
- Date: 2026-11-07
- Decision: When the `view` URL parameter is absent or invalid, `/v2/binder` opens the binder list and `/v2/decks` opens the deck list. A valid explicit view remains URL-backed; selecting a specific binder or deck continues to open its cards.
- Why: The primary management entry point for these pages is choosing a binder or deck, rather than starting in the aggregate card list.
- Alternatives considered: Keeping All cards as the default (requires an extra navigation step to reach the lists).
- Consequences: The defaults are `binders` and `decks` in the respective `nuqs` parsers. `npm run typecheck` and `npm run build` pass.
- Source: "Binder and Decks list-first defaults"
