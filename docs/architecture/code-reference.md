# Source code reference

This is a file-by-file map of the live `src/` tree. It describes module purpose
and exported component, hook, function, or type contracts. Private helpers
remain implementation details; read the linked source for their exact logic.
Keep this reference aligned with the source when moving or adding modules.

## Entry, providers, and routing

| File | Purpose and public contract |
|---|---|
| [`src/main.tsx`](../../src/main.tsx) | Browser entry: validates `#root`, imports global theme CSS, and mounts `AppProviders` under `StrictMode`. |
| [`src/app/router.tsx`](../../src/app/router.tsx) | Defines redirects, the `/v2` layout, public routes, and `RequireAuth`-protected routes; default-exports the router. |
| [`src/app/App.tsx`](../../src/app/App.tsx) | V2 shell and splash transition. Exports `App` and route elements `Home`, `Favorites`, `Binder`, and `Decks`. |
| [`src/app/AppProviders.tsx`](../../src/app/AppProviders.tsx) | Composes theme, query persistence/devtools, auth, and router providers; default-exports `AppProviders`. |
| [`src/app/AppProviders/AuthContext.ts`](../../src/app/AppProviders/AuthContext.ts) | Exports `AuthContextValue`, `AuthContext`, and `useAuth`; defines the session/user/loading/sign-out contract. |
| [`src/app/AppProviders/AuthProvider.tsx`](../../src/app/AppProviders/AuthProvider.tsx) | Exports `AuthProvider`; synchronizes the Supabase session with React context. |
| [`src/app/AppProviders/ThemeContext.ts`](../../src/app/AppProviders/ThemeContext.ts) | Exports `Theme`, `ThemeContext`, and `useTheme`; provides the dark/light theme contract. |
| [`src/app/AppProviders/ThemeProvider.tsx`](../../src/app/AppProviders/ThemeProvider.tsx) | Exports `ThemeProvider`; applies theme state to the document and browser theme color. |
| [`src/app/AppProviders/queryProvider.ts`](../../src/app/AppProviders/queryProvider.ts) | Creates and exports the shared TanStack `queryClient`. |
| [`src/app/AppProviders/PersistenceProvider.tsx`](../../src/app/AppProviders/PersistenceProvider.tsx) | Configures persisted-query restoration and persistence around the shared query client. |
| [`src/app/AppProviders/QueryDevToolsProvider.tsx`](../../src/app/AppProviders/QueryDevToolsProvider.tsx) | Lazily provides React Query Devtools in development. |

## Icons

React SVG assets are individual components. Navigation-specific symbols are
grouped in the nested folder; `public/favicon.svg` and `public/logo.svg` are
static brand assets and are not React components.

| File | Contract |
|---|---|
| [`src/assets/icons/IconClose.tsx`](../../src/assets/icons/IconClose.tsx) | Default `IconClose`; SVG props allow use in the card-details close control. |
| [`src/assets/icons/IconTurnAround.tsx`](../../src/assets/icons/IconTurnAround.tsx) | Default `IconTurnAround`; SVG props allow reuse on double-faced card tiles. |
| [`src/assets/icons/navigation/AdvancedSearchIcon.tsx`](../../src/assets/icons/navigation/AdvancedSearchIcon.tsx) | Default navigation icon for the Search item. |
| [`src/assets/icons/navigation/BinderIcon.tsx`](../../src/assets/icons/navigation/BinderIcon.tsx) | Default navigation/action icon for Binder. |
| [`src/assets/icons/navigation/DecksIcon.tsx`](../../src/assets/icons/navigation/DecksIcon.tsx) | Default navigation/action icon for Decks. |
| [`src/assets/icons/navigation/FavoritesIcon.tsx`](../../src/assets/icons/navigation/FavoritesIcon.tsx) | Default navigation/action icon for Favorites. |
| [`src/assets/icons/navigation/HomeIcon.tsx`](../../src/assets/icons/navigation/HomeIcon.tsx) | Default navigation icon for Home. |
| [`src/assets/icons/navigation/LogoutIcon.tsx`](../../src/assets/icons/navigation/LogoutIcon.tsx) | Default sign-out icon for desktop/mobile navigation. |
| [`src/assets/icons/navigation/NavMoonIcon.tsx`](../../src/assets/icons/navigation/NavMoonIcon.tsx) | Default moon SVG for the theme toggle. |
| [`src/assets/icons/navigation/NavSunIcon.tsx`](../../src/assets/icons/navigation/NavSunIcon.tsx) | Default sun SVG for the theme toggle. |

