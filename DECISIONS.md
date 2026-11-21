# Decisions List

This file holds standing policies and open, evaluating or deferred decisions. Implemented and superseded decisions are in [DECISIONS_HISTORY.md](./DECISIONS_HISTORY.md).

## D-004: Supabase project and security baseline

- Status: Accepted
- Date: 2026-10-27
- Decision: Use one Supabase project in an EU region for local development and the Netlify site. Only the publishable key reaches the browser (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). The auth redirect allow-list holds `http://localhost:5173/**` and the Netlify URL. Unused auth providers are off, and the Data API exposes only the `public` schema.
- Why: This is a solo learning app, so one project keeps setup small. A publishable key in a bundle is only safe because RLS restricts every row.
- Alternatives considered: Separate dev and production projects (safer, double the setup, can be added later). Any use of the secret/service-role key in the app (rejected: it bypasses RLS).
- Consequences: Dev and production share data. Free projects can pause after inactivity (verify current rules). Keys never go in chat or the repo, and Netlify holds the production values. New projects expose no tables to the Data API by default, so every migration must grant access explicitly. Legacy anon/service_role keys are not used. The production redirect entry is tightened to the callback route in D-008. Status: implemented once the checks above pass. Checked in code on 2026-11-21: `src/services/supabaseClient.ts` reads only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, and no `service_role` key appears in `src/`; the dashboard settings (region, redirect allow-list, providers, exposed schemas) cannot be checked from the repository.
- Source: "[Supabase] Auth and favorites plan"

## D-005: Supabase MCP is read-only

- Status: Accepted
- Date: 2026-10-27
- Decision: Connect the Supabase MCP server to VS Code Copilot, scoped to this project with `read_only=true`. Schema changes are tracked and applied through the migration workflow in D-014.
- Why: Database content can carry prompt-injection text, so a write-enabled agent is a risk. Read-only still lets Copilot inspect schema, logs and advisors.
- Alternatives considered: Write-enabled MCP (faster, riskier). No MCP (loses the inspection help).
- Consequences: The workspace MCP entry is in the gitignored `.vscode/mcp.json`; first-time OAuth authentication in VS Code is still required. Copilot cannot apply migrations. To enable writes later, remove the flag, keep the project scope and per-call approvals, then record a superseding decision.
- Source: "[Supabase] Auth and favorites plan"

## D-015: Supabase GitHub integration deploys migrations from main

- Status: Evaluating
- Date: 2026-10-27
- Decision: After `favorites` is merged, connect the Supabase GitHub integration to this repository only, with the working directory at the repo root, "Deploy to production" on for `main`, and automatic branching off.
- Why: Merging to `main` then applies pending migrations, and no database password or access token is stored in GitHub. Deploying from GitHub works on any plan.
- Alternatives considered: Keep manual `db push` (enough for one developer, nothing to configure). Branching with per-PR preview databases (isolated and data-less, plan requirements to verify, not needed without users). GitHub Actions with stored secrets.
- Consequences: Supabase gets read access to the repo. With one shared project, a merge changes the live database. Because D-014 records history, migrations already applied from the feature branch should not run twice; verify on the first merge. `config.toml` does not push auth settings, which stay in the dashboard (D-004). Revisit if a staging project is added.
- Source: "[Supabase] Migrations and GitHub"

## D-038: Keycloak realm and client as identity source for Supabase

- Status: Deferred (2026-11-21)
- Date: 2026-11-05
- Decision: Use a dedicated realm (e.g. `oracle-binder`) on the existing Pikapod Keycloak server, with one confidential client that Supabase uses to sign users in. Supabase's built-in `keycloak` OAuth provider is used; Keycloak is not a Supabase third-party auth issuer.
- Why: A realm isolates users, clients and sessions, so the other app on the same server is unaffected. Supabase needs a client ID, a client secret and the realm URL, so Keycloak is configured first. The Pikapod is publicly reachable, which hosted Supabase requires.
- Alternatives considered: The `master` realm (reserved for administering Keycloak). Reusing the other app's realm (mixes users). A second Keycloak server (more cost and upkeep). Supabase third-party auth (its supported list is Clerk, Firebase Auth, Auth0, AWS Cognito and WorkOS, not Keycloak). Google/GitHub login through Supabase, or custom SMTP, which are lighter but were not chosen.
- Consequences: Not implemented; deferred on 2026-11-21. Sign-in uses Supabase email and password (D-008, D-017), and the repository has no Keycloak configuration (only the commented provider list in `supabase/config.toml`). The plan below is kept for a possible later switch. Both apps share one server, so downtime and upgrades affect both. Accounts are separate per realm. Email settings are per realm, so verification and password-reset emails need their own SMTP or must stay off; email sending is still unsolved.
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
- Consequences: Not implemented; deferred on 2026-11-21. Sign-in uses Supabase email and password (D-008, D-017), and the repository has no Keycloak configuration (only the commented provider list in `supabase/config.toml`). The plan below is kept for a possible later switch. The client secret lives only in the Supabase dashboard. The redirect allowlist must contain every origin the app runs on, or sign-in fails on the way back. Supabase's default email sender only reaches the project team's addresses, so email/password and magic-link sign-in for real users need custom SMTP; Keycloak sign-in does not depend on it.
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
- Consequences: Deferred on 2026-11-21 as written here (Keycloak OAuth). Parts exist in another form: the Supabase client (`src/services/supabaseClient.ts`, D-007), `AuthProvider` and `AuthContext` (`src/app/AppProviders/`), the `RequireAuth` layout route (D-009) and email and password sign-in (`signInWithPassword`, D-008, D-017); there is no `signInWithOAuth` call. Favorites, Binder and Decks are implemented, not placeholders. The original text follows. Adds one dependency (`@supabase/supabase-js`). Favorites, collection and decks stay placeholders until they have storage and RLS (a later decision). `PersistenceProvider` persists only Scryfall queries, so no user data reaches `localStorage`. The route guard only controls what the UI shows; real protection comes from RLS policies.
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

