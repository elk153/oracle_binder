# D-071 performance measurements

Before/after figures for D-071 ("fast first screen, the rest in the background").
Branch `feature/d-071-performance`. Baseline taken on commit `def1848` on 23 Nov 2026.

## How these numbers were taken

- Production build (`npm run build`) served by `vite preview` (gzip), opened in the
  Claude desktop app's built-in browser on a Mac. Not the Netlify build, and no phone.
- Lighthouse could not be run in this session, and the browser pane was hidden, so
  wall-clock paint times (FCP/LCP) were unreliable (one cold run reported 4.5 s FCP
  for a page that renders in ~0.4 s). The comparison therefore uses **deterministic
  numbers**: bytes and requests on Home's critical path, measured with the browser's
  Resource Timing API, plus `curl` for the gzip size of Scryfall responses (cross-origin
  sizes are hidden from Resource Timing).
- Times for phones are a **transfer model**, not a recording: Lighthouse's "Slow 4G"
  profile (1.6 Mbit/s ≈ 200 kB/s down, 150 ms RTT), bytes ÷ bandwidth. It ignores
  parse/execute time, so real phone gains for JavaScript are larger than shown.
- "Cold" = empty `localStorage` (first visit). "Warm" = persisted TanStack Query cache
  present (`sets`, `symbology` and the hand of the day restored from `localStorage`)
  and hashed JS/CSS in the HTTP cache.
- The Lighthouse recording (decision step 1) is in "Lighthouse recording" below. It is still
  local, not Netlify, and emulated, not a real phone.

## Baseline (before)

### JavaScript at startup

| Item | Minified | Gzip |
| --- | ---: | ---: |
| `index-*.js` (main chunk, everything) | 807.1 kB | 229.3 kB |
| other startup JS (`rolldown-runtime`) | 1.3 kB | 0.7 kB |
| **JS downloaded before Home shows** | **808 kB** | **230 kB** |

Breakdown of the main chunk by source: `d-071-baseline-bundle-breakdown.txt`. Code only
other pages need, but loaded at startup: Binder 30 kB, `@tanstack/table-core` 30 kB,
Scan 28 kB, Decks 19 kB, advanced search 16 kB, Favorites 8 kB (minified).

### Network on Home's critical path (cold start)

Measured order: JS/CSS → `/sets`, `/catalog/card-names`, `/symbology` in parallel →
`/cards/search` (needs `/sets` to pick the set of the day) → 7 card images.

| Request | Gzip transfer | Needed by Home? |
| --- | ---: | --- |
| HTML + CSS + favicon | 14 kB | yes |
| JS | 230 kB | partly |
| `/sets` | 71 kB | **yes** (picks the daily set) |
| `/catalog/card-names` | **246 kB** | **no** (only the Search name box uses it) |
| `/symbology` | 2 kB | no |
| `/cards/search` (hand of the day) | 80 kB | yes |
| 7 card images (`normal`) | ~665 kB | yes |
| **Total before the hand is fully visible** | **~1,308 kB** | |
| Requests started before LCP | 15 | |

- Bytes before the hand's *data* arrives (everything except images): **~643 kB** →
  Slow-4G model **≈ 3.2 s** + 4 round trips.
- Warm start: `/catalog/card-names` (246 kB) is **downloaded on every visit**, because it is
  not persisted. Everything else on Home comes from cache.
- `localStorage` cache after one visit: 1.51 MB (sets 634 kB, hand of the day 845 kB,
  symbology 29 kB); `JSON.parse` takes ~3 ms on the Mac.

### Favorites heart (tap response)

From the code (`useToggleFavorite`): the heart changes only after
1. the Supabase insert/delete returns, and
2. the full favorites list is fetched again (`invalidateQueries` is returned from
   `onSuccess`, so the mutation stays pending until the refetch is done).

So **2 sequential server round trips** before the heart flips, and while they run **every**
heart on the page is disabled (`favorites.isPending`). Not timed in the browser: it needs a
signed-in account (GitHub/Discord OAuth), which this session cannot use.

## Evaluation: where the win is