## Authentication

| File | Purpose and public contract |
|---|---|
| [`src/features/auth/LoginPage.tsx`](../../src/features/auth/LoginPage.tsx) | Default login/signup page; owns auth form interaction and error display. |
| [`src/features/auth/AuthCallbackPage.tsx`](../../src/features/auth/AuthCallbackPage.tsx) | Default callback page; completes confirmation and redirects to a safe V2 path. |
| [`src/features/auth/RequireAuth.tsx`](../../src/features/auth/RequireAuth.tsx) | Default protected-route gate; routes unauthenticated users through login. |
| [`src/features/auth/authRedirect.ts`](../../src/features/auth/authRedirect.ts) | Exports `getSafeNextPath` and `getAuthCallbackUrl` for safe internal auth redirects. |
| [`src/features/auth/AuthPages.css`](../../src/features/auth/AuthPages.css) | Shared login and callback page styles. |

## Card browser

| File | Purpose and public contract |
|---|---|
| [`src/features/card-browser/CardBrowserPage.tsx`](../../src/features/card-browser/CardBrowserPage.tsx) | Default `CardBrowserPage`; composes search results, filters, card actions, details, and Binder add-copy dialog. `mode` selects search or mulligan rendering. |
| [`src/features/card-browser/useCardBrowserResults.ts`](../../src/features/card-browser/useCardBrowserResults.ts) | Default `useCardBrowserResults`; interprets URL/search scope, owns daily mulligan timing, queries card sources, validates records, and returns display state. |
| [`src/features/card-browser/useScryfallCardsSearch.ts`](../../src/features/card-browser/useScryfallCardsSearch.ts) | Default single-request Scryfall React Query hook; uses the `scryfallCards` query-key family. |
| [`src/features/card-browser/useScryfallCardPages.ts`](../../src/features/card-browser/useScryfallCardPages.ts) | Default paginated Scryfall search hook; validates `next_page` URLs and exposes loaded pages and pagination state. |
| [`src/features/card-browser/mulliganSets.ts`](../../src/features/card-browser/mulliganSets.ts) | Exports `ScryfallSet`, `isScryfallSet`, `getMulliganSets`, and `selectDailyMulliganSet` for validating/filtering sets and selecting a daily set. |
| [`src/features/card-browser/types.ts`](../../src/features/card-browser/types.ts) | Exports card/source/action/image/face types and `isCardBrowserCard` runtime guard. |
| [`src/features/card-browser/fetchCardRulings.ts`](../../src/features/card-browser/fetchCardRulings.ts) | Exports `CardRuling` and `fetchCardRulings`; validates and maps Scryfall rulings. |
| [`src/features/card-browser/CardTile.tsx`](../../src/features/card-browser/CardTile.tsx) | Default reusable card tile; renders a card and optional favorite/Binder/Deck actions. Binder actions signal when disposed-copy history exists. |
| [`src/features/card-browser/CardDetailsOverlay.tsx`](../../src/features/card-browser/CardDetailsOverlay.tsx) | Default accessible card-details overlay; loads details/rulings/prints and wires card actions. |
| [`src/features/card-browser/CardBrowserPage.css`](../../src/features/card-browser/CardBrowserPage.css) | Search/home result layout, messages, pagination, and notice styles. |
| [`src/features/card-browser/CardTile.css`](../../src/features/card-browser/CardTile.css) | Card tile, face flip, action popover, and entry-state styles. |
| [`src/features/card-browser/CardDetailsOverlay.css`](../../src/features/card-browser/CardDetailsOverlay.css) | Card-details overlay, card-content, rulings, legalities, and print layout. |

## Card filters

| File | Purpose and public contract |
|---|---|
| [`src/features/card-filters/CardFilters.tsx`](../../src/features/card-filters/CardFilters.tsx) | Default `CardFilters`; renders feature/layout filter controls, optional collection place/kind controls, and visible/total counts. |
| [`src/features/card-filters/useCardsTable.ts`](../../src/features/card-filters/useCardsTable.ts) | Exports `useCardsTable`; converts URL parser values into controlled TanStack Table state and reset operations, optionally using card-place metadata. |
| [`src/features/card-filters/columns.ts`](../../src/features/card-filters/columns.ts) | Exports registered table `features`, default `columns`, and `createColumns` for color, rarity, type, place, kind, and sort behavior. |
| [`src/features/card-filters/filterParams.ts`](../../src/features/card-filters/filterParams.ts) | Exports valid color/rarity/kind/sort constants and `filterParsers` for URL-backed filters. |
| [`src/features/card-filters/filterCategories.ts`](../../src/features/card-filters/filterCategories.ts) | Exports `FilterFeature`, `FilterCategory`, feature/category mapping, and display-label dictionaries. |
| [`src/features/card-filters/types.ts`](../../src/features/card-filters/types.ts) | Exports narrow `CardColor` and `ScryfallCard` shapes plus card-place metadata used by collection filtering. |
| [`src/features/card-filters/CardFilters.css`](../../src/features/card-filters/CardFilters.css) | Filter bar and control styles, including responsive/floating layouts. |

