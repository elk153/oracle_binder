# Decisions List

This file holds standing policies and open, evaluating or deferred decisions. Implemented and superseded decisions are in [DECISIONS_HISTORY.md](./DECISIONS_HISTORY.md).

## D-015: Supabase GitHub integration deploys migrations from main

- Status: Deferred (2026-11-22)
- Date: 2026-10-27
- Decision: After `favorites` is merged, connect the Supabase GitHub integration to this repository only, with the working directory at the repo root, "Deploy to production" on for `main`, and automatic branching off.
- Why: Merging to `main` then applies pending migrations, and no database password or access token is stored in GitHub. Deploying from GitHub works on any plan.
- Alternatives considered: Keep manual `db push` (enough for one developer, nothing to configure). Branching with per-PR preview databases (isolated and data-less, plan requirements to verify, not needed without users). GitHub Actions with stored secrets.
- Consequences: Supabase gets read access to the repo. With one shared project, a merge changes the live database. Because D-014 records history, migrations already applied from the feature branch should not run twice; verify on the first merge. `config.toml` does not push auth settings, which stay in the dashboard (D-004). Revisit if a staging project is added.
- Source: "[Supabase] Migrations and GitHub"

## D-038: Keycloak realm and client as identity source for Supabase

- Status: Deferred (2026-11-21)
- Date: 2026-11-05
- Issue: #30 (closed as deferred on 2026-11-22; reopen it if this decision is picked up)
- Decision: Use a dedicated realm (e.g. `oracle-binder`) on the existing Pikapod Keycloak server, with one confidential client that Supabase uses to sign users in. Supabase's built-in `keycloak` OAuth provider is used; Keycloak is not a Supabase third-party auth issuer.
- Why: A realm isolates users, clients and sessions, so the other app on the same server is unaffected. Supabase needs a client ID, a client secret and the realm URL, so Keycloak is configured first. The Pikapod is publicly reachable, which hosted Supabase requires.
- Alternatives considered: The `master` realm (reserved for administering Keycloak). Reusing the other app's realm (mixes users). A second Keycloak server (more cost and upkeep). Supabase third-party auth (its supported list is Clerk, Firebase Auth, Auth0, AWS Cognito and WorkOS, not Keycloak). Google/GitHub login through Supabase, or custom SMTP, which are lighter but were not chosen.
- Consequences: Not implemented; deferred on 2026-11-21. Sign-in uses Supabase email and password (D-008, D-017), and the repository has no Keycloak configuration (only the commented provider list in `supabase/config.toml`). The plan below is kept for a possible later switch. Both apps share one server, so downtime and upgrades affect both. Accounts are separate per realm. Email settings are per realm, so verification and password-reset emails need their own SMTP or must stay off; email sending is still unsolved. Re-assessed on 2026-11-22 in D-067: still deferred, because Keycloak needs its own SMTP for verification and password reset and so does not solve email delivery. Accounts use Supabase social sign-in instead (D-067 to D-070).
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

- Status: Deferred (2026-11-21)
- Date: 2026-11-05
- Decision: Create a Supabase project, enable its built-in Keycloak provider with the D-004 values, and allow the app's URLs as redirect targets.
- Why: Supabase Auth stays the session issuer, so `auth.uid()` and RLS work without changes. The app talks only to Supabase, never directly to Keycloak.
- Alternatives considered: Supabase third-party auth (Keycloak is not supported). Social login through Google or GitHub (simpler, not chosen).
- Consequences: Not implemented; deferred on 2026-11-21. Sign-in uses Supabase email and password (D-008, D-017), and the repository has no Keycloak configuration (only the commented provider list in `supabase/config.toml`). The plan below is kept for a possible later switch. The client secret lives only in the Supabase dashboard. The redirect allowlist must contain every origin the app runs on, or sign-in fails on the way back. Supabase's default email sender only reaches the project team's addresses, so email/password and magic-link sign-in for real users need custom SMTP; Keycloak sign-in does not depend on it. Re-assessed on 2026-11-22 in D-067: still deferred, because Keycloak needs its own SMTP for verification and password reset and so does not solve email delivery. Accounts use Supabase social sign-in instead (D-067 to D-070).
- Source: "[Auth] Supabase Keycloak provider"

