# Decisions List

Implemented decisions have been moved to [DECISIONS_HISTORY.md](./DECISIONS_HISTORY.md).

## D-004: Supabase project and security baseline

- Status: Accepted
- Date: 2026-10-27
- Decision: Use one Supabase project in an EU region for local development and the Netlify site. Only the publishable key reaches the browser (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). The auth redirect allow-list holds `http://localhost:5173/**` and the Netlify URL. Unused auth providers are off, and the Data API exposes only the `public` schema.
- Why: This is a solo learning app, so one project keeps setup small. A publishable key in a bundle is only safe because RLS restricts every row.
- Alternatives considered: Separate dev and production projects (safer, double the setup, can be added later). Any use of the secret/service-role key in the app (rejected: it bypasses RLS).
- Consequences: Dev and production share data. Free projects can pause after inactivity (verify current rules). Keys never go in chat or the repo, and Netlify holds the production values. New projects expose no tables to the Data API by default, so every migration must grant access explicitly. Legacy anon/service_role keys are not used. The production redirect entry is tightened to the callback route in D-008. Status: implemented once the checks above pass.
- Source: "[Supabase] Auth and favorites plan"

## D-005: Supabase MCP is read-only

- Status: Accepted
- Date: 2026-10-27
- Decision: Connect the Supabase MCP server to VS Code Copilot, scoped to this project with `read_only=true`. Schema changes are tracked and applied through the migration workflow in D-014.
- Why: Database content can carry prompt-injection text, so a write-enabled agent is a risk. Read-only still lets Copilot inspect schema, logs and advisors.
- Alternatives considered: Write-enabled MCP (faster, riskier). No MCP (loses the inspection help).
- Consequences: The workspace MCP entry is in the gitignored `.vscode/mcp.json`; first-time OAuth authentication in VS Code is still required. Copilot cannot apply migrations. To enable writes later, remove the flag, keep the project scope and per-call approvals, then record a superseding decision.
- Source: "[Supabase] Auth and favorites plan"

## D-013: Email delivery for magic links

- Status: Not working
- Date: 2026-10-27
- Decision: Use Supabase's built-in sender during solo development, and choose a free SMTP provider before inviting others.
- Why: The built-in sender is for testing and heavily rate-limited, but enough for one developer.
- Alternatives considered: Brevo (free daily quota, can verify a single sender address), Resend (free monthly quota, needs a domain you control), Mailtrap (test inbox only, no real delivery). Verify current free limits.
- Consequences: Passwordless magic-link sign-in was not reliable and is no longer the sign-in flow. The replacement is recorded in D-017. Supabase may still send email confirmation for signup, depending on Auth settings.
- Source: "[Supabase] Auth and favorites plan"

## D-015: Supabase GitHub integration deploys migrations from main

- Status: Evaluating
- Date: 2026-10-27
- Decision: After `favorites` is merged, connect the Supabase GitHub integration to this repository only, with the working directory at the repo root, "Deploy to production" on for `main`, and automatic branching off.
- Why: Merging to `main` then applies pending migrations, and no database password or access token is stored in GitHub. Deploying from GitHub works on any plan.
- Alternatives considered: Keep manual `db push` (enough for one developer, nothing to configure). Branching with per-PR preview databases (isolated and data-less, plan requirements to verify, not needed without users). GitHub Actions with stored secrets.
- Consequences: Supabase gets read access to the repo. With one shared project, a merge changes the live database. Because D-014 records history, migrations already applied from the feature branch should not run twice; verify on the first merge. `config.toml` does not push auth settings, which stay in the dashboard (D-004). Revisit if a staging project is added.
- Source: "[Supabase] Migrations and GitHub"

## D-020: Binder and decks roadmap

- Status: Accepted
- Date: 2026-10-28
- Decision: Ship the binder completely (D-021 to D-032) before starting decks (D-033 to D-037). Each step below is its own decision, planned with a short plan before code and closed with its own check. A binder entry is one copy per row; "loose" is `binder_id = NULL`.
- Why: Multiple copies with per-copy metadata do not fit favorites' `(user_id, scryfall_id)` key. Finishing the binder first gives decks a stable, documented base.
- Alternatives considered: Interleaving binder and deck steps (deck rules would need tables that do not exist yet); a quantity column per card (cannot hold per-copy metadata); a real "Loose" binder row (special-case rename and delete rules).
- Consequences: Order is fixed: A (D-021 to D-024, no database), B (D-025 to D-032, binder), C (D-033 to D-037, decks). Deck implementation reuses or commonalizes suitable Binder components and retains the established UI styles rather than introducing a new visual system. Every migration needs explicit approval and a dry run, because one Supabase project serves development and production (D-014, D-015).
- Source: "[Binder & Decks] Planning"

## D-038: Keycloak realm and client as identity source for Supabase

- Status: Accepted
- Date: 2026-11-05
- Decision: Use a dedicated realm (e.g. `oracle-binder`) on the existing Pikapod Keycloak server, with one confidential client that Supabase uses to sign users in. Supabase's built-in `keycloak` OAuth provider is used; Keycloak is not a Supabase third-party auth issuer.
- Why: A realm isolates users, clients and sessions, so the other app on the same server is unaffected. Supabase needs a client ID, a client secret and the realm URL, so Keycloak is configured first. The Pikapod is publicly reachable, which hosted Supabase requires.
- Alternatives considered: The `master` realm (reserved for administering Keycloak). Reusing the other app's realm (mixes users). A second Keycloak server (more cost and upkeep). Supabase third-party auth (its supported list is Clerk, Firebase Auth, Auth0, AWS Cognito and WorkOS, not Keycloak). Google/GitHub login through Supabase, or custom SMTP, which are lighter but were not chosen.
- Consequences: Not implemented yet. Both apps share one server, so downtime and upgrades affect both. Accounts are separate per realm. Email settings are per realm, so verification and password-reset emails need their own SMTP or must stay off; email sending is still unsolved.
- Source: "[Auth] Keycloak realm for Supabase"