## Favorites

| File | Purpose and public contract |
|---|---|
| [`src/features/favorites/FavoritesPage.tsx`](../../src/features/favorites/FavoritesPage.tsx) | Default protected favorites page; composes paginated favorite hydration, filters, card tiles, and details. |
| [`src/features/favorites/useFavoriteCards.ts`](../../src/features/favorites/useFavoriteCards.ts) | Default paginated favorites hook; hydrates Supabase favorite IDs through Scryfall while preserving database ordering. |
| [`src/features/favorites/useFavorites.ts`](../../src/features/favorites/useFavorites.ts) | Exports `useFavoriteIds` and `useToggleFavorite`; reads and mutates the current user's favorites. |
| [`src/features/favorites/useFavoriteCardAction.ts`](../../src/features/favorites/useFavoriteCardAction.ts) | Default `useFavoriteCardAction`; shares favorite IDs, pending state, and card-toggle mutation across CardBrowser, Binder, and Decks. The calling page owns user-facing notices. |
| [`src/features/favorites/FavoritesPage.css`](../../src/features/favorites/FavoritesPage.css) | Favorites page layout, result grid, loading/error, and notice styles. |

## Binder

| File | Purpose and public contract |
|---|---|
| [`src/features/binder/BinderPage.tsx`](../../src/features/binder/BinderPage.tsx) | Default Binder page; opens the binder list unless an explicit view is set, and owns URL-backed view/folder/history selection, bulk moves, filters, and card presentation. Deck-assigned copies are excluded from Binder folders and Loose; History includes retained sold, lost, and given-away copies. |
| [`src/features/binder/useBinders.ts`](../../src/features/binder/useBinders.ts) | Exports `Binder`, `bindersQueryKey`, and `useBinders`; provides user-scoped binder-folder queries and mutations. |
| [`src/features/binder/useBinderCopies.ts`](../../src/features/binder/useBinderCopies.ts) | Exports Binder copy and mutation types, `binderCopiesQueryKey`, and `useBinderCopies`; manages per-copy records, atomic deck assignment/moves, and history actions. |
| [`src/features/binder/useBinderManagement.ts`](../../src/features/binder/useBinderManagement.ts) | Default `useBinderManagement`; coordinates Binder folder/copy hooks, deck destinations, and dialog actions. |
| [`src/features/binder/BinderCopyForm.tsx`](../../src/features/binder/BinderCopyForm.tsx) | Exports `CopyFormValues` and default `BinderCopyForm`; collects storage destination and per-copy acquisition/disposal fields with standard acquisition, condition, finish, and language choices. |
| [`src/features/binder/AddBinderCopyDialog.tsx`](../../src/features/binder/AddBinderCopyDialog.tsx) | Default add-copy dialog; offers Loose, Binder-folder, and deck storage destinations and wraps save/cancel actions. |
| [`src/features/binder/BinderCopiesPopover.tsx`](../../src/features/binder/BinderCopiesPopover.tsx) | Default copy-history/action popover for a card's Binder copies. |
| [`src/features/binder/Binder.css`](../../src/features/binder/Binder.css) | Shared Binder copy/form/popover styles, including EUR price input and theme-aware date control. |
| [`src/features/binder/BinderPage.css`](../../src/features/binder/BinderPage.css) | Binder folders, card list, selection, and bulk-move page styles. |

## Decks

| File | Purpose and public contract |
|---|---|
| [`src/features/decks/DecksPage.tsx`](../../src/features/decks/DecksPage.tsx) | Default protected Decks page; opens the deck list unless an explicit view is set, and owns URL-backed views, deck CRUD interaction, filters, and entries presentation. |
| [`src/features/decks/useDeckManagement.ts`](../../src/features/decks/useDeckManagement.ts) | Exports `Deck`, `DeckCard`, insert/update types, query-key factories, `useDeckManagement`, and derived `DeckActions`; user-scoped queries and mutations that synchronize physical copy storage on deck assignment/release. |
| [`src/features/decks/DeckCardPopover.tsx`](../../src/features/decks/DeckCardPopover.tsx) | Default deck-entry action popover for adding/removing/changing card entry kinds. |
| [`src/features/decks/DecksPage.css`](../../src/features/decks/DecksPage.css) | Deck list, deck covers, entry-kind labels, and page states. |
| [`src/features/queryKeys.ts`](../../src/features/queryKeys.ts) | Shared query-key factories for Binder copies and deck cards, avoiding hook import cycles. |

