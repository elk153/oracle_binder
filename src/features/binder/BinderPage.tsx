import { useMemo, useState } from "react";
import {
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
import type { CardAction, CardBrowserCard } from "../card-browser/types.ts";
import { isCardBrowserCard } from "../card-browser/types.ts";
import CardTile from "../card-browser/CardTile.tsx";
import CardDetailsOverlay from "../card-browser/CardDetailsOverlay.tsx";
import CardFilters from "../card-filters/CardFilters.tsx";
import { useCardsTable } from "../card-filters/useCardsTable.ts";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import useFavoriteCardAction from "../favorites/useFavoriteCardAction.ts";
import useScryfallCardsForIds from "../../hooks/useScryfallCardsForIds.ts";
import useBinderManagement from "./useBinderManagement.ts";
import AddBinderCopyDialog from "./AddBinderCopyDialog.tsx";
import type { BinderCopy } from "./useBinderCopies.ts";
import type { Binder } from "./useBinders.ts";
import useDeckManagement from "../decks/useDeckManagement.ts";
import "./BinderPage.css";

const BINDER_VIEWS = ["all", "binders"] as const;
const HISTORY_FILTER = "history";
const RARITY_RANK: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  mythic: 4,
};

function coverCard(
  copies: BinderCopy[],
  cardsById: ReadonlyMap<string, CardBrowserCard>,
): CardBrowserCard | undefined {
  return [...copies]
    .sort((left, right) => {
      const rarityDifference =
        (RARITY_RANK[right.rarity] ?? 0) - (RARITY_RANK[left.rarity] ?? 0);
      if (rarityDifference !== 0) return rarityDifference;
      const leftCard = cardsById.get(left.scryfall_id);
      const rightCard = cardsById.get(right.scryfall_id);
      const legendaryDifference =
        Number(Boolean(rightCard?.type_line?.includes("Legendary"))) -
        Number(Boolean(leftCard?.type_line?.includes("Legendary")));
      if (legendaryDifference !== 0) return legendaryDifference;
      return left.created_at.localeCompare(right.created_at);
    })
    .map((copy) => cardsById.get(copy.scryfall_id))
    .find((card): card is CardBrowserCard => Boolean(card));
}