### Instructions (Keycloak admin console)

1. Create the realm `oracle-binder`. Do not use `master`.
2. Create a client in that realm: protocol OpenID Connect, Client ID e.g. `oracle-binder-supabase`, Client authentication **On** (a confidential client has a secret), Standard flow **On**. Labels vary by Keycloak version; match them to your console.
3. Add Supabase's callback as a valid redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. This is Supabase's address, not the app's.
4. Copy the secret from the client's Credentials tab. It goes only into the Supabase dashboard, never into the repo, `.env` or a chat.
5. Open `<server>/realms/oracle-binder/.well-known/openid-configuration` in a browser to confirm the base URL (including any path prefix the Pikapod adds). The `issuer` value is the realm URL Supabase needs.
6. Leave "Verify email" and "Forgot password" off for now, or configure SMTP in the realm's Email settings.
7. Check the Keycloak version. From version 22 the `openid` scope must be passed (handled in D-006).

Check: the discovery URL returns JSON whose `issuer` ends in `/realms/oracle-binder`.

## D-039: Supabase project and Keycloak provider configuration

- Status: Accepted
- Date: 2026-11-05
- Decision: Create a Supabase project, enable its built-in Keycloak provider with the D-004 values, and allow the app's URLs as redirect targets.
- Why: Supabase Auth stays the session issuer, so `auth.uid()` and RLS work without changes. The app talks only to Supabase, never directly to Keycloak.
- Alternatives considered: Supabase third-party auth (Keycloak is not supported). Social login through Google or GitHub (simpler, not chosen).
- Consequences: Not implemented yet. The client secret lives only in the Supabase dashboard. The redirect allowlist must contain every origin the app runs on, or sign-in fails on the way back. Supabase's default email sender only reaches the project team's addresses, so email/password and magic-link sign-in for real users need custom SMTP; Keycloak sign-in does not depend on it.
- Source: "[Auth] Supabase Keycloak provider"

### Instructions (Supabase dashboard)

1. Create the project. Note the project reference (the `<project-ref>` in `https://<project-ref>.supabase.co`); it must match the callback URL registered in D-004 step 3.
2. Enable the provider under Authentication, Providers, **Keycloak**, and enter: Client ID (D-004 step 2), Client secret (D-004 step 4), Keycloak URL (the realm URL from D-004 step 5).
3. Under Authentication, URL Configuration, set the Site URL to `https://oraclebinder.netlify.app` and add these Redirect URLs: `https://oraclebinder.netlify.app/**` and `http://localhost:5173/**` (check your Vite port).
4. Copy the project URL and the *publishable* key for the app. Never use the `service_role` key in this app: it bypasses RLS and every `VITE_` variable is public.
5. Leave email settings for now (see Consequences).

Check: the Keycloak provider shows as enabled. The full sign-in test happens in D-006.

## D-040: App-side authentication (client, provider, route guard)

- Status: Accepted
- Date: 2026-11-05
- Decision: Add a Supabase client, an `AuthProvider` with a `useAuth` hook, sign-in/out controls, and a protected-route layout for the user-owned pages, in that order.
- Why: This mirrors the existing `ThemeContext` / `ThemeProvider` pattern, uses the existing React Router layout routes, and keeps each change to one purpose.
- Alternatives considered: Calling `supabase.auth` directly in components (duplicates session logic). A third-party auth library (new dependency, not needed).
- Consequences: Not implemented yet. Adds one dependency (`@supabase/supabase-js`). Favorites, collection and decks stay placeholders until they have storage and RLS (a later decision). `PersistenceProvider` persists only Scryfall queries, so no user data reaches `localStorage`. The route guard only controls what the UI shows; real protection comes from RLS policies.
- Source: "[Auth] App-side Supabase auth"

### Instructions (one step at a time, each approved first)

1. Add the dependency: `npm install @supabase/supabase-js` (needs approval).
2. Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, after confirming `.gitignore` excludes it. Never paste values in chat.
3. Type the variables in `src/vite-env.d.ts` with an `ImportMetaEnv` interface (both `string`).
4. Create `src/lib/supabase.ts`, a module singleton:

   ```ts
   import { createClient } from "@supabase/supabase-js";

   export const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
     { auth: { flowType: "pkce" } },
   );
   ```

   Verify the PKCE option against the supabase-js docs for the installed version.
5. Create `src/features/auth/AuthContext.ts` with the context and a `useAuth` custom hook, like `ThemeContext.ts`.
6. Create `AuthProvider.tsx` in the same folder. Load the session once, then subscribe to changes, with cleanup:

   ```tsx
   useEffect(() => {
     supabase.auth.getSession().then(({ data }) => {
       setSession(data.session);
       setIsLoading(false);
     });
     const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
     return () => data.subscription.unsubscribe();
   }, []);
   ```

7. Mount `AuthProvider` in `AppProviders.tsx` above `RouterProvider`, next to `ThemeProvider`.
8. Add sign-in and sign-out to the V2 navbar:

   ```ts
   supabase.auth.signInWithOAuth({ provider: "keycloak", options: { scopes: "openid" } });
   supabase.auth.signOut();
   ```

9. Add a `ProtectedRoute` layout: render `<Outlet />` with a session, nothing while `isLoading`, otherwise `<Navigate to="/v2/home" replace />`. Wrap `/v2/favorites`, `/v2/collection` and `/v2/decks` in `router.tsx`. AGENTS.md requires route-relative navigation inside the layouts; confirm the absolute redirect is acceptable for this V2-only guard before changing it.
10. Run `npm run typecheck` and `npm run build`; both should pass. `npm run lint` still has the 19 existing errors, so compare against that baseline. Then test manually: sign in through Keycloak and return to the app, reload and stay signed in, open `/v2/favorites` signed out (redirects) and signed in (shows), then sign out and confirm the guard works again.

## D-044: Search page shell, toggles and naming rule

