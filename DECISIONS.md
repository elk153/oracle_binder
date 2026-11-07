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


### D-044: Search page shell, toggles and naming rule

- Status: Accepted
- Date: 2026-11-07
- Decision: On `/v2/search`, `CardBrowserPage` (mode `search`) renders a new `SearchControls` (`src/features/search/`) in place of the header hint. It holds two toggles: source (`scryfall` | `collection`, default `scryfall`, param `source` unchanged) and search type (`simple` | `advanced`, default `simple`, param `s_mode`). The existing `SearchSourceToggle` is moved there, not rewritten.
- Why: All searching lives in one page; `q`/`source` links keep working; the `s_` prefix and the "Search" vs "Filter & sort" titles stop search inputs and local filters from being confused.
- Alternatives considered: A separate advanced route (more routes); renaming filter params (breaks existing links, a public contract change).
- Consequences: Supersedes the navbar-toggle part of D-019. `/v2/search/advanced` (placeholder `AdvancedSearch` in `App.tsx`) becomes a redirect to `/v2/search?s_mode=advanced`. The `search/random` route and mulligan mode are untouched. Touches 3+ files: show a plan first.
- Source: "[Search] Search refactor"

### D-045: Navbar cleanup

- Status: Accepted
- Date: 2026-11-07
- Decision: After D-044, remove the search field and source toggle from `NavBarDesktop.tsx` and `NavBarMobile.tsx`. The existing "Search" item in `navItems.ts` points to `search` instead of `search/advanced`. `NavThemeToggle` moves between Decks and Logout. Signed-out users still get the login prompt from protected pages, as today.
- Why: Done after D-044 so search is never unreachable; home stays the landing page.
- Alternatives considered: Doing it first (a gap with no search); adding a Login item (deferred to later user/preferences work).
- Consequences: In `NavBar.tsx` and `types.ts`, drop `searchSource`, `onSearchSource*`, `onSearch` and the mobile `searchFocused` state. Delete only after your approval: `NavSearchField.tsx`, `src/assets/icons/navigation/QuickSearchIcon.tsx` (used only by NavSearchField), the `SearchSourceToggle` files in `navigation/` once moved by D-044, the `.nav-search*`, `.nav-source-toggle` and `.nav-bar--search-focused` rules in `navbar-shared.css`, `navbar-desktop.css` and `navbar-mobile.css`, the `AdvancedSearch` function in `App.tsx` and its import in `router.tsx`. Update the `.nav-search` comment in `NavThemeToggle.css`. Check with `grep` before each deletion.
- Source: "[Search] Search refactor"

### D-046: Collection scope and name search

- Status: Accepted
- Date: 2026-11-07
- Decision: With `source=collection`, results are the union of favorites (`favoriteIdList`), owned binder copies (`status === "owned"`) and deck entries of any kind (owned/proxy/virtual from `useDeckManagement`), built in `personalCardIds` in `useCardBrowserResults.ts` and hydrated by the existing `useScryfallCardsForIds("personal", …)`. Simple search applies the same case-insensitive name `includes` on `q` that is already used for favorites in Scryfall mode.
- Why: Collection name search is not implemented today: the personal branch of `displayCards` returns every personal card and ignores `q`.
- Alternatives considered: A separate collection hook (duplicates hydration and caching).
- Consequences: `CardTile` already shows Favorites, Binder and Decks icons; check `CardTile.tsx` for proxy/virtual and only add what is missing. The `personal` cache key contains the ID list, so any change in the collection rehydrates all cards; watch performance on large collections.
- Source: "[Search] Search refactor"

### D-047: Filter and sort by place and kind

