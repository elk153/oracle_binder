import { useEffect, useMemo, useState } from "react";
import {
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
import CardDetailsOverlay from "../card-browser/CardDetailsOverlay.tsx";
import CardTile from "../card-browser/CardTile.tsx";
import type { CardAction, CardBrowserCard } from "../card-browser/types.ts";
import { isCardBrowserCard } from "../card-browser/types.ts";
import CardFilters from "../card-filters/CardFilters.tsx";
import { useCardsTable } from "../card-filters/useCardsTable.ts";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import useScryfallCardsForIds from "../../hooks/useScryfallCardsForIds.ts";
import useBinderManagement from "../binder/useBinderManagement.ts";
import AddBinderCopyDialog from "../binder/AddBinderCopyDialog.tsx";
import type { BinderCopy } from "../binder/useBinderCopies.ts";
import type { Deck, DeckCard } from "./useDeckManagement.ts";
import useDeckManagement from "./useDeckManagement.ts";
import useFavoriteCardAction from "../favorites/useFavoriteCardAction.ts";
import "./DecksPage.css";

const DECK_VIEWS = ["all", "decks"] as const;
const RARITY_RANK: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  mythic: 4,
};

function getDeckCover(
  entries: DeckCard[],
  cardsById: ReadonlyMap<string, CardBrowserCard>,
): DeckCard | undefined {
  return [...entries]
    .sort((left, right) => {
      const leftCard = cardsById.get(left.scryfall_id);
      const rightCard = cardsById.get(right.scryfall_id);
      const rarityDifference =
        (RARITY_RANK[rightCard?.rarity ?? ""] ?? 0) -
        (RARITY_RANK[leftCard?.rarity ?? ""] ?? 0);
      if (rarityDifference !== 0) return rarityDifference;
      const legendaryDifference =
        Number(Boolean(rightCard?.type_line?.includes("Legendary"))) -
        Number(Boolean(leftCard?.type_line?.includes("Legendary")));
      if (legendaryDifference !== 0) return legendaryDifference;
      return left.created_at.localeCompare(right.created_at);
    })
    .find((entry) => cardsById.has(entry.scryfall_id));
}