- Status: Accepted
- Date: 2026-11-07
- Decision: On `/v2/search`, `CardBrowserPage` (mode `search`) renders a new `SearchControls` (`src/features/search/`) in place of the header hint. It holds two toggles: source (`scryfall` | `collection`, default `scryfall`, param `source` unchanged) and search type (`simple` | `advanced`, default `simple`, param `s_mode`). The existing `SearchSourceToggle` is moved there, not rewritten.
- Why: All searching lives in one page; `q`/`source` links keep working; the `s_` prefix and the "Search" vs "Filter & sort" titles stop search inputs and local filters from being confused.
- Alternatives considered: A separate advanced route (more routes); renaming filter params (breaks existing links, a public contract change).
- Consequences: Supersedes the navbar-toggle part of D-019. `/v2/search/advanced` (placeholder `AdvancedSearch` in `App.tsx`) becomes a redirect to `/v2/search?s_mode=advanced`. The `search/random` route and mulligan mode are untouched. Touches 3+ files: show a plan first.
- Source: "[Search] Search refactor"

## D-045: Navbar cleanup

- Status: Accepted
- Date: 2026-11-07
- Decision: After D-044, remove the search field and source toggle from `NavBarDesktop.tsx` and `NavBarMobile.tsx`. The existing "Search" item in `navItems.ts` points to `search` instead of `search/advanced`. `NavThemeToggle` moves between Decks and Logout. Signed-out users still get the login prompt from protected pages, as today.
- Why: Done after D-044 so search is never unreachable; home stays the landing page.
- Alternatives considered: Doing it first (a gap with no search); adding a Login item (deferred to later user/preferences work).
- Consequences: In `NavBar.tsx` and `types.ts`, drop `searchSource`, `onSearchSource*`, `onSearch` and the mobile `searchFocused` state. Delete only after your approval: `NavSearchField.tsx`, `src/assets/icons/navigation/QuickSearchIcon.tsx` (used only by NavSearchField), the `SearchSourceToggle` files in `navigation/` once moved by D-044, the `.nav-search*`, `.nav-source-toggle` and `.nav-bar--search-focused` rules in `navbar-shared.css`, `navbar-desktop.css` and `navbar-mobile.css`, the `AdvancedSearch` function in `App.tsx` and its import in `router.tsx`. Update the `.nav-search` comment in `NavThemeToggle.css`. Check with `grep` before each deletion.
- Source: "[Search] Search refactor"

## D-046: Collection scope and name search

- Status: Accepted
- Date: 2026-11-07
- Decision: With `source=collection`, results are the union of favorites (`favoriteIdList`), owned binder copies (`status === "owned"`) and deck entries of any kind (owned/proxy/virtual from `useDeckManagement`), built in `personalCardIds` in `useCardBrowserResults.ts` and hydrated by the existing `useScryfallCardsForIds("personal", …)`. Simple search applies the same case-insensitive name `includes` on `q` that is already used for favorites in Scryfall mode.
- Why: Collection name search is not implemented today: the personal branch of `displayCards` returns every personal card and ignores `q`.
- Alternatives considered: A separate collection hook (duplicates hydration and caching).
- Consequences: `CardTile` already shows Favorites, Binder and Decks icons; check `CardTile.tsx` for proxy/virtual and only add what is missing. The `personal` cache key contains the ID list, so any change in the collection rehydrates all cards; watch performance on large collections.
- Source: "[Search] Search refactor"

## D-047: Filter and sort by place and kind

- Status: Accepted
- Date: 2026-11-07
- Decision: Extend `useCardsTable(cards, cardPlaces?)` with an optional `Map<scryfallId, {favorite, binders[], decks[{id, kind}]}>` built from the D-046 sources. New `FilterCategory` values `place` (binder or deck, multi-select) and `kind` (owned/proxy/virtual/favorite, multi-select) are added to `columns.ts`, `filterParams.ts` (`place`, `kind`) and `filterCategories.ts`. They show only when `cardPlaces` is passed. A new sort key `place` is added to `SORT_KEYS`.
- Why: Reuses the TanStack Table and nuqs filter pipeline, so no separate filtering code exists for collection results.
- Alternatives considered: Filtering before the table (duplicates filter logic); a new filter panel (inconsistent UI).
- Consequences: Passed only by the Search page (collection source) for now. Binder, Decks and Favorites pages already have their own location selectors and are unchanged. A card in several places matches any of them. Sorting by `place` uses the alphabetically first place name (assumption).
- Source: "[Search] Search refactor"

## D-048: Card-name catalog prefetch (stale at 04:00)

- Status: Accepted
- Date: 2026-11-07
- Decision: Prefetch `https://api.scryfall.com/catalog/card-names` once with `usePreFetchUrl` (data purpose `cardNames`), reading it with `useFetchUrl`. Stale time = until the next 04:00 local time, computed from `query.state.dataUpdatedAt` by a small helper. `staleTimeInSeconds` in both hooks accepts `number | ((query) => number)`.
- Why: Avoids repeated Scryfall requests; the catalog has no fixed refresh cycle, so a fixed daily boundary is simplest. `createApiClient` cannot be used because it rejects a `data` array of strings. Measured size: 703,493 bytes (about 687 KB), small enough to keep the app's default persistence.
- Alternatives considered: Scryfall `/cards/autocomplete` (one request per search, more calls); a plain 24 h stale time (refreshes at arbitrary hours); excluding the catalog from persistence (not needed at this size).
- Consequences: No change to `shouldDehydrateQuery`: queries keyed `fetchedUrl` are already persisted, in the single `REACT_QUERY_OFFLINE_CACHE` localStorage entry. The default `maxAge` (24 h, not set in `PersistenceProvider.tsx`) and `gcTime` (24 h in `queryProvider.ts`) already fit; a restored catalog older than 04:00 is stale and refetched. Quota check after implementing: that same entry also holds symbols, sets and every `cards/search` page (full Scryfall cards), so run `localStorage.getItem("REACT_QUERY_OFFLINE_CACHE").length` in the console after several searches. If it exceeds about 2 million characters (a safety margin, since the limit is typically about 5 MB), exclude `cardNames` in `shouldDehydrateQuery` and note it in the CHANGELOG as a persisted-data change. Also run `typecheck` to confirm the installed `@tanstack/react-query` (^5.104) accepts a function `staleTime`; the 04:00 boundary assumes local time.
- Source: "[Search] Search refactor"