| Change | Effect on the first screen | Size of win |
| --- | --- | --- |
| Don't load card names on Home; prefetch them later in idle time | −246 kB on **every** visit; on a cold start `/sets` no longer shares bandwidth with a 246 kB download | **Large**: Slow-4G model ≈ −1.2 s before the hand data, warm and cold |
| Route-level `lazy` for Favorites, Binder, Decks, Scan, Login | Removes other pages' code from startup JS | Medium: expect ~−15 % startup JS; also less parse time on phones |
| Defer `usePreFetchUrl` (`/sets`, `/symbology`) to idle | Home already asks for `/sets` itself, so this only removes duplicates from the start | Small |
| Optimistic favorites | Heart flips at 0 ms instead of after 2 round trips; buttons free after 1 | **Large for perceived speed** of taps |
| Binder/Deck optimistic updates | Same idea, more complex state (copies, folders) | Later, if they still feel slow |

## After

Same method, same day, on branch `feature/d-071-performance` (uncommitted build).

### What changed

1. **Route-level code splitting**: Login, auth callback, Scan, Favorites, Binder and Decks load
   through React Router's `lazy` (`src/app/lazyPages.ts`). Home and Search stay in the main
   chunk (both are `CardBrowserPage`).
2. **Startup fetches moved to shadow time**: `App` mounts `BackgroundWork` only when
   `useBackgroundReady` says the first screen is done (cache restored, no query fetching,
   browser idle). It prefetches `/symbology`, `/sets`, card names and preloads the Binder,
   Decks and Favorites code one at a time.
3. **Home no longer asks for card names**: `useCardBrowserResults` passes `null` in
   mulligan/random mode. Search still loads them at once (checked: 20 name suggestions shown).
4. **Optimistic favorites** in `useToggleFavorite` (`onMutate` / `onError` / `onSettled`).

### JavaScript at startup

| | Before | After | Change |
| --- | ---: | ---: | ---: |
| Main chunk, minified | 807.1 kB | 718.0 kB | −89 kB (−11 %) |
| **JS before Home shows, gzip** | **230.2 kB** | **217.8 kB** | **−12.4 kB (−5 %)** |
| JS files before Home shows | 2 | 5 | +3 (parallel, same origin) |
| Page code loaded later in idle time | – | 9.8 kB (Binder, Decks, Favorites) | |
| Page code only when opened | – | Scan 10.4 kB, Login 0.8 kB, callback 0.6 kB | |

The JS saving is smaller than the ~15 % estimate: Rolldown moved code shared by the lazy
pages and Home into small shared chunks (`useFetchUrl` 7.9 kB, `react` 3.0 kB, `jsx-runtime`
0.4 kB) that Home still loads, and most of the remaining weight is `react-dom` (202 kB),
Supabase (~210 kB) and `react-router` (93 kB), which Home needs.

### Network on Home's critical path (cold start)

Measured order now: JS/CSS → `/sets` → `/cards/search` → images. `/symbology` and
`/catalog/card-names` start at ~1.2 s, after the hand is on screen; the page chunks follow.

| | Before | After | Change |
| --- | ---: | ---: | ---: |
| Requests before the hand's data arrives | 8 | 9 | +1 |
| Scryfall API calls before the hand | 4 | 2 | −2 |
| **Bytes before the hand's data arrives** | **~643 kB** | **~383 kB** | **−260 kB (−40 %)** |
| Slow-4G model, hand data ready | ≈ 3.2 s | ≈ 1.9 s | **≈ −1.3 s** |
| Total bytes before the hand is fully visible (with images) | ~1,308 kB | ~1,048 kB | −20 % |

### Warm start (cache present)

| | Before | After |
| --- | --- | --- |
| Downloads before the hand shows | card names 246 kB on every visit | **none** (images start at 123 ms) |
| Card names | at startup, competing with images | in idle time (~1.2 s) |

### Favorites heart

| | Before | After |
| --- | --- | --- |
| Server round trips before the heart flips | 2 (write + full list refetch) | **0** (cache updated at once) |
| Hearts disabled for | 2 round trips | 1 round trip (the write) |
| On a failed write | heart never changed | heart flips back (snapshot restored) |

