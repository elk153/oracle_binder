# Implemented Decision History

Implemented and superseded decisions are retained here with their original IDs. Current, deferred and unresolved decisions remain in [DECISIONS.md](./DECISIONS.md). `Release: pending (on dev)` means the decision is implemented on `dev` but not yet in a release; the release step replaces it with the version.

## D-001: Logo and icon set for the web app

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-25
- Decision: The logo was traced from the uploaded raster into a vector SVG with CSS variables for all colors. A full icon set was generated from it: SVGs, favicon.ico, 180/192/512/1024 px PNGs in transparent, dark (#000000) and light (#ffffff) versions where relevant.
- Why: One vector source keeps every size consistent and lets the colors be edited in one place. The Apple-sized canvas (logo about 70% of the height) leaves room for iOS corner masking. A separate tight crop (about 92%) keeps the favicon readable at small sizes.
- Alternatives considered: A hand-drawn SVG would be cleaner but less faithful to the original. Inline SVG components via SVGR would allow runtime recoloring but need a new dependency. Both were not chosen for now.
- Consequences: Files live in public/. The CSS variables only work when the SVG is inlined, not through <img> or as a favicon. A maskable PWA icon and an og:image are not covered yet. The App Store icons are only needed for a native iOS build. Schema changes never go through the MCP; they follow D-014.
- Source: “[Branding] Logo and icon set”

## D-002: Theme toggle buttons in both navigation bars

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-25
- Decision: Each navigation bar gets its own round button that switches between the dark and light theme through the existing useTheme() hook. The icon shows the theme you will switch to (sun in dark mode, moon in light mode).
- Why: The theme state, the data-theme attribute and the theme tokens already existed, so the simplest fix was a button that calls setTheme. Separate components per bar let each match its own visual style (glowing two-layer icons in the NavBar, plain filled icons in the FloatingNavBar).
- Alternatives considered: One shared button component (less duplication, but the two bars look different). A toggleTheme function in the context (needs two more files). Saving the choice in localStorage (left for later; needs an early script to avoid a flash). Putting the FloatingNavBar button between the text field and "Go for it" (needs changes to Input.jsx).
- Consequences: The FloatingNavBar now follows the app theme instead of the OS setting. The choice is lost on reload. The NavBar mobile bar and the FloatingNavBar on narrow phones are wider or tighter and need a visual check. Each toggle contains the same one-line "pick the other theme" logic.
- Source: "[Theme] Dark/light toggle in navigation bars"

## D-003: V2 card browser data and integration boundary

- Status: Implemented
- Release: v2026.11.0
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

## D-004: Supabase project and security baseline

- Status: Implemented. Standing policy that still applies. Archived 2026-11-22.
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Use one Supabase project in an EU region for local development and the Netlify site. Only the publishable key reaches the browser (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). The auth redirect allow-list holds `http://localhost:5173/**` and the Netlify URL. Unused auth providers are off, and the Data API exposes only the `public` schema.
- Why: This is a solo learning app, so one project keeps setup small. A publishable key in a bundle is only safe because RLS restricts every row.
- Alternatives considered: Separate dev and production projects (safer, double the setup, can be added later). Any use of the secret/service-role key in the app (rejected: it bypasses RLS).
- Consequences: Dev and production share data. Free projects can pause after inactivity (verify current rules). Keys never go in chat or the repo, and Netlify holds the production values. New projects expose no tables to the Data API by default, so every migration must grant access explicitly. Legacy anon/service_role keys are not used. The enabled providers become GitHub and Discord, and Email is turned off at the end of D-070 (D-067). The production redirect entry is tightened to the callback route in D-008. Status: implemented once the checks above pass. Checked in code on 2026-11-21: `src/services/supabaseClient.ts` reads only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, and no `service_role` key appears in `src/`; the dashboard settings (region, redirect allow-list, providers, exposed schemas) cannot be checked from the repository.
- Source: "[Supabase] Auth and favorites plan"

## D-005: Supabase MCP is read-only

- Status: Implemented. Standing policy that still applies. Archived 2026-11-22.
- Release: none (developer tooling, not part of the app)
- Date: 2026-10-27
- Decision: Connect the Supabase MCP server to VS Code Copilot, scoped to this project with `read_only=true`. Schema changes are tracked and applied through the migration workflow in D-014.
- Why: Database content can carry prompt-injection text, so a write-enabled agent is a risk. Read-only still lets Copilot inspect schema, logs and advisors.
- Alternatives considered: Write-enabled MCP (faster, riskier). No MCP (loses the inspection help).
- Consequences: The workspace MCP entry is in the gitignored `.vscode/mcp.json`; first-time OAuth authentication in VS Code is still required. Copilot cannot apply migrations. To enable writes later, remove the flag, keep the project scope and per-call approvals, then record a superseding decision.
- Source: "[Supabase] Auth and favorites plan"

## D-006: Favorites table keyed to a card printing, with owner-only RLS

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Create `public.favorites (user_id, scryfall_id, created_at)` with primary key `(user_id, scryfall_id)`, an index on `(user_id, created_at desc)`, RLS enabled, and select/insert/delete policies for `authenticated` users on their own rows. `anon` has no access. `scryfall_id` is the Scryfall card id, which identifies one printing. There is no `profiles` table.
- Why: The composite key prevents duplicates and indexes lookups by user. The second index serves "latest added first". `user_id` defaults to `auth.uid()`, so the browser never sends it.
- Alternatives considered: Favoriting the card across printings via `oracle_id` (dedupes, but loses the printing). A `profiles` table now (nothing to store yet). Snapshotting card JSON (goes stale).
- Consequences: Two printings of one card are two favorites. A nullable `oracle_id` column can be added later without breaking anything. The migration is applied and verified in the project: the table, key, index, RLS policies and grants match this decision, and an anonymous Data API read is denied. The pgTAP owner-isolation suite is authored but still needs to run against a local Supabase database. Use the migration workflow in D-014, never the SQL editor.
- Source: "[Supabase] Auth and favorites plan"

## D-007: Supabase client and AuthProvider

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Add `@supabase/supabase-js`, create a single client in `src/services/supabaseClient.ts`, and add an `AuthProvider` with a `useAuth` hook. The provider sits inside `PersistenceProvider` and around `RouterProvider`. On sign-out it removes the favorites queries.
- Why: The library already stores the session and refreshes tokens. A context plus a hook matches the existing `ThemeProvider` pattern.
- Alternatives considered: Reading the session separately in each component (duplicated logic). A state library (new dependency, unnecessary). Auth UI packages (less to learn, less control).
- Consequences: The existing `@supabase/supabase-js` dependency and `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` configuration are used by the shared client. `AuthProvider` exposes session, user, loading state and sign-out through `useAuth`; sign-out removes favorites queries from the React Query cache. Implemented; sign-in UI and user-facing auth routes are covered by D-008.
- Source: "[Supabase] Auth and favorites plan"

## D-008: Email and password authentication

- Status: Superseded by D-067 (GitHub and Discord sign-in; email/password form removed on 2026-11-22, branch `claude/account-management-selection-85da20`)
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Add `/v2/login` with email/password sign-in and signup, plus `/v2/auth/callback` for email confirmation. After authentication, navigate to `next` only when it starts with `/v2/` and contains no `//` or backslash; otherwise use `/v2/home`.
- Why: Use Supabase's built-in password authentication rather than passwordless OTP, while keeping a dedicated route for account access.
- Alternatives considered: Passwordless email OTP (D-008's previous implementation); literal usernames (not supported as a native Supabase Auth identifier).
- Consequences: Supabase email confirmation must be enabled/configured as desired, and the callback URL must be in the Auth redirect allow-list. Email confirmation links are for signup verification only; normal sign-in uses the password. Password reset and profile management are outside this decision. Implemented.
- Source: "[Supabase] Auth and favorites plan"

## D-009: RequireAuth layout route

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Wrap `/v2/favorites`, `/v2/binder` and `/v2/decks` in a `RequireAuth` layout route. It renders nothing while the session loads, an inline sign-in invitation linking to `/v2/login?next=<current path>` when signed out, and `<Outlet />` when signed in.
- Why: An invitation fits your request better than a silent redirect, and the loading state avoids a flash.
- Alternatives considered: Redirecting to the login route (loses the page context). Guarding inside each page (duplicated).
- Consequences: This guard is UX only. Security is enforced by RLS, never by the client. Implemented.
- Source: "[Supabase] Auth and favorites plan"

## D-010: Paginated card source for the card browser

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Define a `CardSource` shape (`cards`, `isLoading`, `isFetchingNextPage`, `hasNextPage`, `fetchNextPage`, `error`). Implement it for Scryfall search with `useInfiniteQuery`, following `next_page` while `has_more` is true. Add a "Load more" button. Keep the current daily-set mode as a single page and leave V1 untouched.
- Why: One source shape lets search, favorites, collections and decks share the card browser. A button is the simplest trigger and keeps Scryfall requests polite.
- Alternatives considered: Infinite scroll with an intersection observer (a new dependency, can come later). A separate browser per page (duplicates the filter code).
- Consequences: Search results can be paged beyond the first 175 cards, but local filters and sorts cover only cards loaded so far. The daily set remains limited to seven cards and V1 is unchanged. The paginated hook reads Scryfall's `has_more` and `next_page` metadata directly, and uses a query-key prefix that `PersistenceProvider` does not persist. Implemented.
- Source: "[Supabase] Auth and favorites plan"

## D-011: Favorite hooks and the heart toggle

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Add `useFavoriteIds` (a query for the user's `scryfall_id` set) and `useToggleFavorite` (a mutation that inserts or deletes, then invalidates). Optimistic updates come later. The heart on `CardTile` replaces the under-construction notice. For anonymous users it shows the sign-in invitation.
- Why: One id set lets every tile show its heart without a request per card.
- Alternatives considered: Checking each visible card with `.in(...)` (more requests). Starting optimistic (more concepts at once).
- Consequences: The favorite-ID query pages through results in bounded batches to avoid API row caps. Favorites are never persisted to `localStorage`; they are loaded for the current authenticated user and refreshed after successful toggles. Anonymous users receive a sign-in invitation that returns to the current page. Implemented.
- Source: "[Supabase] Auth and favorites plan"

## D-012: Favorites page on the shared card source

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Implement `CardSource` for favorites. Each page reads up to 75 rows ordered by `created_at desc, scryfall_id desc`, continuing from the last row with a composite cursor. It resolves them through Scryfall's `POST /cards/collection`, re-orders them by the Supabase order, and skips ids Scryfall no longer returns. Page size is a single constant.
- Why: Scryfall accepts at most 75 identifiers per request. Cursor paging stays correct when favorites are added or removed between pages.
- Alternatives considered: Offset paging (rows can shift). Relying on Scryfall's response order (not guaranteed).
- Consequences: The favorites hook issues one Scryfall collection request for each loaded page and skips missing cards without changing Supabase pagination. The composite cursor avoids skipping favorites with tied timestamps. "No sort selected" means latest added. Collections and decks can implement the same `CardSource` later. Implemented.
- Source: "[Supabase] Auth and favorites plan"

## D-013: Email delivery for magic links

- Status: Superseded by D-017 (email and password sign-in)
- Date: 2026-10-27
- Decision: Use Supabase's built-in sender during solo development, and choose a free SMTP provider before inviting others.
- Why: The built-in sender is for testing and heavily rate-limited, but enough for one developer.
- Alternatives considered: Brevo (free daily quota, can verify a single sender address), Resend (free monthly quota, needs a domain you control), Mailtrap (test inbox only, no real delivery). Verify current free limits.
- Consequences: Passwordless magic-link sign-in was not reliable and is no longer the sign-in flow. The replacement is recorded in D-017. Supabase may still send email confirmation for signup, depending on Auth settings.
- Source: "[Supabase] Auth and favorites plan"

## D-014: Schema tracked as migration files and applied with the Supabase CLI

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Keep every schema change as a timestamped SQL file in `supabase/migrations/`, created with `supabase migration new` and applied with `supabase db push` (dry run first). The CLI is pinned as a dev dependency and invoked through `npx`. Local Docker is optional for testing; the dashboard is for reading and experiments, not for schema changes.
- Why: Files in git give a reviewable history and one source of truth. `db push` also records each migration in the project's migration history, so later automation knows what is already applied. Pasting into the SQL editor would leave that history empty.
- Alternatives considered: SQL editor plus committed files (simple, but files and database drift, and later automation would try to re-run them). Hand-written GitHub Actions running `db push` (needs the access token and database password stored as GitHub secrets). A local Docker stack (best for testing, heavy for now).
- Consequences: The Supabase CLI is pinned as a dev dependency, and `supabase/MIGRATIONS.md` documents setup, local pgTAP testing, dry-run, apply, and history verification. `supabase login` and `supabase link` are one-time local setup; local database testing requires Docker, but remote migration application does not. Rollbacks are new forward migrations. Each migration still needs approval per AGENTS.md. If the schema is changed in the dashboard, `supabase db pull` captures it as a file. Implemented; no remote schema changes were made as part of this workflow setup.
- Source: "[Supabase] Migrations and GitHub"

## D-016: Generated TypeScript types for the database

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Generate `src/types/database.ts` from the linked Supabase project's `public` schema with `supabase gen types typescript --linked --schema public` and pass `Database` to `createClient<Database>()` in D-007.
- Why: `npm run typecheck` then catches wrong table or column names at compile time.
- Alternatives considered: Hand-written row types (drift from the schema). No types (no checks).
- Consequences: `src/types/database.ts` is generated and committed, and must be regenerated after schema migrations. The pinned CLI workflow is documented in `supabase/MIGRATIONS.md`. TypeScript catches Supabase table and column mismatches in typed files; JS/JSX files stay unchecked, as in AGENTS.md. Implemented.
- Source: "[Supabase] Migrations and GitHub"

## D-017: Email and password authentication replaces magic-link sign-in

- Status: Superseded by D-067 (GitHub and Discord sign-in; email/password form removed on 2026-11-22, branch `claude/account-management-selection-85da20`)
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Use Supabase's native email/password signup and sign-in on `/v2/login`; keep `/v2/auth/callback` for signup email confirmation and return users only to validated `/v2/` paths.
- Why: Passwordless magic-link sign-in was not working reliably during testing. The password flow supports regular sign-in without requiring a magic link each time.
- Alternatives considered: Continue troubleshooting passwordless magic links (D-013, not working); literal username/password authentication (requires a custom username identity mapping because Supabase's native password identifier is email or phone).
- Consequences: Signup confirmation emails may still be sent when email confirmation is enabled in Supabase Auth. SMTP delivery configuration is not required for normal password sign-in. Existing D-008 routes implement this flow; remote Auth settings are managed separately.
- Source: "[Supabase] Auth and favorites plan"

## D-018: Cross-device favorites refresh and printing availability

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Keep favorites synchronized across signed-in devices using Supabase Realtime notifications to refresh the authenticated user's favorites. In the card browser, also surface the user's favorited printing when it is absent from the current Scryfall name-search results. Deduplicate by Scryfall printing ID and apply the existing local filters and sorting to the combined results. Leave the daily seven-card set and unrelated searches unchanged.
- Why: The current favorite-ID query only refreshes after local mutations or when it becomes stale; it does not notify another open device. Search results are also returned independently by Scryfall and may not include the exact printing saved as a favorite.
- Alternatives considered: Rely on periodic or focus-triggered refetching (not immediate on an already-open device). Refresh only the favorite heart state (does not make the missing printing available in the browser).
- Consequences: A reusable user-owned-table Realtime invalidation hook, bounded Scryfall hydration, and merging of matching missing favorite printings are implemented. Notifications invalidate/refetch under RLS and do not trust event payloads; local favorite mutation echoes are ignored. The D-031 migration is applied; a read-only linked-project query on 2026-11-02 confirmed the three user-owned tables are in `supabase_realtime`. Cross-device behavior has not been separately exercised. Search pagination, printing-ID deduplication and local filtering are preserved.
- Source: "[Supabase Realtime: Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)"; "[Supabase Realtime: Subscribing to Database Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)"

## D-019: Select between Scryfall and personal collection search

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-27
- Decision: Add a search-scope toggle with two modes: "Scryfall" searches the public Scryfall catalog, and "Personal collection" searches only the signed-in user's owned card sources. Initially, the personal scope includes Favorites; when the collection feature is implemented, include Collection there as well. Keep Scryfall as the default scope.
- Why: Searching a user's own cards is a different task from searching the full Scryfall catalog, and should not require them to remember which page contains each card.
- Alternatives considered: Keep independent search experiences on separate pages (less discoverable). Search Scryfall and personal sources together by default (mixes owned and unowned results).
- Consequences: The navbar's URL-backed source toggle preserves the selected scope through searches. Personal results combine favorites and owned Binder copies, deduplicated by Scryfall printing ID and read through RLS-protected queries; disposed copies are omitted. No separate collection feature is implied.
- Source: User request, 2026-10-27

## D-020: Binder and decks roadmap

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: Ship the binder completely (D-021 to D-032) before starting decks (D-033 to D-037). Each step below is its own decision, planned with a short plan before code and closed with its own check. A binder entry is one copy per row; "loose" is `binder_id = NULL`.
- Why: Multiple copies with per-copy metadata do not fit favorites' `(user_id, scryfall_id)` key. Finishing the binder first gives decks a stable, documented base.
- Alternatives considered: Interleaving binder and deck steps (deck rules would need tables that do not exist yet); a quantity column per card (cannot hold per-copy metadata); a real "Loose" binder row (special-case rename and delete rules).
- Consequences: Order is fixed: A (D-021 to D-024, no database), B (D-025 to D-032, binder), C (D-033 to D-037, decks). Deck implementation reuses or commonalizes suitable Binder components and retains the established UI styles rather than introducing a new visual system. Every migration needs explicit approval and a dry run, because one Supabase project serves development and production (D-014, D-015).
- Source: "[Binder & Decks] Planning"

## D-021: Logout SVG icon

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: Create `LogoutIcon.tsx` in `src/assets/icons/navigation/` using the nav icon pattern (24-unit viewBox, `nav-icon` class, `nc-trace`/`nc-core` layers, `1em` size), and use it in `NavBarDesktop.tsx` and `NavBarMobile.tsx` in place of the `↪` text glyph.
- Why: The glyph does not follow the theme or hover/active behavior of the other icons.
- Alternatives considered: Keep the glyph and style it with CSS (still not a real icon, inconsistent shapes); an icon library (new dependency, not needed).
- Consequences: Existing `aria-label="Log out"` and the `isSigningOut` state stay unchanged. Both navbars use the new icon with the same hover behavior as the other icons.
- Source: "[Binder & Decks] Planning"

## D-022: Card action order and flip icon style

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: In `CardTile.tsx`, order the actions favorite, binder, deck, then flip last. Redraw `IconTurnAround.tsx` in the nav icon style (24-unit viewBox, `1em`, two-layer trace/core).
- Why: The flip button was rendered first, and its 48-unit viewBox, stroke 4 and fixed 32px size did not match the nav icons.
- Alternatives considered: Restyle the other icons to match the flip (would change the nav set); reorder only (leaves the visual mismatch).
- Consequences: The `collection` action id became `binder` in D-023. The hover-flip behavior on desktop and tap-flip on mobile are preserved.
- Source: "[Binder & Decks] Planning"

## D-023: Replace Collection with Binder

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: Rename the nav item label to "Binder", rename `CollectionIcon.tsx` to `BinderIcon.tsx`, change the route from `/v2/collection` to `/v2/binder`, and redirect the old path. Rename the `CardAction` value `collection` to `binder`.
- Why: The feature is a binder; "collection" implies a different, undefined thing.
- Alternatives considered: Keep the route and change only the label (path and label drift apart); no redirect (breaks existing links).
- Consequences: The Binder route stays behind `RequireAuth`, and the old `/v2/collection` URL redirects to it. The card-action value is `binder`; personal-collection search scope remains distinct. This decision also establishes the shared implementation context for D-023 onward: reuse or commonalize suitable Binder components when implementing decks, and keep the existing application styles instead of creating a new UI style. Check: `npm run typecheck` and `npm run build` pass; `/v2/binder` is protected and `/v2/collection` redirects to it.
- Source: "[Binder & Decks] Planning"

## D-024: Card details: P/T, color pills, rarity pill

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: In the card-content panel, place mana cost beside power/toughness (and loyalty/defense when present), then color circles and a rarity pill on the next row, between type line and oracle text. This applies per face. Extend `CardBrowserCard` and `isCardBrowserCard` in `types.ts` for the fields needed.
- Why: The overlay currently shows none of these. Color circles give a quick visual cue, with accessible labels preserving their meaning; the rarity remains a text pill.
- Alternatives considered: Mana symbol images only (color-only, harder to read); showing P/T only below the rules text (requested next to mana cost).
- Consequences: Renderer metadata is opt-in for the details overlay, leaving other renderer surfaces unchanged. Color circles use the Magic colors and have accessible labels; stat and rarity pills share a height. Check: `npm run typecheck`, `npm run build`, and targeted lint pass; browser verification covers a single-face creature, a double-faced card, a colorless card, and a multicolor card.
- Source: "[Binder & Decks] Planning"

## D-025: Binder groundwork: hydration, DB types, updated_at

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: Extract the bounded Scryfall collection hydration from `useFavoriteCards` into a shared helper (D-018). Generate `src/types/database.ts` and pass `Database` to `createClient` (D-016). Add one shared SQL function `set_updated_at()` in a migration.
- Why: Binder pages need the same hydration as favorites. Typed tables catch column mistakes early. One trigger function serves every new table.
- Alternatives considered: Copy the hydration into binder code (duplication); skip generated types (untyped rows); the `moddatetime` extension (extra moving part).
- Consequences: The shared fetcher keeps the 75-card request bound, cancellation, validation, and error behavior; favorites ordering, missing-card handling, and keyset pagination are unchanged. `Database` types and `createClient<Database>` were already generated and verified against the linked schema. The migration is present in linked migration history.
- Source: "[Binder & Decks] Planning"

## D-026: Binder schema migration

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: One migration creates `binders (id, user_id, name, created_at, updated_at)` and `binder_cards` (one row per copy: `id`, `user_id`, nullable `binder_id` with `ON DELETE SET NULL`, `scryfall_id`, `rarity`, `status`, `acquisition_type`, `acquisition_format`, `condition`, `finish`, `language`, `purchase_price`, `acquired_at`, `location`, `notes`, `disposed_at`, `disposal_price`, timestamps). Use `text` plus `check` constraints. Binder names are unique per user, case-insensitive. RLS on both tables, update granted only on editable columns, and policies verify that `binder_id` belongs to the user. Add RLS tests.
- Why: Per-copy rows hold per-copy metadata. `SET NULL` implements "deleting a binder moves cards to loose". `rarity` on each copy allows covers without Scryfall calls.
- Alternatives considered: Enums (harder to change); quantity column (no per-copy metadata); composite foreign key for ownership (more complex than a policy check).
- Consequences: `binder_cards.user_id` explicitly owns loose copies; cards attached to a binder must reference a binder owned by the same user. Grants exclude ownership and card-identity updates; timestamp triggers use the shared D-025 function. A paired manual rollback is in `supabase/rollback/`. The pgTAP tests cover grants, RLS isolation, ownership, and deleting a binder to move its cards to loose. The migration is present in linked migration history.
- Source: "[Binder & Decks] Planning"

## D-027: Binder copies query and icon state

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: Add `useBinderCopies`, one paged-loop query for all of the user's copies (as in `useFavoriteIds`), and derive `Map<scryfallId, copies[]>` with `useMemo`. `CardTile` shows the binder icon active with a copy count, and the favorite icon stays independent so both can be active.
- Why: One query serves icon state, hover content and binder views, with no per-card queries.
- Alternatives considered: A counts-only query plus lazy per-card loading (extra queries on hover); a database view (not needed yet).
- Consequences: Query key `["binderCopies", userId]`; data loads in bounded PostgREST pages and is indexed in a memoized `Map`. The count includes owned copies only; history remains available in the popover. Signed-out users are invited to sign in. Typecheck/build pass and responsive UI was inspected.
- Source: "[Binder & Decks] Planning"

## D-028: Add-copy overlay and mutations

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: Clicking the binder icon opens and pins the copies popover; choosing **Add another copy** opens the add-copy dialog (defaults prefilled, all metadata optional, one-tap save). Mutations return the written row (`.insert().select().single()`) and patch the cache with `setQueryData` instead of refetching.
- Why: Multiple copies are allowed, and avoiding a refetch after each change follows the "minimize queries" goal.
- Alternatives considered: Invalidate and refetch as favorites does (extra query per change); optimistic updates (more complexity, can come later).
- Consequences: The accessible controlled form uses typed fields, defaults new copies to owned/loose, and stores rarity from the selected Scryfall card. The dialog matches the card-details overlay styling and keeps Save/Cancel reachable while the form scrolls on short screens. Insert/update return rows and patch the cache; a local Realtime echo does not trigger a redundant refetch. Database writes were not exercised in browser verification to avoid changing the signed-in user's live data.
- Source: "[Binder & Decks] Planning"

## D-029: Copy popover: view, edit, dispose, delete

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: Hovering or keyboard-focusing the binder icon opens a transient popover; clicking or tapping it pins the popover open until it is closed, Escape is pressed, or the user clicks outside. The popover lists the card's copies with their metadata. Modify/save/cancel switch a copy into edit mode. Per copy: **Delete** removes the row after a confirm; **Mark sold/lost/given away** changes `status` and sets `disposed_at`, keeping the data. A History toggle shows disposed copies, and **Restore** returns one to owned.
- Why: Deleting loses data; disposing keeps history that feeds the future sales and balance goals.
- Alternatives considered: Hover-only metadata (not reachable on touch or keyboard); delete-only (loses history).
- Consequences: Default Binder views and counts include only owned copies; History shows disposed copies. The card-content-style popover bounds its height to the viewport and scrolls the copy list. Status actions set `disposed_at`, restore clears disposal metadata, and permanent deletion requires confirmation. Edit failures leave the copy in edit mode and show an error notice. Browser inspection confirmed the popover and form; database writes were not exercised against live user data.
- Source: "[Binder & Decks] Planning"

## D-030: Binder page: all-cards view and binder list

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: `/v2/binder` offers two views through NUQS (`?view=all|binders`, `?binder=<id>`). The all-cards view reuses `CardFilters` and the shared hydration. The binder list shows each binder with a cover chosen by rarity rank, then the Legendary supertype, then oldest added. A virtual "Loose" binder is always present and cannot be renamed or deleted. Users can create, rename and delete binders (with a confirm that states how many cards move to loose) and move copies, singly or in bulk.
- Why: Covers computed from loaded copies avoid fetching every card. Loose as `NULL` keeps rules simple.
- Alternatives considered: A stored cover id (needs manual upkeep); one table of all cards only (no binders).
- Consequences: `/v2/binder` has URL-backed all-cards/binder-list views, local filters, bulk moves, binder CRUD, and a virtual Loose binder. Card entries and folder covers reuse the card-browser `CardTile`; covers are hydrated in sequential Scryfall collection batches and ranked by rarity, Legendary supertype, then oldest copy. Typecheck/build pass; deleting binders was not performed against live user data.
- Source: "[Binder & Decks] Planning"

## D-031: Realtime refresh and personal search scope

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: Implement the reusable Realtime invalidation hook from D-018 and apply it to favorites and binder tables, with a migration adding them to the `supabase_realtime` publication. Update D-019's personal scope to include binder copies, deduplicated by Scryfall printing ID.
- Why: Another open device should see binder changes, and personal search should cover what the user owns.
- Alternatives considered: Refetch on window focus only (not immediate).
- Consequences: The reusable Realtime hook invalidates the appropriate user-scoped query keys for favorites, binders and binder copies; local cache-patched mutation echoes are ignored. The migration and paired manual rollback are present, with a pgTAP publication test. Linked migration history and a read-only publication query on 2026-11-02 confirm the migration is applied and all three tables are members of `supabase_realtime`. Cross-device UI behavior has not been separately verified; D-018/D-019 code is implemented.
- Source: "[Binder & Decks] Planning"

## D-032: Binder release checkpoint

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: Stop and verify before decks: run `typecheck` and `build`, test by hand on desktop and mobile, and update `AGENTS.md` (binder becomes a feature, decks remain a goal) and `DECISIONS.md` statuses.
- Why: Decks build on the binder, so it must be stable and documented first.
- Alternatives considered: Document everything at the end (context drifts and errors compound).
- Consequences: Typecheck and production build pass; desktop (1440px) and mobile (390px) browser checks covered Binder views, personal search, shared card tiles, the pinned copy popover and scrollable add-copy dialog without writing to the signed-in user's live data. Targeted lint passes; full lint has 18 unrelated pre-existing errors (checked 2026-11-02). Linked migration history and publication membership are verified; cross-device UI behavior has not been separately tested. The local pgTAP suite was not run because a local database was unavailable at the last attempt. Deck work remains out of scope.
- Source: "[Binder & Decks] Planning"

## D-033: Deck schema migration

- Status: Implemented (migration applied; local pgTAP verification pending)
- Release: v2026.11.0
- Date: 2026-11-02
- Decision: One migration creates `decks (id, user_id, name, format, notes, timestamps)` and `deck_cards (id, user_id, deck_id ON DELETE CASCADE, kind binder|proxy|virtual, binder_card_id nullable, scryfall_id, timestamps)`. A partial unique index on `binder_card_id` allows one binder copy in one deck only. A check ties `kind = 'binder'` to a non-null `binder_card_id`. RLS policies verify ownership of `deck_id` and `binder_card_id`.
- Why: The database, not the UI, guarantees the one-deck rule.
- Alternatives considered: Separate tables per kind (more queries); a `quantity` column (cannot link copies).
- Consequences: The migration, paired manual rollback, and pgTAP tests are authored; linked migration history confirms `20261102174623` is applied. The schema uses owner-scoped RLS, least-privilege grants, timestamp triggers, and indexes for deck/card lookup, foreign-key deletion, and unique binder-copy assignment. `src/types/database.ts` was regenerated from the linked public schema. Typecheck and linked schema lint pass. The linked advisors reported no deck-specific security warnings; unused-index notices are expected before deck queries are in use. Local pgTAP remains unverified because no database was listening on port 54322. Acceptance check (pending local pgTAP): verify cross-user access denial, binder/proxy/virtual constraints, and that one binder copy cannot be assigned to two decks.
- Source: "[Binder & Decks] Planning"

## D-034: Delete or dispose a copy that is in a deck

- Status: Implemented (migration applied; local pgTAP verification pending)
- Release: v2026.11.0
- Date: 2026-11-04
- Decision: Add a Postgres function called through Supabase RPC that deletes or disposes a binder copy and, in the same transaction, converts its `deck_cards` row to `virtual`. The binder confirm dialog from D-029 then mentions the deck.
- Why: Two steps must succeed or fail together; the client cannot guarantee that.
- Alternatives considered: Two client calls (can leave a broken deck row); `ON DELETE CASCADE` (a card silently vanishes from the deck).
- Consequences: Added an authenticated-only `SECURITY INVOKER` RPC that verifies ownership, performs the deck conversion and Binder status/delete operation atomically, and accepts only editable copy metadata. The Binder confirmation explains that a deck entry remains as virtual; both direct disposal controls and the edit form's status transition use the RPC. The paired rollback and pgTAP coverage include deletion, disposal, privilege boundaries, and a forced failure to verify rollback. The migration is applied, as confirmed by the user; generated database types include its nullable disposal status. Typecheck/build pass; local pgTAP verification remains pending until a local database is available.
- Source: "[Binder & Decks] Planning"

## D-035: Deck flows

- Status: Implemented (typecheck/build pass; authenticated positive control verified 2026-11-04)
- Release: v2026.11.0
- Date: 2026-10-28
- Decision: Enable the deck icon: add a binder copy (picker shows only copies not in a deck), add a proxy or a virtual card, switch a card between binder/proxy/virtual, move a copy between decks as an explicit action, and assign an owned copy to a virtual card. Binder copies show an "In deck: X" badge. Reuse or commonalize the Binder copy picker, form, popover and card actions where suitable instead of creating parallel components; retain the existing application styles.
- Why: Decks should behave like the binder, as requested.
- Alternatives considered: A separate deck-only interface (duplicate logic).
- Consequences: `useDeckManagement` loads user-scoped decks and entries, and patches the TanStack Query cache after create/add/update mutations. The shared `CardTile` deck action is available in Browser, Favorites, Binder and card-printing details; its popover creates decks, adds Binder/proxy/virtual entries, and changes an entry's kind, Binder copy or destination deck. Assigned Binder copies are excluded from other copy pickers, while the Binder copy popover displays the assigned deck name. D-034 invalidates deck entries when Binder copies are disposed or deleted. No schema change was needed. In the authenticated positive control on 2026-11-04, the Niv-Mizzet Reborn Binder copy was added to the existing `test` deck; it persisted after reload and the deck icon showed one entry. Typecheck and build pass; full lint still reports 18 pre-existing errors.
- Source: "[Binder & Decks] Planning"

## D-036: Deck pages and proxy/virtual visuals

- Status: Implemented (authenticated desktop/mobile checks and typecheck/build pass; light/dark contrast not separately checked)
- Release: v2026.11.0
- Date: 2026-11-04
- Decision: Add a decks page mirroring the binder page (all view and deck list, covers by the same rule, NUQS state, `CardFilters` reuse). Reuse/commonalize Binder page and `CardTile` components where their behavior matches, and preserve the existing application styles. Proxies use a thin dashed accent outline and a matching subtle pill; virtual cards use a distinct muted style. Both must also be identifiable without relying on color alone.
- Why: Same logic and visuals keep the app consistent.
- Alternatives considered: Badges only (not what was requested).
- Consequences: `/v2/decks` now provides URL-backed All cards and Decks views, selected-deck filtering, shared Scryfall hydration, `CardFilters`/`CardTile` reuse, rarity/type/date-ranked covers, and rounded card-count pills beside deck names. The All cards view preserves every deck entry and shows a pill below each card; Binder entries name their folder or Loose. Proxy entries use a thin dashed outline and subtly tinted pill; virtual entries use muted styling. Decks can be created, renamed and deleted; deletion removes deck entries through the existing `ON DELETE CASCADE` while leaving linked Binder copies intact. No schema change was needed. Authenticated desktop and 390px mobile checks on 2026-11-04 covered All cards, deck list, selected deck, entry pills and the deck popover without horizontal overflow. Light/dark visual contrast was not separately checked.
- Source: "[Binder & Decks] Planning"

## D-037: Deck release checkpoint

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-11-04
- Decision: Verify and document: run `typecheck` and `build`, test by hand on desktop and mobile, and update `AGENTS.md` (decks become a feature) and `DECISIONS.md` statuses.
- Why: Same reason as D-032.
- Alternatives considered: Skip the checkpoint (documentation drifts from the source).
- Consequences: Closes the roadmap in D-020. Decks is now documented as an implemented feature; full deck-construction tools remain planned. `CardTile`, `CardFilters`, Binder copy controls and the established styles are reused. `npm run typecheck` and `npm run build` pass; build retains the >500 kB chunk advisory. `npm run lint` remains at 18 pre-existing errors and 0 warnings. Authenticated desktop checks at 1440px and mobile checks at 390px covered All cards, deck list, selected-deck filtering, entry pills and the deck action popover with no horizontal overflow. The Niv-Mizzet Reborn Binder-copy-to-`test` positive control persisted after reload and updated the deck icon count. The current `/v2/decks` feature is documented in `AGENTS.md`; local pgTAP verification remains pending as recorded in D-033/D-034.
- Source: "[Binder & Decks] Planning"

## D-041: Exclusive storage location for physical Binder copies

- Status: Implemented (migration applied; local pgTAP verification pending)
- Release: v2026.11.0
- Date: 2026-11-07
- Decision: An owned physical copy has exactly one storage location: one Binder folder, one deck, or Loose. The add-copy flow may assign the copy directly to an existing deck. Moving an assigned copy to a Binder folder preserves the deck entry as virtual; deleting its deck releases the physical copy to Loose. RPC argument types must retain nullability where a null Binder/deck ID represents the other storage destination. This supersedes the earlier deck-deletion behavior recorded in D-036.
- Why: A physical copy cannot simultaneously be stored in a Binder folder and assigned to a deck. Making storage transitions atomic keeps the database and UI consistent.
- Alternatives considered: Keeping duplicate ownership/location fields and reconciling them in the client (permits contradictory states); adding a copy to Loose or a Binder first and requiring a second assignment step (unnecessary user work).
- Consequences: Migration `20261107084804_exclusive_deck_copy_storage` and its manual rollback implement the invariant and atomic RPCs. The user confirmed the migration was applied. Authenticated browser verification added a copy directly to a deck and moved it to a Binder folder; the deck entry remained virtual. Typecheck/build pass; local pgTAP verification remains pending.
- Source: "Exclusive deck-copy storage workflow"

## D-042: Default Binder and Decks pages to their lists

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-11-07
- Decision: When the `view` URL parameter is absent or invalid, `/v2/binder` opens the binder list and `/v2/decks` opens the deck list. A valid explicit view remains URL-backed; selecting a specific binder or deck continues to open its cards.
- Why: The primary management entry point for these pages is choosing a binder or deck, rather than starting in the aggregate card list.
- Alternatives considered: Keeping All cards as the default (requires an extra navigation step to reach the lists).
- Consequences: The defaults are `binders` and `decks` in the respective `nuqs` parsers. `npm run typecheck` and `npm run build` pass.
- Source: "Binder and Decks list-first defaults"

## D-043: Calendar versioning (CalVer) for releases

- Status: Implemented
- Release: v2026.11.0
- Date: 2026-11-07
- Decision: Releases are versioned `YYYY.M.MICRO` (unpadded), with `package.json` as the single source of truth and annotated `vYYYY.M.MICRO` tags created by `npm version`. UI layout prefixes such as `/v2` are layout names, not app versions.
- Why: The app is an end-user web app with no dependents, so SemVer's compatibility signal has no reader and costs a judgment call at every release. Changes are incremental and deployed continuously. CalVer needs no judgment and matches the dates already used in `DECISIONS.md` and Supabase migration filenames.
- Alternatives considered: SemVer `0.y.z` (kept only if the app becomes a published package, exposes an API, or a "1.0" milestone is wanted). Plain integers (not valid in `package.json` without faking `N.0.0`, and no time information). A SemVer/CalVer hybrid (more rules than a solo project needs).
- Consequences: Breaking contract changes (URLs and query params, Supabase schema and RLS, persisted browser data) are listed under `### Breaking` in `CHANGELOG.md` and recorded in `DECISIONS.md`. The "1.0" goal becomes named roadmap milestones. Same-month releases use `npm version patch`; the first release of a month uses an explicit `npm version YYYY.M.0`. Removing a layout prefix without a redirect counts as a breaking change. The changelog and annotated release tag were created for the first release.
- Source: "[Versioning] SemVer vs CalVer"

## D-044: Search page shell, toggles and naming rule

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-07
- Decision: On `/v2/search`, `CardBrowserPage` (mode `search`) renders a new `SearchControls` (`src/features/search/`) in place of the header hint. It holds two toggles: source (`scryfall` | `collection`, default `scryfall`, param `source` unchanged) and search type (`simple` | `advanced`, default `simple`, param `s_mode`). The existing `SearchSourceToggle` is moved there, not rewritten.
- Why: All searching lives in one page; `q`/`source` links keep working; the `s_` prefix and the "Search" vs "Filter & sort" titles stop search inputs and local filters from being confused.
- Alternatives considered: A separate advanced route (more routes); renaming filter params (breaks existing links, a public contract change).
- Consequences: Supersedes the navbar-toggle part of D-019. `/v2/search/advanced` (placeholder `AdvancedSearch` in `App.tsx`) becomes a redirect to `/v2/search?s_mode=advanced`. The `search/random` route and mulligan mode are untouched. Touches 3+ files: show a plan first.
- Source: "[Search] Search refactor"

## D-045: Navbar cleanup

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-07
- Decision: After D-044, remove the search field and source toggle from `NavBarDesktop.tsx` and `NavBarMobile.tsx`. The existing "Search" item in `navItems.ts` points to `search` instead of `search/advanced`. `NavThemeToggle` moves between Decks and Logout. Signed-out users still get the login prompt from protected pages, as today.
- Why: Done after D-044 so search is never unreachable; home stays the landing page.
- Alternatives considered: Doing it first (a gap with no search); adding a Login item (deferred to later user/preferences work).
- Consequences: In `NavBar.tsx` and `types.ts`, drop `searchSource`, `onSearchSource*`, `onSearch` and the mobile `searchFocused` state. Delete only after your approval (done: on 2026-11-21 none of the files or CSS rules listed here exist on `dev`): `NavSearchField.tsx`, `src/assets/icons/navigation/QuickSearchIcon.tsx` (used only by NavSearchField), the `SearchSourceToggle` files in `navigation/` once moved by D-044, the `.nav-search*`, `.nav-source-toggle` and `.nav-bar--search-focused` rules in `navbar-shared.css`, `navbar-desktop.css` and `navbar-mobile.css`, the `AdvancedSearch` function in `App.tsx` and its import in `router.tsx`. Update the `.nav-search` comment in `NavThemeToggle.css`. Check with `grep` before each deletion.
- Source: "[Search] Search refactor"

## D-046: Collection scope and name search

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-07
- Decision: With `source=collection`, results are the union of favorites (`favoriteIdList`), owned binder copies (`status === "owned"`) and deck entries of any kind (owned/proxy/virtual from `useDeckManagement`), built in `personalCardIds` in `useCardBrowserResults.ts` and hydrated by the existing `useScryfallCardsForIds("personal", …)`. Simple search applies the same case-insensitive name `includes` on `q` that is already used for favorites in Scryfall mode.
- Why: Collection name search is not implemented today: the personal branch of `displayCards` returns every personal card and ignores `q`.
- Alternatives considered: A separate collection hook (duplicates hydration and caching).
- Consequences: `CardTile` already shows Favorites, Binder and Decks icons; check `CardTile.tsx` for proxy/virtual and only add what is missing. The `personal` cache key contains the ID list, so any change in the collection rehydrates all cards; watch performance on large collections.
- Source: "[Search] Search refactor"

## D-047: Filter and sort by place and kind

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-07
- Decision: Extend `useCardsTable(cards, cardPlaces?)` with an optional `Map<scryfallId, {favorite, binders[], decks[{id, kind}]}>` built from the D-046 sources. New `FilterCategory` values `place` (binder or deck, multi-select) and `kind` (owned/proxy/virtual/favorite, multi-select) are added to `columns.ts`, `filterParams.ts` (`place`, `kind`) and `filterCategories.ts`. They show only when `cardPlaces` is passed. A new sort key `place` is added to `SORT_KEYS`.
- Why: Reuses the TanStack Table and nuqs filter pipeline, so no separate filtering code exists for collection results.
- Alternatives considered: Filtering before the table (duplicates filter logic); a new filter panel (inconsistent UI).
- Consequences: Passed only by the Search page (collection source) for now. Binder, Decks and Favorites pages already have their own location selectors and are unchanged. A card in several places matches any of them. Sorting by `place` uses the alphabetically first place name (assumption).
- Source: "[Search] Search refactor"

## D-048: Card-name catalog prefetch (stale at 04:00)

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-07
- Decision: Prefetch `https://api.scryfall.com/catalog/card-names` once with `usePreFetchUrl` (data purpose `cardNames`), reading it with `useFetchUrl`. Stale time = until the next 04:00 local time, computed from `query.state.dataUpdatedAt` by a small helper. `staleTimeInSeconds` in both hooks accepts `number | ((query) => number)`.
- Why: Avoids repeated Scryfall requests; the catalog has no fixed refresh cycle, so a fixed daily boundary is simplest. `createApiClient` cannot be used because it rejects a `data` array of strings. Measured size: 703,493 bytes (about 687 KB), small enough to keep the app's default persistence.
- Alternatives considered: Scryfall `/cards/autocomplete` (one request per search, more calls); a plain 24 h stale time (refreshes at arbitrary hours); excluding the catalog from persistence (not needed at this size).
- Consequences: No change to `shouldDehydrateQuery`: queries keyed `fetchedUrl` are already persisted, in the single `REACT_QUERY_OFFLINE_CACHE` localStorage entry. The default `maxAge` (24 h, not set in `PersistenceProvider.tsx`) and `gcTime` (24 h in `queryProvider.ts`) already fit; a restored catalog older than 04:00 is stale and refetched. Quota check after implementing: that same entry also holds symbols, sets and every `cards/search` page (full Scryfall cards), so run `localStorage.getItem("REACT_QUERY_OFFLINE_CACHE").length` in the console after several searches. If it exceeds about 2 million characters (a safety margin, since the limit is typically about 5 MB), exclude `cardNames` in `shouldDehydrateQuery` and note it in the CHANGELOG as a persisted-data change. Also run `typecheck` to confirm the installed `@tanstack/react-query` (^5.104) accepts a function `staleTime`; the 04:00 boundary assumes local time. Outcome (checked in code on 2026-11-21): the quota check exceeded the threshold, so `PersistenceProvider.tsx` excludes `cardNames` from `shouldDehydrateQuery`; the catalog is prefetched per session but no longer persisted, recorded under `Unreleased` in `CHANGELOG.md`.
- Source: "[Search] Search refactor"

## D-049: Name autocomplete (native datalist)

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-07
- Decision: One reusable `NameAutocomplete` (`src/features/search/`) built on a native `<datalist>`, fed with a name list and showing at most 20 matches once the input has 4 or more characters. Sources: Scryfall card names (D-048, Scryfall source), collection card names (D-046, collection source), set names (`scryfallSets`, already prefetched).
- Why: Simplest approach, no dependency; limiting the options keeps the browser fast with tens of thousands of names.
- Alternatives considered: A custom dropdown or library (more code or a new dependency).
- Consequences: Styling is limited by the browser. Matching is case-insensitive on the typed text; add a `<label>` for accessibility. The same component is used by simple search, advanced name and set fields.
- Source: "[Search] Search refactor"

## D-050: Advanced filter model and Scryfall query builder

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-07
- Decision: One typed `AdvancedSearchFilters` object with nuqs parsers (all `s_`-prefixed): `s_name`, `s_text`, `s_type`, `s_flavor`, `s_colors` + `s_colors_op`, `s_identity` + `s_identity_op` (operators `exactly` | `includes` | `atmost`), `s_mana` (symbol sequence), `s_formats` (format + `legal` | `restricted` | `banned`), `s_rarity` (multi), `s_price_min`/`s_price_max` (EUR). A `toScryfallQuery(filters)` function builds the `q` string, passed to the existing `useScryfallCardPages`.
- Why: One model feeds the form, the URL and the collection matcher (D-052); the prefix avoids collisions with `colors`, `rarity` and `type`.
- Alternatives considered: Building the string inside the form (not reusable); a free-text syntax box (less friendly).
- Consequences: Check each Scryfall operator in their syntax docs before coding. When a price is set, add `unique=prints` (prices are per printing). Submit on button press, not per keystroke, to limit requests.
- Source: "[Search] Search refactor"

## D-051: Advanced search form

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-07
- Decision: `AdvancedSearchForm` (`src/features/search/`), shown when `s_mode=advanced`, for both sources. Name and set fields reuse D-049. Text-on-card and mana cost use symbol dropdowns from the prefetched `cardSymbols` (symbol + meaning). Mana cost is a symbol builder that appends symbols (e.g. `{2}{U}{U}`) with a clear button. Colors and identity are multi-selects with an operator select.
- Why: Reuses cached data and existing components.
- Alternatives considered: A single-symbol mana select (cannot express a full cost).
- Consequences: Local filters (`CardFilters`, "Filter & sort") remain on the results below and refine only the loaded results.
- Source: "[Search] Search refactor"

## D-052: Advanced search over the collection

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-07
- Decision: With `source=collection`, `matchesAdvancedFilters(card, filters)` in `src/features/search/` applies the D-050 filters to the hydrated cards from D-046, mirroring each field of `toScryfallQuery`.
- Why: The hydrated cards are already full Scryfall objects, so no schema change or migration is needed.
- Alternatives considered: Querying Scryfall with a list of IDs (query length limits); copying card data into Supabase (migration, duplication).
- Consequences: Two implementations of the same semantics must be kept in sync (add tests for both). Extend `CardBrowserCard` and `isCardBrowserCard` in `card-browser/types.ts` with `color_identity` and `flavor_text`. Use face-level fallbacks for `colors`, `type_line`, `oracle_text` and `flavor_text` as `columns.ts` already does.
- Source: "[Search] Search refactor"

## D-053: Audit and streamline the project CSS

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-21
- Decision: Refactor in 7 small phases, one commit or PR each, on `feature/css-review`. Component CSS stays beside its component (existing rule); only proven duplicates move to shared files. Every phase must leave the app looking exactly the same. After every phase run `npm run build`, `npm run lint` (6 errors already exist and are the baseline), `npm run typecheck` and `node --experimental-strip-types --test "tests/**/*.test.ts"` (2 binder palette tests already fail and are the baseline). Phases 1 and 2 are also checked by a token-resolution comparison: resolve every `var()` for both themes and compare each selector's final declarations with the baseline. That check cannot see cascade-order or specificity changes, so phases 3 to 6 additionally need the developer to check, in a browser, the 4 pages (Search, Favorites, Binder, Decks) plus the card overlay in both themes at 390 px and 1280 px.
  - **0. Baseline (no code change):** recorded in "Why" below (taken on `feature/css-review` @ `266cc9d`, with `wc -l $(find src style.css -name "*.css")` and the raw and gzip size of `dist/assets/*.css` after `npm run build`). These numbers are the acceptance reference. Screenshots are taken by the developer and are not stored in the repository.
  - **1. Tokens (done 2026-11-17):** `src/theme.css` moved to `src/styles/tokens.css` (`main.tsx`, the navigation CSS and README comments, `AGENTS.md` and the docs updated). The shared `:root` block now also holds shape (`--radius-sm|md|lg|card`; the 9 literal `999px` use the existing `--control-radius`), motion (`--duration-fast` 0.2 s and `--duration-slow` 0.5 s, the two values that are used more than once; the 0.4 s and 0.8 s first proposed are used twice and only in the splash, and mapping the 0.5 s uses to 0.4 s would change timing), a z-index scale for the 7 global layers with the same numbers (`--z-filters` 90, `--z-notice` 95, `--z-nav` 100, `--z-nav-notice` 101, `--z-popover` 105, `--z-overlay` 110, `--z-dialog` 120; local 0 to 2 and the splash's 10 and 9999 stay literal), and colors that do not change with the theme (`--gold-fixed`, `--gold-deep`, `--highlight`, `--text-error`, `--bone-white`, `--mana-w|u|b|r|g` and 14 `--rarity-*` colors, 23 of them used once, which is the price of keeping every hex value in the token file). Removed as unused: `--bg-color`, `--bg-overlay` and `--text-header` (the swatch check mark first used `--text-header`, but it is `#e8edea` in the light theme and `#e2ebd5` in the dark one, so it now uses the fixed `--bone-white`). `--font-display` is kept (the navigation README says it is deliberately unused). Color literals outside the token file: 36 to 7, all in `style.css` (the splash CSS, which loads before the tokens). The colors that are constant across themes use `color-mix` of `--gold-fixed`, `--highlight` or `--sublayer-bg`, never `--btn-gold`, which changes in the light theme. `--focus-ring` moves to Phase 2, where the global focus rule uses it.
  - **2. Base (done 2026-11-21, from `7507b83`; browser-checked by the developer, confirmed 2026-11-21):** the developer chose Option A for both open choices. Implemented as planned below; the only additions are short comments in `base.css`, `splash.css`, `CardTile.css` (why the proxy rule repeats the ring) and `BinderPage.css` (why the hover block stays), and an `AGENTS.md` line that says not to add per-component focus rings or reduced-motion transition overrides. Start Phase 3 next.
    - **Files:** (1) create `src/styles/base.css` with exactly four rules: `body { font-size: 19px }`, the same at `@media (max-width: 480px)` with 16px, one global `:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }`, and one `@media (prefers-reduced-motion: reduce)` rule on `*, *::before, *::after` setting `animation-duration: 0.01ms`, `animation-iteration-count: 1` and `transition-duration: 0.01ms`, all `!important`. (2) Add `--focus-ring: 2px solid var(--text-accent);` to the shared `:root` block of `tokens.css`. (3) `git mv style.css src/styles/splash.css`, add a header comment, and change the link in `index.html` to `/src/styles/splash.css`; it keeps its reset, `#root`, the splash rules and its own literal values. `#root` stays there and not in `base.css` as first written, because its `.visible` toggle is part of the splash handshake. (4) Delete the `body` rules from `App.css`: the background duplicates the one in `splash.css`, and the font size moves to `base.css`. (5) In `main.tsx` import `./styles/tokens.css` and `./styles/base.css` before `AppProviders`; today the tokens are imported after the app, so the built bundle puts them last, and `base.css` must come early so component CSS wins ties. (6) Docs: `tokens.css` header comment ("Only style.css"), `AGENTS.md` lines 103 and 200, `docs/file-conventions.md` line 35 (global styles list), and add `base.css` and `splash.css` rows to `docs/architecture/code-reference.md` next to the `tokens.css` row.
    - **Focus ring (Option A):** 16 component rules repeat `outline: 2px solid var(--text-accent)`. Delete the 9 that equal the global ring (offset 2px): the `.binder-copy-form` group in `Binder.css`, the close and flip controls in `CardDetailsOverlay.css`, `.nav-theme-toggle`, `.nav-item`, the `.advanced-search` group, three rules in `SearchControls.css`, and `.search-source-toggle`. Slim the 5 with a 3px offset to `outline-offset: 3px` only: the auth form, `.binder-page__binder-cover`, the two pagination rules (`CardBrowserPage.css`, `FavoritesPage.css`) and `.browser-card__media, .browser-card__action`. Keep 2 drawing their own ring with `outline: var(--focus-ring)`: the swatch chip in `BinderFormDialog.css` (the ring belongs on the chip, not on the hidden radio; offset 4px) and `.browser-card--proxy .browser-card__media:focus-visible`, because a more specific non-focus rule gives that element `outline: 1.5px dashed`, which would otherwise beat the global ring. About 45 controls had no ring of their own and showed the browser default (the Decks page, the card filters, the Binder toolbar and the two popovers); they now show the app ring. This, the Phase 4a leak fix and the Phase 4b login messages are the only intentional visual changes in D-053.
    - **Reduced motion (Option A):** 5 files have a block today. Remove the blocks in `navbar-shared.css`, `SearchSourceToggle.css`, `CardFilters.css` and `CardTile.css`. In `BinderPage.css` remove only the `transition: none` part and keep `.binder-page .binder-page__binder-cover:hover { transform: none; }`, because the global rule shortens durations but does not cancel the hover lift. The mobile navbar and the floating filters had a deliberate fade in place of the slide; with the global rule they become instant. `!important` in `base.css` is the one allowed exception to Phase 7's "no `!important`" rule (the component rules are more specific); the existing one in `AuthPages.css` is a separate item for Phase 4.
    - **Verification:** Phase 1's comparison script was lost, and Phase 2 needs a different one because files are renamed and rules deleted or slimmed. Rebuild it to check, against a pristine clone of the starting commit, for both themes: all tokens unchanged and only `--focus-ring` added; `base.css` holds exactly the four rules above; every existing `:focus-visible` selector keeps the same effective outline and offset (global ring plus component overrides); a focus rule is not deleted when a more specific non-focus rule also sets `outline` for the same element; `body` ends with the same final declarations by default and at 480px, taking the bundle order (splash, base, `App.css`) into account; no `prefers-reduced-motion` block is left outside `base.css` except the cover hover one; `!important` appears only in `base.css` (3) and the existing `AuthPages.css` one; no color literals outside `tokens.css` and `splash.css`. Prove the script by sabotaging a copy at least ten ways (an offset, the cover rule deleted, the proxy outline, the body size, a literal color, a dropped `!important`, an extra reduced-motion block) and confirming each is caught. It cannot see rendering, so after the diff the developer should: Tab through the Decks page, the filters, the Binder toolbar and both popovers in both themes; turn on the operating system's reduce-motion setting and check the mobile navbar, the floating filters and the binder cover hover; check the body text at 390 px and 1280 px; and reload to see the splash.
    - **Result:** 21 CSS files and 3,150 lines (from 3,197; `base.css` added, `style.css` now `src/styles/splash.css`); one bundle of 52,186 bytes raw and 8,750 bytes gzip (from 53,739 and 8,793; the gzip numbers here and in Phase 1 are `gzip -9`, the default level gives 8,859 before). `npm run typecheck` clean, `npm run lint` 6 baseline errors, tests 64 of 66 (the 2 binder palette baseline failures). Verification script (rebuilt, not stored in the repository) compared the built bundles of `7507b83` and the change, both themes: tokens unchanged except the new `--focus-ring`; `base.css` exactly the four rules; 26 `:focus-visible` selectors with the same effective outline and offset; every outline-setting rule still beaten by a focus rule on focus; `body` the same by default and at 480px; the other rules identical; `base.css` before component CSS in the bundle; reduced motion only in `base.css` plus the cover hover; `!important` only in `base.css` (3) and `AuthPages.css` (1); no color literals outside `tokens.css` and `splash.css`. It caught all 15 sabotages tried (offsets, the cover and proxy rules deleted, both body sizes, a literal color, a dropped and an added `!important`, an extra reduced-motion block, the global offset, the ring token, another token, the cover hover cancel, `base.css` imported after the app).
    - **Tips from the first attempt:** use `bash`, not `sh`, for `${PIPESTATUS[0]}` and process substitution; delete rule blocks with exact-text replacement and an expected count so a mismatch stops the script; do not commit the `package-lock.json` change that `npm install` makes in a sandbox.
  - **3. Shared layout (done 2026-11-21, from `662df4f`; accepted after the developer's browser check of the 4 pages in both themes at 390 px and 1280 px):** `src/styles/layout.css`, imported by `main.tsx` after `base.css`, with `.page` (shell and the 860px padding), `.page__heading` and `.page__title` (Binder and Decks; the Search page has no `h1` and the Favorites one is commented out, so their own heading rules stay), `.page__toolbar` (Binder and Decks), `.page__message` and `--error` (all 4; Search and Favorites keep a local 75rem width and 2rem bottom margin), `.page__notice` (all 4, with the 540px rule), `.card-grid` (the 4 card lists, card width and the 540px `min()` rule; Search and Favorites keep their 860px `gap: 1rem`) and `.pagination` (Search, Favorites). The page components carry the new classes; the old page classes stay only where local rules still use them (`__list`, `__toolbar`, `__notice`, `__message` on Search and Favorites). **Changed from the plan:** (1) not declared with `@layer layout`, the developer chose this: any unlayered rule beats every layered one, so `CardTile.css`'s `.browser-card { width: 250px }` would beat the shared card width; the unlayered file loads before component CSS, so components still win by specificity or order. (2) Not moved: the Binder and Decks action and notice buttons, because they win today only by coming after the page-wide `.binder-page button` / `.deck-page button` rules in the same file (same specificity); the notice buttons keep a local rule and the action buttons wait for Phase 4. (3) The two cover grids stay local (their nested `.browser-card` would meet the card-width rule; Phase 4). (4) `.count-badge` dropped: there is only one. Result: 22 CSS files and 2,933 lines (from 3,150); bundle 47,871 bytes raw and 8,610 bytes `gzip -9` (from 52,186 and 8,750); typecheck clean, lint 6 baseline errors, tests 64 of 66. Checked by a cascade model (script not stored in the repository): 115 elements of the 4 pages, each described by its old and its new class path inside the app shell, with hover, focus and disabled states, in both themes at 390, 520, 700, 1000 and 1280 px; every final declared value (margin, padding and flex shorthands expanded, browser default margins for `div`, `section`, `header`, `article`, `p`, `h1`) compared with `662df4f`: 2,450 comparisons, zero differences. It caught all 15 sabotages tried, including `@layer`, the import order, each local override removed and single values changed. Lesson for later phases: the built CSS writes `(max-width: 860px)` as `(width<=860px)`; a first version of the script did not read that form and applied every media rule at every width, so the script now stops on any media query it does not understand. The same blind spot affected Phase 2's 480px `body` comparison; rechecked by hand, the final `body` font size is 16px at 480px and below in both commits.
  - **4. Selector hygiene (split into 4a, 4b and 4c on 2026-11-21, one commit each, the developer's choice):** one block per component file named `block__element--modifier`; replace descendant element selectors with classes. Re-measured at `1c4d745` with a CSS-parser count of selectors whose last part is an element: 101 in 15 files (the 123 below is an older count by a different script). Allowed exceptions, the developer's choice: element selectors on markup that other components render (`.scryfall-card__oracle-text p` from the card renderer, `svg` inside the icon components) and `splash.css` (markup in `index.html`).
    - **4a. Pages (done 2026-11-21, from `1c4d745`; browser-checked by the developer, confirmed 2026-11-21):** the Binder and Decks page-wide `button, select, input` rules (and `button`, `button[aria-pressed]`, Decks `button:disabled`) are replaced by `.page__control`, `.page__button` (with `[aria-pressed="true"]`) and `.page__label` in `layout.css`, put on the pages' own controls; Decks keeps `.deck-page .page__button:disabled`. Also new in `layout.css`: `.page__card-actions` and `.page__card-action` (the Modify/Rename/Delete row), `.page__cover-card` (binder and deck cover width, with the 540px rule), `.card-grid` now also on the two cover grids, `.page__notice-action` and `.pagination__button` instead of `.page__notice button, a` and `.pagination button`. Local classes replace the rest: `binder-page__binder-name|count`, `binder-page__select-input`, `deck-page__deck-name`, `card-browser__intro`. Deleted as no longer needed: the `.binder-page|.deck-page .browser-card__media|__action` overrides (they repeated `CardTile.css` and only undid the page-wide rule) and the `.binder-page` / `.deck-page` prefixes on the cover rules. **Intentional visual change (the developer's choice, "fix the leaks"):** the page-wide rules also styled every component rendered inside those two pages, so there the card overlay's close button was a pill instead of a circle, its flip button was not gold, pressed filter chips had aquamarine text on gold, the filters' controls were larger, and the dialogs' close button and form fields were pills. Those components now look as they do on the Search page. The same applies to the Binder and Decks notice Dismiss button (now the same text button as on Search and Favorites) and the Binder select-copies checkbox (no longer gets padding, border and background, which a native checkbox mostly ignores). Result: 2,796 CSS lines (from 2,933), bundle 45,117 bytes raw and 8,356 bytes `gzip -9` (from 47,871 and 8,610), 70 element selectors (from 101); typecheck clean, lint 6 baseline errors, tests 64 of 66. Checked with the Phase 3 cascade model in two runs: (1) 57 controls of the filters, overlay and dialogs inside both pages compared with a build of `1c4d745` with only the page-wide rules deleted, so they must equal their own design: 1,920 comparisons, zero differences; (2) 80 page elements, old classes against new, 2,230 comparisons, where the only differences are on an allow-list: the leak fixes above, `min-height: 0` against unset on block-level buttons, color and font on buttons that hold only an image or icon, the binder cover background (overridden by its inline color), `:disabled` on the tile image button and the deck cover (never disabled), and the deck cover grid's explicit 80rem width inside an 80rem container. A third check fails when a `button`, `select`, `input`, `textarea`, `label`, `h1`, `h2` or `p` in the four page components has no `className`, or the notice link lacks `page__notice-action`. Together they caught all 15 sabotages tried. Two more script lessons: Node cut off long piped output at `process.exit()` (use `process.exitCode`); and the model takes the new classes from hand-written paths, so it needs the `className` check to see a class missing from the JSX. Left for 4b: the Search and Favorites heading `h1` rules (the Search one meets `SearchControls`' own `h1`).
    - **4b. Forms (done 2026-11-21, from `b6886a6`, in one commit, the developer's choice; browser-checked by the developer, confirmed 2026-11-21):** it grew to 23 files because both card popovers (`BinderCopiesPopover`, `DeckCardPopover`) reuse the Binder form classes. New `src/styles/forms.css`, imported by `main.tsx` after `base.css`: `.field` (grid, 0.35rem gap), `.field__input` (the identical name-search and advanced-search look) and the Binder variants `.field--soft` and `.field__input--soft` (2.4rem, 0.65rem corners, translucent). Search: `.search-controls__title`, `__mode-button`, `__submit`; `NameAutocomplete` and every advanced-search text, number and select field use `.field__input`; `.advanced-search__legend`, `__option`, `__grow`, `__chip`, `__chip-remove`. The Search page's `.card-browser__heading h1` rule is deleted (it repeated `.search-controls` `h1` value for value); the commented-out Favorites `h1` carries `page__title favorites-page__title` in the comment. Login: `.app-v2__page h1` and `p` in `App.css` became `.app-v2__page-title` and `.app-v2__page-text`, which removed the `!important` in `AuthPages.css` (`App.css` loads before `AuthPages.css`, so `.auth-page__intro` now wins the tie); the login input is `.field__input auth-form__input`, the label `.auth-form__label`. Binder: `Binder.css` rewritten with feature classes used by the copy form, both dialogs and both popovers: `.binder-fields` (the field grid, replacing `.binder-copy-form` as the shared form class; `BinderFormDialog` no longer uses `.binder-copy-form`), `.binder-button` and `--primary` (replacing the `button[type="submit"]` and `button:first-child` rules), `.binder-actions`, `.binder-dialog__title`, `.binder-dialog__close`, `.binder-copy-popover__close|title|meta|text`, `.binder-copy-form__price-unit|date|notes`, `.binder-form__legend|radio`; the swatch labels now carry the grid and caption values they used to get from `.binder-copy-form label`. **Rule for page-wide leaks found here:** `.app-v2__page p` also beat the login messages' own classes. Where a component's own CSS set a value that the page-wide rule overrode, the component wins: `.auth-message` gets its own 0.5rem bottom margin (was 0) and `.auth-message--error` its red `--text-error` (was the secondary text color). Where the component set nothing, today's value moved into its own rule (`.auth-mode-switch` gets `margin-bottom: 0`). Those two message changes are the only intended visual difference of 4b. Result: 23 CSS files and 2,783 lines (from 2,796), bundle 43,825 bytes raw and 8,212 bytes `gzip -9` (from 45,117 and 8,356), 22 element selectors (from 70), `!important` only in `base.css`; typecheck clean, lint 6 baseline errors, tests 64 of 66. Checked with the cascade model against `b6886a6`: 304 elements (search, advanced search, login, both dialogs on three pages, the copy form in a dialog and in a popover, both popovers in a card tile and in the overlay portal, the deck-entry forms), 6,960 comparisons; the only differences are the two login message changes, the invisible 1px radio of the color picker (it no longer gets the field look) and the popover close button's `:disabled` state (never disabled). The four sibling-combinator rules of the color picker were compared separately after mapping `.binder-form__swatch input` to `.binder-form__radio`: identical. A class check fails when a `button`, `select`, `input`, `textarea`, `label`, `h1`, `h2`, `p`, `legend` or `li` in the 11 changed components has no `className` (except the name-autocomplete caption and the advanced-search checkboxes, which no rule styles), when a popover title loses its class, or when the first button of a `.binder-actions` row is not the only `binder-button--primary` in it. Together they caught all 17 sabotages tried.
    - **4c. Rest (done 2026-11-21, from `5ccf871`; browser-checked by the developer, confirmed 2026-11-21):** card filters: one `.card-filters__control` on every button, select and input (with `[aria-pressed="true"]`, `:disabled` and the floating 860px rule). Card overlay: `.card-detail-overlay__title`, `.card-detail__flip-button`, `.card-detail__section-title`, `.card-detail__ruling`, `.card-detail__print-name`, `.card-detail__print-meta`; the `.card-detail-overlay__prints > h2` part of a selector group is deleted because the prints section renders no `h2`. `CardTile`: `.browser-card__image`. No leaks this time and no visual change. Result: 2,778 CSS lines (from 2,783), bundle 43,690 bytes raw and 8,176 bytes `gzip -9` (from 43,825 and 8,212); typecheck clean, lint 6 baseline errors, tests 64 of 66. Cascade model: 188 elements (filters static, floating and hidden, the overlay and the tile image, on all four pages), 4,360 comparisons, zero differences; class check on the three components; all 12 sabotages caught. **Phase 4 end state:** 6 element selectors left, all allowed exceptions: `.card-detail-overlay__close svg` and `.browser-card__action svg` (icon components), `.card-detail__mana-cost > div` and `.card-detail__renderer .scryfall-card__oracle-text p` (card renderer output), and two `.splash-logo img` in `splash.css`; `!important` only in `base.css`.
    - Original text: one block per component file named `block__element--modifier`. Replace the descendant element selectors (123 by the parser count below, e.g. `.deck-page button`) with class selectors, starting with the 4 pages, `Binder.css` (27) and `AdvancedSearchForm.css` (12). Give the form fields one shared set of classes, so `BinderFormDialog` no longer reuses `.binder-copy-form` and the input rules stop being repeated in `SearchControls.css` and `AdvancedSearchForm.css`. Remove the single `!important` in `AuthPages.css`. Element selectors only in `base.css`.
  - **5. Breakpoints (done 2026-11-21 on `feature/css-review-phases-5-7`, the developer's choices):** all five breakpoints are kept and documented in the `tokens.css` header: 480px (body text), 540px (phones), 760px (overlay one column), 860/861px (mobile and desktop) and 1040px (desktop navbar without labels between 861 and 1040px; it cannot fold into 860, which is the mobile bar). Folding 480 into 540 or 760 into 860 would change the layout at 481 to 540px and 761 to 860px, so it waits for a browser check. Viewport units are not changed: re-measured, only a few `100vw`/`100vh` remain (page `min-height`, card widths at 540px, the notice, two popovers, the splash), most `vw` uses are deliberate fluid sizes inside `clamp()`, and a blind `100vw` to `100%` swap would be wrong for the popovers (absolutely positioned inside a card tile, so `100%` is the tile's width). No visual change; Phase 5 is a comment only. Original text: keep two, `540px` and `860px` (CSS variables cannot be used in media queries, so document them as a comment in `tokens.css`); fold the one-off `480px`, `760px` and `1040px` rules into them after a visual check. Replace remaining `100vw` (25 uses, page widths) with `100%` and `100vh` (9 uses) with `100dvh`, except fixed overlays, which use `inset: 0`.
  - **6. Speed (done 2026-11-21 on `feature/css-review-phases-5-7`, the developer's choices; the splash was checked on reload, confirmed 2026-11-21):** (a) `content-visibility: auto` on `.browser-card` is **not** applied: it implies paint containment, which would clip the Binder and deck popovers that a tile positions outside itself (`right: 100%`); applying it only to the tile image button was offered and declined, since the images already use `loading="lazy"`. (b) Done: the splash `pulse` no longer animates `filter: drop-shadow`. The logo keeps the resting glow as a static `drop-shadow(0 0 10px …0.2)` and only scales; the bright glow is a new `.splash-background::before` layer (a 50vmin rounded square with `box-shadow: 0 0 25px …0.6`, `z-index: -1` behind the logo) whose `opacity` and `transform` pulse on the same 3 s timing (`@keyframes pulse-glow`). At the peak the two glows add up instead of one replacing the other, so it is close to, not identical with, the old look. The layer has no transition on purpose: `App.tsx` waits for the background's `opacity` `transitionend`, which a pseudo-element transition would also fire. `.splash-logo.ready` now also sets `filter: none`, as the old animation did when it stopped. (c) Not measurable here: the developer should record the 6 `backdrop-filter` blurs (navbar, filters, overlay, dialog backdrop, popover, `App.css`) in DevTools Performance at a phone-sized viewport and drop the weakest if it costs frames. (d) All 9 `-webkit-` declarations stay: Vite 8's default build target (Baseline widely available) includes Safari 16.4, which needs `-webkit-backdrop-filter` (unprefixed only from Safari 18); `-webkit-line-clamp` with `display: -webkit-box` is still the only widely supported line clamp; the two `::-webkit-*-spin-button` rules and their `-webkit-appearance` hide the number spinners in WebKit and Blink. Original text: no CSS file is large; gains come from rendering cost. (a) Add `content-visibility: auto` with `contain-intrinsic-size` to `.browser-card` (up to 175 cards per page); test scrolling, keyboard focus and the overlay. (b) Replace the splash `pulse` animation, which animates `filter: drop-shadow`, with `transform`/`opacity` only. (c) Keep the 6 `backdrop-filter` blurs (navbar, filters, three overlays, `App.css`), but verify their cost in DevTools Performance on a phone-sized viewport and drop the weakest one if it costs frames. (d) Review the 9 `-webkit-` declarations against the supported browsers.
  - **7. Guardrails and docs (done 2026-11-21 on `feature/css-review-phases-5-7`):** `docs/file-conventions.md` now holds the CSS rules (BEM naming, class selectors only, tokens for colors, z-index, radii and the shared durations, no `!important` outside `base.css`, no per-component focus rings or reduced-motion overrides, the breakpoint list, `npm run lint:css`); `AGENTS.md` lists the new command; `docs/theme/theme.md` says the palette page is historical and `tokens.css` is the source of truth; the navigation README and a `navbar-desktop.css` comment no longer suggest `rgba()` fallbacks or a `main { … }` element rule. `stylelint` 18.1 is a new dev dependency (the developer approved it), configured in `stylelint.config.mjs` with `color-no-hex`, `color-named: never` and a `function-disallowed-list` of the color functions (all off for `tokens.css` and `splash.css`), `declaration-no-important` (off for `base.css`) and `selector-max-type: 0` (off for `base.css` and `splash.css`); the four agreed exceptions carry a `stylelint-disable-next-line` comment with the reason. `npm run lint:css` passes, and it caught all 6 sabotages tried (a hex, an `rgba()` and a named color, an `!important`, an element selector and a page-wide `button` rule). `npm audit` reports the same 7 moderate findings (`minimatch`) with and without stylelint. Original text: update the CSS lines in `docs/file-conventions.md`, `docs/theme/theme.md`, `src/features/navigation/README.md` and `AGENTS.md` (paths, shared files, naming, token rule: no hard-coded colors, durations, z-index or radii; new CSS written after Phase 1 follows these rules). Optionally add `stylelint` as a dev dependency (needs approval) with rules: no hex/rgb colors outside `tokens.css`, no `!important`, no element selectors outside `base.css`, and a `lint:css` script.
- Why: First written on 2026-11-07 from an audit of `dev` @ `9a5d883`, before D-044 to D-057; refreshed on 2026-11-17 on `feature/css-review` @ `266cc9d`, after that work added 3 files and 295 lines and repeated some of the patterns this decision removes. Baseline (Phase 0): 20 CSS files and 3,142 lines; one built bundle, `dist/assets/index-D11-30hf.css`, of 51,742 bytes raw and 8,536 bytes gzip; 420 rules and 215 class names; 36 color literals outside the tokens file (listed in phase 1); 19 tokens, 4 of them unused (`--bg-color`, `--bg-overlay`, `--text-header`, and `--font-display`, which is deliberately kept); 12 z-index values (0, 1, 2, 10, 90, 95, 100, 101, 105, 110, 120, 9999); 10 transition and animation durations; 6 breakpoint values for 5 breakpoints (861/860, 540, 760, 480, 1040); 1 `!important`; `100vh` 9, `100vw` 25 and `100dvh` 5 uses; 6 `backdrop-filter` and 9 `-webkit-` declarations; 16 copies of the focus ring; 5 files that handle `prefers-reduced-motion`; `body` styled in both `style.css` and `App.css`; 123 descendant element selectors; 23 rule bodies of 3 or more declarations repeated across files (the page shell, notice, card list and card-width rules in the 4 pages, the Binder and Decks heading, toolbar and message rules, the page `h1` rule in three files); lint 6 errors, typecheck clean, 66 tests of which 64 pass. The 2 failures are binder palette tests unrelated to CSS: the palette now has 12 colors, and its "Gray" `#8da399` has about 1:1 contrast with the logo gold; they are the baseline until the palette is settled separately. The counts of rules, class names, selectors and duplicates come from a CSS-parser script, so they are comparable only with a later run of the same script; line counts and gzip size can be reproduced with the commands in Phase 0. Grep reports class names not found in source, but they are built dynamically (`browser-card--${kind}`, rarity, legality, color and deck kind pills), so none is safely deletable by grep alone.
- Alternatives considered: Rewrite with Tailwind or CSS-in-JS (new dependency, rewrites every component, loses the existing token system); one big global stylesheet (against `file-conventions.md`); merge all component CSS into layers (large change, little gain); only delete duplicates without tokens (leaves the literals and drift); a new decision for the refreshed plan instead of updating this one (two overlapping entries for one refactor).
- Consequences: Class names and CSS are not part of the public contract (AGENTS.md), so no `### Breaking` entry; no user-visible change is allowed except the three recorded ones, the Phase 2 focus ring, the Phase 4a leak fix and the Phase 4b login messages (acceptance = no other visual difference). Success = fewer CSS lines than 3,142 and a smaller gzip size than 8,536 bytes, not a promised percentage. Do not delete a class unless it is absent from source after expanding template strings; check unused rules with Chrome DevTools Coverage on each page. No CSS file split without a matching component split. Claude has no browser in this environment, so the token-resolution comparison covers phases 1 and 2 only; every later phase relies on the developer's visual check, and a phase is not accepted until that check is done. Phases 1, 3 and 4 touch about 10 to 15 files each and need a short plan before starting; phases 2 and 7 are small. Moving `theme.css` and `style.css` changes paths in `main.tsx`, `index.html` and the docs only. The Phase 0 numbers move whenever CSS is added, so later phases re-measure from the commit they start on. After Phase 1: 20 files and 3,197 lines (+55); one bundle of 53,739 bytes raw and 8,793 bytes gzip (+1,997 and +257, about 3 percent: the tokens are new declarations and `var(--name)` is not shorter than the value it replaces); 53 tokens, only `--font-display` unused; 7 color literals outside the token file; all global z-index layers, shared radii and the two shared durations tokenized. Phase 1 was checked by resolving every `var()` and `color-mix()` for both themes and comparing each rule's final declarations with the Phase 0 commit: 417 rules and 1,619 declarations per theme, zero differences (the comparison found one mistake, the check-mark color above, and also fails when a hex digit, a z-index, a duration or a radius is changed on purpose). Phase 1 grows the CSS, so the size target of this decision now depends on phases 2 to 4; the 23 single-use tokens are the first place to look if it is not met. **End state after Phase 7 (2026-11-21):** 23 CSS files and 2,830 lines (Phase 0: 20 and 3,142), one bundle of 44,055 bytes raw and 8,237 bytes `gzip -9` (Phase 0: 51,742 and 8,536; Phase 1 peak 53,739 and 8,793 `gzip -9`; the line count rose from 2,778 after Phase 4c through comments only, which the build strips), so both success criteria are met; 6 element selectors, all documented exceptions (from 101); `!important` only in `base.css`; one focus ring and one reduced-motion rule; `npm run lint:css` guards the rules. Three recorded visual changes (Phase 2 focus ring, Phase 4a leak fix, Phase 4b login messages) and the near-identical splash glow (Phase 6). The developer confirmed on 2026-11-21 that the browser checks of Phases 4a, 4b, 4c and 6 and the `backdrop-filter` measurement (6c) are done; nothing in D-053 remains open.
- Source: "[CSS] Audit and streamline"

## D-054: Set filter and form details for advanced search

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-08
- Decision: Add `s_set` (a set code) to `AdvancedSearchFilters`, with a nuqs parser and a `set:<code>` term in `toScryfallQuery`. `AdvancedSearchForm` (D-051) shows set names through `NameAutocomplete` and converts the chosen name (or a typed code) to its code on submit; an unknown set shows an inline error and does not submit. The form keeps a local draft and writes the `s_` parameters through `useQueryStates` only when Search is pressed; Reset clears them all. Colors, identity and rarity are checkbox groups; formats are a format + status pair added as removable chips. The mana select lists only symbols with `appears_in_mana_costs` that pass `isValidManaSequence` (now exported); the text select lists every non-funny symbol. A new `useCardSymbols` hook reads the existing `cardSymbols` query.
- Why: D-051 reuses the set autocomplete, but the D-050 model had no set field, and Scryfall's `set:` operator takes a code, not a name. Checkboxes avoid Ctrl-click on `<select multiple>`, which is awkward on mobile. Draft state keeps one request per search, as D-050 requires.
- Alternatives considered: Storing the set name in the URL (not a valid Scryfall value and breaks if a name changes); `<select multiple>` for colors and rarity (poor on touch); per-keystroke URL updates (many requests); changing `useOracleText` to share the new hook (unrelated change, left for later).
- Consequences: `s_set` is a new URL parameter (additive, not breaking). D-052 must mirror `s_set` in `matchesAdvancedFilters` against `card.set`, and tests must cover both implementations. Until D-052 ships, `source=collection` ignores the advanced filters and `SearchControls` says so; remove that notice with D-052. Hybrid Phyrexian costs such as `{G/W/P}` are not offered in the mana select because `isValidManaSequence` rejects them. The form copies the URL only on mount, so browser back/forward does not refresh an already-open form (known limitation). `useOracleText.tsx` still has its own copy of the symbol type guard. Not browser-tested: server render and query-builder checks only.
- Source: "[Search] Search refactor"

## D-055: Collection matcher semantics and tests

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-08
- Decision: `matchesAdvancedFilters(card, filters)` (D-052) mirrors `toScryfallQuery` field by field and shares its validators (`isValidSetCode`, `isValidManaSequence`, `isValidPrice`), so invalid input is ignored by both. Rules: name, type, flavor and oracle text are case-insensitive substrings; text and mana cost are checked on the card and on every face, and `~` in the oracle text is replaced by the card or face name; `set` compares `card.set` to the code; colors and identity use set equality, superset and subset (colors fall back to the front face, colorless passes "at most"); mana cost passes when the cost contains every chosen symbol at least as many times; `legal` accepts `legal` and `restricted`, `restricted` and `banned` are exact, and every chosen format must match; rarity is any of the chosen values; a card without a EUR price never passes a price bound. With no filters, every collection card is kept, like simple collection search with an empty name. `q` is ignored in advanced mode. Tests are a dependency-free `node:test` table in `tests/search/matchesAdvancedFilters.test.ts` that checks the query string and the kept cards for the same filters.
- Why: Hydrated collection cards are full Scryfall objects, so a pure function avoids a migration and Scryfall's query length limits. Face-level text matching copies Scryfall, which matches any face; D-052 only said "fallback", which would miss back-face text. One shared table is the cheapest way to keep two implementations in sync without a framework. Two rules were verified on scryfall.com on 2026-11-08: `m:R` returns Char ({2}{R}), so `m:` means "contains at least"; `f:vintage` returns Black Lotus (restricted), so `f:` accepts restricted cards.
- Alternatives considered: Matching only the front face (misses back-face text); exact mana cost matching (contradicted by the check above); adding Vitest (a new dependency, not needed yet); a `test` npm script (edits `package.json`, deferred).
- Consequences: Known approximations, not checked against Scryfall: `~` uses the full card or face name, so cards whose text uses a shorter name (for example "Niv-Mizzet" for "Niv-Mizzet, Parun") will not match; generic mana symbols are compared as separate symbols, so `{3}{U}` does not contain `{2}{U}` (whether Scryfall treats generic mana as a number was not checked); Scryfall's accent and punctuation normalization is not reproduced. Two implementations must still change together: edit the test table first. `tests/` is outside `tsconfig.json` and is not covered by `npm run typecheck`; it needs Node 22 with `--experimental-strip-types`. The temporary D-051 notice that advanced filters did not apply to the collection is removed. `CardBrowserCard` gains optional `color_identity` and `flavor_text`; a card with an invalid value in either field now counts as invalid card data.
- Source: "[Search] Search refactor"

## D-056: Colored binder covers

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-15
- Decision: A binder cover on the Binder page no longer shows a card print. It keeps the card shape (488:680, rounded corners), is filled with the binder's color and shows the vector app logo (`/logo.svg` in an `<img>` with `alt=""`) centered; deck covers do not change. The color is stored in a new `binders.color` column as lowercase `#rrggbb` (`text not null default '#1f2a6b'`, check `^#[0-9a-f]{6}$`, plus `grant update (color)`) and is chosen in one dialog: the page keeps only a "Create binder" button, which opens a dialog asking for a name and a color, and "Rename" becomes "Modify", which opens the same dialog to change both. The picker offers 10 colors, Navy `#1f2a6b` (default, first), Forest `#1f4526`, Olive `#3f3d14`, Violet `#4a3766`, Magenta `#6b1f5e`, Wine `#5a1a2e`, Oxblood `#7a2a2a`, Rust `#6e3312`, Umber `#523823` and Espresso `#2e1f1a`, and the "Loose" tile uses the same cover with a fixed Graphite `#33302d` that is not editable and not in the palette.
- Why: A color is quicker to scan than a card print that changes when the best card changes, and it gives the person a way to tell binders apart. Each palette color had to pass three checks against the logo: at least 3:1 contrast with the darkest logo gold (`#cb9131`), at least 3:1 with the darker sparkle teal (`#09a19f`), and a CIEDE2000 distance of at least 20 from both lens teals (`#067c85`, `#04505c`), so the lens does not vanish. The first two checks force dark colors, which also suits the dark teal theme. Storing hex lets a custom picker be added later without another migration. The grant is needed because updates on `binders` are granted per column: on a scratch PostgreSQL, removing it made a color update fail with "permission denied".
- Alternatives considered: A palette key such as `navy` instead of hex (a later palette change would recolor existing binders and custom colors would be impossible); browser storage for the color (does not sync between devices); keeping the card print (rejected); an inline SVG logo (the file carries a `:root` style block and fixed gradient ids that would leak into the page and clash across many covers); a single-color logo (needs a new asset); lighter colors (fail the gold contrast); teal, slate, charcoal and midnight-blue swatches that I first proposed (their distance from the lens teal is 4 to 18, so the lens disappears).
- Consequences: The migration `20261115163138_binder_color` and its rollback `supabase/rollback/20261115163138_binder_color_reverse.sql` must be applied to the linked project (dry run first) before an app version that reads or writes the color is deployed (applied, confirmed by the developer on 2026-11-21). The column default keeps older app builds working, because inserts without a color still succeed, and it fills existing binders with Navy. Rolling back drops every chosen color. The `Binder` type gains `color: string`, hand-edited in `src/types/database.ts` and to be confirmed by regenerating it. The app must accept any valid `#rrggbb` value from the database: if a binder's color is not in the palette, the dialog shows it as an extra "Current" swatch. `coverCard`, its rarity ranking and the binder use of `CardTile` are removed from `BinderPage.tsx`. The unique binder name index still applies, so a duplicate name in the dialog shows the database error. The lens teal blends into every cover by design; the gold ring and sparkle stay readable. In the dark theme covers sit close to the page background (contrast 1.1 to 1.6), so the edge comes from the existing gold hairline border and glow; in the light theme the contrast is 8 to 13. If the logo colors change, the palette must be re-checked. pgTAP assertions were added to `supabase/tests/binder_rls_test.sql` but not run, because that needs Docker; the same scenarios (default and backfill, constraint, own and other-user updates, grants, rollback and re-apply) were run against a scratch PostgreSQL with the repository's binder migrations. This entry covers the database change; the picker, cover, dialog and page changes are the next step.
- Source: "[Binder] Colored binder covers"
- Amendment (2026-11-21): the picker offers 12 colors. Gray `#8da399` and Black `#11161a`, added in `61b8585`, are kept by the developer's choice. Black passes every check above; Gray fails the gold and sparkle contrast (about 1:1), so `tests/binder/binderColors.test.ts` lists it in `CONTRAST_EXCEPTIONS` and reports that one test as skipped with the reason, while its lens and swatch-distance checks still run. The palette-size test now expects 12.

## D-057: Binder cover and dialog implementation

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-15
- Decision: D-056 is implemented with `binderColors.ts` (palette, default, fixed Loose color and a hex guard), `BinderCover.tsx` (a card-shaped color button with `<img src={BASE_URL + "logo.svg"} alt="">` at 76% of the cover width), and `BinderFormDialog.tsx` (one dialog for create and modify: a name field and a radio-group of named swatches). `useBinders` now has `createBinder({ name, color })` and `updateBinder({ id, name, color })`, which replaces `renameBinder`. The Binder page keeps one "Create binder" button, "Rename" becomes "Modify", `window.prompt` and the inline name field are gone, and `coverCard` with its rarity ranking is removed.
- Why: The dialog holds a local draft and only `onSave` talks to the database, so a failed save keeps the dialog open with the message inline. Real radio inputs, visually hidden behind card-shaped chips with a check mark, give keyboard arrows and screen-reader names without relying on color alone. A color that is not in today's palette is kept as an extra "Current" swatch, so Modify never silently changes it. At 76% the drawing, which fills two thirds of `logo.svg`, is about half the cover width.
- Alternatives considered: A native `<select>` for the color (cannot show colors); `window.prompt` for modify (cannot hold a color); new standalone dialog CSS (the field, label and button styles already exist in `.binder-copy-form`, so the dialog reuses them and adds only the swatches); a live cover preview inside the dialog (deferred); a focus trap (not added, to match `AddBinderCopyDialog`, which has none).
- Consequences: This corrects one consequence of D-056. A render of the real logo on all ten colors and on Loose (checked by eye) shows the lens as a clearly visible teal gem on every cover; only its dark outer edge is close to the cover colors. The rule of a CIEDE2000 distance of at least 20 from both lens colors is therefore stricter than needed, and it stays as a conservative guard. A duplicate binder name (PostgreSQL error 23505) shows "You already have a binder with this name." Save is disabled until the name or color changes. `tests/binder/binderColors.test.ts` has 28 cases, reads the logo colors from `public/logo.svg` and the default color from the `*_binder_color.sql` migration, and was checked by breaking the palette and the default on purpose. The dialog and page were typechecked, built and linted but not clicked through in a browser; only the covers were rendered, outside the app. `AGENTS.md` also loses its stale "Advanced search remains a placeholder" statement, which has been false since D-051. Later change (found on 2026-11-21, not covered by a decision): commit `61b8585` ("D-056 implementation", 2026-11-17) added Gray `#8da399` and Black `#11161a`, so the palette in `binderColors.ts` has 12 colors, not the 10 of D-056. Gray has about 1:1 contrast with the logo gold, so two `binderColors.test.ts` cases fail ("the palette has ten valid, unique, named colors" and "Gray #8da399: contrast…"). Resolved the same day by the D-056 amendment: both colors are kept.
- Source: "[Binder] Colored binder covers"

## D-058: Finish the TypeScript migration

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-21
- Decision: The last JavaScript in the app, the 17 files of `src/features/scryfall-card-renderer/` and `vite.config.js`, is converted to TypeScript, and `tsconfig.json` sets `allowJs: false` (with `checkJs` removed) and includes `vite.config.ts`. The renderer owns its types in `types.ts`: `RawScryfallCard`/`RawScryfallFace` list only the fields `normalizeCard` reads, and `NormalizedCard`/`NormalizedFace` describe the shape every component consumes. `scryfallCardLayouts.ts` builds each `LayoutConfig` (description plus `shape` and `faceRotations`) as a new object instead of mutating the description tables, and `CARD_SHAPES` is `as const` with a derived `CardShape` union, so `CardRenderer`'s `Record<CardShape, ...>` requires a component per shape. Bugs found during the conversion are fixed in separate commits: mana costs now pass `container="span"` to `OracleText` (the old `Component` prop was never read, so each cost rendered in a `<p>`); `SplitFacesCard` gets its missing list `key`, drops a `<p>` wrapped around the OracleText block and no longer reads the nonexistent `card.rotation`; the battle check in `normalizeCard` no longer throws on a transform card without faces; and the renderer's four debug `console.log` calls are removed. `MeldCard` replaces the never-passed `fetchCardByUri` prop with `useScryfallCardsSearch("cards/<id>")`: a meld piece shows "Melds into <name>" from `all_parts` right away and the result's image once loaded, and the meld result itself lists its pieces ("Melded from A and B"). `eslint.config.js` stays JavaScript.
- Why: With `checkJs: false`, the renderer, the code that draws every card in the details overlay, was not type-checked at all, and the conversion immediately surfaced the bugs above. `allowJs: false` keeps the guarantee: importing a `.js` file from `src/` now fails `npm run typecheck` with TS7016 (checked with a throwaway file). Renderer-owned raw types keep the pipeline separation (raw data in, normalized shape out) without a dependency on `card-browser` types; TypeScript compares object types by structure, so `CardBrowserCard` is accepted unchanged. Building configs instead of mutating them gives each object a complete type from the start. The meld fetch was wired rather than deleted because the meld result's image was wanted, not just its name, which `all_parts` already provides; it uses the same query key format as the overlay's `cards/<id>` request, so the cache is shared. A real Scryfall response for Bruna, the Fading Light confirmed the `meld_result`/`meld_part` components and their `id` fields.
- Alternatives considered: A pure type-only conversion that kept the bugs (rejected: chosen to fix everything found); deleting the meld fetch and showing only the name (no request, but no image); calling `createApiClient` from `MeldCard` to avoid importing a `card-browser` hook (duplicates the query hook; the single import was accepted); reusing `CardBrowserCard` as the renderer input type (couples the renderer to `card-browser`); `eslint.config.ts` (needs the `jiti` dev dependency); keeping `allowJs: true` (new JS could slip in untyped).
- Consequences: Visible changes in the details overlay: mana costs render inside a `<span>` instead of a `<p>`, which may change their spacing slightly; meld pieces show the meld result's image (sized with `--card-image-width`), the only image in the renderer panel because the overlay hides the face images; meld results show their pieces. Opening a meld piece makes one extra Scryfall request, cached for 24 hours. The renderer now imports one hook from `card-browser` (removed again by D-059, which uses `useScryfallCardsForIds` from `src/hooks/`). `npm run lint` passes (the six unused-`face` errors in the `extras/` stubs are gone, because the stubs take no parameters until they read `face`). `npm run typecheck` and `npm run build` pass; the matcher tests pass (34/34), and two `binderColors.test.ts` cases still fail, as they did on `dev` before this change. The developer confirmed on 2026-11-21 that the layouts were checked in the browser. Branch `typescript`, based on `dev`, so it does not contain the D-053 CSS work on `feature/css-review`; a trial merge with that branch on 2026-11-21 merged `CardDetailsOverlay.css`, `AGENTS.md`, `DECISIONS.md` and `docs/file-conventions.md` cleanly and conflicted only in `docs/architecture/code-reference.md`; `--card-image-width` still exists there (in `src/styles/tokens.css`).
- Source: "[TypeScript] Convert remaining JavaScript"

## D-059: Meld trio in the details overlay

- Status: Implemented
- Release: v2026.11.2
- Date: 2026-11-21
- Decision: Each card of a meld trio shows the other two in the details overlay, and each opens its own overlay when clicked. A meld piece (e.g. Bruna, the Fading Light) shows its partner ("Melds with Gisela, the Broken Blade") and the result ("Melds into Brisela, Voice of Nightmares"); the result shows both pieces ("Melded from"). The names come from `all_parts` right away, and both images load in one Scryfall collection request through `useScryfallCardsForIds` (24 h cache). Opening a card goes through a new optional `onOpenCard(cardId)` prop that the page passes to `CardDetailsOverlay`, which passes it through `CardRenderer` to `MeldCard`. Search and Favorites set `?card=<id>`; Binder and Decks set their local `cardId` and now show the overlay for any card id, letting it fetch cards that are not in their list. This replaces the D-058 meld display (result only, one card fetched with `useScryfallCardsSearch`).
- Why: The developer asked for every card in the trio to point at the other two. A callback prop keeps the renderer independent of routing and of each page's way of opening the overlay (URL or local state); without it, the related cards are shown but not clickable. Using the URL on Search and Favorites gives a working Back button for free. One collection request is lighter than one card request per related card, and `useScryfallCardsForIds` lives in `src/hooks/`, so the renderer no longer imports from `card-browser` (the trade-off D-058 accepted). A real Scryfall response for Gisela confirmed it lists the same trio as Bruna, with its own id as a `meld_part`.
- Alternatives considered: Linking only the meld result (the first plan, replaced by the trio at the developer's request); a combined image of both pieces on the result (the developer chose to show the two pieces like the other relations); making the cards clickable only on the URL-based pages (Binder and Decks would close the overlay instead); swapping the card inside the overlay like the print selector (rulings and prints come from the original card, so the whole overlay must change).
- Consequences: A related card is a `<button>` whose label ("Melds with …") is its accessible name, and its image has `alt=""`; the global focus ring applies. The images sit in an auto-fit grid in `CardDetailsOverlay.css` that stacks when narrow, with `--card-image-width` and `--radius-card`. On Binder and Decks there is no Back history, and an overlay opened for a card outside the page works like the Search overlay (it fetches the card; binder and deck actions use the page's existing props). Opening any meld card makes one collection request for its two related cards. `npm run typecheck`, `npm run build` and `npm run lint` pass. The developer confirmed on 2026-11-21 that the trio was clicked through in the browser. `npm run lint:css` failed after the merge because the images used an `img` type selector (against the D-053 rule); the follow-up commit gives them the `scryfall-card__meld-image` class.
- Source: "[Meld] Complete the meld feature"

## D-060: Build guard for Supabase variables and a route error page

- Status: Implemented
- Release: v2026.11.3
- Date: 2026-11-21
- Decision: `vite.config.ts` stops `vite build` when `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing, reading them with Vite's `loadEnv` (the `.env` files for the mode and the process environment); dev and preview are unchanged. A new `RouteErrorPage` is the `errorElement` of both top-level routes: a code chunk that fails to load shows "A new version of Oracle Binder is available" with a Reload button (the Chromium, Firefox and Safari wordings of a failed dynamic import are recognized), an unknown address shows "Page not found" with a link home, and any other error shows "Something went wrong" with Reload; error details appear only in development. Pages are not lazy-loaded.
- Why: Vite warns that the main JavaScript file is larger than 500 kB (777 kB minified, 222 kB gzip). Looking into it showed that builds without the Supabase variables had silently produced a 266 kB bundle: `supabaseClient.ts` throws at load time, so the bundler removed Supabase and everything depending on it, and the app would crash on startup while the build passed (this also made the bundle sizes reported during D-058 wrong). Failing the build makes that visible. A prototype measured lazy loading: Favorites, Binder and Decks lazy gave 713 kB, adding `AdvancedSearchForm` 705 kB (205 kB gzip, about 9 percent less), and making Login and AuthCallback lazy as well gave 737 kB, because the bundler moved shared code back into the main file. The rest is React, the router and Supabase, which the Home page (`CardBrowserPage`, with its auth, favorites, binder and deck hooks) needs immediately. The developer judged 9 percent not worth the loading states. The app already loads the rarer card layouts and extras on demand, so a deploy while the app is open can make one of those chunks 404; the error page turns React Router's default screen into a clear reload prompt.
- Alternatives considered: Lazy pages (measured above, skipped); splitting React, the router and Supabase into separate cached files (same total size; removes the warning, not chosen now); raising `chunkSizeWarningLimit` (hides the warning only); a global `vite:preloadError` handler that reloads automatically (could loop on a real outage, and reloads without telling the user); leaving React Router's default error screen.
- Consequences: The 500 kB warning remains and is understood. Building in a folder without `.env.local` (for example a fresh worktree) now fails with a message naming the missing variable; set the variables first. The error page replaces the whole `/v2` layout, navbar included. Checked: with `.env.local` the build passes (778 kB main file); without either variable it exits with code 1 and names the missing one; with both set only in the environment it builds the full bundle; the dev server still starts. The error page was rendered on the server for every case (three chunk wordings, another error, unknown `/v2` and top-level paths) with the expected title and action, and without details in a production build. In the developer's first browser check, `/v2/nope` stayed on the pulsing splash logo: the splash was hidden by an effect in `App.tsx`, which the error page replaces. That effect moved into a `useDismissSplash` hook that both `App.tsx` and `RouteErrorPage` call (calling it again after the splash is gone changes nothing). The server-side render check could not catch this, because effects do not run there.
- Source: "[Build] Chunk size warning"

## D-061: Card scanning feature: scope, route and modes

- Status: Implemented. Route, navbar item, mode choice, Add-mode sign-in check, rear camera with error messages and guide are in `src/features/scan/`; recognition, Identify and Add are built on it (D-062 to D-066). Archived 2026-11-22.
- Release: v2026.11.3
- Date: 2026-11-21
- Decision: Add a card scanning feature on a new route `/v2/scan`, reached from a new navbar item (Scan). The page first asks for a mode:
  - **Identify** finds a card and opens its details (D-063). It works signed out, like search.
  - **Add** adds recognized cards one after another to a binder or a deck (D-064). It requires sign-in, because binders and decks belong to a user.

  Input is the live rear camera with automatic detection: a card is recognized as soon as it is held steady in the frame, with no capture button. Recognition must find the exact printing (set and collector number), because binder copies and deck entries store a Scryfall card id. When the printing can't be read, the app falls back to the recognized name and lets the user pick from that card's printings. The design targets phones first (portrait layout, one-handed controls) and must work in both iOS Safari and Chrome on Android. How recognition works is decided in D-062.

  **Guide frame (visual cue in the camera view):** *changed by D-065: one wide box for the code only, with the name fallback read in the same box.* Originally: a card-shaped outline (the 63 × 88 mm card ratio) is drawn over the camera picture, and the area outside it is dimmed. Two zones are marked inside the outline:
  - the **collector zone**, a box at the bottom left where the set code and collector number must sit;
  - the **title zone**, a box along the top where the card name must sit.

  A short line of text under the frame tells the user what to do, for example "Fit the card in the frame. Set and number in the lower box." While a zone is being read, it is highlighted. When the app falls back to the name (D-062 step 3), the title zone is highlighted and the text says so. When a card is found, the frame briefly turns to a success color.

  The zones are fixed positions in the frame, and the OCR reads exactly those areas, so the guide is what makes the user scan the right part of the card. The outline and zones use the theme tokens, stay visible on both light and dark cards (a light line with a dark edge), and the instructions are also given as text for screen readers (`aria-live`).
- Why: Adding a collection one card at a time through search is too slow. A camera flow that keeps running between cards makes rapid addition possible. One route for both modes shares the camera and recognition code.
- Alternatives considered:
  - Inputs: tap-to-capture, photo upload, or upload only. Each is slower than auto-detect; upload can be added later.
  - Precision: recognizing only the name and then always choosing a printing, or using a default printing. Both are simpler but slower or less accurate.
  - Entry points: camera buttons on Search, Binder and Decks instead of, or in addition to, a route. Rejected for now to keep a single entry point.
- Consequences:
  - A new public route and navbar item. The Add mode checks the session inside the page rather than protecting the whole route.
  - A new feature folder `src/features/scan/`. AGENTS.md (routes, source layout) and the architecture docs must be updated when this is implemented.
  - Camera access needs HTTPS (Netlify and `localhost` qualify) and a permission prompt. Denied permission must show a clear message.
  - No data model change: the feature reuses the binder copy and deck entry tables (D-064).
  - Out of scope: scanning several cards in one frame, binder proxies, price or collection valuation.
- Source: "[Scan] Visual card recognition plan"

## D-062: Card recognition technology

- Status: Implemented with tesseract.js: steady frame, collector-line OCR and name fallback (steps 1–3; guide changed by D-065). Not implemented: the optional cloud fallback (step 4). Archived 2026-11-22.
- Release: v2026.11.3 (name fallback in v2026.11.4)
- Date: 2026-11-21
- Decision (recommended, to be confirmed by a prototype): a staged pipeline that runs in the browser first and uses a cloud service only as a fallback.
  1. **Steady frame (no library):** draw camera frames on a canvas a few times per second and compare them. When the picture stops changing, take that frame. This avoids recognizing a card while it is still moving.
  2. **Collector line by in-browser OCR:** cut the small info line at the bottom left of the card (collector number and set code, printed on cards since Magic 2015 in 2014) out of the frame and read only that strip with tesseract.js (see "OCR library evaluation" below). The strip is cut out at the position of the guide frame's collector zone (D-061). tesseract.js runs in a Web Worker and is loaded only on `/v2/scan`. Look the printing up with Scryfall's `/cards/:code/:number`, which returns exactly one printing.
  3. **Name fallback:** if the line can't be read (older cards, glare, foreign language), OCR the title (cut out at the guide frame's title zone) and match it, allowing small errors, against the Scryfall card-name catalog the app already prefetches. Then show that card's printings to pick from (D-061).
  4. **Optional cloud fallback:** only if steps 2 and 3 fail, send that one still frame to a cloud vision service through a Supabase Edge Function, which keeps the API key secret. Never send video frames continuously.

  Since D-065, steps 2 and 3 read one guide box that the user fills with the info line, or with the name for the fallback, instead of zones of a card outline.

  Before this decision is accepted, a prototype on one iPhone (Safari) and one Android phone (Chrome) measures how often steps 2 and 3 succeed and how long they take. Based on that, the cloud step is either kept, with a chosen service and budget, or dropped. The prototype also settles the OCR library (see "OCR library evaluation" below).
- Why:
  - In-browser recognition is free, private and needs no backend. The app has only Supabase today.
  - Reading set and number gives the exact printing in one lookup, which recognizing the art or name can't do for reprints.
  - The cloud step covers the hard cases while its cost stays limited to failed scans.
- Alternatives considered:
  - **Browser built-in text detection (Shape Detection API `TextDetector`):** no library to add, but Chrome documents it as available only behind a flag or on some platforms, and no support in iOS Safari was found. Usable at most as an optional speed-up where it exists.
  - **Cloud vision for every scan (Google Cloud Vision, an LLM with vision, Azure as used by MTGScan):** most accurate, but needs an Edge Function and a secret. It costs money per image: Google Cloud Vision lists the first 1,000 text-detection units a month as free, then $1.50 per 1,000 (to verify on the official page when choosing). It also adds network delay to every card.
  - **Image matching (perceptual hash of the art):** used by open-source recognizers. It needs a reference hash for every printing, so a large download or a server. Reprints that share art can't be told apart without reading the set.
  - **Native app (VisionKit, ML Kit):** best camera and OCR quality, but leaves the web stack. Rejected.
- Consequences:
  - tesseract.js is a new dependency, chosen by the developer in this decision. It must be lazy-loaded so it doesn't grow the main bundle.
  - Scryfall limits: about 10 requests per second overall (2 per second for search and named lookups), and HTTP 429 must not be ignored. One lookup per steady frame, plus caching of recognized printings, stays well below this.
  - The cloud step, if kept, adds an Edge Function, a secret, a monthly cost limit, and image data leaving the device. It needs its own follow-up decision.
  - Camera quirks to handle: iOS may pick the ultra-wide lens for `facingMode: "environment"`, and camera streams have failed in iOS home-screen apps on some versions. The flashlight (torch) must be feature-detected, not assumed. Everything is tested on real devices.
- Source: "[Scan] Visual card recognition plan". Research references: Chrome Shape Detection docs (developer.chrome.com/docs/capabilities/shape-detection), Google Cloud Vision pricing (cloud.google.com/vision/pricing), Scryfall rate limits (scryfall.com/docs/api/rate-limits), MTGScan (github.com/fortierq/mtgscan), Yet Another Magic Card Recognizer (github.com/ForOhForError/Yet-Another-Magic-Card-Recognizer), WebKit bugs 252560 and 253186 (rear camera selection) and 273938 (camera in home-screen apps).

### OCR library evaluation

What the OCR has to do: read very short text from a region the app has already cut out of a steady frame. That text is a collector number (digits), a set code (three to five letters or digits) and, in the fallback, a card title (one line). It does not need page layout, document handling or many languages. What matters is accuracy on phone photos, speed per strip, download size (loaded only on `/v2/scan`), support in iOS Safari and Chrome on Android, the license and maintenance.

Package versions, licenses and dates below were read from the npm registry on 2026-11-21. "Unpacked size" is the npm package on disk, which contains several builds. It is not what a phone downloads, which the prototype measures.

| Library | Version, license, last publish | Engine and size | Fit for this task |
| --- | --- | --- | --- |
| **tesseract.js** | 7.0.0, Apache-2.0, Dec 2025 | Tesseract compiled to WebAssembly, runs in a worker, caches the language data in IndexedDB. English data is a separate download (`@tesseract.js-data/eng`). | Most widely used browser OCR. Can be limited to given characters (`tessedit_char_whitelist`), told to expect one text line (page segmentation mode 7), and given a rectangle to read. All three suit a fixed, pre-cut strip. Weak on raw photos, curved text and perspective (reviews), so the strip must be straightened, enlarged and turned to black and white first. Version 7 reports 15–35% faster runs than version 6. |
| **ppu-paddle-ocr** (+ `onnxruntime-web`) | 6.7.1, MIT, Nov 2026 (`onnxruntime-web` 1.31.1, MIT, Nov 2026) | PaddleOCR models run with ONNX Runtime Web, using WebGPU where available and WebAssembly otherwise. Default "tiny" model about 6 MB (multilingual); English mobile model about 12 MB. | PaddleOCR is described as clearly better than Tesseract on scene text and photos. The project's own receipt test reports 99.5% character accuracy, but there are no published phone or iOS timings. Two dependencies, a larger first download, and no documented character whitelist (a custom dictionary option exists). Accuracy drops with more than a few degrees of skew, so straightening is needed here too. Actively maintained. |
| **@paddleocr/paddleocr-js** (official) | 0.4.2, Apache-2.0, Jun 2026 | Official PaddleOCR browser SDK, 23.8 MB unpacked. | A 2026 comparison called the official JS SDK immature and based on older models. The June 2026 release may have changed that, but it is less proven than the community port above. Not recommended now. |
| **tesseract-wasm** | 0.11.0, BSD-2-Clause, Oct 2025 | Smaller Tesseract WebAssembly build: about 2.1 MB for the library plus English data, and uses SIMD (Safari 16.4+). | Smallest download, but a lower-level API, far fewer users, and character whitelisting is not confirmed. A fallback if tesseract.js turns out too heavy. |
| **Scribe.js** | (fork of tesseract.js) | Tesseract with an improved model and PDF support. | Aimed at documents and PDFs. Files must be served from the same origin. No benefit for short strips. Rejected. |
| **Transformers.js with TrOCR** | — | Transformer models of tens to hundreds of MB, best with WebGPU. | Accurate on hard text, but far too large and slow for scanning card after card on a phone. Rejected. |
| **ocrad.js** | 0.0.1, GPL-3.0, 2022 | Old pure-JavaScript OCR. | Unmaintained, low accuracy, and a GPL license that doesn't fit the app. Rejected. |
| **Browser `TextDetector`** | built in | Shape Detection API. | No library at all, but behind a flag or limited to some platforms in Chrome, and not found in iOS Safari. Only an optional speed-up. |

Decision (developer choice, 2026-11-21): **use tesseract.js** (version 7) as the OCR library of the card scanner.

- Why tesseract.js: it is the most proven and documented option, and it is one dependency with a permissive license (Apache-2.0). Its character whitelist, single-line mode and rectangle options fit the pre-cut strips exactly: digits and letters for the collector line, one line of text for the title. The guide frame in the camera view (D-061) makes the user place those strips where the app cuts them out, which avoids Tesseract's weak point: finding text in a busy photo.
- How it is used:
  - It is loaded with a dynamic `import()` only on `/v2/scan`, so the main bundle doesn't grow.
  - One worker with the English data is created when the scanner opens and reused for every card.
  - Each strip is straightened, enlarged and turned to black and white before it is read.
  - It sits behind one small interface in `src/features/scan/` (for example `readText(image, { characters })`), so the library can be swapped later without touching the camera or confirm code.
- The prototype (above) runs on 30–50 photos of real cards from the collection, covering new and old cards, foils, and normal and poor light, on both phones. It records:
  - how often the set and number are read correctly;
  - how often the title alone is read well enough to find the card;
  - time per strip, first time and later;
  - the download size on first use.
- Package: `tesseract.js` (with its English data) is added to `package.json` when implementation starts.

The other libraries in the table are kept as references. If the prototype shows tesseract.js reads too few cards, even with the guide frame, try them in this order:

1. ppu-paddle-ocr: reported to be better on photos, at the cost of two dependencies and a larger download.
2. tesseract-wasm: the same engine in a smaller build.

Switching would need a new or amended decision and approval for the new dependency.

Research references for this section: npm registry entries for each package (2026-11-21), "PaddleOCR vs Tesseract vs TrOCR: OCR in the Browser" (lofttools.com/blog/on-device-ocr-reviewed, June 2026), the ppu-paddle-ocr README (github.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr), the tesseract.js 7.0.0 release notes, the tesseract-wasm README, the Scribe.js README, and "Deterministic OCR in JavaScript: PaddleOCR for Node, Bun, Deno, and the Browser" (dev.to).

## D-063: Scan Identify mode

- Status: Implemented. Archived 2026-11-22.
- Release: v2026.11.3
- Date: 2026-11-21
- Decision: When a card is recognized in Identify mode, the app stops the camera and navigates to `/v2/search?q=<card name>&card=<scryfall id>`. This pushes a normal browser history entry: the search runs for that name and the existing details overlay opens on the recognized printing. If only the name was recognized and the user picked a printing (D-061), that printing's id is used. No scan history is stored.
- Why: It reuses the existing search page and overlay (`?card=` already opens the overlay without replacing the search URL). Back returns to the scanner, and the URL can be shared.
- Alternatives considered: a stored list of recent scans (local or Supabase), alone or in addition. It needs new storage and UI, and was not wanted.
- Consequences:
  - Works signed out. The overlay's favorite, binder and deck actions behave as on search, so they need sign-in.
  - Going back to `/v2/scan` restarts the camera, which asks for permission again only if the browser forgot it.
- Source: "[Scan] Visual card recognition plan"

## D-064: Scan Add mode (rapid addition)

- Status: Implemented
- Release: v2026.11.3
- Date: 2026-11-21
- Decision: The Add mode has a session setup, then a loop of scan → confirm → next card.
  - **Session setup (once):**
    - Target: a binder folder, Loose, or a deck.
    - Type: owned or proxy. Proxy is offered only when the target is a deck, because the data model has no binder proxies.
    - For owned copies, default copy details applied to every card of the session (the fields of the binder copy form except finish, which is chosen per card). Individual copies are edited later in the Binder.
  - **Confirm step (per card):**
    - Shows the recognized printing (image, name, set, collector number), with a way to change the printing.
    - A finish slider with three positions, Non-foil → Foil → Etched foil, which are the finish values of the binder copy form. It starts at Non-foil for each card. It's a native range input (`min=0`, `max=2`, `step=1`) with the three labels visible under it and the current label announced to screen readers (`aria-valuetext`). The slider sets the finish of the copies created, so finish is not one of the session defaults. It's shown only for owned cards, because deck entries (proxies) have no finish.
    - A quantity stepper (default 1), so several copies of the same card take one scan.

    Confirm adds the cards.
  - **What Confirm creates:**
    - Owned into a binder or Loose: new binder copies.
    - Owned into a deck: new physical copies placed in the deck (a `kind='binder'` entry, as the add-copy dialog already does).
    - Proxy into a deck: proxy deck entries.

    The existing binder and deck mutations and cache updates are reused.
  - **After Confirm:** an "Added N × name — Undo" message appears briefly and the scanner resumes at once. Undo deletes exactly the copies or entries just created. To avoid adding the same card twice by accident, the same printing is not offered again until the card has left the frame.
- Why: Choosing target, type and details once, then confirming each card with one tap, is the fastest flow that still prevents wrong additions. Reusing the current data model and mutations means no migration.
- Alternatives considered:
  - Binder proxies (needs a data model change and its own decision).
  - Copy details per card, collapsed or empty (slower, or more editing later).
  - Rescanning each copy instead of a quantity stepper.
  - A session list instead of, or in addition to, the undo message.
- Consequences:
  - Requires sign-in.
  - Several copies in one confirm need several inserts. Whether that happens in one database call or a short loop is decided during implementation, and a partial failure must be reported clearly.
  - Undo must also handle a copy placed in a deck (copy and deck entry).
  - A two-state foil toggle was considered and replaced by the slider, so Etched foil can also be recorded.
- Implementation (2026-11-21): `AddScanner`, `AddSessionSetup`, `AddConfirm` and `useScanAdd` in `src/features/scan/`. Several copies are created one after another in a short loop with the existing mutations (no new database function); the first failure stops the loop and the notice says "Added N of M", with Undo for what was added. Undo deletes deck entries before their copies through the new `deleteDeckCards` mutation in `useDeckManagement`, so no virtual entry is left. The option lists of the copy form moved to `src/features/binder/copyOptions.ts` to be shared. A newer notice replaces an older one, and its Undo with it.
- Source: "[Scan] Visual card recognition plan"

## D-065: Scanner guide for the code only, with a name fallback in the same box

- Status: Implemented (steps 1 and 2). Step 3 (low-light help) was tried on the phone and read cards worse than without it; it is kept on the branch `2026.11.3a-low-light` (flashlight button, sharpest of the still frames, automatic retry after a failed reading) and was not released. Seen in the test: the OCR found many characters that are not on the card. The likely cause is the sharpness measure (Laplacian variance), which also rises with sensor noise, so in poor light it picks the noisiest frame rather than the sharpest; the retries then add more misreadings. If this is tried again, measure sharpness after a light blur, or choose between frames by OCR confidence or by an agreeing reading.
- Release: v2026.11.4
- Date: 2026-11-21
- Decision: Replace D-061's card-shaped guide with one wide box (4:1) in the middle of a 4:3 landscape camera view, 90% of its width. The user fills the box with the card's info line (set code and collector number, bottom left), not the whole card. A small card sketch in the corner shows which part goes in the box. The steady-frame check and the OCR both use only this box.
  1. **Code in the box:** the strip is read as before (D-062 stage 2).
  2. **Name fallback in the same box:** after 2 captures in a row whose code can't be read or found (or with a "Read the name instead" button), the text asks the user to put the card name in the box. The OCR text is matched against the card-name catalog, allowing one wrong letter in five, and `/cards/named` gives the card. In Add mode the printing list then opens at once for the user to pick theirs (D-061, D-062 stage 3); in Identify mode the card opens on its default printing, and the details overlay lists the others. After a found card, the next card starts with the code again.
  3. **Low-light help:** a flashlight button only where the camera reports torch support, and the sharpest of the last few frames before giving up.
- Why:
  - Measured on an iPhone 13 Pro (Test mode, 2026-11-21): with the whole card in a 3:4 view at 4K, the info text gets about 31 px/mm, and the reading succeeds only about half the time in poor light. That is below the target of 75% in low light (90% in normal light, no wrong printings).
  - With only the 28 mm info line across the box, the same 4K video gives about 65–70 px/mm, more than twice the pixels per character.
  - Held this close, the iPhone switches to its macro lens by itself, which looked clearly sharper in the test. A whole card can't fit the frame at that distance.
  - A shorter camera view leaves more of the screen for the instruction and the Add-mode controls.
- Alternatives considered:
  - Keep the card guide and improve the clean-up filters (Sauvola, contrast stretch; benchmark at `/v2/scan-bench`): filters can't recover detail the camera didn't capture. They stay in the benchmark to tune the new strips.
  - Another OCR library (ppu-paddle-ocr, D-062): a new dependency and a larger download. Kept for later if the box isn't enough.
  - A cloud OCR step: cost and a backend. Kept as D-062's optional last fallback.
- Consequences:
  - Changes D-061's guide frame (card outline with title and collector zones) and the D-062 stages that cut strips "at the guide frame's zones": they now cut the box.
  - The user aims at a small part of the card instead of fitting the whole card, and moves the card once more for the name fallback.
  - Saved scan samples get a `guide` field (`"code"`; older files count as `"card"`). The benchmark groups by guide and scales each strip so the text is about 30 px tall.
  - Identify and Add both use `ScanCamera`, so both modes change.
- Source: hotfix "OCR reading is not consistent enough" (branch `2026.11.3a`, 2026-11-21).

## D-066: Read the finish mark and language from the collector line

- Status: Implemented (2026-11-21). Checked on the phone: the mark and the language are read and pre-select the finish and the language in Add mode.
- Release: v2026.11.6
- Date: 2026-11-21
- Decision: Extend `parseCollectorLine` so that, besides the set code and collector number, it returns:
  - **`foilMark`**: `"star"`, `"dot"` or `null` (not read). On modern cards the sign between the set code and the language is a dot (•) on nonfoil cards and a star (★) on foil and other premium cards, for example "FRA • EN" and "FRA ★ EN".
  - **`language`**: the printed two-letter code after that sign (EN, FR, DE, IT, ES, PT, JP or JA, KO, RU, CS, CT, PH), mapped to the app's language names where they exist (`LANGUAGES` in `binder/copyOptions.ts`), otherwise `null`.

  How they are used:
  - **Finish in Add mode (D-064):** the confirm step pre-selects the finish instead of always starting at Non-foil. A dot gives Non-foil. A star gives Foil, or Etched foil when the printing (Scryfall `finishes`) has `etched` but not `foil`. A finish the printing doesn't have is never pre-selected. With no mark read, the confirm step starts at the first finish the printing has. The user still confirms and can change it.
  - **Language in Add mode:** the confirm step has a Language choice for owned copies (the app's languages, or Not set). It starts at the read language when it maps to an app language, marked "(read on the card)", otherwise at the session default. The chosen value is saved on that card's copies.
  - **Lookup:** stays on the English printing (`/cards/:set/:number`). Binder copies already keep the language in their own `language` field, and the English card object always exists.
  - Identify mode (D-063) is unchanged: the card page shows every finish anyway.

  **Etched foil:** no source found shows a separate sign for etched foils in this line. Etched foils are told apart through the printing instead: Scryfall lists the finishes of each printing, and etched versions often have their own collector number. So a star together with the printing's finishes decides between Foil and Etched foil, as above. If samples show a distinct sign, this decision is amended.
- Why:
  - The scanner already reads this line, so the finish and language cost no extra step. They are the two copy fields a user otherwise sets by hand for almost every foreign or foil card.
  - A wrong guess costs little: it is only a pre-selection on a confirm screen.
- Alternatives considered:
  - Detecting foil from the picture (glare, rainbow sheen): unreliable under phone light and needs image analysis.
  - Looking up the localized printing (`/cards/:set/:number/:lang`): gives a different Scryfall id per language, which would split one card into several entries across binders and decks, and not every language has a Scryfall object. Rejected for now.
- Consequences:
  - The OCR character list (`COLLECTOR_CHARACTERS`) gains the dot and star signs and their likely misreads (`*`, `·`), checked with the benchmark so the set code and number don't get worse. If Tesseract can't tell the two apart reliably, `foilMark` stays `null` and only the language is used.
  - The scan-sample truth field accepts an optional finish mark and language ("ltc 277 star en"), so the benchmark can count both.
  - `CardBrowserCard` gains the Scryfall `finishes` list, used by the confirm step.
  - The app's language list has only six languages. Printed codes without a match are ignored until that list grows (a separate change).
- Sources: "How to Identify an Exact MTG Printing" (scanmtg.com/guides/how-to-identify-mtg-printing, star vs dot example), mtg.wiki "Parts of a card" and "Information below the text box" (seen in search results only; the pages refused automated reading), 2026-11-21.

## D-067: Account system: Supabase social sign-in only

- Status: Implemented. Archived 2026-11-22.
- Release: v2026.11.7
- Date: 2026-11-22
- Decision: Accounts use Supabase Auth with two OAuth providers: GitHub and Discord. Google was planned as a third provider and dropped on 2026-11-22 at the developer's request; it is not enabled in Supabase. Anyone can sign up, with no invite or allow-list. Email and password sign-up and sign-in are removed once the existing accounts are linked (D-070). Supabase stays the session issuer, so `auth.uid()`, RLS, `RequireAuth` (D-009) and every user table are unchanged. Keycloak (D-038 to D-040) stays deferred.
- Why: The goals are simplicity, security and no extra cost, using only services already in use (Supabase free, Netlify free, the Keycloak Pikapod). There is no mailbox or domain for sending email. Supabase's built-in mailer delivers only to members of the project team, at about 2 emails an hour, so today's sign-up confirmation emails never reach anyone else. Social sign-in sends no email: the provider confirms the address and handles forgotten passwords. That gives self-service sign-up and recovery for free. The app then stores no passwords, so there are none to leak, guess or reset.
- Users and requirements (answered on 2026-11-22): the developer plus a few people, open self-service sign-up, users must recover access on their own, no personal mailbox may send app email, and users have GitHub or Discord accounts.
- Alternatives considered:
  - Social sign-in plus email/password with "Confirm email" off. No mailbox needed, but password users without a linked social account cannot reset their password themselves. An unconfirmed password account could also be auto-linked to a social account that uses the same email. Rejected in favour of no passwords.
  - The same, plus a new Gmail used only by the app as custom SMTP. Gives full confirmation and reset emails, but adds an account to look after and sends from a `@gmail.com` address. Rejected.
  - Keycloak broker (D-038 to D-040). Keycloak needs its own SMTP for verification and reset, so it doesn't solve email. It adds a second admin console and a client secret, and makes sign-in depend on the shared Pikapod. Kept deferred.
  - Firebase Auth, Clerk or Auth0. They send email from their own domain on free tiers, but each is a new service to subscribe to. Rejected by the no-new-services rule.
  - Custom SMTP through a free email provider (Brevo, Resend, Mailgun). Each needs a verified sender mailbox or an owned domain. Not possible today.
- Consequences:
  - Each user needs a GitHub or Discord account. Someone without one cannot sign up. Google can be added later with a new provider step in D-068 and one entry in `SOCIAL_PROVIDERS`.
  - A user who signs in with two providers that report the same verified email gets one account (Supabase automatic identity linking). Different emails give separate accounts, each with its own data.
  - The provider apps (GitHub OAuth app, Discord application) are free. Their client secrets live only in the Supabase dashboard (D-068).
  - D-004's "Unused auth providers are off" still holds: these three are the providers in use, and Email is turned off at the end of D-070.
  - When implemented, D-008 and D-017 in `DECISIONS_HISTORY.md` get `Superseded by D-067`, and `AGENTS.md` ("App at a glance", Routes) is updated.
  - If the app ever has a domain and a mailbox, email sign-in can come back as a new decision.
- Source: "[Auth] Account management selection"

## D-068: GitHub and Discord provider configuration

- Status: Implemented: GitHub and Discord are enabled in Supabase. Archived 2026-11-22.
- Release: v2026.11.7
- Date: 2026-11-22
- Decision: Register one free OAuth app with each provider, then enable each provider in Supabase with that app's client ID and secret. Every provider app uses Supabase's callback, `https://<project-ref>.supabase.co/auth/v1/callback`, as its only redirect URI. The app's own `/v2/auth/callback` stays in the Supabase redirect allow-list (D-004, D-008).
- Why: Supabase finishes the OAuth exchange and then returns to the app, so the providers only ever see Supabase's address. The secrets never reach the browser, the repo or Netlify.
- Alternatives considered: Also enabling Google (planned, then dropped on 2026-11-22 at the developer's request; its console setup is the heaviest of the three, with a consent screen and publishing step).
- Consequences: Dashboard work only, with no code change. Labels and requirements in the provider consoles change over time, so check each step against the console and the Supabase provider guide when doing it.
- Source: "[Auth] Account management selection"

### Instructions (one provider at a time)

1. Note the Supabase callback URL from Authentication → Sign In / Providers → (provider). It is `https://<project-ref>.supabase.co/auth/v1/callback`.
2. **GitHub**: Settings → Developer settings → OAuth Apps → New. Set Homepage URL to `https://oraclebinder.netlify.app` and the authorization callback URL to the Supabase callback. Generate a client secret.
3. **Discord**: Developer Portal → New Application → OAuth2. Add the Supabase callback as a redirect and copy the client ID and secret.
4. In Supabase, enable each provider and paste its client ID and secret. Copy secrets straight from the provider console into the dashboard, never into a chat, the repo or `.env`.
5. Under Authentication → URL Configuration, confirm that the Site URL is `https://oraclebinder.netlify.app` and that the redirect URLs include the Netlify callback and `http://localhost:5173/**`.

Check: each provider shows as enabled. The sign-in test happens in D-069.

## D-069: App-side social sign-in

- Status: Implemented. Archived 2026-11-22.
- Release: v2026.11.7
- Date: 2026-11-22
- Decision: `/v2/login` shows one button per provider ("Continue with GitHub / Discord"). Each calls `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: getAuthCallbackUrl(nextPath) } })`. The page carries the safe `next` path through to `/v2/auth/callback` exactly as today. `AuthCallbackPage` keeps its logic, and its wording changes from "Email confirmation" to a general sign-in message. The email/password form was removed in D-070 step 4.
- Why: The client already uses `flowType: "pkce"` with `detectSessionInUrl: true` (`src/services/supabaseClient.ts`). The callback page already waits for `AuthProvider` to pick up the session and then follows `getSafeNextPath`. So the OAuth return needs no new route and no new dependency.
- Alternatives considered: A Supabase auth UI package (new dependency, less control). Going straight to Supabase without a login page (loses the provider choice and the `next` handling).
- Consequences:
  - Touches `LoginPage.tsx`, `AuthCallbackPage.tsx` and `AuthPages.css`, so it needs a short plan and approval before coding (AGENTS.md).
  - Provider buttons use the existing tokens and BEM classes. Provider logos are optional, and any logo must follow the provider's brand rules.
  - Check: `npm run typecheck`, `npm run build` and `npm run lint` (against the existing baseline) pass. Then test each provider locally and on Netlify: sign in, return to the `next` page, reload and stay signed in, sign out.
  - Progress (2026-11-22, branch `claude/account-management-selection-85da20`): coded. `npm run typecheck`, `npm run build`, `npm run lint` and `npm run lint:css` pass with no errors; the build keeps the existing >500 kB chunk warning. On 2026-11-22 the developer signed in on `http://localhost:5173` with both GitHub and Discord using their existing app account: both returned through the callback to the app, signed in to that account. The Google button was then removed. Not yet tested: the Netlify site, and reload and sign-out after a social sign-in.
- Source: "[Auth] Account management selection"

## D-070: Moving existing password accounts to social sign-in

- Status: Implemented in the app (steps 1–5). Still open in the Supabase dashboard: turning off the Email provider (step 4). Archived 2026-11-22.
- Release: v2026.11.7
- Date: 2026-11-22
- Decision: Keep each existing email/password account and its data by attaching a social identity to it. Then remove password sign-in from the app and turn off the Email provider in Supabase.
- Why: All user data references `auth.users.id`. Linking keeps that id, so favorites, Binder and Decks need no data migration.
- Alternatives considered: Keeping password sign-in for existing accounts (keeps passwords in the app; rejected). Recreating the accounts (loses their data).
- Consequences: Not every existing account email is known to match an email on GitHub or Discord. A matching account links automatically; a mismatched one needs one of the manual paths below. Until step 4 is done, the old password sign-up stays reachable and its confirmation emails still fail.
- Source: "[Auth] Account management selection"

### Instructions (in order)

1. Ship D-069 with the password form still in place.
2. For each existing account, list its email in Supabase (Authentication → Users) and choose a path:
   - **Email matches a GitHub or Discord account**: the user signs in once with that provider. Supabase links the new identity to the existing user automatically. Check that the user now shows two identities and that their data is still visible. Done on 2026-11-22 for the developer's own account with both GitHub and Discord.
   - **No match**: change the account's email in Supabase to the email of the user's social account, then sign in with that provider. First check whether the dashboard lets you edit a user's email. If it doesn't, ask before choosing another way, because the Admin API needs the secret key and must never run from the app.
   - **Test accounts not worth keeping**: delete them in the dashboard. Their rows in `favorites`, `binders`, `binder_cards`, `decks` and `deck_cards` are removed by the existing `on delete cascade` foreign keys to `auth.users`.
3. Confirm every remaining account has a social identity.
4. Remove the email/password form and the sign-up mode from `LoginPage.tsx` (approval first). Then turn off the Email provider in Supabase.
5. Mark D-008 and D-017 as superseded by D-067 in `DECISIONS_HISTORY.md` and update `AGENTS.md`.

Check: signed-out password sign-up is no longer offered, and every user reaches their existing data through a provider.

Progress (2026-11-22, branch `claude/account-management-selection-85da20`): steps 1–3 done for the developer's account, which is linked to GitHub and Discord. Step 4, code part: the email/password form, the sign-up mode and their styles are removed from `LoginPage.tsx` and `AuthPages.css`. Still open: turning off the Email provider in the Supabase dashboard. Step 5: D-008 and D-017 are marked superseded and `AGENTS.md` is updated.

## D-079: Delete, dispose and remove cards in Binder and Decks, one by one or in bulk

- Status: Implemented (2026-11-23, branch `feature/d-079-card-removal`; migration applied to the linked project; pgTAP 39/39 passed there)
- Release: v2026.11.8
- Date: 2026-11-23
- Requires: D-071 (optimistic Binder and Deck actions), because D-079 changes the same hooks (`useBinderCopies`, `useDeckManagement`) and reuses its helpers in `src/features/optimisticCache.ts`. Met on 2026-11-23: D-071 was merged into `dev` (PR #38), and D-079 is built on `feature/d-079-card-removal` from there.
- Decision: Give Binder and Decks the same three ways to take cards out, each available for one card (in the card's popover) and for a selection (in a shared selection bar). The three actions have different meanings and keep distinct labels everywhere:

  | Action (label) | Where | What happens to the data | Undo |
  | --- | --- | --- | --- |
  | **Delete** | Binder (owned and history views) and Decks | The record is removed from the database. Binder: the `binder_cards` row is deleted; a deck entry linked to it turns virtual (D-034). In the history view this permanently forgets a disposed copy. Decks: the `deck_cards` entry is deleted; for an owned (Binder-kind) entry the physical copy is deleted too, because "delete" means the card is no longer in the collection at all. Proxy and virtual entries only have the entry. | 8 s undo buffer, no confirm dialog (dropped 2026-11-23: Undo covers a mistake); permanent after that |
  | **Dispose** (sold, lost, given away) | Binder and Decks (owned entries only) | The copy keeps its row with `status` set and appears under the Binder history filter, where Restore is available. A linked deck entry stays in the deck as virtual (D-034, existing `remove_or_dispose_binder_copy`). In Decks it applies only to Binder-kind entries; proxy and virtual entries in a selection are left untouched and the notice says how many were skipped. | 8 s undo buffer; later, Restore in the history view |
  | **Remove from deck** | Decks | The deck entry is deleted. An owned copy goes back to the Binder: the action always asks where it goes (a Binder folder or Loose), with no destination preselected; in bulk, one destination applies to all selected copies. Proxy and virtual entries are simply removed, and the question is skipped when the selection holds no owned copy. | 8 s undo buffer |

  Interface, the same on both pages:
  1. **Selection.** Each card tile in a Binder view and in the Decks views (All cards and a selected deck) gets the selection checkbox the Binder already has. Above the grid, a shared `SelectionBar` component shows the count, "Select all shown", "Clear", and the actions that apply to the page: Binder → Move to…, Dispose…, Delete; Binder history view → Delete (the checkbox, hidden there today, is shown); Decks → Remove from deck…, Dispose…, Delete. Without a selection the bar shows only "Select all shown"; the summary, Clear and the actions appear once something is selected. Binder selection stays per card (all of that card's copies in the current view); deck selection is per entry, since the All cards view already shows each entry as its own tile. Choosing individual copies of the same card stays in the popover.
  2. **One card.** The Binder copy popover and `DeckCardPopover` list the same actions per copy or entry, with the same labels and the same 8-second Undo as the bulk bar.
  3. **Feedback.** One notice per action, for example "Disposed 4 copies as sold." or "Removed 3 cards from Burn; 2 copies back to Loose." and an Undo button for 8 seconds. A newer action replaces the notice and sends the older action at once. (Replaced by D-080: notices go to an app-wide stack where every undo notice keeps its own Undo.) Partial failures are not possible because each bulk action is one transaction (see below).

  Database (one migration with rollback and pgTAP, as for D-034):
  - `delete_binder_copies(p_copy_ids uuid[])` and `dispose_binder_copies(p_copy_ids uuid[], p_status text)`: the bulk form of `remove_or_dispose_binder_copy`, all-or-nothing, ownership checked for every id, linked deck entries turned virtual in the same transaction. The single-copy RPC stays and may call the bulk one with one id.
  - Dispose from Decks uses `dispose_binder_copies` with the copy ids of the selected Binder-kind entries; no separate deck function.
  - `remove_deck_entries(p_entry_ids uuid[], p_binder_id uuid)`: deletes the entries and puts each owned copy in `p_binder_id` (null = Loose, chosen explicitly by the user) in the same transaction. Without it the `deck_cards_sync_binder_copy_location` trigger sends the copy to Loose and a second call would be needed to file it, which can leave it half-done.
  - `delete_deck_entries(p_entry_ids uuid[])`: deletes the entries and, for Binder-kind ones, their copies.
  - All `SECURITY INVOKER`, authenticated only, least-privilege grants, as the existing functions.

  Client: the mutations follow the D-071 optimistic pattern (`patchLists`/`restoreLists`, Realtime echo marking of the touched copy ids, refetch in `onSettled`).

  **Undo buffer (added 2026-11-23).** Every D-079 action, one card or bulk, gets an 8-second undo buffer: the screen changes at once, but the request to the database waits 8 seconds. Undo in that time cancels the request, so nothing reaches the database, and the cached lists go back. When the time runs out, the request is sent. `src/features/undoWindow.ts` (`createUndoWindow`, tested in `tests/binder/undoWindow.test.ts`) holds the timer; the page passes the window with the mutation (`deleteCopies`, `disposeCopies`, `removeDeckEntries`, `deleteDeckEntries` accept `undoWindow`), and the mutation awaits it before the request. Undo rejects with `UndoneError`, which the page shows as "Undone." rather than as an error. Open windows are sent early only when the page is closed or left (`pagehide`); a page that is merely hidden (tab switched, phone locked) keeps its Undo. If closing the tab cuts the request off, or a hidden page is frozen and never comes back, the change simply does not happen, which is the safe side for the data. (Changed 2026-11-23: the first version also sent on `visibilitychange` to hidden; in testing, a browser pane that hides itself in the background sent a delete at once and the Undo never showed.) The Realtime echo marks are set when the request is sent, and both lists are refetched after it, because a refetch during the window can bring the old rows back. The two deck actions are not counted in `isPending`, so buttons are not locked for 8 seconds.

  Settled on 2026-11-23:
  - Decks also offer **Dispose** for owned entries (a card sold straight out of a deck); the entry stays as virtual.
  - **Delete** from a deck also deletes the owned copy. Taking a card out of a deck while keeping it is **Remove from deck**, which moves the copy back to the Binder.
  - Remove from deck **asks every time** where the copy goes (a Binder folder or Loose). No default and no remembered previous folder, so no new column.
  - **Delete** is available in the Binder history view too, through the same `delete_binder_copies`.
- Why: Today the Binder can dispose, restore and delete one copy at a time and move copies in bulk, while Decks can only delete a whole deck or change an entry's kind; there is no way to take a card out of a deck back into a folder in one step, and no bulk version of any of this. Three clearly named actions, offered the same way on both pages, match what a collector actually does (throw away a mistaken entry, record a sale, rebuild a deck) without mixing them up.
- Alternatives considered: One "Remove" action with a follow-up question (delete, dispose, or back to the Binder): fewer buttons, but an extra step every time and easy to pick the wrong branch. Delete in Decks removing only the entry (the copy to Loose): rejected, it would make Delete and Remove from deck almost the same. Remove from deck defaulting to Loose or to the copy's previous folder: rejected in favor of asking, so a copy never lands somewhere the user did not choose; the previous folder would also need a new column. Bulk actions as a loop of the existing single-copy calls: no migration, but slower, and a failure halfway leaves a partial result (the reason D-034 used one transaction). Soft delete with a trash bin instead of real deletion: safer, but the history filter already covers "keep a record"; Delete is meant to forget.
- Consequences:
  - A new migration with matching rollback in `supabase/rollback/` and pgTAP tests (ownership, all-or-nothing on a bad id, deck entries turning virtual, copies landing in the chosen folder). It must be applied before the app version that uses it is deployed.
  - `SelectionBar` is a new shared component used by `BinderPage` and `DecksPage`; it reuses `.page__toolbar`/`.page__control` styles from `layout.css` rather than new page-wide rules (D-053 Phase 4a). Tiles in Decks gain the Binder's checkbox, so the checkbox moves to a shared place instead of being copied.
  - The existing single-copy actions in the Binder popover keep working; their labels are aligned with the table.
  - Touches more than two files: built in small steps (migration, hooks, `SelectionBar` on Binder, then Decks, then popovers), each with a plan and approval (AGENTS.md).
- Source: "[Binder & Decks] Delete, dispose and remove"
- Verification (2026-11-23): `supabase/tests/card_removal_test.sql` passed 39 of 39 on the linked project. Docker is not available, so `supabase test db` could not run; the file was run through `supabase db query --remote` in one transaction that installed pgTAP, collected each test's output in a temporary table and ended with a deliberate error, so the extension and all test rows were rolled back (checked afterwards: no pgTAP, no test users, binders or decks). Browser-checked signed in on Binder and Decks (bulk and popover actions, Undo, phone width); actions that really sent requests were tried on throwaway data only.

## D-080: App-wide notification stack

- Status: Implemented (2026-11-23, branch `feature/d-079-card-removal`)
- Release: v2026.11.8
- Date: 2026-11-23
- Related: D-079 (the 8-second undo buffer, `useUndoNotice`, `UndoNotice`)
- Decision: Replace the single notice that each page keeps today (Search, Binder, Decks, Favorites, the deck card popover and scanner Add mode) with one notification collection for the whole app. All of them move to the new stack in the same change.

  | Kind | How long it stays | Actions | Role |
  | --- | --- | --- | --- |
  | **Info** (confirmations such as "Moved 3 copies.") | 5 s | Dismiss | `status` |
  | **Undo** (D-079 delete, dispose, remove; scanner Add mode "Added N × name") | 8 s, the length of its undo window | Undo, Dismiss | `status` |
  | **Error** | Until the user dismisses it | Dismiss | `alert` |

  Behavior:
  1. **One stack for the app.** One provider in the app layout holds the stack, and every page adds to it. Notifications stay visible when the user moves to another page.
  2. **Order.** The newest notification is at the bottom; older ones move up.
  3. **Position.** The stack follows the navigation bar, not the viewport size: while the desktop navbar is shown it is fixed in the bottom-right corner; while the mobile navbar is shown it is fixed at the bottom center, above that bar. It has no breakpoint of its own, so if the navbar's breakpoint changes, the stack follows. (Changed 2026-11-23; the first version used `max-width: 480px`.)
  4. **Each one ends on its own timer.** A notification goes away when its own time runs out.
  5. **Every undo notice keeps its Undo.** Several undo windows can be open at once. Each Undo cancels only its own action, until its own 8 s end. This replaces D-079's rule that a newer action sends the older one at once. Scanner Add mode's Undo follows the same rules.
  6. **After Undo.** The notification's text changes to "Undone." in place, and it then counts as a 5 s info notice.
  7. **Dismiss.** Dismiss removes the notification. On an undo notice it also keeps the action: the request is sent at once instead of after 8 s, as in D-079 today.
  8. **Pause.** While the pointer is over a notification or it has keyboard focus, its countdown pauses. For an undo notice, the undo window pauses too.
  9. **At most 5 visible.** When a 6th arrives, the oldest non-error notification is removed at once. If that one is an undo notice, its action is sent. Errors are pushed out only when all 5 are errors.
- Why: Several commands show a message, and in bulk work several messages often show at once. With one notice per page, a newer message replaces an older one. The older undo action is then forced through, and errors can vanish before anyone reads them.
- Alternatives considered: Clearing the stack when the user changes page (rejected: the stack stays across navigation). Only the newest notice keeping Undo (rejected: each notice keeps its own). Errors disappearing by themselves (rejected: they stay until dismissed). No limit on visible notifications (rejected: the limit is 5). Moving Binder and Decks first and the other pages later (rejected: all pages move together).
- Consequences:
  - `useUndoNotice` and `UndoNotice` (D-079) are replaced by the app-wide provider.
  - Each page's `notice`/`setNotice` and each `.page__notice` block moves to the provider: `CardBrowserPage`, `BinderPage`, `DecksPage`, `FavoritesPage`, `DeckCardPopover` and `AddScanner`.
  - Scanner Add mode's own 8 s timer is removed, and its Undo goes through the stack.
  - `createUndoWindow` needs a pause and resume so that hovering can stop the 8 s window; the tests in `tests/binder/undoWindow.test.ts` grow to cover them.
  - Several undo windows can be open at once. Each one's request is sent separately when its time runs out, and every open window is still sent at once when the page is closed or left (`pagehide`); a page that is merely hidden keeps its Undo (D-079, changed 2026-11-23).
  - Touches more than two files: built in small steps, each with a plan and approval (AGENTS.md).
- Source: "[App] Notification collection"
- Verification (2026-11-23): stack rules tested in `tests/notifications/notificationList.test.ts`, undo-window pause/resume in `tests/binder/undoWindow.test.ts`, overlapping undo windows in `tests/binder/optimisticCache.test.ts`. Browser-checked: order and roles, Undo to "Undone.", 5 s info and 8 s undo timers, hover and focus pause, the limit of 5, placement above the mobile navbar and bottom-right with the desktop navbar, a notice surviving a page change, and two overlapping Undos. The stack uses its own layer, `--z-notifications` (115), above popovers and the card-details overlay and below dialogs. Not tried in the browser: the Search "Sign in" link (needs a signed-out session) and scanner Add mode (needs the camera).

## D-073: Home layout: "Hand of the day"

- Status: Implemented (2026-11-23, branch `feature/d-073-hand-of-the-day`, PR #40)
- Release: v2026.11.8
- Date: 2026-11-22
- Issue: #28
- Decision: Restyle the daily seven-card set on Home so it **looks like a hand of cards** and has the title **"Hand of the day"** (with the day's set name as a subtitle). The cards overlap in a slight fan, as if held, instead of the current grid of tiles. The data stays the same: up to seven cards from the booster-focused set chosen per UTC day (`mulliganSets.ts`, `CardBrowserPage` in mulligan mode).
  - Desktop: a fan of seven overlapping cards; hovering or focusing a card lifts it a little (no transform when `prefers-reduced-motion` is set; `base.css` rule plus the local block AGENTS.md asks for).
  - Phone: a tighter fan or a horizontal row that scrolls, so all seven stay reachable without horizontal page overflow at 390 px.
  - A tap/click still opens the card details overlay. The card action icons (favorite, binder, deck) stay available, for example on the lifted card or in the details.
  - The value dashboard (D-076) sits above the hand for signed-in users.
- Why: The issue asks to "simulate a hand of cards". The cards already form a daily hand; presenting them as one makes the page read as that instead of as a search result.
- Alternatives considered: A Mulligan button that redraws the hand (from the plan document; not asked for now, can be added on top later). A sample hand drawn from one of the user's decks (a different feature, on the Decks page).
- Consequences: Mostly CSS and the Home part of `CardBrowserPage`; tokens only, no new colors, radii or z-index values (`npm run lint:css`). `CardTile` is reused; if the fan needs a variant, add it as a modifier class rather than a copy.
- Source: "[Issues] Decision plan review"
- Implementation (2026-11-23): `CardBrowserPage` in mulligan mode (Home and `/v2/search/random`) shows a "Hand of the day" heading with the set name and renders the cards as an `<ol class="hand">` of `CardTile`s; the filter bar is not shown on the hand (seven cards need no filters). Each card gets `--hand-offset` (distance from the middle card); `CardBrowserPage.css` turns it into a `rotate` and an arc `translate`. Hover or keyboard focus (`:focus-within`) brings a card to the front (local `z-index` inside `isolation: isolate`) and lifts it, so its action icons are reachable; the lift is cancelled under `prefers-reduced-motion`. Card width follows the window (`clamp(6rem, 18vw, var(--card-image-width))`); at 540 px and below the hand is a sideways-scrolling row with a lighter fan. Browser-checked at 1440 px and 390 px (seven cards, no page overflow, click opens the details). The D-076 dashboard slot is not added, because D-076 is not built yet.
