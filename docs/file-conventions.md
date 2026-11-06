# File Conventions

Naming and usage rules for each file format in this repo (branch `typescript`). Each entry has **Observed** (what the repo does today) and **Rule** (what to follow for new files). Where the repo is inconsistent, the rule picks one direction; do not rename existing files without asking.

## Source code

### `.tsx` — TypeScript + JSX

- **Use for:** new React components and providers; the target format for the migration.
- **Observed:** `main.tsx` (entry), `AppProviders.tsx`, `PersistenceProvider.tsx`, `QueryDevToolsProvider.tsx`.
- **Rule:** PascalCase name matching the default export, one component per file, typed props (`type XProps = {...}`), `import type` for type-only imports, include the extension in imports of `.ts`/`.tsx` files.

### `.ts` — TypeScript, no JSX

- **Use for:** hooks, services, types, helpers that return no JSX.
- **Observed:** `queryProvider.ts`.
- **Rule:** camelCase name (`queryProvider.ts`). Hooks start with `use`. Shared types go in a `types.ts` next to the feature that owns them.

### `.jsx` — JavaScript + JSX (legacy, being migrated)

- **Use for:** existing components only. Do not create new `.jsx` files.
- **Observed:** components in PascalCase (`NavBar.tsx`, `CardDetailsOverlay.tsx`), icons as `Icon<Name>.tsx`, router as `router.tsx` (lowercase, not a component).
- **Rule:** when converting, rename to `.tsx` in the same commit, then run `npm run typecheck`. Some hooks are `.jsx` without any JSX (`useOracleText.jsx`, `useScryfallCardsSearch.jsx`); they should become `.ts`.

### `.js` — JavaScript, no JSX (legacy and config)

- **Use for:** config files that must stay JS, plus existing hooks and services.
- **Observed:** `eslint.config.js`, `vite.config.js` (config, lowercase with `.config`); hooks `useFetchUrl.ts`, `usePreFetchUrl.ts`, `useScrollVisibility.ts`; services `createApiClient.ts`, `fetchScryfallCards.ts`; helpers `normalizeCard.js`, `scryfallCardLayouts.js`.
- **Rule:** camelCase. New non-config code should be `.ts`.

## Styles

### `.css` — Stylesheets

- **Observed:** one CSS file beside each component with the same name. Global styles: `style.css` (repo root), `src/app/App.css`, and `src/theme.css` (design tokens).
- **Rule:** component CSS lives in the component's folder and shares its name. Colors, spacing and fonts come from the tokens in `src/theme.css` (CSS variables); do not hard-code new colors. Global rules go only in the global files.

## Docs and diagrams

### `.md` — Markdown

- **Observed:** mixed naming in `references/` (`Components.md`, `THEME.md`, `CARD_SEARCH_SEQUENCES.md`, `card-search-sequences.md`). `README.md` and `LICENSE`-style files use uppercase.
- **Rule:** root-level project files in UPPERCASE (`README.md`, `AGENTS.md`, `FILE_CONVENTIONS.md`). Other docs in `references/` use kebab-case (`card-search-sequences.md`). Start with one `#` title. Treat reference docs as notes that can lag the code.
- **Special locations:** `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md` are read by GitHub Copilot; keep their exact names.

### `.mmd` — Mermaid diagrams

- **Observed:** kebab-case with numbering for sequences (`card-search-seq-01-initial-random.mmd`) and descriptive names (`component-architecture.mmd`, `app-startup-sequence.mmd`).
- **Rule:** store in `references/`, kebab-case, numbered when part of an ordered set. First line is the diagram keyword (`sequenceDiagram`, `flowchart TD`). Validate before committing (see `.github/instructions/mermaid.instructions.md`).

## Data and config

### `.json` — JSON

- **Observed:** `package.json`, `package-lock.json`, `tsconfig.json`, `references/CARD.json` (sample Scryfall card).
- **Rule:** no comments and no trailing commas. Never edit `package-lock.json` by hand; change dependencies with `npm install`. `tsconfig.json` has `checkJs: false`, so JS is not type-checked.

### `.html` — HTML

- **Observed:** a single `index.html` at the repo root (Vite entry).
- **Rule:** do not add more HTML files. Changes belong in `index.html` only for global needs (fonts, meta tags, splash elements). Ask before touching the `localhost:8097` script.

### `.gitignore` — Git ignore rules

- **Rule:** keep `node_modules`, `dist`, `*.local` and editor folders ignored. Never commit secrets or `.env` files; add `.env*` before creating any.

## Assets

### `.svg`, `.png`, `.ico` — Images

- **Observed:** all in `public/` (`favicon.svg`, `favicon.ico`, `favicon-96x96.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`).
- **Rule:** files in `public/` are served from the site root (`/favicon.svg`) and are not processed by Vite. Use kebab-case with size in the name for icons. Prefer SVG for new icons. Inline icon components live in `src/assets/` as `Icon<Name>` files.

## No extension

### `LICENSE`

- Uppercase, no extension, at the repo root. Do not modify.

## Folder and naming summary

| Thing | Convention | Example |
| --- | --- | --- |
| Component folder and file | PascalCase | `CardOverlay/CardOverlay.tsx` |
| Component CSS | same name as component | `CardOverlay.css` |
| Hook | `use` + camelCase | `useFetchUrl.ts` |
| Service or helper | camelCase | `createApiClient.ts` |
| Config file | lowercase + `.config` | `vite.config.js` |
| Docs in `references/` | kebab-case | `card-search-sequences.md` |
| Diagrams | kebab-case, numbered sets | `card-search-seq-01-initial-random.mmd` |
| Feature code | `src/features/<feature-name>/` (kebab-case) | `scryfall-card-renderer/` |