- Status: Accepted
- Date: 2026-11-07
- Decision: Extend `useCardsTable(cards, cardPlaces?)` with an optional `Map<scryfallId, {favorite, binders[], decks[{id, kind}]}>` built from the D-046 sources. New `FilterCategory` values `place` (binder or deck, multi-select) and `kind` (owned/proxy/virtual/favorite, multi-select) are added to `columns.ts`, `filterParams.ts` (`place`, `kind`) and `filterCategories.ts`. They show only when `cardPlaces` is passed. A new sort key `place` is added to `SORT_KEYS`.
- Why: Reuses the TanStack Table and nuqs filter pipeline, so no separate filtering code exists for collection results.
- Alternatives considered: Filtering before the table (duplicates filter logic); a new filter panel (inconsistent UI).
- Consequences: Passed only by the Search page (collection source) for now. Binder, Decks and Favorites pages already have their own location selectors and are unchanged. A card in several places matches any of them. Sorting by `place` uses the alphabetically first place name (assumption).
- Source: "[Search] Search refactor"

### D-048: Card-name catalog prefetch (stale at 04:00)

- Status: Evaluating
- Date: 2026-11-07
- Decision: Prefetch `https://api.scryfall.com/catalog/card-names` once with `usePreFetchUrl` (data purpose `cardNames`), reading it with `useFetchUrl`. Stale time = until the next 04:00 local time, computed from `query.state.dataUpdatedAt` by a small helper. `staleTimeInSeconds` in both hooks accepts `number | ((query) => number)`.
- Why: Avoids repeated Scryfall requests; the catalog has no fixed refresh cycle, so a fixed daily boundary is simplest. `createApiClient` cannot be used because it rejects a `data` array of strings.
- Alternatives considered: Scryfall `/cards/autocomplete` (one request per search, more calls); a plain 24 h stale time (refreshes at arbitrary hours).
- Consequences: Verify that the installed `@tanstack/react-query` (^5.104) accepts a function `staleTime` (run `typecheck`). The timezone is assumed to be local time. Persistence: queries keyed `fetchedUrl` are persisted to `localStorage` automatically, which risks the quota. Run `curl -s -H "User-Agent: oracle_binder-dev/1.0" -H "Accept: application/json" https://api.scryfall.com/catalog/card-names | wc -c`. If it is under about 1 MB, keep the default; otherwise exclude `cardNames` in `shouldDehydrateQuery` (record in CHANGELOG as persisted-data change).
- Source: "[Search] Search refactor"

### D-049: Name autocomplete (native datalist)

- Status: Accepted
- Date: 2026-11-07
- Decision: One reusable `NameAutocomplete` (`src/features/search/`) built on a native `<datalist>`, fed with a name list and showing at most 20 matches once the input has 4 or more characters. Sources: Scryfall card names (D-048, Scryfall source), collection card names (D-046, collection source), set names (`scryfallSets`, already prefetched).
- Why: Simplest approach, no dependency; limiting the options keeps the browser fast with tens of thousands of names.
- Alternatives considered: A custom dropdown or library (more code or a new dependency).
- Consequences: Styling is limited by the browser. Matching is case-insensitive on the typed text; add a `<label>` for accessibility. The same component is used by simple search, advanced name and set fields.
- Source: "[Search] Search refactor"

### D-050: Advanced filter model and Scryfall query builder

- Status: Accepted
- Date: 2026-11-07
- Decision: One typed `AdvancedSearchFilters` object with nuqs parsers (all `s_`-prefixed): `s_name`, `s_text`, `s_type`, `s_flavor`, `s_colors` + `s_colors_op`, `s_identity` + `s_identity_op` (operators `exactly` | `includes` | `atmost`), `s_mana` (symbol sequence), `s_formats` (format + `legal` | `restricted` | `banned`), `s_rarity` (multi), `s_price_min`/`s_price_max` (EUR). A `toScryfallQuery(filters)` function builds the `q` string, passed to the existing `useScryfallCardPages`.
- Why: One model feeds the form, the URL and the collection matcher (D-052); the prefix avoids collisions with `colors`, `rarity` and `type`.
- Alternatives considered: Building the string inside the form (not reusable); a free-text syntax box (less friendly).
- Consequences: Check each Scryfall operator in their syntax docs before coding. When a price is set, add `unique=prints` (prices are per printing). Submit on button press, not per keystroke, to limit requests.
- Source: "[Search] Search refactor"