Not timed in the browser (needs a signed-in account).

## Lighthouse recording (decision step 1)

Lighthouse 12.8.2, headless Chrome on the Mac, 23 Nov 2026. Both builds were made the same
day from the same `node_modules`: **before** = `def1848` (main), **after** = this branch.
Each build was served by `vite preview` (ports 4174 and 4175). Each profile ran 3 times,
alternating before and after; the tables show medians. Lighthouse starts with empty
storage, so every run is a **cold start**. Throttling is applied for real
(`--throttling-method=devtools`), not simulated, so the deferred loading actually happens
during the run. Scripts: `docs/perf/lighthouse/run.sh` and `summarize.py`. Raw summary:
`docs/perf/lighthouse/2026-11-23-summary.md`.

| Profile | Network | CPU |
| --- | --- | --- |
| Mobile 4G | 9 Mbit/s, 165 ms request latency | 4× slower |
| Mobile slow 4G (Lighthouse default) | 1.6 Mbit/s, 562 ms request latency | 4× slower |
| Desktop | 10 Mbit/s, 40 ms | 1× |

Lighthouse's LCP is **not** usable here: its largest element is the splash logo, not the
cards. So the hand of the day is measured from the network log:
**hand data** = `/cards/search` response done; **hand visible** = 7th card image downloaded.

| Profile | Build | Hand data | Hand visible | FCP | Speed Index | TBT | Score |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile 4G | before | 2,176 ms | 3,168 ms | 775 ms | 2,120 ms | 17 ms | 82 |
| Mobile 4G | after | **1,779 ms** | **2,806 ms** | 634 ms | 1,818 ms | 3 ms | 85 |
| Mobile slow 4G | before | 5,749 ms | 10,080 ms | 1,438 ms | 5,092 ms | 7 ms | 51 |
| Mobile slow 4G | after | **4,975 ms** | 9,943 ms | 1,857 ms ⚠ | 4,719 ms | 2 ms | 55 |
| Desktop | before | 1,178 ms | 1,849 ms | 173 ms | 1,208 ms | 0 ms | 92 |
| Desktop | after | **918 ms** | **1,652 ms** | 194 ms | 1,070 ms | 0 ms | 92 |

Everything downloaded before the hand data arrives:

| Profile (same in all) | Before | After |
| --- | ---: | ---: |
| Requests | 12 | 13 |
| Transferred | 691 kB | **435 kB (−37 %)** |
| of which JS | 226 kB | 215 kB |
| Card names start at (mobile 4G) | 895 ms, next to `/sets` | 1,937 ms, after the hand data |

### What the recording says

- **Hand data is faster in every profile**: −397 ms on mobile 4G, −774 ms on slow 4G,
  −260 ms on desktop. `/sets` no longer shares bandwidth with the card names.
- **Hand visible improves less**: −362 ms on 4G, but only −137 ms on slow 4G. The 7 images
  (~665 kB) dominate, and the background work starts as soon as no *query* is fetching. Images
  are not queries, so the card names (241 kB) and page code download **while the images are
  still loading**.
- **⚠ FCP regression on slow 4G (+420 ms, all 3 runs)**: FCP is the splash logo
  (`favicon.svg`). `vite preview` serves HTTP/1.1, where Chrome opens at most 6 connections
  per host. The after build starts with 6 JS/CSS files (main chunk + 3 small shared chunks +
  runtime + CSS), so the logo waits for a free connection: it starts at ~1,190 ms instead of
  ~625 ms. Netlify serves HTTP/2 (one connection, many requests at once), where this should
  not happen. That is **not verified**.
- Total bytes for the whole page are unchanged (~1.35 MB). The change reorders downloads; it
  does not remove any.

### Recording 2: after fixing the two weak spots

Two fixes, then the same recording again (both builds, 3 profiles × 3 runs, medians). Raw
summary: `docs/perf/lighthouse/2026-11-23-summary-2.md`.

