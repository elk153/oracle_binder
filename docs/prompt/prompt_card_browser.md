# Prompt draft file

> Historical planning prompt. The AppV2 card browser has since been implemented,
> and the V1 layout has been removed. Do not treat this draft as current work;
> use [AGENTS.md](../../AGENTS.md) and the source code as the source of truth.

## creating a card browser feature for AppV2

### context

- the card browser is used to render card lists and filter them
- the card browser also renders card details (card illustration, content, rulings, legalities, prints, etc.)
- the card browser can be called by the different other (upcoming) features of the AppV2 (search fied, home, advanced search, collection, decks). as a first step, the search field call will be implemented. other cases will be provision for.
- the layout of the render list can depend on the feature calling it.
- the browser will minimize the number of API calls and will maximize the use of the tanstack query cache
- the browser will rely on already developped functionalities:
  - createApiClient.js and will maintain the capability to call another API than scryfall
  - useOracleText for rendering the card content
  - getCardRulings => rename to fetchCardRulings
  - useFetchUrl and usePreFetchUrl
  - normalizeCard.js and scryfallCardLayouts.js
  - card-filter
  - navigation
- the browser will replace functionalities:
  - getCardPrices.js. use the query cache data from the query
- all re-used and new functionalities shall be located in the appropriate folder:
  - features/card-browser
  - hooks
  - services
  - components
- propose the use of external libraries when it can simplify the code
- use the scryfall api to discover the adapted queries
- code must be in typescript, convert the js and jsx to typescript
- follow scryfall etiquette in building the queries and testing
- rendered v1 live in the AppV1 component
- follow the rules and stack mentioned in AGENTS.md

### plan

- on the navigation bar, add a toggle switch before the search field to toggle from search in scryfall library or personal collection. the toggle will be set on scryfall and will show a "under construction" when switched to personal
- adapt the navigation bar format to handled the newly added elements (theme toggle and search toggle)
- refactor the card-filter to divide the element by categories (color, rarity, etc.), add dictionnary to make it more readable (e.g., colors), and add the possibility to select whjich categories are showed based on which feature calls the filter (search field, advanced serach, etc.)
- have the card-filter bar to have the same dimensions as the NavBar. Make it responsive.
- the CardFilters shall render below/above the NavBard desktop/mobile. It shall have the same behavior as NavBar when scrolling. it shall follow the theme of AppV2.
- on the card list:
  - the list will show the card without extra text
  - use the normal card size image in a 250px wide
  - add to the right right of the card translucent icons (50% on the card) for the following functions
    - for dual faces card, it shall provide a flip capability like for AppV1. the icon shall be a thematic translucid svg icon glowing when hovered. hovering will be the trigger to flip the card on desktop. touching the icon will be the trigger for mobile. reuse IconTurnAround. propose a keyboard/accessibility solution too
    - Add/remove the card to favorites (reuse the icon from NavIcons.jsx) for further use
    - add/removed the card to the collection (reuse the icon from NavIcons.jsx) for further use
    - add/remove card to/from a deck (reuse the icon from NavIcons.jsx) for further use
    - move the NavIcons to the asset folders and make one file per icon
    - applying the same glowing same as the NavBar
    - icons (except the turn around) will be stubs for the time being
- the card list shall adapt to the screen size with flex
- Card Details Rendered
  - based on AppV1 concept, create a card renderer for AppV2 is a new component.
  - the renderer must manage all card formats like AppV1
  - the renderer shall be made of the following elements
    - Card details:
      - a banner with the card illustration (not the full card) above the content
      - the content of the card as for AppV1 using the useOracleText hook
      - the button will change the illustration and card content
      - the rulings as for AppV1 with a theme related vertical bar as bullet
      - the legalities (legal / not legal) in a compact/horizontal fashion (pills)
    - the card prints
      - the set name
      - the set reference
      - the price in EUR with a visible difference for the foiled edition
      - showing the card print
      - same card renderer as the Cardlist
      - all card print containers shall have the same dimension.
  - on a large screen the card details will be on the left and the columns of card prints on the right with independent scrolling
  - design will be responsive
  - the card details shall render as an overlay.
  - the closing icon (reuse IconClose) will remain visible when scrolling the details or the prints
- when a search is done with an empty field, proceed with a "mulligan".
  - prefetch (all app loading app, same moment as the symbols) the list of sets available on scyrfall <https://scryfall.com/docs/api/sets>
  - fetch all cards form a random set and filter to display 5 differents card from that set. <https://scryfall.com/docs/api/cards> and <https://scryfall.com/docs/syntax#sets>
  - the random set will change everyday (stale)
- dimensions of the card prints in the card list and card prints shall be identical
- font sizes will be coherent in all elements
- all icons, NavBar, and card filters will have a common theme appearance.
- restructure the whole css modules file structure to make it coherent. break it down to coloca;ize it with the components and keep it readable
- the routing will allow back and forth navigation with deep links. use react router and nuqs to keep the navigation effective
- the app state (feature, filter, query, etc.) shall be recorded in the url

Before proceeding with the plan, review the needed documentation and tell me if supplementary libraries are required.
Make a thourough review and ask questions if elements are missing.

Once accepted:

- proceed to the changes
  - Phase 1: icons split into one file each, and a theme-token foundation.
  - Phase 2: NavBar and CardFilters refactor.
  - Phase 3: card list, API layer, and query cache.
  - Phase 4: details overlay and prints.
  - Phase 5: mulligan.
- document the changes in a .md file for me to understand the implementation
- generate a decision for DECISIONS.md
- Conversion will occur phase per phase.