export default function DecksPage() {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(DECK_VIEWS).withDefault("decks"),
  );
  const [selectedDeckId, setSelectedDeckId] = useQueryState("deck", parseAsString);
  const { user } = useAuth();
  const [cardId, setCardId] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [notice, setNotice] = useState("");
  const decks = useDeckManagement();
  const binder = useBinderManagement(setNotice);
  const favorites = useFavoriteCardAction();
  const {
    favoriteIds,
    isLoading: favoritesLoading,
    error: favoritesError,
  } = favorites;

  const cardIds = useMemo(
    () =>
      [...new Set(decks.deckCards.map((entry) => entry.scryfall_id))].sort(),
    [decks.deckCards],
  );
  const cardsQuery = useScryfallCardsForIds(
    "decks-page",
    cardIds,
    Boolean(user) && !decks.isLoading,
  );
  const invalidCardData =
    cardsQuery.data?.some((card) => !isCardBrowserCard(card)) ?? false;
  const cards = useMemo<CardBrowserCard[]>(
    () =>
      invalidCardData
        ? []
        : (cardsQuery.data ?? []).filter(isCardBrowserCard),
    [cardsQuery.data, invalidCardData],
  );
  const cardsById = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );

  useEffect(() => {
    if (
      !decks.isLoading &&
      !decks.error &&
      selectedDeckId &&
      !decks.decks.some((deck) => deck.id === selectedDeckId)
    ) {
      void setSelectedDeckId(null);
    }
  }, [decks.decks, decks.error, decks.isLoading, selectedDeckId, setSelectedDeckId]);

  const visibleEntries = useMemo(
    () =>
      selectedDeckId
        ? decks.deckCards.filter((entry) => entry.deck_id === selectedDeckId)
        : decks.deckCards,
    [decks.deckCards, selectedDeckId],
  );
  const entryById = useMemo(
    () => new Map(visibleEntries.map((entry) => [entry.id, entry])),
    [visibleEntries],
  );
  const tableCards = useMemo(
    () =>
      visibleEntries.flatMap((entry) => {
        const card = cardsById.get(entry.scryfall_id);
        return card ? [{ ...card, id: entry.id }] : [];
      }),
    [cardsById, visibleEntries],
  );
  const { table, filters, setFilters, resetFilters } = useCardsTable(tableCards);
  const rows = table.getRowModel().rows;
  const filteredEntries = rows.flatMap((row) => {
    const entry = entryById.get(row.original.id);
    const card = entry ? cardsById.get(entry.scryfall_id) : undefined;
    return entry && card ? [{ entry, card }] : [];
  });
  const cardsMissingFromScryfall = visibleEntries.length - tableCards.length;
  const selectedCard = cardId ? cardsById.get(cardId) : undefined;

  function chooseDeck(deckId: string) {
    void setSelectedDeckId(deckId);
    void setView("all");
  }

  async function createDeck() {
    const name = newDeckName.trim();
    if (!name) return;
    try {
      await decks.createDeck(name);
      setNewDeckName("");
      setNotice(`Created deck “${name}”.`);
    } catch (error) {
      setNotice(
        `Could not create deck: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
    }
  }

  async function renameDeck(deck: Deck) {
    const name = window.prompt("Rename deck", deck.name)?.trim();
    if (!name || name === deck.name) return;
    try {
      await decks.renameDeck({ id: deck.id, name });
      setNotice(`Renamed deck to “${name}”.`);
    } catch (error) {
      setNotice(
        `Could not rename deck: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
    }
  }

  async function deleteDeck(deck: Deck) {
    const count = decks.deckCards.filter(
      (entry) => entry.deck_id === deck.id,
    ).length;
    if (
      !window.confirm(
        `Delete “${deck.name}”? This permanently removes ${count} ${
          count === 1 ? "deck entry" : "deck entries"
        }. Assigned Binder copies will become Loose.`,
      )
    ) {
      return;
    }
    try {
      await decks.deleteDeck(deck.id);
      if (selectedDeckId === deck.id) void setSelectedDeckId(null);
      setNotice(`Deleted “${deck.name}” and its ${count} deck entries.`);
    } catch (error) {
      setNotice(
        `Could not delete deck: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
    }
  }

  function handleCardAction(action: CardAction, card: CardBrowserCard) {
    if (action !== "favorite" || !user) return;
    favorites.toggleCardFavorite(card, user.id, {
      onSuccess: (wasFavorite) =>
        setNotice(
          wasFavorite
            ? `Removed ${card.name} from Favorites.`
            : `Added ${card.name} to Favorites.`,
        ),
      onError: (error) => setNotice(`Could not update Favorites: ${error.message}`),
    });
  }

  const binderActionDisabled =
    binder.bindersLoading ||
    binder.copies.isLoading ||
    decks.isLoading ||
    Boolean(binder.bindersError) ||
    Boolean(binder.copies.error) ||
    Boolean(decks.error) ||
    binder.isPending;
  const binderCardProps = {
    binders: binder.binders,
    isBinderPending: binderActionDisabled,
    canManageBinder: Boolean(user),
    onAddBinderCopy: binder.requestAdd,
    onUpdateBinderCopy: (copy: BinderCopy, values: Parameters<typeof binder.updateCopy>[1]) =>
      binder.updateCopy(copy, values),
    onDisposeBinderCopy: (copy: BinderCopy, status: "sold" | "lost" | "given_away") =>
      binder.disposeCopy(copy.id, status),
    onRestoreBinderCopy: (copy: BinderCopy) => binder.restoreCopy(copy.id),
    onDeleteBinderCopy: (copy: BinderCopy) => binder.deleteCopy(copy.id),
  };
  const deckActionProps = {
    deckActions: decks,
    canManageDeck: Boolean(user),
  };
  const deckCovers = new Map<string, DeckCard | undefined>();
  for (const deck of decks.decks) {
    deckCovers.set(
      deck.id,
      getDeckCover(
        decks.deckCards.filter((entry) => entry.deck_id === deck.id),
        cardsById,
      ),
    );
  }
  const isLoading = decks.isLoading || cardsQuery.isLoading;

  return (
    <section className="deck-page">
      <header className="deck-page__heading">
        <h1>Decks</h1>
        <div className="deck-page__view-switch" role="group" aria-label="Deck view">
          <button
            type="button"
            aria-pressed={view === "all"}
            onClick={() => void setView("all")}
          >
            All cards
          </button>
          <button
            type="button"
            aria-pressed={view === "decks"}
            onClick={() => void setView("decks")}
          >
            Decks
          </button>
        </div>
      </header>

      {decks.error && (
        <p className="deck-page__message deck-page__message--error" role="alert">
          Could not load decks: {decks.error.message}
        </p>
      )}
      {binder.copies.error && (
        <p className="deck-page__message deck-page__message--error" role="alert">
          Could not load Binder copies: {binder.copies.error.message}
        </p>
      )}
      {binder.bindersError && (
        <p className="deck-page__message deck-page__message--error" role="alert">
          Could not load binders: {binder.bindersError.message}
        </p>
      )}
      {cardsQuery.error && (
        <p className="deck-page__message deck-page__message--error" role="alert">
          Could not load card printings: {cardsQuery.error.message}
        </p>
      )}
      {invalidCardData && (
        <p className="deck-page__message deck-page__message--error" role="alert">
          Scryfall returned card data in an unexpected format.
        </p>
      )}
      {binder.realtimeError && (
        <p className="deck-page__message" role="alert">
          Binder updates from other devices may be delayed: {binder.realtimeError.message}
        </p>
      )}
      {favoritesError && (
        <p className="deck-page__message deck-page__message--error" role="alert">
          Could not load favorite status: {favoritesError.message}
        </p>
      )}
      {cardsQuery.isLoading && (
        <p className="deck-page__message" role="status">
          Loading card printings…
        </p>
      )}

      {view === "decks" && (
        <section className="deck-page__decks" aria-label="Your decks">
          <form
            className="deck-page__create"
            onSubmit={(event) => {
              event.preventDefault();
              void createDeck();
            }}
          >
            <label>
              New deck
              <input
                value={newDeckName}
                onChange={(event) => setNewDeckName(event.currentTarget.value)}
                maxLength={100}
              />
            </label>
            <button type="submit" disabled={!newDeckName.trim() || decks.isPending}>
              Create deck
            </button>
          </form>

          <div className="deck-page__grid">
            {decks.decks.map((deck) => {
              const entries = decks.deckCards.filter(
                (entry) => entry.deck_id === deck.id,
              );
              const cover = deckCovers.get(deck.id);
              const card = cover ? cardsById.get(cover.scryfall_id) : undefined;
              const countLabel = `${entries.length} ${
                entries.length === 1 ? "card" : "cards"
              }`;
              return (
                <article className="deck-page__deck-card" key={deck.id}>
                  {card && cover ? (
                    <CardTile
                      card={card}
                      deckEntryKind={cover.kind}
                      onSelect={() => chooseDeck(deck.id)}
                      selectLabel={`Open ${deck.name}, ${countLabel}`}
                      showActions={false}
                    />
                  ) : (
                    <button
                      type="button"
                      className="deck-page__cover"
                      onClick={() => chooseDeck(deck.id)}
                      aria-label={`Open ${deck.name}, ${countLabel}`}
                    >
                      {entries.length === 0 ? "Empty deck" : "No available cover"}
                    </button>
                  )}
                  <div className="deck-page__deck-meta">
                    <h2>{deck.name}</h2>
                    <span className="deck-page__count">{countLabel}</span>
                  </div>
                  <div className="deck-page__deck-actions">
                    <button
                      type="button"
                      disabled={decks.isPending}
                      onClick={() => void renameDeck(deck)}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      disabled={decks.isPending}
                      onClick={() => void deleteDeck(deck)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {!decks.isLoading && !decks.error && decks.decks.length === 0 && (
            <p className="deck-page__message">You have no decks yet.</p>
          )}
        </section>
      )}

      {view === "all" && (
        <>
          <div className="deck-page__toolbar">
            <label>
              Show
              <select
                value={selectedDeckId ?? ""}
                onChange={(event) =>
                  void setSelectedDeckId(event.currentTarget.value || null)
                }
              >
                <option value="">All decks</option>
                {decks.decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedDeckId && (
              <button type="button" onClick={() => void setView("decks")}>
                Back to decks
              </button>
            )}
          </div>

          {tableCards.length > 0 && (
            <CardFilters
              filters={filters}
              setFilters={setFilters}
              onReset={resetFilters}
              shown={rows.length}
              total={tableCards.length}
              feature="search"
              layout="floating"
            />
          )}

          {isLoading ? (
            <p className="deck-page__message" role="status">Loading deck cards…</p>
          ) : filteredEntries.length > 0 ? (
            <div className="deck-page__list" aria-label="Deck cards">
              {filteredEntries.map(({ entry, card }) => {
                const binderCopy =
                  entry.kind === "binder"
                    ? binder.copies.copiesByScryfallId
                        .get(card.id)
                        ?.find((copy) => copy.id === entry.binder_card_id)
                    : undefined;
                const kindLabel =
                  entry.kind === "binder"
                    ? binderCopy
                      ? "Owned (in this deck)"
                      : "Owned copy unavailable"
                    : entry.kind === "proxy"
                      ? "Proxy"
                      : "Virtual";
                return (
                  <article className="deck-page__entry" key={entry.id}>
                    <CardTile
                      card={card}
                      deckEntryKind={entry.kind}
                      showKindLabel={false}
                      onSelect={() => setCardId(card.id)}
                      onAction={handleCardAction}
                      isFavorite={favoriteIds.has(card.id)}
                      isFavoritePending={
                        favoritesLoading ||
                        Boolean(favoritesError) ||
                        favorites.isPending
                      }
                      binderCopies={binder.copies.copiesByScryfallId.get(card.id) ?? []}
                      {...binderCardProps}
                      {...deckActionProps}
                    />
                    <span
                      className={`deck-page__kind-pill deck-page__kind-pill--${entry.kind}`}
                    >
                      {kindLabel}
                    </span>
                  </article>
                );
              })}
            </div>
          ) : (
            !isLoading &&
            !decks.error &&
            !cardsQuery.error &&
            !invalidCardData && (
              <p className="deck-page__message">
                {visibleEntries.length > 0
                  ? "No available card printings were found for these deck entries."
                  : selectedDeckId
                    ? "This deck has no cards."
                    : "Your decks are empty. Add cards with the Decks action on any card."}
              </p>
            )
          )}
          {rows.length === 0 && tableCards.length > 0 && (
            <p className="deck-page__message">No cards match these filters.</p>
          )}
          {!cardsQuery.isLoading &&
            !cardsQuery.error &&
            !invalidCardData &&
            cardsMissingFromScryfall > 0 && (
            <p className="deck-page__message">
              {cardsMissingFromScryfall}{" "}
              {cardsMissingFromScryfall === 1 ? "entry was" : "entries were"} skipped
              because the printing is no longer available from Scryfall.
            </p>
            )}
        </>
      )}

      {notice && (
        <p className="deck-page__notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")}>Dismiss</button>
        </p>
      )}

      {selectedCard && (
        <CardDetailsOverlay
          key={selectedCard.id}
          cardId={selectedCard.id}
          fallbackCard={selectedCard}
          onAction={handleCardAction}
          favoriteIds={favoriteIds}
          favoriteActionDisabled={
            favoritesLoading ||
            Boolean(favoritesError) ||
            favorites.isPending
          }
          binderCopiesByScryfallId={binder.copies.copiesByScryfallId}
          {...binderCardProps}
          {...deckActionProps}
          onClose={() => setCardId(null)}
        />
      )}

      {binder.cardToAdd && (
        <AddBinderCopyDialog
          card={binder.cardToAdd}
          binders={binder.binders}
          decks={decks.decks}
          onSave={binder.addCopy}
          onClose={binder.closeAdd}
          isSaving={binder.isPending}
        />
      )}
    </section>
  );
}