export default function BinderPage() {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(BINDER_VIEWS).withDefault("all"),
  );
  const [selectedBinderId, setSelectedBinderId] = useQueryState(
    "binder",
    parseAsString,
  );
  const { user } = useAuth();
  const [notice, setNotice] = useState("");
  const [cardId, setCardId] = useState<string | null>(null);
  const [newBinderName, setNewBinderName] = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [moveDestination, setMoveDestination] = useState("");
  const binder = useBinderManagement(setNotice);
  const decks = useDeckManagement();
  const favorites = useFavoriteCardAction();
  const { favoriteIds, isLoading: favoritesLoading } = favorites;
  const ownedCopies = useMemo(
    () => binder.copies.copies.filter((copy) => copy.status === "owned"),
    [binder.copies.copies],
  );
  const historyCopies = useMemo(
    () => binder.copies.copies.filter((copy) => copy.status !== "owned"),
    [binder.copies.copies],
  );
  const ownedCardIds = useMemo(
    () => [...new Set(ownedCopies.map((copy) => copy.scryfall_id))].sort(),
    [ownedCopies],
  );
  const historyCardIds = useMemo(
    () => [...new Set(historyCopies.map((copy) => copy.scryfall_id))].sort(),
    [historyCopies],
  );
  const cardsQuery = useScryfallCardsForIds(
    "binder-page",
    selectedBinderId === HISTORY_FILTER ? historyCardIds : ownedCardIds,
    Boolean(user) && !binder.copies.isLoading,
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
  const looseCopies = ownedCopies.filter((copy) => copy.binder_id === null);
  const selectedCopies =
    selectedBinderId === HISTORY_FILTER
      ? historyCopies
      : selectedBinderId
        ? selectedBinderId === "loose"
          ? looseCopies
          : ownedCopies.filter((copy) => copy.binder_id === selectedBinderId)
        : ownedCopies;
  const selectedIds = new Set(selectedCopies.map((copy) => copy.scryfall_id));
  const viewCards = cards.filter((card) => selectedIds.has(card.id));
  const { table, filters, setFilters, resetFilters } = useCardsTable(viewCards);
  const rows = table.getRowModel().rows;
  const orderedCards = rows.map((row) => {
    const card = cardsById.get(row.original.id);
    if (!card) throw new Error(`Filtered card ${row.original.id} was not loaded.`);
    return card;
  });

  function chooseBinder(id: string) {
    setSelectedCardIds(new Set());
    void setSelectedBinderId(id);
    void setView("all");
  }

  function toggleCardSelection(id: string) {
    setSelectedCardIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createBinder() {
    const name = newBinderName.trim();
    if (!name) return;
    try {
      await binder.bindersQuery.createBinder.mutateAsync(name);
      setNewBinderName("");
      setNotice(`Created binder “${name}”.`);
    } catch (error) {
      setNotice(
        `Could not create binder: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
    }
  }

  async function renameBinder(target: Binder) {
    const name = window.prompt("Rename binder", target.name)?.trim();
    if (!name || name === target.name) return;
    try {
      await binder.bindersQuery.renameBinder.mutateAsync({
        id: target.id,
        name,
      });
      setNotice(`Renamed binder to “${name}”.`);
    } catch (error) {
      setNotice(
        `Could not rename binder: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
    }
  }

  async function deleteBinder(target: Binder) {
    const count = ownedCopies.filter((copy) => copy.binder_id === target.id).length;
    const cardWord = count === 1 ? "card moves" : "cards move";
    if (
      !window.confirm(
        `Delete “${target.name}”? ${count} ${cardWord} to Loose.`,
      )
    ) {
      return;
    }
    try {
      await binder.bindersQuery.deleteBinder.mutateAsync(target.id);
      if (selectedBinderId === target.id) void setSelectedBinderId(null);
      setNotice(`Deleted “${target.name}”; ${count} ${cardWord} to Loose.`);
    } catch (error) {
      setNotice(
        `Could not delete binder: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
    }
  }

  async function moveSelectedCopies() {
    const destination =
      moveDestination === "loose" ? null : moveDestination || null;
    const ids = ownedCopies
      .filter((copy) => selectedCardIds.has(copy.scryfall_id))
      .map((copy) => copy.id);
    if (ids.length === 0) return;

    try {
      await binder.copies.moveCopies.mutateAsync({ ids, binderId: destination });
      setNotice(`Moved ${ids.length} ${ids.length === 1 ? "copy" : "copies"}.`);
      setSelectedCardIds(new Set());
    } catch (error) {
      setNotice(
        `Could not move selected copies: ${
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
    Boolean(binder.bindersError) ||
    Boolean(binder.copies.error) ||
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
  const selectedCard = cards.find((card) => card.id === cardId);
  const covers = new Map<string, CardBrowserCard | undefined>();
  for (const target of binder.binders) {
    covers.set(
      target.id,
      coverCard(
        ownedCopies.filter((copy) => copy.binder_id === target.id),
        cardsById,
      ),
    );
  }
  covers.set("loose", coverCard(looseCopies, cardsById));
  const looseCover = covers.get("loose");

  return (
    <section className="binder-page">
      <header className="binder-page__heading">
        <h1>Binder</h1>
        <div className="binder-page__view-switch" role="group" aria-label="Binder view">
          <button
            type="button"
            aria-pressed={view === "all"}
            onClick={() => void setView("all")}
          >
            All cards
          </button>
          <button
            type="button"
            aria-pressed={view === "binders"}
            onClick={() => void setView("binders")}
          >
            Binders
          </button>
        </div>
      </header>

      {binder.copies.error && (
        <p className="binder-page__message binder-page__message--error" role="alert">
          Could not load Binder copies: {binder.copies.error.message}
        </p>
      )}
      {binder.bindersError && (
        <p className="binder-page__message binder-page__message--error" role="alert">
          Could not load binders: {binder.bindersError.message}
        </p>
      )}
      {binder.realtimeError && (
        <p className="binder-page__message binder-page__message--error" role="alert">
          Updates from other devices may be delayed: {binder.realtimeError.message}
        </p>
      )}
      {decks.error && (
        <p className="binder-page__message" role="alert">
          Could not load decks: {decks.error.message}
        </p>
      )}
      {cardsQuery.error && (
        <p className="binder-page__message binder-page__message--error" role="alert">
          Could not load card printings: {cardsQuery.error.message}
        </p>
      )}
      {invalidCardData && (
        <p className="binder-page__message binder-page__message--error" role="alert">
          Scryfall returned card data in an unexpected format.
        </p>
      )}

      {view === "binders" && (
        <section className="binder-page__binders" aria-label="Your binders">
          <form
            className="binder-page__create"
            onSubmit={(event) => {
              event.preventDefault();
              void createBinder();
            }}
          >
            <label>
              New binder
              <input
                value={newBinderName}
                onChange={(event) => setNewBinderName(event.currentTarget.value)}
                maxLength={100}
              />
            </label>
            <button
              type="submit"
              disabled={!newBinderName.trim() || binder.bindersQuery.createBinder.isPending}
            >
              Create binder
            </button>
          </form>

          <div className="binder-page__binder-grid">
            {[...binder.binders].map((target) => {
              const count = ownedCopies.filter(
                (copy) => copy.binder_id === target.id,
              ).length;
              const cover = covers.get(target.id);
              return (
                <article className="binder-page__binder-card" key={target.id}>
                  {cover ? (
                    <CardTile
                      card={cover}
                      onSelect={() => chooseBinder(target.id)}
                      selectLabel={`Open ${target.name}, ${count} ${count === 1 ? "copy" : "copies"}`}
                      showActions={false}
                    />
                  ) : (
                    <button
                      type="button"
                      className="binder-page__binder-cover"
                      onClick={() => chooseBinder(target.id)}
                      aria-label={`Open ${target.name}, ${count} ${count === 1 ? "copy" : "copies"}`}
                    >
                      No cover yet
                    </button>
                  )}
                  <h2>{target.name}</h2>
                  <p>{count} {count === 1 ? "copy" : "copies"}</p>
                  <div className="binder-page__binder-actions">
                    <button type="button" onClick={() => void renameBinder(target)}>
                      Rename
                    </button>
                    <button type="button" onClick={() => void deleteBinder(target)}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
            <article className="binder-page__binder-card binder-page__binder-card--loose">
              {looseCover && (
                <CardTile
                  card={looseCover}
                  onSelect={() => chooseBinder("loose")}
                  selectLabel={`Open Loose, ${looseCopies.length} ${looseCopies.length === 1 ? "copy" : "copies"}`}
                  showActions={false}
                />
              )}
              {!looseCover && (
                <button
                  type="button"
                  className="binder-page__binder-cover"
                  onClick={() => chooseBinder("loose")}
                  aria-label={`Open Loose, ${looseCopies.length} ${looseCopies.length === 1 ? "copy" : "copies"}`}
                >
                  No cover yet
                </button>
              )}
              <h2>Loose</h2>
              <p>{looseCopies.length} {looseCopies.length === 1 ? "copy" : "copies"}</p>
            </article>
          </div>
        </section>
      )}

      {view === "all" && (
        <>
          <div className="binder-page__toolbar">
            <label>
              Show
              <select
                value={selectedBinderId ?? ""}
                onChange={(event) => {
                  setSelectedCardIds(new Set());
                  void setSelectedBinderId(event.currentTarget.value || null);
                }}
              >
                <option value="">All binders and Loose</option>
                <option value="loose">Loose</option>
                {binder.binders.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name}
                  </option>
                ))}
                <option value={HISTORY_FILTER}>History (sold, lost, given away)</option>
              </select>
            </label>
            {selectedBinderId !== HISTORY_FILTER && (
              <>
                <label>
                  Move selected copies to
                  <select
                    value={moveDestination}
                    onChange={(event) => setMoveDestination(event.currentTarget.value)}
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
                <button
                  type="button"
                  onClick={() => void moveSelectedCopies()}
                  disabled={!moveDestination || selectedCardIds.size === 0 || binder.isPending}
                >
                  Move selected
                </button>
              </>
            )}
          </div>

          {cards.length > 0 && (
            <CardFilters
              filters={filters}
              setFilters={setFilters}
              onReset={resetFilters}
              shown={rows.length}
              total={viewCards.length}
              feature="search"
              layout="floating"
            />
          )}

          {binder.copies.isLoading || cardsQuery.isLoading ? (
            <p className="binder-page__message" role="status">Loading Binder…</p>
          ) : orderedCards.length > 0 ? (
            <div className="binder-page__list" aria-label="Binder cards">
              {orderedCards.map((card) => (
                <article className="binder-page__card" key={card.id}>
                  {selectedBinderId !== HISTORY_FILTER && (
                    <label className="binder-page__select">
                      <input
                        type="checkbox"
                        checked={selectedCardIds.has(card.id)}
                        onChange={() => toggleCardSelection(card.id)}
                        aria-label={`Select all owned copies of ${card.name}`}
                      />
                      Select copies
                    </label>
                  )}
                  <CardTile
                    card={card}
                    onSelect={() => setCardId(card.id)}
                    onAction={handleCardAction}
                    isFavorite={favoriteIds.has(card.id)}
                    isFavoritePending={favoritesLoading || favorites.isPending}
                    binderCopies={binder.copies.copiesByScryfallId.get(card.id) ?? []}
                    {...binderCardProps}
                    {...deckActionProps}
                  />
                </article>
              ))}
            </div>
          ) : (
            <p className="binder-page__message">
              {selectedBinderId === HISTORY_FILTER
                ? "Your Binder has no disposed copies."
                : selectedBinderId
                  ? "No owned copies are in this binder."
                  : "Your Binder is empty."}
            </p>
          )}
          {rows.length === 0 && viewCards.length > 0 && (
            <p className="binder-page__message">
              No cards match these filters.
            </p>
          )}
        </>
      )}

      {notice && (
        <p className="binder-page__notice" role="status">
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
          favoriteActionDisabled={favoritesLoading || favorites.isPending}
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
          onSave={binder.addCopy}
          onClose={binder.closeAdd}
          isSaving={binder.copies.addCopy.isPending}
        />
      )}
    </section>
  );
}