### Instructions (Supabase dashboard)

1. Create the project. Note the project reference (the `<project-ref>` in `https://<project-ref>.supabase.co`); it must match the callback URL registered in D-004 step 3.
2. Enable the provider under Authentication, Providers, **Keycloak**, and enter: Client ID (D-004 step 2), Client secret (D-004 step 4), Keycloak URL (the realm URL from D-004 step 5).
3. Under Authentication, URL Configuration, set the Site URL to `https://oraclebinder.netlify.app` and add these Redirect URLs: `https://oraclebinder.netlify.app/**` and `http://localhost:5173/**` (check your Vite port).
4. Copy the project URL and the *publishable* key for the app. Never use the `service_role` key in this app: it bypasses RLS and every `VITE_` variable is public.
5. Leave email settings for now (see Consequences).

Check: the Keycloak provider shows as enabled. The full sign-in test happens in D-006.

## D-040: App-side authentication (client, provider, route guard)

- Status: Deferred (2026-11-21)
- Date: 2026-11-05
- Decision: Add a Supabase client, an `AuthProvider` with a `useAuth` hook, sign-in/out controls, and a protected-route layout for the user-owned pages, in that order.
- Why: This mirrors the existing `ThemeContext` / `ThemeProvider` pattern, uses the existing React Router layout routes, and keeps each change to one purpose.
- Alternatives considered: Calling `supabase.auth` directly in components (duplicates session logic). A third-party auth library (new dependency, not needed).
- Consequences: Deferred on 2026-11-21 as written here (Keycloak OAuth). Parts exist in another form: the Supabase client (`src/services/supabaseClient.ts`, D-007), `AuthProvider` and `AuthContext` (`src/app/AppProviders/`), the `RequireAuth` layout route (D-009) and email and password sign-in (`signInWithPassword`, D-008, D-017); there is no `signInWithOAuth` call. Favorites, Binder and Decks are implemented, not placeholders. The original text follows. Adds one dependency (`@supabase/supabase-js`). Favorites, collection and decks stay placeholders until they have storage and RLS (a later decision). `PersistenceProvider` persists only Scryfall queries, so no user data reaches `localStorage`. The route guard only controls what the UI shows; real protection comes from RLS policies. Re-assessed on 2026-11-22 in D-067: still deferred, because Keycloak needs its own SMTP for verification and password reset and so does not solve email delivery. Accounts use Supabase social sign-in instead (D-067 to D-070).
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

## D-071: App performance audit: fast first screen, the rest in the background