### D-051: Advanced search form

- Status: Accepted
- Date: 2026-11-07
- Decision: `AdvancedSearchForm` (`src/features/search/`), shown when `s_mode=advanced`, for both sources. Name and set fields reuse D-049. Text-on-card and mana cost use symbol dropdowns from the prefetched `cardSymbols` (symbol + meaning). Mana cost is a symbol builder that appends symbols (e.g. `{2}{U}{U}`) with a clear button. Colors and identity are multi-selects with an operator select.
- Why: Reuses cached data and existing components.
- Alternatives considered: A single-symbol mana select (cannot express a full cost).
- Consequences: Local filters (`CardFilters`, "Filter & sort") remain on the results below and refine only the loaded results.
- Source: "[Search] Search refactor"

### D-052: Advanced search over the collection

- Status: Accepted
- Date: 2026-11-07
- Decision: With `source=collection`, `matchesAdvancedFilters(card, filters)` in `src/features/search/` applies the D-050 filters to the hydrated cards from D-046, mirroring each field of `toScryfallQuery`.
- Why: The hydrated cards are already full Scryfall objects, so no schema change or migration is needed.
- Alternatives considered: Querying Scryfall with a list of IDs (query length limits); copying card data into Supabase (migration, duplication).
- Consequences: Two implementations of the same semantics must be kept in sync (add tests for both). Extend `CardBrowserCard` and `isCardBrowserCard` in `card-browser/types.ts` with `color_identity` and `flavor_text`. Use face-level fallbacks for `colors`, `type_line`, `oracle_text` and `flavor_text` as `columns.ts` already does.
- Source: "[Search] Search refactor"

<!-- Paste below D-052 in DECISIONS.md. Run only AFTER D-044..D-052 are shipped (they delete, move and add CSS). -->

### D-053: Audit and streamline the project CSS

