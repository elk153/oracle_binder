# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Release versions follow the CalVer policy in [AGENTS.md](./AGENTS.md).

## [Unreleased]

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