## D-060: Card scanning feature: scope, route and modes

- Status: Evaluating
- Date: 2026-11-21
- Decision: Add a card scanning feature on a new route `/v2/scan`, reached from a new navbar item (Scan). The page first asks for a mode:
  - **Identify** finds a card and opens its details (D-062). It works signed out, like search.
  - **Add** adds recognized cards one after another to a binder or a deck (D-063). It requires sign-in, because binders and decks belong to a user.

  Input is the live rear camera with automatic detection: a card is recognized as soon as it is held steady in the frame, with no capture button. Recognition must find the exact printing (set and collector number), because binder copies and deck entries store a Scryfall card id. When the printing can't be read, the app falls back to the recognized name and lets the user pick from that card's printings. The design targets phones first (portrait layout, one-handed controls) and must work in both iOS Safari and Chrome on Android. How recognition works is decided in D-061.

  **Guide frame (visual cue in the camera view):** a card-shaped outline (the 63 × 88 mm card ratio) is drawn over the camera picture, and the area outside it is dimmed. Two zones are marked inside the outline:
  - the **collector zone**, a box at the bottom left where the set code and collector number must sit;
  - the **title zone**, a box along the top where the card name must sit.

  A short line of text under the frame tells the user what to do, for example "Fit the card in the frame. Set and number in the lower box." While a zone is being read, it is highlighted. When the app falls back to the name (D-061 step 3), the title zone is highlighted and the text says so. When a card is found, the frame briefly turns to a success color.

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
  - No data model change: the feature reuses the binder copy and deck entry tables (D-063).
  - Out of scope: scanning several cards in one frame, binder proxies, price or collection valuation.
- Source: "[Scan] Visual card recognition plan"

## D-061: Card recognition technology

- Status: Evaluating
- Date: 2026-11-21
- Decision (recommended, to be confirmed by a prototype): a staged pipeline that runs in the browser first and uses a cloud service only as a fallback.
  1. **Steady frame (no library):** draw camera frames on a canvas a few times per second and compare them. When the picture stops changing, take that frame. This avoids recognizing a card while it is still moving.
  2. **Collector line by in-browser OCR:** cut the small info line at the bottom left of the card (collector number and set code, printed on cards since Magic 2015 in 2014) out of the frame and read only that strip with tesseract.js (see "OCR library evaluation" below). The strip is cut out at the position of the guide frame's collector zone (D-060). tesseract.js runs in a Web Worker and is loaded only on `/v2/scan`. Look the printing up with Scryfall's `/cards/:code/:number`, which returns exactly one printing.
  3. **Name fallback:** if the line can't be read (older cards, glare, foreign language), OCR the title (cut out at the guide frame's title zone) and match it, allowing small errors, against the Scryfall card-name catalog the app already prefetches. Then show that card's printings to pick from (D-060).
  4. **Optional cloud fallback:** only if steps 2 and 3 fail, send that one still frame to a cloud vision service through a Supabase Edge Function, which keeps the API key secret. Never send video frames continuously.

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

- Why tesseract.js: it is the most proven and documented option, and it is one dependency with a permissive license (Apache-2.0). Its character whitelist, single-line mode and rectangle options fit the pre-cut strips exactly: digits and letters for the collector line, one line of text for the title. The guide frame in the camera view (D-060) makes the user place those strips where the app cuts them out, which avoids Tesseract's weak point: finding text in a busy photo.
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

## D-062: Scan Identify mode

- Status: Evaluating
- Date: 2026-11-21
- Decision: When a card is recognized in Identify mode, the app stops the camera and navigates to `/v2/search?q=<card name>&card=<scryfall id>`. This pushes a normal browser history entry: the search runs for that name and the existing details overlay opens on the recognized printing. If only the name was recognized and the user picked a printing (D-060), that printing's id is used. No scan history is stored.
- Why: It reuses the existing search page and overlay (`?card=` already opens the overlay without replacing the search URL). Back returns to the scanner, and the URL can be shared.
- Alternatives considered: a stored list of recent scans (local or Supabase), alone or in addition. It needs new storage and UI, and was not wanted.
- Consequences:
  - Works signed out. The overlay's favorite, binder and deck actions behave as on search, so they need sign-in.
  - Going back to `/v2/scan` restarts the camera, which asks for permission again only if the browser forgot it.
- Source: "[Scan] Visual card recognition plan"

## D-063: Scan Add mode (rapid addition)

- Status: Evaluating
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
- Source: "[Scan] Visual card recognition plan"