- Status: Evaluating
- Date: 2026-11-07
- Decision: Refactor in 7 small phases, one PR each. Component CSS stays beside its component (existing rule); only proven duplicates move to shared files. After every phase run `npm run build`, `npm run lint`, `npm run typecheck`, then check the 4 browsers (Search, Favorites, Binder, Decks) plus the card overlay in both themes at 390 px and 1280 px.
  - **0. Baseline (no code change):** record `wc -l $(find src style.css -name "*.css")` and the raw and gzip size of `dist/assets/*.css` after `npm run build`; save screenshots. These numbers are the acceptance reference.
  - **1. Tokens:** move `src/theme.css` to `src/styles/tokens.css` (update the `main.tsx` import and doc references). Add only tokens used 3 or more times or that change per theme: `--duration-fast|base|slow` (0.2 / 0.4 / 0.8 s), `--z-*` scale (replaces 11 values from 1 to 9999), `--radius-*` (replaces 8px, 0.75rem, 1rem and the 10 literal `999px`; `--control-radius` already exists), `--focus-ring`, and MTG identity colors (`--mana-w|u|b|r|g`, rarity, legality, kind pills; same in both themes, moved out of `CardDetailsOverlay.css`). Remove the unused `--bg-color`, `--bg-overlay`, `--text-header`. Replace the 36 color literals outside `theme.css`.
  - **2. Base:** create `src/styles/base.css` (imported by `main.tsx`) holding `#root`, one `body` rule, one global `:focus-visible` ring (replaces 11 copies of `outline: 2px solid var(--text-accent)`) and one global `prefers-reduced-motion` rule (4 files handle it today, others do not). Keep `style.css` only as pre-React critical CSS (splash + body reset), renamed `src/styles/splash.css` and still linked from `index.html` so Vite bundles it. Remove the duplicate `body` rules from `App.css`.
  - **3. Shared layout layer:** `src/styles/layout.css`, declared with `@layer layout`, with `.page` (shell: box-sizing, width, `min-height: 100dvh`, padding), `.page__notice`, `.card-grid` (flex list + card width rule incl. the 540 px `min(calc(var(--card-image-width) + 1.45rem), …)` rule), `.count-badge`, `.pagination`. Component CSS stays unlayered, so it still overrides the layer without touching specificity. Add the class in the 4 page components and `CardTile`, then delete the duplicates from `CardBrowserPage.css`, `FavoritesPage.css`, `BinderPage.css`, `DecksPage.css`, `CardTile.css`.
  - **4. Selector hygiene:** one block per component file named `block__element--modifier`. Replace the 88 descendant element selectors (e.g. `.deck-page button`) with class selectors, starting with the 4 pages. Remove the single `!important` in `AuthPages.css`. Element selectors only in `base.css`.
  - **5. Breakpoints:** keep two, `540px` and `860px` (CSS variables cannot be used in media queries, so document them as a comment in `tokens.css`); fold the one-off `480px`, `760px` and `1040px` rules into them after a visual check. Replace remaining `100vw` (page widths) with `100%` and `100vh` with `100dvh`, except fixed overlays, which use `inset: 0`.
  - **6. Speed:** no CSS file is large; gains come from rendering cost. (a) Add `content-visibility: auto` with `contain-intrinsic-size` to `.browser-card` (up to 175 cards per page); test scrolling, keyboard focus and the overlay. (b) Replace the splash `pulse` animation, which animates `filter: drop-shadow`, with `transform`/`opacity` only. (c) Keep the 6 `backdrop-filter` blurs (navbar, filters, three overlays, `App.css`), but verify their cost in DevTools Performance on a phone-sized viewport and drop the weakest one if it costs frames. (d) Review the `-webkit-` prefixes against the supported browsers.
  - **7. Guardrails and docs:** update the CSS lines in `docs/file-conventions.md`, `docs/theme/theme.md` and `AGENTS.md` (paths, shared files, naming, token rule: no hard-coded colors, durations, z-index or radii). Optionally add `stylelint` as a dev dependency (needs approval) with rules: no hex/rgb colors outside `tokens.css`, no `!important`, no element selectors outside `base.css`, and a `lint:css` script.
- Why: Audit of `dev` @ `9a5d883`, before D-044..D-052: 17 files, 2,847 lines, 189 class names. Findings: 24 identical rule bodies repeated across files (page shell, notice, card list and card-width rules each copied in the 4 pages; binder and deck count badges identical); 36 color literals outside the tokens, 20 of them in `CardDetailsOverlay.css`; 3 unused tokens; 11 z-index values, 8 transition durations, 5 breakpoints (860/861, 540, 760, 480, 1040) without tokens; `body` styled in both `style.css` and `App.css`; `SearchSourceToggle.css` imported by two files; 11 uses of `100vh`/`100vw` while only 2 files use `dvh`; no CSS lint. Grep reports 17 class names not found in source, but they are built dynamically (`browser-card--${kind}`, rarity, legality, color and deck kind pills), so none is safely deletable by grep alone.
- Alternatives considered: Rewrite with Tailwind or CSS-in-JS (new dependency, rewrites every component, loses the existing token system); one big global stylesheet (against `file-conventions.md`); merge all component CSS into layers (large change, little gain); only delete duplicates without tokens (leaves the literals and drift).
- Consequences: Class names and CSS are not part of the public contract (AGENTS.md), so no `### Breaking` entry; the only user-visible change allowed is none (acceptance = no visual difference). Success = fewer CSS lines and a smaller gzip size than the Phase 0 baseline, not a promised percentage. Do not delete a class unless it is absent from source after expanding template strings; check unused rules with Chrome DevTools Coverage on each page. No CSS file split without a matching component split. Files touched per phase: Phases 1, 2 and 7 are small; Phases 3 and 4 touch about 10 files each and need a short plan before starting. Moving `theme.css` and `style.css` changes paths in `main.tsx`, `index.html` and the docs only.
- Source: "[CSS] Audit and streamline"
