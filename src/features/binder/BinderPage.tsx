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
import BinderCover from "./BinderCover.tsx";
import BinderFormDialog from "./BinderFormDialog.tsx";
import { LOOSE_BINDER_COLOR } from "./binderColors.ts";
import type { BinderCopy } from "./useBinderCopies.ts";
import type { Binder, BinderValues } from "./useBinders.ts";
import useDeckManagement from "../decks/useDeckManagement.ts";
import "./BinderPage.css";

const BINDER_VIEWS = ["all", "binders"] as const;
const HISTORY_FILTER = "history";

type BinderDialogState =
  | { mode: "create" }
  | { mode: "modify"; binder: Binder };

/** 23505 is PostgreSQL's unique violation: binder names are unique per user. */
function binderErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return "You already have a binder with this name.";
  }
  return error instanceof Error ? error.message : "The request failed.";
}

export default function BinderPage() {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(BINDER_VIEWS).withDefault("binders"),
  );
  const [selectedBinderId, setSelectedBinderId] = useQueryState(
    "binder",
    parseAsString,
  );
  const { user } = useAuth();
  const [notice, setNotice] = useState("");
  const [cardId, setCardId] = useState<string | null>(null);
  const [binderDialog, setBinderDialog] = useState<BinderDialogState | null>(
    null,
  );
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
  const deckAssignedCopyIds = useMemo(
    () =>
      new Set(
        decks.deckCards
          .filter((entry) => entry.kind === "binder" && entry.binder_card_id)
          .map((entry) => entry.binder_card_id),
      ),
    [decks.deckCards],
  );
  const unallocatedOwnedCopies = useMemo(
    () => ownedCopies.filter((copy) => !deckAssignedCopyIds.has(copy.id)),
    [deckAssignedCopyIds, ownedCopies],
  );
  const historyCopies = useMemo(
    () => binder.copies.copies.filter((copy) => copy.status !== "owned"),
    [binder.copies.copies],
  );
  const ownedCardIds = useMemo(
    () =>
      [...new Set(unallocatedOwnedCopies.map((copy) => copy.scryfall_id))].sort(),
    [unallocatedOwnedCopies],
  );
  const historyCardIds = useMemo(
    () => [...new Set(historyCopies.map((copy) => copy.scryfall_id))].sort(),
    [historyCopies],
  );
  const cardsQuery = useScryfallCardsForIds(
    "binder-page",
    selectedBinderId === HISTORY_FILTER ? historyCardIds : ownedCardIds,
    Boolean(user) && !binder.copies.isLoading && !decks.isLoading,
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
  const looseCopies = unallocatedOwnedCopies.filter(
    (copy) => copy.binder_id === null,
  );
  const selectedCopies =
    selectedBinderId === HISTORY_FILTER
      ? historyCopies
      : selectedBinderId
        ? selectedBinderId === "loose"
          ? looseCopies
          : unallocatedOwnedCopies.filter(
              (copy) => copy.binder_id === selectedBinderId,
            )
        : unallocatedOwnedCopies;
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

  /** Called by the dialog. It throws a readable Error so the dialog can show it. */
  async function saveBinder(values: BinderValues) {
    if (!binderDialog) return;
    try {
      if (binderDialog.mode === "create") {
        await binder.bindersQuery.createBinder.mutateAsync(values);
        setNotice(`Created binder “${values.name}”.`);
      } else {
        await binder.bindersQuery.updateBinder.mutateAsync({
          id: binderDialog.binder.id,
          ...values,
        });
        setNotice(`Updated binder “${values.name}”.`);
      }
      setBinderDialog(null);
    } catch (error) {
      throw new Error(binderErrorMessage(error), { cause: error });
    }
  }

  async function deleteBinder(target: Binder) {
    const count = unallocatedOwnedCopies.filter(
      (copy) => copy.binder_id === target.id,
    ).length;
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
    const ids = unallocatedOwnedCopies
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
  const selectedCard = cards.find((card) => card.id === cardId);
  return (
    <section className="page binder-page">
      <header className="page__heading">
        <h1 className="page__title">Binder</h1>
        <div className="binder-page__view-switch" role="group" aria-label="Binder view">
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
            aria-pressed={view === "binders"}
            onClick={() => void setView("binders")}
          >
            Binders
          </button>
        </div>
      </header>

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
      {binder.realtimeError && (
        <p className="page__message page__message--error" role="alert">
          Updates from other devices may be delayed: {binder.realtimeError.message}
        </p>
      )}
      {decks.error && (
        <p className="page__message" role="alert">
          Could not load decks: {decks.error.message}
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

      {view === "binders" && (
        <section className="binder-page__binders" aria-label="Your binders">
          <div className="binder-page__create">
            <button
              type="button"
              className="page__control page__button"
              onClick={() => setBinderDialog({ mode: "create" })}
              disabled={binder.bindersLoading}
            >
              Create binder
            </button>
          </div>

          <div className="card-grid">
            {[...binder.binders].map((target) => {
              const count = unallocatedOwnedCopies.filter(
                (copy) => copy.binder_id === target.id,
              ).length;
              return (
                <article className="page__cover-card" key={target.id}>
                  <BinderCover
                    color={target.color}
                    onSelect={() => chooseBinder(target.id)}
                    label={`Open ${target.name}, ${count} ${count === 1 ? "copy" : "copies"}`}
                  />
                  <h2 className="binder-page__binder-name">{target.name}</h2>
                  <p className="binder-page__binder-count">{count} {count === 1 ? "copy" : "copies"}</p>
                  <div className="page__card-actions">
                    <button
                      type="button"
                      className="page__control page__button page__card-action"
                      onClick={() =>
                        setBinderDialog({ mode: "modify", binder: target })
                      }
                    >
                      Modify
                    </button>
                    <button type="button" className="page__control page__button page__card-action" onClick={() => void deleteBinder(target)}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
            <article className="page__cover-card">
              <BinderCover
                color={LOOSE_BINDER_COLOR}
                onSelect={() => chooseBinder("loose")}
                label={`Open Loose, ${looseCopies.length} ${looseCopies.length === 1 ? "copy" : "copies"}`}
              />
              <h2 className="binder-page__binder-name">Loose</h2>
              <p className="binder-page__binder-count">{looseCopies.length} {looseCopies.length === 1 ? "copy" : "copies"}</p>
            </article>
          </div>
        </section>
      )}

      {view === "all" && (
        <>
          <div className="page__toolbar">
            <label className="page__label">
              Show
              <select
                className="page__control"
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
                <label className="page__label">
                  Move selected copies to
                  <select
                    className="page__control"
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
                  className="page__control page__button"
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

          {binder.copies.isLoading || decks.isLoading || cardsQuery.isLoading ? (
            <p className="page__message" role="status">Loading Binder…</p>
          ) : orderedCards.length > 0 ? (
            <div className="card-grid" aria-label="Binder cards">
              {orderedCards.map((card) => (
                <article className="binder-page__card" key={card.id}>
                  {selectedBinderId !== HISTORY_FILTER && (
                    <label className="binder-page__select">
                      <input
                        type="checkbox"
                        className="binder-page__select-input"
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
            <p className="page__message">
              {selectedBinderId === HISTORY_FILTER
                ? "Your Binder has no disposed copies."
                : selectedBinderId
                  ? "No owned copies are in this binder."
                  : "Your Binder is empty."}
            </p>
          )}
          {rows.length === 0 && viewCards.length > 0 && (
            <p className="page__message">
              No cards match these filters.
            </p>
          )}
        </>
      )}

      {notice && (
        <p className="page__notice" role="status">
          <span>{notice}</span>
          <button type="button" className="page__notice-action" onClick={() => setNotice("")}>Dismiss</button>
        </p>
      )}

      {/* Any card id can be shown: a card outside this page (e.g. a meld
          partner) has no fallbackCard, so the overlay fetches it. */}
      {cardId && (
        <CardDetailsOverlay
          key={cardId}
          cardId={cardId}
          fallbackCard={selectedCard}
          onAction={handleCardAction}
          favoriteIds={favoriteIds}
          favoriteActionDisabled={favoritesLoading || favorites.isPending}
          binderCopiesByScryfallId={binder.copies.copiesByScryfallId}
          {...binderCardProps}
          {...deckActionProps}
          onOpenCard={setCardId}
          onClose={() => setCardId(null)}
        />
      )}

      {binderDialog && (
        <BinderFormDialog
          key={binderDialog.mode === "modify" ? binderDialog.binder.id : "create"}
          mode={binderDialog.mode}
          initialValues={
            binderDialog.mode === "modify"
              ? {
                  name: binderDialog.binder.name,
                  color: binderDialog.binder.color,
                }
              : undefined
          }
          onSave={saveBinder}
          onClose={() => setBinderDialog(null)}
          isSaving={
            binder.bindersQuery.createBinder.isPending ||
            binder.bindersQuery.updateBinder.isPending
          }
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