## Navigation

| File | Purpose and public contract |
|---|---|
| [`src/features/navigation/NavBar.tsx`](../../src/features/navigation/NavBar.tsx) | Default responsive navbar coordinator; owns sign-out handling. |
| [`src/features/navigation/NavBarDesktop.tsx`](../../src/features/navigation/NavBarDesktop.tsx) | Desktop navbar presentation and navigation actions. |
| [`src/features/navigation/NavBarMobile.tsx`](../../src/features/navigation/NavBarMobile.tsx) | Mobile navbar presentation and navigation actions. |
| [`src/features/navigation/NavThemeToggle.tsx`](../../src/features/navigation/NavThemeToggle.tsx) | Default theme toggle; reads/writes theme through `useTheme`. |
| [`src/features/navigation/navItems.ts`](../../src/features/navigation/navItems.ts) | Default single-source navigation item list shared by both navbar layouts. |
| [`src/features/navigation/types.ts`](../../src/features/navigation/types.ts) | Exports the `NavBarProps` contract. |
| [`src/features/navigation/README.md`](../../src/features/navigation/README.md) | Navigation-specific design and behavior notes. |
| [`src/features/navigation/navbar-shared.css`](../../src/features/navigation/navbar-shared.css) | Shared navbar surface, icon, and label styles. |
| [`src/features/navigation/navbar-desktop.css`](../../src/features/navigation/navbar-desktop.css) | Desktop positioning and responsive visibility. |
| [`src/features/navigation/navbar-mobile.css`](../../src/features/navigation/navbar-mobile.css) | Mobile positioning and responsive visibility. |
| [`src/features/navigation/NavThemeToggle.css`](../../src/features/navigation/NavThemeToggle.css) | Theme button presentation and focus states. |

## Search

| File | Purpose and public contract |
|---|---|
| [`src/features/search/SearchControls.tsx`](../../src/features/search/SearchControls.tsx) | Search-page controls for the Scryfall/collection source and simple/advanced mode, persisted in URL parameters. |
| [`src/features/search/SearchSourceToggle.tsx`](../../src/features/search/SearchSourceToggle.tsx) | Default source toggle used by the search page. |
| [`src/features/search/types.ts`](../../src/features/search/types.ts) | Exports the `SearchSource` and `SearchMode` contracts. |

## Shared card renderer