1. **Background work waits for the images too.** `useBackgroundReady` now also waits until the
   images on screen in `<main>` have loaded (15 s limit), checking twice, 300 ms apart, after an
   idle moment. Two pitfalls found while measuring: TanStack Query hands new data to React one
   task after the fetch ends, so a single check ran before the cards were on the page; and a
   card image is 0 px high until it has loaded, so the "on screen" test must not require a height.
2. **Splash logo inlined.** A small Vite plugin (`inlineSplashLogo` in `vite.config.ts`) puts
   `public/favicon.svg` into `index.html` as a `data:` URL, so the first paint needs no extra
   request, however many JS files load. (`src/types/node-fs.d.ts` types the one Node function it
   uses; the project has no `@types/node`.)

| Profile | Build | Hand data | Hand visible | FCP | Speed Index | Score | Background starts |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile 4G | before | 1,789 ms | 2,806 ms | 529 ms | 1,795 ms | 87 | 883 ms |
| Mobile 4G | after | **1,651 ms** | 2,728 ms | 505 ms | 1,703 ms | 87 | 3,053 ms |
| Mobile slow 4G | before | 5,753 ms | 10,067 ms | 1,459 ms | 5,082 ms | 54 | 2,748 ms |
| Mobile slow 4G | after | **4,978 ms** | **9,294 ms** | 1,463 ms | 4,641 ms | **64** | 9,636 ms |
| Desktop | before | 1,217 ms | 1,935 ms | 175 ms | 1,248 ms | 91 | 377 ms |
| Desktop | after | **935 ms** | **1,621 ms** | 177 ms | 1,083 ms | 92 | 1,943 ms |

- **The FCP regression is gone** (slow 4G: 1,459 → 1,463 ms, within noise).
- **Hand visible now improves where it matters**: −773 ms on slow 4G (was −137 ms), −314 ms on
  desktop. On mobile 4G the gain is small (−78 ms).
- The background work (card names, page code) now starts after the hand is on screen in
  every profile.
- Mobile 4G "before" is ~400 ms faster than in the first recording. Same build, so that is
  network variance (Scryfall's API and image CDN are real, not throttled stand-ins). Compare
  before and after **within** one recording, not across recordings.

## Hover/focus preload of nav items (decision step 4, second half)

The Scan, Favorites, Binder and Decks nav items now start downloading their page's code when
the pointer enters them or they get keyboard focus (`preload` in `navItems.ts`). Pointer events
also fire when a finger touches down, so phones get a short head start too.

Measured with `docs/perf/hover/measure-hover.mjs` (puppeteer-core from the Lighthouse package,
headless Chrome, empty cache per run, same 4G/slow-4G profiles as above, 5 runs, medians), on
the same build: open Home, wait for the hand, then click **Scan** either directly or after a
300 ms hover. Scan is the test case because idle time does not preload its code, so only
the hover can fetch it early. "Click only" is the before: a click without pointer events
does what the app did before this change.

| Profile | Click only (before) | Hover 300 ms, then click (after) | Saved |
| --- | ---: | ---: | ---: |
| Mobile 4G | 211 ms | **27 ms** | −184 ms (−87 %) |
| Mobile slow 4G | 1,110 ms | **796 ms** | −314 ms (−28 %) |

- On 4G the page code arrives within the 300 ms hover, so the click opens Scan almost at once.
- On slow 4G the download takes longer than the hover, so the saving is about the hover time.
- Favorites, Binder and Decks are usually already preloaded in idle time; there the hover only
  helps when the user is quicker than the idle preload.

### Not done / next

- Netlify + real phone: repeat the recording on a Netlify deploy preview (HTTP/2) to check the
  FCP regression, and once on a real phone.
- Folding the small shared chunks back into the main chunk was tried with Rolldown's
  `experimentalInlineCommonChunks`; it split the app into *more* files, so it was dropped in
  favor of the inlined splash logo.
- Optimistic Binder/Deck actions (step 5, "if they still feel slow").
- Bigger JS wins need a look at Supabase (realtime-js + phoenix ≈ 56 kB minified, only
  needed when signed in) and the card details overlay.
