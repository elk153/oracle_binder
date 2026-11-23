import { useMemo, useState } from "react";
import type { BinderCopy } from "../binder/useBinderCopies.ts";
import type { CardBrowserCard } from "../card-browser/types.ts";
import { DISPOSAL_STATUSES } from "../selection/selectionActions.ts";
import type {
  Deck,
  DeckActions,
  DeckCard,
  DeckCardChanges,
} from "./useDeckManagement.ts";
import type { DeckEntryActions } from "./deckEntryActions.ts";

type DeckCardPopoverProps = {
  card: CardBrowserCard;
  copies: BinderCopy[];
  actions: DeckActions;
  /** D-079 take-out actions (remove, dispose, delete); hidden without. */
  entryActions?: DeckEntryActions;
  onClose: () => void;
};

type DeckCardDraft = {
  deck_id: string;
  kind: DeckCard["kind"];
  binder_card_id: string | null;
};

function entryLabel(entry: DeckCard, decks: Deck[]): string {
  const deckName =
    decks.find((deck) => deck.id === entry.deck_id)?.name ?? "Unknown deck";
  return `${deckName} · ${entry.kind}`;
}

function copyLocationLabel(
  copy: BinderCopy,
  actions: DeckActions,
): string {
  const deckEntry = actions.deckCards.find(
    (entry) => entry.binder_card_id === copy.id,
  );
  if (deckEntry) {
    const deckName =
      actions.decks.find((deck) => deck.id === deckEntry.deck_id)?.name ??
      "Unknown deck";
    return `In ${deckName}`;
  }
  return copy.binder_id ? "Binder copy" : "Loose copy";
}

