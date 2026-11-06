# State and data flows

This document explains where application state lives and how card data moves
through the V2 application. See [the architecture overview](./overview.md) for
routes and component ownership.

## State ownership

```mermaid
flowchart LR
    URL["URL state<br/>q, source, card, view, binder, deck, filters"]
    Local["Local React state<br/>temporary form values, notices, selections"]
    Auth["AuthProvider<br/>Supabase session and user"]
    Query["TanStack Query cache<br/>Scryfall and user-owned records"]
    Persist["Persisted query subset<br/>browser localStorage"]
    Supabase["Supabase<br/>Auth and user data"]
    Scryfall["Scryfall API"]
    Components["Feature pages and controls"]

    Components <--> URL
    Components <--> Local
    Components --> Auth
    Auth <--> Supabase
    Components <--> Query
    Query <--> Scryfall
    Query <--> Supabase
    Query --> Persist
    Persist --> Query
```

| State kind | Examples | Owner / source of truth |
|---|---|---|
| URL state | Search term `q`, search scope `source`, selected card `card`, Binder/Deck view and selection, card filters | React Router search params and `nuqs` parsers. It is shareable and survives reloads. |
| Local component state | Notice text, unsaved form values, selected cards for a bulk move, current overlay presentation | The page or component that owns the interaction. It is not persisted unless represented in the URL. |
| Authentication | Supabase session and current user | `AuthProvider`; user-specific queries are enabled/scoped by the authenticated user. |
| Remote/cache state | Scryfall search pages, card details, Binder/favorites/decks query results | TanStack Query, with query keys including relevant identifiers and request parameters. |
| Persisted query state | Selected Scryfall search and auxiliary URL query data | `PersistenceProvider` and browser `localStorage`; not all queries are persisted. |
| Database state | Favorites, Binder folders/copies, decks/entries | Supabase under row-level security. Realtime events invalidate caches; payloads are not treated as trusted application data. |

## Card browser search flow

```mermaid
sequenceDiagram
    actor User
    participant URL as Router URL
    participant Page as CardBrowserPage
    participant Results as useCardBrowserResults
    participant Query as TanStack Query
    participant API as Scryfall
    participant Filters as CardFilters
    participant Tile as CardTile

    User->>URL: Search or change source/filter
    URL->>Page: q, source, card, filter params
    Page->>Results: URL plus auth/favorite/Binder inputs
    Results->>Query: Search pages or card-ID hydration
    Query->>API: Cached request or HTTP request
    API-->>Query: Card records
    Query-->>Results: Cached/fetched records and status
    Results-->>Page: Validated card list and loading/error state
    Page->>Filters: Loaded cards and URL-backed filter state
    Filters-->>Page: Ordered visible rows
    Page->>Tile: Render each card and actions
    User->>Tile: Open details
    Tile->>URL: Set card=<id>
```

The search hooks preserve separate query keys for a paginated name search and a
single-page daily mulligan. The daily set is stable for the UTC day; changing
the day changes the query seed. Collection search hydrates deduplicated IDs
from favorites and owned Binder copies. Disposed Binder copies are excluded.
Search filters operate on loaded cards; they are not sent as an advanced
Scryfall query.

## User-owned data and mutations

```mermaid
flowchart TD
    Page["BinderPage / DecksPage / FavoritesPage"]
    FeatureHook["Feature query or mutation hook"]
    Cache["TanStack Query cache"]
    DB["Supabase table under RLS"]
    Realtime["Supabase Realtime event"]
    Invalidate["useRealtimeInvalidation"]
    UI["Updated feature UI"]

    Page --> FeatureHook
    FeatureHook --> DB
    DB --> FeatureHook
    FeatureHook --> Cache
    Cache --> UI
    DB --> Realtime
    Realtime --> Invalidate
    Invalidate --> Cache
```

Mutations patch their relevant cache where implemented. Realtime is an
invalidation signal, after which the normal user-scoped query reads the
authoritative row under RLS. Locally-originated Realtime echoes are tracked by
`src/services/localRealtimeChanges.ts` so they do not undo a local cache patch.

## Interaction invariants

- Keep URL-backed state in the existing query parameters; do not shadow it with
  independent state unless a component needs an uncommitted draft.
- Preserve user scoping in query keys and Supabase queries.
- Treat Scryfall and Supabase responses as external data; validate shapes before
  rendering or using them to build mutations.
- Keep Scryfall requests bounded and paced. Collection hydration is limited to
  75 identifiers per request.
- Use Realtime events to invalidate/refetch, not as trusted replacement rows.
- Prices are current Scryfall prices, not price history or collection valuation.