## D-049: Name autocomplete (native datalist)

- Status: Accepted
- Date: 2026-11-07
- Decision: One reusable `NameAutocomplete` (`src/features/search/`) built on a native `<datalist>`, fed with a name list and showing at most 20 matches once the input has 4 or more characters. Sources: Scryfall card names (D-048, Scryfall source), collection card names (D-046, collection source), set names (`scryfallSets`, already prefetched).
- Why: Simplest approach, no dependency; limiting the options keeps the browser fast with tens of thousands of names.
- Alternatives considered: A custom dropdown or library (more code or a new dependency).
- Consequences: Styling is limited by the browser. Matching is case-insensitive on the typed text; add a `<label>` for accessibility. The same component is used by simple search, advanced name and set fields.
- Source: "[Search] Search refactor"

## D-050: Advanced filter model and Scryfall query builder

- Status: Accepted
- Date: 2026-11-07
- Decision: One typed `AdvancedSearchFilters` object with nuqs parsers (all `s_`-prefixed): `s_name`, `s_text`, `s_type`, `s_flavor`, `s_colors` + `s_colors_op`, `s_identity` + `s_identity_op` (operators `exactly` | `includes` | `atmost`), `s_mana` (symbol sequence), `s_formats` (format + `legal` | `restricted` | `banned`), `s_rarity` (multi), `s_price_min`/`s_price_max` (EUR). A `toScryfallQuery(filters)` function builds the `q` string, passed to the existing `useScryfallCardPages`.
- Why: One model feeds the form, the URL and the collection matcher (D-052); the prefix avoids collisions with `colors`, `rarity` and `type`.
- Alternatives considered: Building the string inside the form (not reusable); a free-text syntax box (less friendly).
- Consequences: Check each Scryfall operator in their syntax docs before coding. When a price is set, add `unique=prints` (prices are per printing). Submit on button press, not per keystroke, to limit requests.
- Source: "[Search] Search refactor"

## D-051: Advanced search form

- Status: Accepted
- Date: 2026-11-07
- Decision: `AdvancedSearchForm` (`src/features/search/`), shown when `s_mode=advanced`, for both sources. Name and set fields reuse D-049. Text-on-card and mana cost use symbol dropdowns from the prefetched `cardSymbols` (symbol + meaning). Mana cost is a symbol builder that appends symbols (e.g. `{2}{U}{U}`) with a clear button. Colors and identity are multi-selects with an operator select.
- Why: Reuses cached data and existing components.
- Alternatives considered: A single-symbol mana select (cannot express a full cost).
- Consequences: Local filters (`CardFilters`, "Filter & sort") remain on the results below and refine only the loaded results.
- Source: "[Search] Search refactor"

## D-052: Advanced search over the collection

- Status: Accepted
- Date: 2026-11-07
- Decision: With `source=collection`, `matchesAdvancedFilters(card, filters)` in `src/features/search/` applies the D-050 filters to the hydrated cards from D-046, mirroring each field of `toScryfallQuery`.
- Why: The hydrated cards are already full Scryfall objects, so no schema change or migration is needed.
- Alternatives considered: Querying Scryfall with a list of IDs (query length limits); copying card data into Supabase (migration, duplication).
- Consequences: Two implementations of the same semantics must be kept in sync (add tests for both). Extend `CardBrowserCard` and `isCardBrowserCard` in `card-browser/types.ts` with `color_identity` and `flavor_text`. Use face-level fallbacks for `colors`, `type_line`, `oracle_text` and `flavor_text` as `columns.ts` already does.
- Source: "[Search] Search refactor"

## D-053: Audit and streamline the project CSS

