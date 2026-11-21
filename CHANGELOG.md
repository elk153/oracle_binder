# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Release versions follow the CalVer policy in [AGENTS.md](./AGENTS.md).

## [Unreleased]

## [2026.11.4] - 2026-11-21

Scanner hotfix: more consistent reading of the set and number.

### Changed

- The scanner no longer needs the whole card in the frame. One wide box in
  the middle of a shorter camera view takes the set code and collector
  number (bottom left of the card), held close: the small text gets more
  than twice as many camera pixels, and iPhones switch to their macro lens.
  A small card sketch shows which part goes in the box.
- The camera asks for 4K by default.
- The number row and the set row are read one at a time, each with only the
  characters it can contain.

### Added

- Name fallback: when the set and number can't be read twice in a row, or
  with "Read the name instead", the scanner asks for the card name in the
  same box and recognizes it even with a few misread letters. In Add mode
  the printing list then opens so you can pick the printing you hold; in
  Identify mode the card opens on its default printing.

### Fixed

- Collector numbers of basic lands (rarity L) and numbers with the rarity
  letter read without a space are recognized.
- A 5 read as S in the collector number is corrected.

### Database

- No migration in this release.

## [2026.11.3] - 2026-11-21

### Added

- Card scanner on the new Scan page (`/v2/scan`, navbar item Scan), using the
  phone's rear camera. A card-shaped guide frame shows where to hold the card;
  a card held still is recognized by the set code and collector number on its
  bottom line (cards printed since 2014), read in the browser with OCR, and
  looked up on Scryfall.
  - Identify mode (works signed out) opens the recognized printing on the
    Search page with its details.
  - Add mode (signed in) adds cards one after another to a binder, Loose or a
    deck, as owned copies or as deck proxies, with copy details chosen once
    per session, and per card a printing check, finish (non-foil, foil,
    etched foil) and quantity. A notice confirms each addition and offers
    Undo.
- A page for routing errors: after a new deploy it offers to reload, an
  unknown address shows "Page not found", and other errors show "Something
  went wrong".

### Changed

- Production builds stop with a clear message when the Supabase settings are
  missing, instead of producing an app that crashes on start.
- The OCR engine and its English data (a few MB) are downloaded from the
  jsDelivr CDN the first time the scanner is used, then cached by the browser.

### Database

- No migration in this release.

## [2026.11.2] - 2026-11-21

### Added

- Advanced search on the Search page, for both Scryfall and the personal
  collection: name, oracle text, type, flavor text, set, colors and color
  identity (exactly, includes or at most), mana cost built from symbols,
  format legality, rarity and EUR price range. Filters are kept in `s_` URL
  parameters and applied when Search is pressed.
- Collection search covers favorites, owned Binder copies and all deck
  entries, with name search and filters and sorting by place (Binder or deck)
  and kind (owned, proxy, virtual, favorite).
- Card-name autocomplete for simple search and the advanced name and set
  fields, after four characters and up to 20 suggestions.
- Colored binder covers: each binder gets a color from a 12-color palette,
  chosen in one dialog for creating and modifying a binder.
- Meld cards show the other two cards of their meld trio (partner and result,
  or both pieces) with images; clicking one opens its details.

### Changed

- The Search page holds the source (Scryfall or collection) and mode (simple or
  advanced) controls; the navbar no longer has a search field, and the theme
  toggle sits between Decks and Logout. `/v2/search/advanced` redirects to
  `/v2/search?s_mode=advanced`.
- The Scryfall card-name catalog is no longer persisted in localStorage because
  the combined query cache exceeded the 2-million-character safety threshold.
- Streamlined CSS on shared design tokens, with one keyboard focus ring and
  one reduced-motion rule across the app; controls that showed the browser's
  default focus outline now show the app's ring.
- In the card details, mana costs render inline, and Binder and Decks can open
  cards that are not in their own list (for example a meld partner).

### Fixed

- Controls inside the card overlay, filters and dialogs on the Binder and
  Decks pages no longer pick up those pages' button and field styles.
- Login error messages use the error color and their own spacing.
- A transform card without faces no longer breaks the card renderer.

### Database

- Apply the Supabase migration `20261115163138_binder_color` (adds
  `binders.color`) before deploying this release. Its rollback is
  `supabase/rollback/20261115163138_binder_color_reverse.sql`.

## [2026.11.0] - 2026-11-07

### Added

- V2 card browsing with a daily seven-card home set, Scryfall name search,
  local color/rarity/type filters, sorting, card details, rulings, legalities,
  printings, and current EUR/foil prices.
- Email/password authentication and protected Favorites, Binder, and Decks
  pages.
- Favorites with paginated loading, card-printing actions, and personal
  collection search.
- Binder folders and per-copy metadata, including acquisition details,
  condition, finish, language, purchase price, disposal history, and bulk
  moves.
- Deck management with Binder-copy, proxy, and virtual card entries, deck
  covers, entry counts, and per-card deck actions.

### Changed

- Binder and Decks now open to their folder/deck lists by default. Their
  URL-backed All cards views remain available, and selecting a folder or deck
  opens its cards.
- Owned copies can be added directly to a deck instead of requiring a
  separate Binder-to-deck step.

### Fixed

- Binder/deck action popovers in the card-details overlay now layer above the
  card content and align with their card controls on mobile.

### Breaking

- Removed the legacy V1 routes; `/` opens the V2 home page.
- Each owned physical copy now has exactly one storage location: a Binder
  folder, a deck, or Loose. Moving a deck copy to a Binder folder leaves its
  deck entry virtual; deleting its deck releases assigned copies to Loose.

### Database

- Apply the Supabase migrations required for the current schema:
  `20261027145744_favorites`,
  `20261028102553_set_updated_at`,
  `20261028104954_binder_schema`,
  `20261028113029_binder_realtime`,
  `20261102174623_decks_schema`,
  `20261104200558_handle_deck_copy_removal`, and
  `20261107084804_exclusive_deck_copy_storage`.