- Status: Evaluating (steps 2–5 implemented and released in v2026.11.8; Netlify and real-phone recordings and a signed-in Binder/Deck check still open)
- Date: 2026-11-22
- Issue: #35
- Decision: Audit the app's loading time from the user's point of view, then fix what the audit finds. The rule for the result: **startup loads only what Home needs to show the hand of the day (D-073)**. Everything else loads in the background ("shadow time") while the user already sees Home: other pages' code, the Scryfall symbol, set and card-name catalogs, the user's collection for the value dashboard (D-076), and so on.
  1. **Measure first.** Record on a phone (Netlify build, normal 4G and a slow-network profile) and on desktop: time to first content, time until the hand of the day is visible, JavaScript downloaded before that, and the number of requests before that. Lighthouse and the browser's Performance panel give the numbers. Keep the figures in this decision as the baseline.
  2. **Split the code by route.** Today only the development scan bench is lazy-loaded; every page is in one main chunk (about 810 kB minified in the last local build, which also prints Vite's >500 kB warning). Load Search, Favorites, Binder, Decks, Scan and the card details overlay with React Router's `lazy`, so startup downloads only the shell and Home.
  3. **Move startup fetches out of the first screen.** `App.tsx` prefetches `/symbology`, `/sets` and the card-name catalog (about 687 kB, not persisted) on every start. Start them only after Home has rendered (for example after the first paint or when the browser is idle) and keep the cached ones from `localStorage`.
  4. **Prefetch the next step.** After Home is visible, preload the code of the most likely next pages (Search, Binder, Decks) in idle time, and prefetch on hover/focus of a nav item.
  5. **Make actions feel instant.** Optimistic updates for the favorites heart, then Binder/Deck icons if they still feel slow (issue #35's original ask; see the options in `docs/issue-decision-plan.md`).
- Why: The user judges speed by how soon something useful is on screen and how fast taps respond, not by when every download is done. Home is the first screen for everyone, signed in or not, so it is the one to optimize.
- Alternatives considered: Optimistic updates only (the original issue; fixes taps but not startup). A service worker for caching (helps repeat visits, belongs to the offline work, issue #32, kept out of decisions for now). Server-side rendering (needs a server; the app is a static SPA on Netlify).
- Consequences:
  - Route-level `lazy` changes how pages load; a chunk that fails after a deploy is already handled by `RouteErrorPage` (D-060).
  - Each step is a separate, small change with its own before/after measurement. Steps touching more than two files need a plan and approval (AGENTS.md).
  - Background loading must stay gentle with Scryfall: no bursts, the existing staggered batching (`fetchScryfallCardsForIds`) is kept.
- Measurements: baseline and after figures for steps 2, 3, the first half of 4, and favorites in step 5 are in `docs/perf/d-071-measurements.md` (23 Nov 2026). Step 1 (Lighthouse 12.8.2, local `vite preview`, emulated phone, cold start, medians of 3, second recording after the fixes), before → after: hand-of-the-day data ready on mobile 4G 1,789 → 1,651 ms, slow 4G 5,753 → 4,978 ms, desktop 1,217 → 935 ms; hand visible on slow 4G 10,067 → 9,294 ms, desktop 1,935 → 1,621 ms; FCP unchanged; bytes before the hand data 691 → 436 kB. A first recording showed a slow-4G FCP regression (splash logo waiting behind JS files on HTTP/1.1) and background work overlapping the card images; both were fixed (inlined splash logo, background waits for on-screen images). Step 4 hover/focus preload of nav items: click on Scan to page shown, mobile 4G 211 → 27 ms, slow 4G 1,110 → 796 ms (300 ms hover first). Step 5 Binder/Deck: every copy and deck mutation except create deck is optimistic; the screen changes after 0 round trips instead of 1–2 (≈225–450 ms on 4G), buttons unlock after 1 instead of up to 2; covered by `tests/binder/optimisticCache.test.ts`, not yet tried signed in. Still open: Netlify and real-phone recording (parked), a signed-in check of the Binder/Deck actions.
- Source: "[Issues] Decision plan review" (`docs/issue-decision-plan.md`)

## D-072: Share link that shows the same cards to anyone

- Status: Evaluating
- Date: 2026-11-22
- Issue: #5
- Decision: Add a Share action that creates a deep link to **the cards currently shown**: a search result, a card's details, a Binder view or a deck. Anyone who opens the link sees those cards, **including people without an account**. On phones the action opens the system share sheet (Web Share API); elsewhere it copies the link and shows a notice.

  How the link carries the cards depends on the view:
  - **Public views** (Scryfall search, Home, a card's details): the current URL already holds the state (`q`, `s_` parameters, `?card=`). Share that URL.
  - **Private views** (collection search, Binder, Decks): their data is protected by RLS, so the URL alone shows nothing to someone else. Options, to settle in fine-tuning:

  | Option | How | Pros | Cons |
  | --- | --- | --- | --- |
  | A. Card list in the URL | A public route (e.g. `/v2/shared?ids=…`) with the shown Scryfall ids; the page hydrates them from Scryfall | No database change, nothing stored, works forever | Long links; a practical limit of a few dozen cards; shows no quantities or kinds unless encoded too |
  | B. Snapshot in Supabase | Share saves the shown list (ids, quantity, kind, title) in a `shared_lists` row with a random token; `/v2/shared/<token>` reads it with an anon-readable RLS policy limited to that row | Any size, short link, can be deleted (revoked) | Migration, rollback, RLS for anonymous read, pgTAP; a frozen copy, not live |
  | C. Live public deck/binder | A deck or binder gets a "public" switch; the link always shows its current content | Always up to date | Exposes live user data; widest RLS change |

  Recommendation: public views share their URL; private views use **B** (snapshot), because it has no size limit and shares nothing beyond the chosen cards.
- Why: The issue asks for a link to "the results of a query (multiple cards) or a card's details". The URL-first design (nuqs) already makes public views shareable; private views need their own answer because of RLS.
- Alternatives considered: See the table. Link previews with a card image when pasted in chats (Open Graph) need a Netlify function per link; possible later, not in scope.
- Consequences:
  - A new public route is part of the public contract (AGENTS.md "Versioning").
  - The shared page shows cards only: no user name, email, purchase prices or notes.
  - With option B the snapshot table needs least-privilege grants, an anon `select` policy by token, and a way for the owner to list and delete their shares.
- Source: "[Issues] Decision plan review"

## D-074: Cards in other languages in search, Binder and Decks

- Status: Accepted (2026-11-28): option B for the Binder; all of Scryfall's languages. In progress on `feature/d-074-card-languages`: phase 1 (search and card details) done, phase 2 (Binder, Decks, Scanner) to do. One pull request into `dev` once both phases are done.
- Date: 2026-11-22
- Issue: #12 (with D-075)
- Decision: Let the user find and manage **non-English printings** of a card.
  - **Search:** a language filter (Scryfall's `lang:` search syntax) in advanced search, and printing lists that include other languages (Scryfall's `include_multilingual` option), so a French printing can be found and opened. Cards show their printed name and text (`printed_name`, `printed_type_line`, `printed_text`) when present, with the English (oracle) text available as well.
  - **Binder:** today a copy stores the English printing's `scryfall_id` plus a free `language` text. To settle in fine-tuning:
    - A. Keep the English id and the language text (no data change; the copy still shows the English image).
    - B. Store the foreign printing's own `scryfall_id` when Scryfall has one, so the copy shows the right image and name; keep `language` as the user's statement and fall back to A when Scryfall has no such printing.
  - **Decks:** deck entries have no language today. With B, a Binder entry follows its copy; proxy/virtual entries could pick a printing in any language.
  - **Scanner:** Add mode already reads the printed language (D-066); with B it could look up that language's printing.
  - Recommendation: B, because it shows the card the user actually owns, and it needs no schema change (a foreign printing is just another Scryfall id).
  - **Settled (2026-11-28):** B. The language lists offer every language Scryfall prints cards in (20, per scryfall.com/docs/api/languages on 2026-11-28), not only the six the app had; the six keep their spelling, so stored copies still match.
- Implementation:
  - **Phase 1, done:** `src/features/cardLanguages.ts` holds the one language list (Scryfall code, app name, printed codes), used by advanced search, the Binder copy form, the scanner's Add mode and `languageNameOf`. Advanced search has a Language select that writes `s_lang` (a Scryfall code; new URL parameter) and adds `lang:<code>` to the Scryfall query; collection search keeps cards whose `lang` matches (a card without `lang` counts as English). `normalizeCard` adds `printedName`, `printedTypeLine` and `printedText` to each face and keeps the English fields; `withTextLanguage` swaps the printed text in, face by face, with English where Scryfall has none. `CardRenderer` takes `textLanguage` (default `printed`). The details overlay shows the printed name and text with a "Show English text" toggle, and its printings list has "Show printings in other languages" (adds `include_multilingual=true`; on from the start when the opened card is not English), with the language after each foreign printing's date. Tests: `tests/languages/`, `tests/renderer/printedText.test.ts`, and `lang:` cases in the search and scanner tests. Checked in a browser against the live Scryfall API on 2026-11-28 (dev server, Supabase stubbed): `lang:fr` search finds the two French Lightning Bolts; the MSC one opens as "Foudre" with French text and English type line (Scryfall has no `printed_type_line` for it) and switches to English; the printings list with other languages returns all 168 printings on one page (`has_more: false`). A card with more than 175 printings in all languages would show only the first page, since `useFetchUrl` reads one page.
  - **Phase 2, to do:** Binder copy language follows the card's language when adding from a foreign printing; Decks entries follow their copy; the scanner looks up the printing in the language read on the card.
- Why: The collection holds French and other non-English cards (the scanner already detects them), but the app only shows English printings.
- Alternatives considered: A only (simplest, but the binder shows the wrong image). Translating card text in the app (Scryfall already has printed text where it exists).
- Consequences:
  - Scryfall has fewer images and texts for non-English printings; every view needs an English fallback.
  - `normalizeCard.ts` and the renderer types gain the `printed_*` fields; the raw → normalized pipeline is kept.
  - Filters and sorting by name must decide between printed and English names (English stays the default for matching).
  - Existing copies keep working; moving them to foreign ids (option B) is optional and per copy.
- Source: "[Issues] Decision plan review"

## D-075: App interface in several languages

- Status: Evaluating
- Date: 2026-11-22
- Issue: #12 (with D-074)
- Decision: Make the app's own text (buttons, labels, messages, page titles) translatable, starting with **English and French**, with a language switch next to the theme toggle. The first visit follows the browser's language when it is supported, otherwise English; the choice is remembered on the device. `<html lang>` follows the chosen language. Card data is not translated by this decision (that is D-074).

  To settle in fine-tuning:
  - A. A translation library (react-i18next or similar): standard, handles plurals and formatting, a new dependency (approval needed).
  - B. A small own solution: a React context like `ThemeContext` with one dictionary file per language. No dependency, a good way to learn the concept, but plurals and interpolation are hand-made.

  Numbers, dates and prices use the browser's `Intl` formatting for the chosen language in both options.
- Why: The issue title is French ("Versions autres langues"); French-speaking users should be able to use the app in French.
- Alternatives considered: Browser auto-translation (unreliable for card terms, breaks on dynamic content). Translating only some pages (mixed-language UI).
- Consequences:
  - Every user-facing string moves into translation files: a large but mechanical change, done page by page.
  - New text must be added in all languages from then on; AGENTS.md conventions get a rule for it.
  - The remembered language is a new `localStorage` key, part of the public contract (persisted browser data).
- Source: "[Issues] Decision plan review"

## D-076: Collection value dashboard on Home, Binder and Decks

- Status: Evaluating
- Date: 2026-11-22
- Issue: #29 (with D-077, D-078)
- Decision: Show the **current value** of the user's cards, using the Scryfall EUR prices the app already receives, split into three figures: **owned**, **proxies** and **virtual**.
  - **Home:** a small dashboard **above the hand of the day** (D-073), for signed-in users only: the three totals for the whole collection (owned Binder copies including Loose and deck copies; proxy deck entries; virtual deck entries).
  - **Binder list:** under each binder cover (and Loose), the same dashboard for that binder's cards. Binders hold only owned copies, so it shows the owned value; the layout stays the same so the lists look alike.
  - **Deck list:** under each deck cover, the three figures for that deck's entries.
  - Prices: a foil or etched copy uses `eur_foil` (falling back to `eur`), a non-foil copy `eur`. Cards without a EUR price are counted and shown as "n without price", not as 0 €. Disposed copies and favorites are not counted.
- Why: Issue #29 asks for value at every level, with Home as the summary. Scryfall prices are already in every card the app loads, so a first version needs no new data source and no database change.
- Alternatives considered: One total instead of three (mixes cards owned with cards not owned). Including purchase price and profit/loss (useful, possible next step; not asked for now). Waiting for better prices (D-077) before showing anything.
- Consequences:
  - Home needs the whole collection hydrated from Scryfall. It must load in the background after Home is visible (D-071), using the cached batch requests (`useScryfallCardsForIds`), and show a placeholder until then.
  - Scryfall's prices are a daily reference, not a market quote; the dashboard labels them as "Scryfall price (EUR)" with the date. D-077 may replace the source.
  - The binder/deck covers and Home get a new shared component (e.g. `ValueSummary`).
- Source: "[Issues] Decision plan review"

## D-077: More accurate card prices: compare data sources

- Status: Evaluating
- Date: 2026-11-22
- Issue: #29 (with D-076, D-078)
- Decision: Evaluate replacing the Scryfall prices used by D-076 with a more accurate source, and pick one. Candidates:
  - **A daily JSON dump** downloaded by a scheduled job, for example MTGJSON's `AllPricesToday` / `AllPrices` files (MTGJSON documents providers Cardmarket, TCGplayer, Card Kingdom and Cardsphere, and 90 days of history in `AllPrices`), or Scryfall's own daily bulk files.
  - **A price API** such as cardbase.dev ("MTG Price History API"), called by a Supabase Edge Function.

  The comparison checks, for each candidate: sources and markets (Cardmarket EUR trend/low/average), foil and etched prices, how cards map to Scryfall ids, update frequency, history depth, size or rate limits, cost and free tier, license and terms (may the data be shown in a public web app?), and whether calls must go through a server to keep a key secret. Result: a table in this decision and a chosen source.
- Why: Scryfall shows one daily price per finish taken from its partners; the user wants values closer to what the cards actually sell for.
- Alternatives considered: Keep Scryfall prices (free, already there; the fallback if no candidate is clearly better). Cardmarket's or TCGplayer's own APIs (access for new developers is restricted; to verify during the evaluation).
- Consequences:
  - Not verified yet (22 Nov 2026): cardbase.dev's site renders with JavaScript and its pricing, limits and terms could not be read; Scryfall's bulk-data page refused the automated fetch; MTGJSON file sizes, license and Scryfall id mapping were not checked. The evaluation does this first.
  - A dump or a keyed API means a server-side part (Supabase Edge Function or scheduled job) and a table for prices, with migration, rollback, RLS and pgTAP.
  - Whatever is chosen, D-076's dashboard switches source without changing its layout.
- Source: "[Issues] Decision plan review"

## D-078: Value history jobs (only if the price source has no history)

- Status: Evaluating
- Date: 2026-11-22
- Issue: #29 (with D-076, D-077)
- Decision: After D-077 picks a price source, check whether it already provides price history (for example MTGJSON's `AllPrices` documents 90 days). **Only if it does not**, evaluate building the history with scheduled jobs:
  - a daily Supabase job (pg_cron calling an Edge Function) that stores the day's prices for the cards users own, or only the day's totals per user, binder and deck;
  - retention of at least 30 days (issue #29 asks for "a month value history"), older rows deleted by the same job;
  - a value-over-time chart on Home under the D-076 dashboard.

  To settle: store totals per day (small, enough for the chart) or a price per card per day (bigger, shows which card moved); how the job stays within the source's rate limits; and which chart approach (a library needs approval, or a hand-drawn SVG).
- Why: Issue #29 asks for a value evolution chart and a month of history. Jobs are only worth building when the data source does not already keep history.
- Alternatives considered: Computing history in the browser from snapshots saved on each visit (gaps on days without a visit). No history (drops the chart).
- Consequences: A job, a table, migration with rollback, RLS, pgTAP, and a free-tier check (Supabase scheduled functions and database size). Depends on D-077.
- Source: "[Issues] Decision plan review"
