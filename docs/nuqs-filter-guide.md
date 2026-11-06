# Card filters with nuqs + TanStack Table

Filters and sorting for the V2 card browser and favorites page, stored in the URL. The implementation uses `nuqs` and `@tanstack/react-table` 9 (v9 has a different API from most tutorials, which show v8).

## Apply it

```bash
git apply card-filters.patch   # from the repo root
npm install                    # installs nuqs and @tanstack/react-table
npm run dev
```

Try: `/v2/search?q=elf&colors=G&rarity=common,uncommon&sort=cmc&dir=desc`, then change a filter and watch the URL change. Press Back, reload, and share the link; the filters survive all three.

## The idea in one picture

```
URL  ──(nuqs parsers)──▶  typed values  ──(useMemo)──▶  table state  ──▶  rows to render
 ▲                                                                           │
 └─────────────── setFilters() called by the filter buttons ◀────────────────┘
```

The URL is the single source of truth. Nothing else stores the filters.

## Concepts

1. **URL state.** A filter is state that you want to survive reloads, be bookmarkable, and be shareable. That is exactly what a query string does. `?colors=W,U` is both the state and the link.
2. **nuqs parsers.** A parser tells nuqs how to turn a URL string into a typed value and back. `parseAsStringLiteral(COLORS)` accepts only `"W" | "U" | ...`, so a hand-edited URL with `?colors=banana` is ignored instead of crashing. `.withDefault(...)` means the key is removed from the URL when it equals the default, which keeps links short.
3. **`useQueryStates`.** Like `useState`, but for several URL keys at once. It returns `[values, setValues]`. Setting a key to `null` removes it. State updates instantly even when the URL write is delayed (`debounce(300)` on the type input).
4. **Headless table.** TanStack Table gives you logic (filter, sort, paginate) and no markup. We never render a `<table>`; we ask for `table.getRowModel().rows` and render each `row.original` as the existing `Card`. This is the key idea: *rows are data; you choose how to draw them*.
5. **v9 opt-in features.** The table only does what you register in `tableFeatures({...})`: `columnFilteringFeature` + `createFilteredRowModel()`, `rowSortingFeature` + `createSortedRowModel()`. Forgetting one means the API is missing, not silently broken.
6. **Controlled state.** We pass `state: { columnFilters, sorting }` so the table reads our state instead of keeping its own. Because the URL is the only writer, the flow is one-way and cannot get out of sync.
7. **Stable references.** `features`, `columns` and `data` must not change identity on every render, or the table recomputes everything. That is why `features`/`columns` live at module level and the empty fallback is a constant (`NO_CARDS`).
8. **Where filtering happens.** Here the table filters the cards that Scryfall already returned (client-side). That is fast and needs no extra requests, but it only sees those cards (see limits below).

## Steps and files

All new code is TypeScript, in `src/features/card-filters/`.

| Step | File | What you do |
|---|---|---|
| 1 | `package.json` | Add `nuqs` and `@tanstack/react-table`. |
| 2 | `src/app/router.tsx` | Wrap each root route element in `NuqsAdapter` (from `nuqs/adapters/react-router/v8`). It must sit *inside* the router because it uses React Router's hooks, so it cannot go around `RouterProvider`. |
| 3 | `types.ts` | Describe only the Scryfall fields the filters read. |
| 4 | `filterParams.ts` | Define the allowed values (`as const`) and one parser per URL key. |
| 5 | `columns.ts` | Register table features and define columns. A column says how to read a value from a card and how it filters or sorts. |
| 6 | `useCardsTable.ts` | Read the URL with `useQueryStates`, convert to `columnFilters` and `sorting`, call `useTable`. |
| 7 | `CardFilters.tsx` + `.css` | Buttons, input and select that call `setFilters`. |
| 8 | `CardBrowserPage.tsx` and `FavoritesPage.tsx` | Use the hook and render `<CardFilters>` over loaded results. |

## Behavior to know

- **Colors** match any selected color; `C` means colorless. Double-faced cards use the front face's colors.
- **Type** is a case-insensitive "contains" on the type line (`creature` matches "Legendary Creature — Elf").
- **Price sort** puts cards with no price last in both directions.
- The navbar changes the `q` search parameter while retaining other query parameters, so active filters remain in the URL when searching for another name.
- Opening a card and pressing Back keeps the filters (they are in the URL you return to).

## Limits (read before building on this)

- **Only cards loaded so far are filtered.** Name search loads paginated Scryfall results; filtering applies to the cards currently loaded. For true server-side filtering, use Scryfall's own syntax in the query (`c:r t:creature`) and send the filters to the API; then the table becomes display-only (`manualFiltering: true`). That is also the model for Supabase: URL state becomes the query key and the database does the filtering.
- **`.tsx` files are not linted** because of the glob typo in `eslint.config.js` (`ts, tsx` has a space). The new `.ts` files are linted; `CardFilters.tsx` is not until you fix it.
- **Not yet tested in a browser.** I verified: typecheck, production build, and the filter and sort logic against sample cards (single and double-faced, colorless, missing prices), and that the patch applies to a fresh clone. I could not click through the UI, so test the checklist below.

## Manual test checklist

1. Search a name that returns many cards, toggle `R`, and confirm the count updates and the URL gets `?colors=R`.
2. Type in the type box; the count updates immediately and the URL updates after a short pause.
3. Reload the page; the filters and results are restored.
4. Open a card, then press Back; the filters are still applied.
5. Edit the URL to `?colors=banana`; the app should not crash and the filter should be ignored.
6. Press Clear; all keys disappear from the URL.

## Good next steps

- Fix the ESLint glob, then fix whatever new `.tsx` lint errors appear.
- Add a numeric `cmc` range filter (`parseAsInteger`) to practice a second parser type.
- Extend the filters for `/v2/search/advanced` when that page is implemented; the hook and component are shared with the current V2 browser and favorites page.
- Move filtering server-side (Scryfall query, later Supabase) when one page of results is not enough.
