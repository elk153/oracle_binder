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
import SelectionBar from "../selection/SelectionBar.tsx";
import SelectionCheckbox from "../selection/SelectionCheckbox.tsx";
import UndoNotice from "../selection/UndoNotice.tsx";
import useUndoNotice from "../selection/useUndoNotice.ts";
import {
  DISPOSAL_STATUSES,
  countText,
  disposalLabel,
  runUndoable,
  type DisposalStatus,
} from "../selection/selectionActions.ts";
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
  // D-079: the notice offers Undo for 8 s after a remove, dispose or delete.
  const undoNotice = useUndoNotice();
  const setNotice = undoNotice.show;
  // Selected deck entries (D-079). Unlike the Binder, every tile here is one
  // entry, so the selection holds entry ids.
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(() => new Set());
  const [removeDestination, setRemoveDestination] = useState("");
  const [disposeStatus, setDisposeStatus] = useState<DisposalStatus | "">("");
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
    // A removal changes the id list; keep the grid on screen.
    { keepPrevious: true },
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
  // With keepPrevious, the previous cards stay on screen while a changed list
  // loads; it only counts as loading when cards for this view are missing.
  const cardsLoading =
    cardsQuery.isLoading ||
    (cardsQuery.isPlaceholderData &&
      visibleEntries.some((entry) => !cardsById.has(entry.scryfall_id)));
  const cardsMissingFromScryfall = cardsQuery.isPlaceholderData
    ? 0
    : visibleEntries.length - tableCards.length;
  const deckNames = new Map(decks.decks.map((deck) => [deck.id, deck.name]));

  // The selection counts only entries that are still in this view.
  const selectionEntries = visibleEntries.filter((entry) => selectedEntryIds.has(entry.id));
  const ownedSelection = selectionEntries.filter(
    (entry) => entry.kind === "binder" && entry.binder_card_id,
  );
  const selectedCard = cardId ? cardsById.get(cardId) : undefined;

  function chooseDeck(deckId: string) {
    setSelectedEntryIds(new Set());
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

  function toggleEntrySelection(id: string) {
    setSelectedEntryIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Where the selected entries are: one deck's name, or "decks".
  function fromText() {
    const deckIds = new Set(selectionEntries.map((entry) => entry.deck_id));
    const [only] = deckIds;
    return deckIds.size === 1 ? (deckNames.get(only) ?? "the deck") : "decks";
  }

  // D-079 bulk actions with an 8-second undo buffer (runUndoable).
  function removeSelectedEntries() {
    const ids = selectionEntries.map((entry) => entry.id);
    if (ids.length === 0) return;
    const owned = ownedSelection.length;
    if (owned > 0 && !removeDestination) return;
    const binderId = removeDestination && removeDestination !== "loose" ? removeDestination : null;
    const destination = binderId
      ? (binder.binders.find((target) => target.id === binderId)?.name ?? "the binder")
      : "Loose";
    const text =
      `Removed ${countText(ids.length, "card")} from ${fromText()}` +
      (owned > 0 ? `; ${countText(owned, "copy", "copies")} to ${destination}.` : ".");
    setSelectedEntryIds(new Set());
    setRemoveDestination("");
    void runUndoable(setNotice, text, "Could not remove the selected cards", (undoWindow) =>
      decks.removeDeckEntries({ ids, binderId, undoWindow }),
    );
  }

  // Dispose applies to owned copies only; proxy and virtual entries are
  // left as they are, and the notice says how many were skipped.
  function disposeSelectedCopies() {
    const status = disposeStatus;
    const ids = ownedSelection.flatMap((entry) =>
      entry.binder_card_id ? [entry.binder_card_id] : [],
    );
    if (!status || ids.length === 0) return;
    const skipped = selectionEntries.length - ids.length;
    const text =
      `Disposed ${countText(ids.length, "copy", "copies")} as ${disposalLabel(status).toLowerCase()}` +
      (skipped > 0 ? `; ${countText(skipped, "proxy or virtual card", "proxy or virtual cards")} skipped.` : ".");
    setSelectedEntryIds(new Set());
    setDisposeStatus("");
    void runUndoable(setNotice, text, "Could not dispose the selected copies", (undoWindow) =>
      binder.copies.disposeCopies.mutateAsync({ ids, status, undoWindow }),
    );
  }

  function deleteSelectedEntries() {
    const ids = selectionEntries.map((entry) => entry.id);
    if (ids.length === 0) return;
    const owned = ownedSelection.length;
    const text =
      `Deleted ${countText(ids.length, "card")} from ${fromText()}` +
      (owned > 0 ? `, including ${countText(owned, "owned copy", "owned copies")}.` : ".");
    setSelectedEntryIds(new Set());
    void runUndoable(setNotice, text, "Could not delete the selected cards", (undoWindow) =>
      decks.deleteDeckEntries({ ids, undoWindow }),
    );
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
  const isLoading = decks.isLoading || cardsLoading;

  return (
    <section className="page deck-page">
      <header className="page__heading">
        <h1 className="page__title">Decks</h1>
        <div className="deck-page__view-switch" role="group" aria-label="Deck view">
          <button
            type="button"
            className="page__control page__button"
            aria-pressed={view === "all"}
            onClick={() => void setView("all")}
          >
            All cards
          </button>
          <button
            type="button"
            className="page__control page__button"
            aria-pressed={view === "decks"}
            onClick={() => void setView("decks")}
          >
            Decks
          </button>
        </div>
      </header>

      {decks.error && (
        <p className="page__message page__message--error" role="alert">
          Could not load decks: {decks.error.message}
        </p>
      )}
      {binder.copies.error && (
        <p className="page__message page__message--error" role="alert">
          Could not load Binder copies: {binder.copies.error.message}
        </p>
      )}
      {binder.bindersError && (
        <p className="page__message page__message--error" role="alert">
          Could not load binders: {binder.bindersError.message}
        </p>
      )}
      {cardsQuery.error && (
        <p className="page__message page__message--error" role="alert">
          Could not load card printings: {cardsQuery.error.message}
        </p>
      )}
      {invalidCardData && (
        <p className="page__message page__message--error" role="alert">
          Scryfall returned card data in an unexpected format.
        </p>
      )}
      {binder.realtimeError && (
        <p className="page__message" role="alert">
          Binder updates from other devices may be delayed: {binder.realtimeError.message}
        </p>
      )}
      {favoritesError && (
        <p className="page__message page__message--error" role="alert">
          Could not load favorite status: {favoritesError.message}
        </p>
      )}
      {cardsQuery.isLoading && (
        <p className="page__message" role="status">
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
            <label className="page__label">
              New deck
              <input
                className="page__control"
                value={newDeckName}
                onChange={(event) => setNewDeckName(event.currentTarget.value)}
                maxLength={100}
              />
            </label>
            <button type="submit" className="page__control page__button" disabled={!newDeckName.trim() || decks.isPending}>
              Create deck
            </button>
          </form>

          <div className="card-grid">
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
                <article className="page__cover-card deck-page__deck-card" key={deck.id}>
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
                    <h2 className="deck-page__deck-name">{deck.name}</h2>
                    <span className="deck-page__count">{countLabel}</span>
                  </div>
                  <div className="page__card-actions">
                    <button
                      type="button"
                      className="page__control page__button page__card-action"
                      disabled={decks.isPending}
                      onClick={() => void renameDeck(deck)}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="page__control page__button page__card-action"
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
            <p className="page__message">You have no decks yet.</p>
          )}
        </section>
      )}

      {view === "all" && (
        <>
          <div className="page__toolbar">
            <label className="page__label">
              Show
              <select
                className="page__control"
                value={selectedDeckId ?? ""}
                onChange={(event) => {
                  setSelectedEntryIds(new Set());
                  void setSelectedDeckId(event.currentTarget.value || null);
                }}
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
              <button type="button" className="page__control page__button" onClick={() => void setView("decks")}>
                Back to decks
              </button>
            )}
          </div>

          <SelectionBar
            count={selectionEntries.length}
            summary={
              countText(selectionEntries.length, "card") +
              (ownedSelection.length > 0
                ? ` (${countText(ownedSelection.length, "owned copy", "owned copies")})`
                : "")
            }
            shownCount={filteredEntries.length}
            onSelectAll={() =>
              setSelectedEntryIds(new Set(filteredEntries.map(({ entry }) => entry.id)))
            }
            onClear={() => setSelectedEntryIds(new Set())}
          >
            {ownedSelection.length > 0 && (
              <label className="page__label">
                Owned copies go to
                <select
                  className="page__control"
                  value={removeDestination}
                  onChange={(event) => setRemoveDestination(event.currentTarget.value)}
                >
                  <option value="">Choose destination</option>
                  <option value="loose">Loose</option>
                  {binder.binders.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="page__control page__button"
              onClick={removeSelectedEntries}
              disabled={ownedSelection.length > 0 && !removeDestination}
            >
              Remove from deck
            </button>
            {ownedSelection.length > 0 && (
              <>
                <label className="page__label">
                  Dispose as
                  <select
                    className="page__control"
                    value={disposeStatus}
                    onChange={(event) =>
                      setDisposeStatus(event.currentTarget.value as DisposalStatus | "")
                    }
                  >
                    <option value="">Choose reason</option>
                    {DISPOSAL_STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="page__control page__button"
                  onClick={disposeSelectedCopies}
                  disabled={!disposeStatus}
                >
                  Dispose
                </button>
              </>
            )}
            <button
              type="button"
              className="page__control page__button"
              onClick={deleteSelectedEntries}
            >
              Delete
            </button>
          </SelectionBar>

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
            <p className="page__message" role="status">Loading deck cards…</p>
          ) : filteredEntries.length > 0 ? (
            <div className="card-grid" aria-label="Deck cards">
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
                    <SelectionCheckbox
                      checked={selectedEntryIds.has(entry.id)}
                      onChange={() => toggleEntrySelection(entry.id)}
                      label="Select"
                      ariaLabel={`Select ${card.name} (${kindLabel}) in ${
                        deckNames.get(entry.deck_id) ?? "its deck"
                      }`}
                    />
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
              <p className="page__message">
                {visibleEntries.length > 0
                  ? "No available card printings were found for these deck entries."
                  : selectedDeckId
                    ? "This deck has no cards."
                    : "Your decks are empty. Add cards with the Decks action on any card."}
              </p>
            )
          )}
          {rows.length === 0 && tableCards.length > 0 && (
            <p className="page__message">No cards match these filters.</p>
          )}
          {!cardsQuery.isLoading &&
            !cardsQuery.error &&
            !invalidCardData &&
            cardsMissingFromScryfall > 0 && (
            <p className="page__message">
              {cardsMissingFromScryfall}{" "}
              {cardsMissingFromScryfall === 1 ? "entry was" : "entries were"} skipped
              because the printing is no longer available from Scryfall.
            </p>
            )}
        </>
      )}

      <UndoNotice
        notice={undoNotice.notice}
        onUndo={undoNotice.undo}
        onDismiss={undoNotice.dismiss}
      />

      {/* Any card id can be shown: a card outside this page (e.g. a meld
          partner) has no fallbackCard, so the overlay fetches it. */}
      {cardId && (
        <CardDetailsOverlay
          key={cardId}
          cardId={cardId}
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
          onOpenCard={setCardId}
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