export default function DeckCardPopover({
  card,
  copies,
  actions,
  entryActions,
  onClose,
}: DeckCardPopoverProps) {
  const [deckId, setDeckId] = useState("");
  const [kind, setKind] = useState<DeckCard["kind"]>("virtual");
  const [binderCardId, setBinderCardId] = useState("");
  const [newDeckName, setNewDeckName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, DeckCardDraft>>({});
  // Where each owned entry's copy goes on "Remove from deck" ("" = not
  // chosen yet, "loose" = Loose, otherwise a binder id). D-079 asks every time.
  const [removeTo, setRemoveTo] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isBusy = isSaving || actions.isPending;

  const entries = actions.deckCards.filter(
    (entry) => entry.scryfall_id === card.id,
  );
  const assignedCopyIds = useMemo(
    () =>
      new Set(
        actions.deckCards
          .filter((entry) => entry.binder_card_id)
          .map((entry) => entry.binder_card_id),
      ),
    [actions.deckCards],
  );
  const ownedCopies = copies.filter(
    (copy) => copy.status === "owned",
  );
  const availableCopies = ownedCopies.filter(
    (copy) => !assignedCopyIds.has(copy.id),
  );

  function setDraft(entry: DeckCard, changes: Partial<DeckCardDraft>) {
    setDrafts((current) => ({
      ...current,
      [entry.id]: {
        deck_id: current[entry.id]?.deck_id ?? entry.deck_id,
        kind: current[entry.id]?.kind ?? entry.kind,
        binder_card_id:
          current[entry.id]?.binder_card_id ?? entry.binder_card_id,
        ...changes,
      },
    }));
  }

  function getDraft(entry: DeckCard): DeckCardDraft {
    return (
      drafts[entry.id] ?? {
        deck_id: entry.deck_id,
        kind: entry.kind,
        binder_card_id: entry.binder_card_id,
      }
    );
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setError(null);
    setNotice(null);
    setIsSaving(true);
    try {
      await action();
      setNotice(success);
      return success;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The request failed.",
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function createDeck() {
    const name = newDeckName.trim();
    if (!name) return;
    const result = await runAction(
      async () => {
        const deck = await actions.createDeck(name);
        setDeckId(deck.id);
      },
      "Deck created.",
    );
    if (result) setNewDeckName("");
  }

  async function addCard() {
    if (!deckId) {
      setError("Choose a deck first.");
      return;
    }
    if (kind === "binder" && !binderCardId) {
      setError("Choose an owned Binder copy.");
      return;
    }
    await runAction(
      () =>
        actions.addDeckCard({
          // Chosen here so the entry shows at once (optimistic, D-071).
          id: crypto.randomUUID(),
          deck_id: deckId,
          kind,
          binder_card_id: kind === "binder" ? binderCardId : null,
          scryfall_id: card.id,
        }),
      `Added ${card.name} to the deck.`,
    );
  }

  async function saveEntry(entry: DeckCard) {
    const draft = getDraft(entry);
    if (draft.kind === "binder" && !draft.binder_card_id) {
      setError("Choose an owned Binder copy.");
      return;
    }
    const changes: DeckCardChanges = {
      deck_id: draft.deck_id,
      kind: draft.kind,
      binder_card_id:
        draft.kind === "binder" ? draft.binder_card_id : null,
    };
    const result = await runAction(
      () => actions.updateDeckCard({ id: entry.id, changes }),
      "Deck card updated.",
    );
    if (result) {
      setDrafts((current) => {
        const next = { ...current };
        delete next[entry.id];
        return next;
      });
    }
  }

  return (
    <section
      className="binder-copy-popover deck-card-popover"
      aria-label={`${card.name} deck entries`}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="binder-copy-popover__header">
        <strong className="binder-copy-popover__title">{card.name}</strong>
        <span className="binder-copy-popover__meta">{entries.length} in decks</span>
        <button type="button" className="binder-copy-popover__close" aria-label="Close deck entries" onClick={onClose}>
          ×
        </button>
      </header>

      {actions.isLoading ? (
        <p className="binder-copy-popover__empty" role="status">
          Loading decks…
        </p>
      ) : actions.error ? (
        <p className="deck-card-popover__error" role="alert">
          Could not load decks: {actions.error.message}
        </p>
      ) : (
        <>
          {actions.decks.length === 0 && (
            <p className="binder-copy-popover__empty">
              Create a deck to add this card.
            </p>
          )}

          <form
            className="binder-fields deck-card-popover__create"
            onSubmit={(event) => {
              event.preventDefault();
              void createDeck();
            }}
          >
            <label className="field field--soft">
              New deck
              <input
                className="field__input field__input--soft"
                value={newDeckName}
                onChange={(event) => setNewDeckName(event.currentTarget.value)}
                maxLength={100}
              />
            </label>
            <button className="binder-button" type="submit" disabled={!newDeckName.trim() || isBusy}>
              Create deck
            </button>
          </form>

          {actions.decks.length > 0 && (
            <>
              <form
                className="binder-fields deck-card-popover__add"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addCard();
                }}
              >
                <label className="field field--soft">
                  Deck
                  <select
                    className="field__input field__input--soft"
                    value={deckId}
                    onChange={(event) => setDeckId(event.currentTarget.value)}
                  >
                    <option value="">Choose a deck</option>
                    {actions.decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field--soft">
                  Card kind
                  <select
                    className="field__input field__input--soft"
                    value={kind}
                    onChange={(event) => {
                      const nextKind = event.currentTarget.value as DeckCard["kind"];
                      setKind(nextKind);
                      if (nextKind !== "binder") setBinderCardId("");
                    }}
                  >
                    <option value="binder">Binder copy</option>
                    <option value="proxy">Proxy</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </label>
                {kind === "binder" && (
                  <label className="field field--soft">
                    Owned copy
                    <select
                      className="field__input field__input--soft"
                      value={binderCardId}
                      onChange={(event) =>
                        setBinderCardId(event.currentTarget.value)
                      }
                    >
                      <option value="">Choose a copy</option>
                      {availableCopies.map((copy) => (
                        <option key={copy.id} value={copy.id}>
                          {copyLocationLabel(copy, actions)} ·{" "}
                          {copy.condition ?? "condition unknown"} ·{" "}
                          {copy.finish ?? "finish unknown"}
                        </option>
                      ))}
                    </select>
                    {availableCopies.length === 0 && (
                      <span>No unassigned owned copies for this printing.</span>
                    )}
                  </label>
                )}
                <button
                  className="binder-button"
                  type="submit"
                  disabled={
                    isBusy ||
                    !deckId ||
                    (kind === "binder" && !binderCardId)
                  }
                >
                  Add to deck
                </button>
              </form>
            </>
          )}

          {entries.length > 0 && (
            <ul className="binder-copy-popover__list">
              {entries.map((entry) => {
                const draft = getDraft(entry);
                const entryCopies = ownedCopies.filter(
                  (copy) =>
                    copy.id === entry.binder_card_id ||
                    !assignedCopyIds.has(copy.id),
                );
                const dirty =
                  draft.deck_id !== entry.deck_id ||
                  draft.kind !== entry.kind ||
                  draft.binder_card_id !== entry.binder_card_id;

                return (
                  <li className="binder-copy-popover__copy" key={entry.id}>
                    <div className="binder-copy-popover__copy-heading">
                      <strong>{entryLabel(entry, actions.decks)}</strong>
                    </div>
                    <div className="binder-fields">
                      <label className="field field--soft">
                        Deck
                        <select
                          className="field__input field__input--soft"
                          value={draft.deck_id}
                          onChange={(event) =>
                            setDraft(entry, {
                              deck_id: event.currentTarget.value,
                            })
                          }
                        >
                          {actions.decks.map((deck) => (
                            <option key={deck.id} value={deck.id}>
                              {deck.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field field--soft">
                        Card kind
                        <select
                          className="field__input field__input--soft"
                          value={draft.kind}
                          onChange={(event) => {
                            const nextKind = event.currentTarget.value as DeckCard["kind"];
                            setDraft(entry, {
                              kind: nextKind,
                              binder_card_id:
                                nextKind === "binder"
                                  ? draft.binder_card_id
                                  : null,
                            });
                          }}
                        >
                          <option value="binder">Binder copy</option>
                          <option value="proxy">Proxy</option>
                          <option value="virtual">Virtual</option>
                        </select>
                      </label>
                      {draft.kind === "binder" && (
                        <label className="field field--soft">
                          Owned copy
                          <select
                            className="field__input field__input--soft"
                            value={draft.binder_card_id ?? ""}
                            onChange={(event) =>
                              setDraft(entry, {
                                binder_card_id:
                                  event.currentTarget.value || null,
                              })
                            }
                          >
                            <option value="">Choose a copy</option>
                            {entryCopies.map((copy) => (
                              <option key={copy.id} value={copy.id}>
                                {copyLocationLabel(copy, actions)} ·{" "}
                                {copy.condition ?? "condition unknown"} ·{" "}
                                {copy.finish ?? "finish unknown"}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <div className="binder-actions">
                        <button
                          type="button"
                          className="binder-button binder-button--primary"
                          disabled={!dirty || isBusy}
                          onClick={() => void saveEntry(entry)}
                        >
                          Save changes
                        </button>
                      </div>
                      {entryActions && (
                        <EntryTakeOutActions
                          entry={entry}
                          cardName={card.name}
                          entryActions={entryActions}
                          destination={removeTo[entry.id] ?? ""}
                          onDestinationChange={(value) =>
                            setRemoveTo((current) => ({ ...current, [entry.id]: value }))
                          }
                          disabled={isBusy}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      {error && (
        <p className="deck-card-popover__error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="binder-copy-popover__empty" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}

type EntryTakeOutActionsProps = {
  entry: DeckCard;
  cardName: string;
  entryActions: DeckEntryActions;
  destination: string;
  onDestinationChange: (value: string) => void;
  disabled: boolean;
};

/**
 * D-079 for one deck entry, with the same labels as the Decks selection bar:
 * Remove from deck (an owned copy needs a destination), Sold / Lost / Given
 * away for an owned copy, and Delete. Each shows Undo in the page notice.
 */
function EntryTakeOutActions({
  entry,
  cardName,
  entryActions,
  destination,
  onDestinationChange,
  disabled,
}: EntryTakeOutActionsProps) {
  const owned = entry.kind === "binder" && Boolean(entry.binder_card_id);
  return (
    <>
      {owned && (
        <label className="field field--soft">
          Copy goes to
          <select
            className="field__input field__input--soft"
            value={destination}
            onChange={(event) => onDestinationChange(event.currentTarget.value)}
          >
            <option value="">Choose destination</option>
            <option value="loose">Loose</option>
            {entryActions.binders.map((binder) => (
              <option key={binder.id} value={binder.id}>
                {binder.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="binder-actions">
        <button
          type="button"
          className="binder-button"
          disabled={disabled || (owned && !destination)}
          onClick={() =>
            entryActions.remove(
              entry,
              cardName,
              destination && destination !== "loose" ? destination : null,
            )
          }
        >
          Remove from deck
        </button>
        {owned &&
          DISPOSAL_STATUSES.map((option) => (
            <button
              key={option.value}
              type="button"
              className="binder-button"
              disabled={disabled}
              onClick={() => entryActions.dispose(entry, cardName, option.value)}
            >
              {option.label}
            </button>
          ))}
        <button
          type="button"
          className="binder-button"
          disabled={disabled}
          onClick={() => entryActions.delete(entry, cardName)}
        >
          Delete
        </button>
      </div>
    </>
  );
}