- Status: Accepted
- Date: 2026-11-21
- Decision: Refactor in 7 small phases, one commit or PR each, on `feature/css-review`. Component CSS stays beside its component (existing rule); only proven duplicates move to shared files. Every phase must leave the app looking exactly the same. After every phase run `npm run build`, `npm run lint` (6 errors already exist and are the baseline), `npm run typecheck` and `node --experimental-strip-types --test "tests/**/*.test.ts"` (2 binder palette tests already fail and are the baseline). Phases 1 and 2 are also checked by a token-resolution comparison: resolve every `var()` for both themes and compare each selector's final declarations with the baseline. That check cannot see cascade-order or specificity changes, so phases 3 to 6 additionally need the developer to check, in a browser, the 4 pages (Search, Favorites, Binder, Decks) plus the card overlay in both themes at 390 px and 1280 px.
  - **0. Baseline (no code change):** recorded in "Why" below (taken on `feature/css-review` @ `266cc9d`, with `wc -l $(find src style.css -name "*.css")` and the raw and gzip size of `dist/assets/*.css` after `npm run build`). These numbers are the acceptance reference. Screenshots are taken by the developer and are not stored in the repository.
  - **1. Tokens (done 2026-11-17):** `src/theme.css` moved to `src/styles/tokens.css` (`main.tsx`, the navigation CSS and README comments, `AGENTS.md` and the docs updated). The shared `:root` block now also holds shape (`--radius-sm|md|lg|card`; the 9 literal `999px` use the existing `--control-radius`), motion (`--duration-fast` 0.2 s and `--duration-slow` 0.5 s, the two values that are used more than once; the 0.4 s and 0.8 s first proposed are used twice and only in the splash, and mapping the 0.5 s uses to 0.4 s would change timing), a z-index scale for the 7 global layers with the same numbers (`--z-filters` 90, `--z-notice` 95, `--z-nav` 100, `--z-nav-notice` 101, `--z-popover` 105, `--z-overlay` 110, `--z-dialog` 120; local 0 to 2 and the splash's 10 and 9999 stay literal), and colors that do not change with the theme (`--gold-fixed`, `--gold-deep`, `--highlight`, `--text-error`, `--bone-white`, `--mana-w|u|b|r|g` and 14 `--rarity-*` colors, 23 of them used once, which is the price of keeping every hex value in the token file). Removed as unused: `--bg-color`, `--bg-overlay` and `--text-header` (the swatch check mark first used `--text-header`, but it is `#e8edea` in the light theme and `#e2ebd5` in the dark one, so it now uses the fixed `--bone-white`). `--font-display` is kept (the navigation README says it is deliberately unused). Color literals outside the token file: 36 to 7, all in `style.css` (the splash CSS, which loads before the tokens). The colors that are constant across themes use `color-mix` of `--gold-fixed`, `--highlight` or `--sublayer-bg`, never `--btn-gold`, which changes in the light theme. `--focus-ring` moves to Phase 2, where the global focus rule uses it.
  - **2. Base (decided 2026-11-21, not yet implemented on the branch; start here when resuming):** the developer chose Option A for both open choices. Work from the tip of `feature/css-review` (`5960680` when this was written) and re-measure first. An earlier attempt was lost with its sandbox before it was committed, so nothing of it exists as files; the plan, the findings and the verification below are what it established.
    - **Files:** (1) create `src/styles/base.css` with exactly four rules: `body { font-size: 19px }`, the same at `@media (max-width: 480px)` with 16px, one global `:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }`, and one `@media (prefers-reduced-motion: reduce)` rule on `*, *::before, *::after` setting `animation-duration: 0.01ms`, `animation-iteration-count: 1` and `transition-duration: 0.01ms`, all `!important`. (2) Add `--focus-ring: 2px solid var(--text-accent);` to the shared `:root` block of `tokens.css`. (3) `git mv style.css src/styles/splash.css`, add a header comment, and change the link in `index.html` to `/src/styles/splash.css`; it keeps its reset, `#root`, the splash rules and its own literal values. `#root` stays there and not in `base.css` as first written, because its `.visible` toggle is part of the splash handshake. (4) Delete the `body` rules from `App.css`: the background duplicates the one in `splash.css`, and the font size moves to `base.css`. (5) In `main.tsx` import `./styles/tokens.css` and `./styles/base.css` before `AppProviders`; today the tokens are imported after the app, so the built bundle puts them last, and `base.css` must come early so component CSS wins ties. (6) Docs: `tokens.css` header comment ("Only style.css"), `AGENTS.md` lines 103 and 200, `docs/file-conventions.md` line 35 (global styles list), and add `base.css` and `splash.css` rows to `docs/architecture/code-reference.md` next to the `tokens.css` row.
    - **Focus ring (Option A):** 16 component rules repeat `outline: 2px solid var(--text-accent)`. Delete the 9 that equal the global ring (offset 2px): the `.binder-copy-form` group in `Binder.css`, the close and flip controls in `CardDetailsOverlay.css`, `.nav-theme-toggle`, `.nav-item`, the `.advanced-search` group, three rules in `SearchControls.css`, and `.search-source-toggle`. Slim the 5 with a 3px offset to `outline-offset: 3px` only: the auth form, `.binder-page__binder-cover`, the two pagination rules (`CardBrowserPage.css`, `FavoritesPage.css`) and `.browser-card__media, .browser-card__action`. Keep 2 drawing their own ring with `outline: var(--focus-ring)`: the swatch chip in `BinderFormDialog.css` (the ring belongs on the chip, not on the hidden radio; offset 4px) and `.browser-card--proxy .browser-card__media:focus-visible`, because a more specific non-focus rule gives that element `outline: 1.5px dashed`, which would otherwise beat the global ring. About 45 controls had no ring of their own and showed the browser default (the Decks page, the card filters, the Binder toolbar and the two popovers); they now show the app ring. This is the only intentional visual change in D-053.
    - **Reduced motion (Option A):** 5 files have a block today. Remove the blocks in `navbar-shared.css`, `SearchSourceToggle.css`, `CardFilters.css` and `CardTile.css`. In `BinderPage.css` remove only the `transition: none` part and keep `.binder-page .binder-page__binder-cover:hover { transform: none; }`, because the global rule shortens durations but does not cancel the hover lift. The mobile navbar and the floating filters had a deliberate fade in place of the slide; with the global rule they become instant. `!important` in `base.css` is the one allowed exception to Phase 7's "no `!important`" rule (the component rules are more specific); the existing one in `AuthPages.css` is a separate item for Phase 4.
    - **Verification:** Phase 1's comparison script was lost, and Phase 2 needs a different one because files are renamed and rules deleted or slimmed. Rebuild it to check, against a pristine clone of the starting commit, for both themes: all tokens unchanged and only `--focus-ring` added; `base.css` holds exactly the four rules above; every existing `:focus-visible` selector keeps the same effective outline and offset (global ring plus component overrides); a focus rule is not deleted when a more specific non-focus rule also sets `outline` for the same element; `body` ends with the same final declarations by default and at 480px, taking the bundle order (splash, base, `App.css`) into account; no `prefers-reduced-motion` block is left outside `base.css` except the cover hover one; `!important` appears only in `base.css` (3) and the existing `AuthPages.css` one; no color literals outside `tokens.css` and `splash.css`. Prove the script by sabotaging a copy at least ten ways (an offset, the cover rule deleted, the proxy outline, the body size, a literal color, a dropped `!important`, an extra reduced-motion block) and confirming each is caught. It cannot see rendering, so after the diff the developer should: Tab through the Decks page, the filters, the Binder toolbar and both popovers in both themes; turn on the operating system's reduce-motion setting and check the mobile navbar, the floating filters and the binder cover hover; check the body text at 390 px and 1280 px; and reload to see the splash.
    - **Expected result, unconfirmed because the attempt was lost:** about 3,150 lines (from 3,197) and about 8,735 bytes gzip (from 8,793), `npm run typecheck` clean, `npm run lint` at the 6 baseline errors, tests at 64 of 66 (the 2 binder palette failures are the baseline). Report the real numbers.
    - **Tips from the first attempt:** use `bash`, not `sh`, for `${PIPESTATUS[0]}` and process substitution; delete rule blocks with exact-text replacement and an expected count so a mismatch stops the script; do not commit the `package-lock.json` change that `npm install` makes in a sandbox.
  - **3. Shared layout layer:** `src/styles/layout.css`, declared with `@layer layout`, with `.page` (shell: box-sizing, width, `min-height: 100dvh`, padding), `.page__notice`, `.page__heading`, `.page__toolbar`, `.page__message`, `.card-grid` (flex list + card width rule incl. the 540 px `min(calc(var(--card-image-width) + 1.45rem), …)` rule), `.count-badge`, `.pagination`. Component CSS stays unlayered, so it still overrides the layer without touching specificity. Add the classes in the 4 page components and `CardTile`, then delete the duplicates from `CardBrowserPage.css`, `FavoritesPage.css`, `BinderPage.css`, `DecksPage.css`, `CardTile.css`. The Binder and Decks pages share more rules than the first audit found (heading, toolbar, message, action buttons), so those move too.
  - **4. Selector hygiene:** one block per component file named `block__element--modifier`. Replace the descendant element selectors (123 by the parser count below, e.g. `.deck-page button`) with class selectors, starting with the 4 pages, `Binder.css` (27) and `AdvancedSearchForm.css` (12). Give the form fields one shared set of classes, so `BinderFormDialog` no longer reuses `.binder-copy-form` and the input rules stop being repeated in `SearchControls.css` and `AdvancedSearchForm.css`. Remove the single `!important` in `AuthPages.css`. Element selectors only in `base.css`.
  - **5. Breakpoints:** keep two, `540px` and `860px` (CSS variables cannot be used in media queries, so document them as a comment in `tokens.css`); fold the one-off `480px`, `760px` and `1040px` rules into them after a visual check. Replace remaining `100vw` (25 uses, page widths) with `100%` and `100vh` (9 uses) with `100dvh`, except fixed overlays, which use `inset: 0`.
  - **6. Speed:** no CSS file is large; gains come from rendering cost. (a) Add `content-visibility: auto` with `contain-intrinsic-size` to `.browser-card` (up to 175 cards per page); test scrolling, keyboard focus and the overlay. (b) Replace the splash `pulse` animation, which animates `filter: drop-shadow`, with `transform`/`opacity` only. (c) Keep the 6 `backdrop-filter` blurs (navbar, filters, three overlays, `App.css`), but verify their cost in DevTools Performance on a phone-sized viewport and drop the weakest one if it costs frames. (d) Review the 9 `-webkit-` declarations against the supported browsers.
  - **7. Guardrails and docs:** update the CSS lines in `docs/file-conventions.md`, `docs/theme/theme.md`, `src/features/navigation/README.md` and `AGENTS.md` (paths, shared files, naming, token rule: no hard-coded colors, durations, z-index or radii; new CSS written after Phase 1 follows these rules). Optionally add `stylelint` as a dev dependency (needs approval) with rules: no hex/rgb colors outside `tokens.css`, no `!important`, no element selectors outside `base.css`, and a `lint:css` script.
- Why: First written on 2026-11-07 from an audit of `dev` @ `9a5d883`, before D-044 to D-057; refreshed on 2026-11-17 on `feature/css-review` @ `266cc9d`, after that work added 3 files and 295 lines and repeated some of the patterns this decision removes. Baseline (Phase 0): 20 CSS files and 3,142 lines; one built bundle, `dist/assets/index-D11-30hf.css`, of 51,742 bytes raw and 8,536 bytes gzip; 420 rules and 215 class names; 36 color literals outside the tokens file (listed in phase 1); 19 tokens, 4 of them unused (`--bg-color`, `--bg-overlay`, `--text-header`, and `--font-display`, which is deliberately kept); 12 z-index values (0, 1, 2, 10, 90, 95, 100, 101, 105, 110, 120, 9999); 10 transition and animation durations; 6 breakpoint values for 5 breakpoints (861/860, 540, 760, 480, 1040); 1 `!important`; `100vh` 9, `100vw` 25 and `100dvh` 5 uses; 6 `backdrop-filter` and 9 `-webkit-` declarations; 16 copies of the focus ring; 5 files that handle `prefers-reduced-motion`; `body` styled in both `style.css` and `App.css`; 123 descendant element selectors; 23 rule bodies of 3 or more declarations repeated across files (the page shell, notice, card list and card-width rules in the 4 pages, the Binder and Decks heading, toolbar and message rules, the page `h1` rule in three files); lint 6 errors, typecheck clean, 66 tests of which 64 pass. The 2 failures are binder palette tests unrelated to CSS: the palette now has 12 colors, and its "Gray" `#8da399` has about 1:1 contrast with the logo gold; they are the baseline until the palette is settled separately. The counts of rules, class names, selectors and duplicates come from a CSS-parser script, so they are comparable only with a later run of the same script; line counts and gzip size can be reproduced with the commands in Phase 0. Grep reports class names not found in source, but they are built dynamically (`browser-card--${kind}`, rarity, legality, color and deck kind pills), so none is safely deletable by grep alone.
- Alternatives considered: Rewrite with Tailwind or CSS-in-JS (new dependency, rewrites every component, loses the existing token system); one big global stylesheet (against `file-conventions.md`); merge all component CSS into layers (large change, little gain); only delete duplicates without tokens (leaves the literals and drift); a new decision for the refreshed plan instead of updating this one (two overlapping entries for one refactor).
- Consequences: Class names and CSS are not part of the public contract (AGENTS.md), so no `### Breaking` entry; the only user-visible change allowed is none (acceptance = no visual difference). Success = fewer CSS lines than 3,142 and a smaller gzip size than 8,536 bytes, not a promised percentage. Do not delete a class unless it is absent from source after expanding template strings; check unused rules with Chrome DevTools Coverage on each page. No CSS file split without a matching component split. Claude has no browser in this environment, so the token-resolution comparison covers phases 1 and 2 only; every later phase relies on the developer's visual check, and a phase is not accepted until that check is done. Phases 1, 3 and 4 touch about 10 to 15 files each and need a short plan before starting; phases 2 and 7 are small. Moving `theme.css` and `style.css` changes paths in `main.tsx`, `index.html` and the docs only. The Phase 0 numbers move whenever CSS is added, so later phases re-measure from the commit they start on. After Phase 1: 20 files and 3,197 lines (+55); one bundle of 53,739 bytes raw and 8,793 bytes gzip (+1,997 and +257, about 3 percent: the tokens are new declarations and `var(--name)` is not shorter than the value it replaces); 53 tokens, only `--font-display` unused; 7 color literals outside the token file; all global z-index layers, shared radii and the two shared durations tokenized. Phase 1 was checked by resolving every `var()` and `color-mix()` for both themes and comparing each rule's final declarations with the Phase 0 commit: 417 rules and 1,619 declarations per theme, zero differences (the comparison found one mistake, the check-mark color above, and also fails when a hex digit, a z-index, a duration or a radius is changed on purpose). Phase 1 grows the CSS, so the size target of this decision now depends on phases 2 to 4; the 23 single-use tokens are the first place to look if it is not met.
- Source: "[CSS] Audit and streamline"

## D-054: Set filter and form details for advanced search

- Status: Accepted
- Date: 2026-11-08
- Decision: Add `s_set` (a set code) to `AdvancedSearchFilters`, with a nuqs parser and a `set:<code>` term in `toScryfallQuery`. `AdvancedSearchForm` (D-051) shows set names through `NameAutocomplete` and converts the chosen name (or a typed code) to its code on submit; an unknown set shows an inline error and does not submit. The form keeps a local draft and writes the `s_` parameters through `useQueryStates` only when Search is pressed; Reset clears them all. Colors, identity and rarity are checkbox groups; formats are a format + status pair added as removable chips. The mana select lists only symbols with `appears_in_mana_costs` that pass `isValidManaSequence` (now exported); the text select lists every non-funny symbol. A new `useCardSymbols` hook reads the existing `cardSymbols` query.
- Why: D-051 reuses the set autocomplete, but the D-050 model had no set field, and Scryfall's `set:` operator takes a code, not a name. Checkboxes avoid Ctrl-click on `<select multiple>`, which is awkward on mobile. Draft state keeps one request per search, as D-050 requires.
- Alternatives considered: Storing the set name in the URL (not a valid Scryfall value and breaks if a name changes); `<select multiple>` for colors and rarity (poor on touch); per-keystroke URL updates (many requests); changing `useOracleText` to share the new hook (unrelated change, left for later).
- Consequences: `s_set` is a new URL parameter (additive, not breaking). D-052 must mirror `s_set` in `matchesAdvancedFilters` against `card.set`, and tests must cover both implementations. Until D-052 ships, `source=collection` ignores the advanced filters and `SearchControls` says so; remove that notice with D-052. Hybrid Phyrexian costs such as `{G/W/P}` are not offered in the mana select because `isValidManaSequence` rejects them. The form copies the URL only on mount, so browser back/forward does not refresh an already-open form (known limitation). `useOracleText.tsx` still has its own copy of the symbol type guard. Not browser-tested: server render and query-builder checks only.
- Source: "[Search] Search refactor"

## D-055: Collection matcher semantics and tests

- Status: Accepted
- Date: 2026-11-08
- Decision: `matchesAdvancedFilters(card, filters)` (D-052) mirrors `toScryfallQuery` field by field and shares its validators (`isValidSetCode`, `isValidManaSequence`, `isValidPrice`), so invalid input is ignored by both. Rules: name, type, flavor and oracle text are case-insensitive substrings; text and mana cost are checked on the card and on every face, and `~` in the oracle text is replaced by the card or face name; `set` compares `card.set` to the code; colors and identity use set equality, superset and subset (colors fall back to the front face, colorless passes "at most"); mana cost passes when the cost contains every chosen symbol at least as many times; `legal` accepts `legal` and `restricted`, `restricted` and `banned` are exact, and every chosen format must match; rarity is any of the chosen values; a card without a EUR price never passes a price bound. With no filters, every collection card is kept, like simple collection search with an empty name. `q` is ignored in advanced mode. Tests are a dependency-free `node:test` table in `tests/search/matchesAdvancedFilters.test.ts` that checks the query string and the kept cards for the same filters.
- Why: Hydrated collection cards are full Scryfall objects, so a pure function avoids a migration and Scryfall's query length limits. Face-level text matching copies Scryfall, which matches any face; D-052 only said "fallback", which would miss back-face text. One shared table is the cheapest way to keep two implementations in sync without a framework. Two rules were verified on scryfall.com on 2026-11-08: `m:R` returns Char ({2}{R}), so `m:` means "contains at least"; `f:vintage` returns Black Lotus (restricted), so `f:` accepts restricted cards.
- Alternatives considered: Matching only the front face (misses back-face text); exact mana cost matching (contradicted by the check above); adding Vitest (a new dependency, not needed yet); a `test` npm script (edits `package.json`, deferred).
- Consequences: Known approximations, not checked against Scryfall: `~` uses the full card or face name, so cards whose text uses a shorter name (for example "Niv-Mizzet" for "Niv-Mizzet, Parun") will not match; generic mana symbols are compared as separate symbols, so `{3}{U}` does not contain `{2}{U}` (whether Scryfall treats generic mana as a number was not checked); Scryfall's accent and punctuation normalization is not reproduced. Two implementations must still change together: edit the test table first. `tests/` is outside `tsconfig.json` and is not covered by `npm run typecheck`; it needs Node 22 with `--experimental-strip-types`. The temporary D-051 notice that advanced filters did not apply to the collection is removed. `CardBrowserCard` gains optional `color_identity` and `flavor_text`; a card with an invalid value in either field now counts as invalid card data.
- Source: "[Search] Search refactor"

### D-056: Colored binder covers

- Status: Accepted
- Date: 2026-11-15
- Decision: A binder cover on the Binder page no longer shows a card print. It keeps the card shape (488:680, rounded corners), is filled with the binder's color and shows the vector app logo (`/logo.svg` in an `<img>` with `alt=""`) centered; deck covers do not change. The color is stored in a new `binders.color` column as lowercase `#rrggbb` (`text not null default '#1f2a6b'`, check `^#[0-9a-f]{6}$`, plus `grant update (color)`) and is chosen in one dialog: the page keeps only a "Create binder" button, which opens a dialog asking for a name and a color, and "Rename" becomes "Modify", which opens the same dialog to change both. The picker offers 10 colors, Navy `#1f2a6b` (default, first), Forest `#1f4526`, Olive `#3f3d14`, Violet `#4a3766`, Magenta `#6b1f5e`, Wine `#5a1a2e`, Oxblood `#7a2a2a`, Rust `#6e3312`, Umber `#523823` and Espresso `#2e1f1a`, and the "Loose" tile uses the same cover with a fixed Graphite `#33302d` that is not editable and not in the palette.
- Why: A color is quicker to scan than a card print that changes when the best card changes, and it gives the person a way to tell binders apart. Each palette color had to pass three checks against the logo: at least 3:1 contrast with the darkest logo gold (`#cb9131`), at least 3:1 with the darker sparkle teal (`#09a19f`), and a CIEDE2000 distance of at least 20 from both lens teals (`#067c85`, `#04505c`), so the lens does not vanish. The first two checks force dark colors, which also suits the dark teal theme. Storing hex lets a custom picker be added later without another migration. The grant is needed because updates on `binders` are granted per column: on a scratch PostgreSQL, removing it made a color update fail with "permission denied".
- Alternatives considered: A palette key such as `navy` instead of hex (a later palette change would recolor existing binders and custom colors would be impossible); browser storage for the color (does not sync between devices); keeping the card print (rejected); an inline SVG logo (the file carries a `:root` style block and fixed gradient ids that would leak into the page and clash across many covers); a single-color logo (needs a new asset); lighter colors (fail the gold contrast); teal, slate, charcoal and midnight-blue swatches that I first proposed (their distance from the lens teal is 4 to 18, so the lens disappears).
- Consequences: The migration `20261115163138_binder_color` and its rollback `supabase/rollback/20261115163138_binder_color_reverse.sql` must be applied to the linked project (dry run first) before an app version that reads or writes the color is deployed. The column default keeps older app builds working, because inserts without a color still succeed, and it fills existing binders with Navy. Rolling back drops every chosen color. The `Binder` type gains `color: string`, hand-edited in `src/types/database.ts` and to be confirmed by regenerating it. The app must accept any valid `#rrggbb` value from the database: if a binder's color is not in the palette, the dialog shows it as an extra "Current" swatch. `coverCard`, its rarity ranking and the binder use of `CardTile` are removed from `BinderPage.tsx`. The unique binder name index still applies, so a duplicate name in the dialog shows the database error. The lens teal blends into every cover by design; the gold ring and sparkle stay readable. In the dark theme covers sit close to the page background (contrast 1.1 to 1.6), so the edge comes from the existing gold hairline border and glow; in the light theme the contrast is 8 to 13. If the logo colors change, the palette must be re-checked. pgTAP assertions were added to `supabase/tests/binder_rls_test.sql` but not run, because that needs Docker; the same scenarios (default and backfill, constraint, own and other-user updates, grants, rollback and re-apply) were run against a scratch PostgreSQL with the repository's binder migrations. This entry covers the database change; the picker, cover, dialog and page changes are the next step.
- Source: "[Binder] Colored binder covers"

### D-057: Binder cover and dialog implementation

- Status: Accepted
- Date: 2026-11-15
- Decision: D-056 is implemented with `binderColors.ts` (palette, default, fixed Loose color and a hex guard), `BinderCover.tsx` (a card-shaped color button with `<img src={BASE_URL + "logo.svg"} alt="">` at 76% of the cover width), and `BinderFormDialog.tsx` (one dialog for create and modify: a name field and a radio-group of named swatches). `useBinders` now has `createBinder({ name, color })` and `updateBinder({ id, name, color })`, which replaces `renameBinder`. The Binder page keeps one "Create binder" button, "Rename" becomes "Modify", `window.prompt` and the inline name field are gone, and `coverCard` with its rarity ranking is removed.
- Why: The dialog holds a local draft and only `onSave` talks to the database, so a failed save keeps the dialog open with the message inline. Real radio inputs, visually hidden behind card-shaped chips with a check mark, give keyboard arrows and screen-reader names without relying on color alone. A color that is not in today's palette is kept as an extra "Current" swatch, so Modify never silently changes it. At 76% the drawing, which fills two thirds of `logo.svg`, is about half the cover width.
- Alternatives considered: A native `<select>` for the color (cannot show colors); `window.prompt` for modify (cannot hold a color); new standalone dialog CSS (the field, label and button styles already exist in `.binder-copy-form`, so the dialog reuses them and adds only the swatches); a live cover preview inside the dialog (deferred); a focus trap (not added, to match `AddBinderCopyDialog`, which has none).
- Consequences: This corrects one consequence of D-056. A render of the real logo on all ten colors and on Loose (checked by eye) shows the lens as a clearly visible teal gem on every cover; only its dark outer edge is close to the cover colors. The rule of a CIEDE2000 distance of at least 20 from both lens colors is therefore stricter than needed, and it stays as a conservative guard. A duplicate binder name (PostgreSQL error 23505) shows "You already have a binder with this name." Save is disabled until the name or color changes. `tests/binder/binderColors.test.ts` has 28 cases, reads the logo colors from `public/logo.svg` and the default color from the `*_binder_color.sql` migration, and was checked by breaking the palette and the default on purpose. The dialog and page were typechecked, built and linted but not clicked through in a browser; only the covers were rendered, outside the app. `AGENTS.md` also loses its stale "Advanced search remains a placeholder" statement, which has been false since D-051.
- Source: "[Binder] Colored binder covers"