| File | Purpose and public contract |
|---|---|
| [`src/features/scryfall-card-renderer/CardRenderer.jsx`](../../src/features/scryfall-card-renderer/CardRenderer.jsx) | Default card renderer; selects a layout-specific component using normalized card data. |
| [`src/features/scryfall-card-renderer/normalizeCard.js`](../../src/features/scryfall-card-renderer/normalizeCard.js) | Exports `normalizeCard`; maps raw Scryfall records to renderer shape. |
| [`src/features/scryfall-card-renderer/scryfallCardLayouts.js`](../../src/features/scryfall-card-renderer/scryfallCardLayouts.js) | Exports layout/shape constants and `getCardRenderConfig`; maps Scryfall layouts to renderer behavior. |
| [`src/features/scryfall-card-renderer/components/CardFrame.jsx`](../../src/features/scryfall-card-renderer/components/CardFrame.jsx) | Exports `CardFaceMetadata` and default `CardFrame`; common face image/text frame. |
| [`src/features/scryfall-card-renderer/components/OneFaceCard.jsx`](../../src/features/scryfall-card-renderer/components/OneFaceCard.jsx) | Single-face card layout. |
| [`src/features/scryfall-card-renderer/components/FlipVerticalCard.jsx`](../../src/features/scryfall-card-renderer/components/FlipVerticalCard.jsx) | Vertical flip-card layout. |
| [`src/features/scryfall-card-renderer/components/MeldCard.jsx`](../../src/features/scryfall-card-renderer/components/MeldCard.jsx) | Meld-card layout and related-card lookup. |
| [`src/features/scryfall-card-renderer/components/SplitFacesCard.jsx`](../../src/features/scryfall-card-renderer/components/SplitFacesCard.jsx) | Split/adventure-style card layout. |
| [`src/features/scryfall-card-renderer/components/ToggleFacesCard.jsx`](../../src/features/scryfall-card-renderer/components/ToggleFacesCard.jsx) | Transform/modal double-faced card layout. |
| [`src/features/scryfall-card-renderer/components/OracleText.jsx`](../../src/features/scryfall-card-renderer/components/OracleText.jsx) | Renderer adapter for symbol-aware Oracle text. |
| [`src/features/scryfall-card-renderer/components/extras/CardExtras.jsx`](../../src/features/scryfall-card-renderer/components/extras/CardExtras.jsx) | Selects layout-specific supplemental text widgets. |
| [`src/features/scryfall-card-renderer/components/extras/CaseSections.jsx`](../../src/features/scryfall-card-renderer/components/extras/CaseSections.jsx) | Case-card section display. |
| [`src/features/scryfall-card-renderer/components/extras/ClassLevels.jsx`](../../src/features/scryfall-card-renderer/components/extras/ClassLevels.jsx) | Class-card level display. |
| [`src/features/scryfall-card-renderer/components/extras/LevelerStats.jsx`](../../src/features/scryfall-card-renderer/components/extras/LevelerStats.jsx) | Leveler-card level/stat display. |
| [`src/features/scryfall-card-renderer/components/extras/MutateBanner.jsx`](../../src/features/scryfall-card-renderer/components/extras/MutateBanner.jsx) | Mutate-card supplemental text. |
| [`src/features/scryfall-card-renderer/components/extras/PrototypeBanner.jsx`](../../src/features/scryfall-card-renderer/components/extras/PrototypeBanner.jsx) | Prototype-card supplemental text. |
| [`src/features/scryfall-card-renderer/components/extras/SagaTracker.jsx`](../../src/features/scryfall-card-renderer/components/extras/SagaTracker.jsx) | Saga chapter display. |

## Shared hooks, services, and generated types

| File | Purpose and public contract |
|---|---|
| [`src/hooks/useFetchUrl.ts`](../../src/hooks/useFetchUrl.ts) | Default cached auxiliary-URL query hook; validates HTTP responses and list-shaped data. |
| [`src/hooks/usePreFetchUrl.ts`](../../src/hooks/usePreFetchUrl.ts) | Default prefetch hook for auxiliary Scryfall resources. |
| [`src/hooks/useOracleText.tsx`](../../src/hooks/useOracleText.tsx) | Default symbol-aware Oracle text hook; uses cached Scryfall symbology data. |
| [`src/hooks/useRealtimeInvalidation.ts`](../../src/hooks/useRealtimeInvalidation.ts) | Default user-filtered Supabase Realtime invalidation hook. |
| [`src/hooks/useScrollVisibility.ts`](../../src/hooks/useScrollVisibility.ts) | Default scroll-direction visibility hook used by navbar and filters. |
| [`src/hooks/useScryfallCardsForIds.ts`](../../src/hooks/useScryfallCardsForIds.ts) | Default cached hook for batched Scryfall card hydration by ID. |
| [`src/services/createApiClient.ts`](../../src/services/createApiClient.ts) | Exports API record/parameter types and `createApiClient`; normalizes Scryfall card/list responses. |
| [`src/services/fetchScryfallCards.ts`](../../src/services/fetchScryfallCards.ts) | Exports collection endpoint limit and card-record type; validated, abortable request bounded to 75 identifiers. |
| [`src/services/fetchScryfallCardsForIds.ts`](../../src/services/fetchScryfallCardsForIds.ts) | Exports sequential batched card hydration by Scryfall ID. |
| [`src/services/localRealtimeChanges.ts`](../../src/services/localRealtimeChanges.ts) | Exports `markLocalRealtimeChange`, `clearLocalRealtimeChange`, and `consumeLocalRealtimeChange` for suppressing local Realtime echoes. |
| [`src/services/supabaseClient.ts`](../../src/services/supabaseClient.ts) | Exports the typed Supabase client singleton. |
| [`src/types/database.ts`](../../src/types/database.ts) | Exports generated `Database`, `Json`, table/insert/update/enum/composite helpers, and database constants. |

## Global styles

| File | Responsibility |
|---|---|
| [`src/theme.css`](../../src/theme.css) | Global theme tokens and dark/light document styles. |
| [`src/app/App.css`](../../src/app/App.css) | V2 shell, main content spacing, placeholder page, and theme-specific navbar integration. |
