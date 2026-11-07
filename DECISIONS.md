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
