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
import { createDeckEntryActions } from "../decks/deckEntryActions.ts";
import SelectionBar from "../selection/SelectionBar.tsx";
import SelectionCheckbox from "../selection/SelectionCheckbox.tsx";
import { useNotify } from "../notifications/NotificationContext.ts";
import {
  DISPOSAL_STATUSES,
  countText,
  disposalLabel,
  runUndoable,
  type DisposalStatus,
} from "../selection/selectionActions.ts";
import "./BinderPage.css";

const BINDER_VIEWS = ["all", "binders"] as const;
const HISTORY_FILTER = "history";

function copiesText(count: number) {
  return countText(count, "copy", "copies");
}

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
  // Messages go to the app-wide notification stack (D-080).
  const notify = useNotify();
  const [cardId, setCardId] = useState<string | null>(null);
  const [binderDialog, setBinderDialog] = useState<BinderDialogState | null>(
    null,
  );
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [moveDestination, setMoveDestination] = useState("");
  const [disposeStatus, setDisposeStatus] = useState<DisposalStatus | "">("");
  const binder = useBinderManagement();
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
    // A delete or dispose changes the id list; keep the grid on screen.
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
  // The copies a bulk action works on: those of the selected cards in the
  // current view (D-079). A card can have several copies here.
  const selectionCopies = selectedCopies.filter((copy) =>
    selectedCardIds.has(copy.scryfall_id),
  );
  const isHistory = selectedBinderId === HISTORY_FILTER;
  const selectedIds = new Set(selectedCopies.map((copy) => copy.scryfall_id));
  const viewCards = cards.filter((card) => selectedIds.has(card.id));
  // With keepPrevious, the previous list stays on screen while a changed one
  // loads. After a delete nothing is missing, so the grid stays; after a view
  // switch (e.g. to History) cards are missing, so the page shows Loading.
  const cardsLoading =
    cardsQuery.isLoading ||
    (cardsQuery.isPlaceholderData && viewCards.length < selectedIds.size);
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
        notify.info(`Created binder “${values.name}”.`);
      } else {
        await binder.bindersQuery.updateBinder.mutateAsync({
          id: binderDialog.binder.id,
          ...values,
        });
        notify.info(`Updated binder “${values.name}”.`);
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
      notify.info(`Deleted “${target.name}”; ${count} ${cardWord} to Loose.`);
    } catch (error) {
      notify.error(
        `Could not delete binder: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
    }
  }

  async function moveSelectedCopies() {
    const destination =
      moveDestination === "loose" ? null : moveDestination || null;
    const ids = selectionCopies.map((copy) => copy.id);
    if (ids.length === 0) return;

    try {
      await binder.copies.moveCopies.mutateAsync({ ids, binderId: destination });
      notify.info(`Moved ${ids.length} ${ids.length === 1 ? "copy" : "copies"}.`);
      setSelectedCardIds(new Set());
    } catch (error) {
      notify.error(
        `Could not move selected copies: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
    }
  }

  // D-079 bulk actions with an 8-second undo buffer (runUndoable): the
  // cards leave the view at once, and Undo in the notice cancels the request.
  function disposeSelectedCopies() {
    const status = disposeStatus;
    const ids = selectionCopies.map((copy) => copy.id);
    if (!status || ids.length === 0) return;
    setDisposeStatus("");
    setSelectedCardIds(new Set());
    void runUndoable(
      notify,
      `Disposed ${copiesText(ids.length)} as ${disposalLabel(status).toLowerCase()}.`,
      "Could not dispose the selected copies",
      (undoWindow) => binder.copies.disposeCopies.mutateAsync({ ids, status, undoWindow }),
    );
  }

  function deleteSelectedCopies() {
    const ids = selectionCopies.map((copy) => copy.id);
    if (ids.length === 0) return;
    setSelectedCardIds(new Set());
    void runUndoable(
      notify,
      `Deleted ${copiesText(ids.length)}.`,
      "Could not delete the selected copies",
      (undoWindow) => binder.copies.deleteCopies.mutateAsync({ ids, undoWindow }),
    );
  }

  function handleCardAction(action: CardAction, card: CardBrowserCard) {
    if (action !== "favorite" || !user) return;
    favorites.toggleCardFavorite(card, user.id, {
      onSuccess: (wasFavorite) =>
        notify.info(
          wasFavorite
            ? `Removed ${card.name} from Favorites.`
            : `Added ${card.name} to Favorites.`,
        ),
      onError: (error) => notify.error(`Could not update Favorites: ${error.message}`),
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
    // D-079 take-out actions in the deck popover, with Undo in this notice.
    deckEntryActions: createDeckEntryActions({
      decks,
      binders: binder.binders,
      disposeCopies: binder.copies.disposeCopies.mutateAsync,
      notify,
    }),
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
          </div>

          <SelectionBar
            count={selectedCardIds.size}
            summary={`${selectedCardIds.size} ${selectedCardIds.size === 1 ? "card" : "cards"} (${copiesText(selectionCopies.length)})`}
            shownCount={orderedCards.length}
            onSelectAll={() => setSelectedCardIds(new Set(orderedCards.map((card) => card.id)))}
            onClear={() => setSelectedCardIds(new Set())}
          >
            {!isHistory && (
              <>
                <label className="page__label">
                  Move to
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
                  disabled={!moveDestination || binder.isPending}
                >
                  Move
                </button>
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
              onClick={deleteSelectedCopies}
            >
              Delete
            </button>
          </SelectionBar>

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

          {binder.copies.isLoading || decks.isLoading || cardsLoading ? (
            <p className="page__message" role="status">Loading Binder…</p>
          ) : orderedCards.length > 0 ? (
            <div className="card-grid" aria-label="Binder cards">
              {orderedCards.map((card) => (
                <article className="binder-page__card" key={card.id}>
                  <SelectionCheckbox
                    checked={selectedCardIds.has(card.id)}
                    onChange={() => toggleCardSelection(card.id)}
                    label="Select copies"
                    ariaLabel={`Select all ${isHistory ? "disposed" : "owned"} copies of ${card.name} in this view`}
                  />
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
