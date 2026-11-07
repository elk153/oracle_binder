import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CardRenderer from "../scryfall-card-renderer/CardRenderer";
import OracleText from "../scryfall-card-renderer/components/OracleText.jsx";
import IconClose from "../../assets/icons/IconClose.tsx";
import useFetchUrl from "../../hooks/useFetchUrl.ts";
import useScryfallCardsSearch from "./useScryfallCardsSearch.ts";
import fetchCardRulings from "./fetchCardRulings.ts";
import CardTile from "./CardTile.tsx";
import type { BinderCopy } from "../binder/useBinderCopies.ts";
import type { Binder } from "../binder/useBinders.ts";
import type { CopyFormValues } from "../binder/BinderCopyForm.tsx";
import type { DeckActions } from "../decks/useDeckManagement.ts";
import type { CardAction, CardBrowserCard, CardBrowserFace } from "./types.ts";
import { isCardBrowserCard } from "./types.ts";
import "./CardDetailsOverlay.css";

type CardDetailsOverlayProps = {
  cardId: string;
  fallbackCard?: CardBrowserCard;
  onAction: (action: CardAction, card: CardBrowserCard) => void;
  favoriteIds: ReadonlySet<string>;
  favoriteActionDisabled: boolean;
  binderCopiesByScryfallId: ReadonlyMap<string, BinderCopy[]>;
  binders: Binder[];
  isBinderPending: boolean;
  canManageBinder: boolean;
  onAddBinderCopy: (card: CardBrowserCard) => void;
  onUpdateBinderCopy: (copy: BinderCopy, values: CopyFormValues) => Promise<boolean>;
  onDisposeBinderCopy: (
    copy: BinderCopy,
    status: "sold" | "lost" | "given_away",
  ) => void;
  onRestoreBinderCopy: (copy: BinderCopy) => void;
  onDeleteBinderCopy: (copy: BinderCopy) => void;
  deckActions: DeckActions;
  canManageDeck: boolean;
  onClose: () => void;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const NO_PRINTS: unknown[] = [];

export default function CardDetailsOverlay({
  cardId,
  fallbackCard,
  onAction,
  favoriteIds,
  favoriteActionDisabled,
  binderCopiesByScryfallId,
  binders,
  isBinderPending,
  canManageBinder,
  onAddBinderCopy,
  onUpdateBinderCopy,
  onDisposeBinderCopy,
  onRestoreBinderCopy,
  onDeleteBinderCopy,
  deckActions,
  canManageDeck,
  onClose,
}: CardDetailsOverlayProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [popoverPortalTarget, setPopoverPortalTarget] =
    useState<HTMLElement | null>(null);
  const setDialogRef = useCallback((element: HTMLElement | null) => {
    dialogRef.current = element;
    setPopoverPortalTarget(element);
  }, []);
  const [selectedPrint, setSelectedPrint] = useState<CardBrowserCard | null>(null);
  const [faceIndex, setFaceIndex] = useState(0);
  const cardQuery = useScryfallCardsSearch(
    fallbackCard ? null : `cards/${encodeURIComponent(cardId)}`,
    {},
    0,
  );
  const fetchedValue = cardQuery.data?.[0];
  const fetchedCard = isCardBrowserCard(fetchedValue) ? fetchedValue : undefined;
  const invalidCard = fetchedValue !== undefined && !fetchedCard;
  const originalCard = fallbackCard ?? fetchedCard;
  const displayCard = selectedPrint ?? originalCard;
  const faces = displayCard?.card_faces ?? [];
  const supportsFaceSelection =
    faces.length > 1 &&
    !["split", "adventure", "flip", "meld"].includes(displayCard?.layout ?? "");
  const activeFace = supportsFaceSelection ? faces[faceIndex] : undefined;
  const nextFace = supportsFaceSelection
    ? faces[(faceIndex + 1) % faces.length]
    : undefined;
  const artCropImage =
    activeFace?.image_uris?.art_crop ??
    displayCard?.image_uris?.art_crop;
  const artImage =
    artCropImage ??
    activeFace?.image_uris?.normal ??
    displayCard?.image_uris?.normal;
  const rulingsUri = originalCard?.rulings_uri;
  const printsUri = originalCard?.prints_search_uri;
  const rulingsQuery = useQuery({
    queryKey: ["fetchedUrl", "cardRulingsNormalized", rulingsUri],
    queryFn: () => {
      if (!rulingsUri) throw new Error("This card has no rulings URL.");
      return fetchCardRulings(rulingsUri);
    },
    enabled: Boolean(rulingsUri),
    staleTime: DAY_IN_MS,
  });
  const printsQuery = useFetchUrl("cardPrints", printsUri);
  const printValues = printsQuery.data ?? NO_PRINTS;
  const invalidPrintData = printValues.some((value) => !isCardBrowserCard(value));
  const prints = useMemo(
    () =>
      invalidPrintData
        ? []
        : printValues.filter(isCardBrowserCard),
    [invalidPrintData, printValues],
  );
  const contentCard = useMemo<CardBrowserCard | undefined>(() => {
    if (!displayCard || !supportsFaceSelection || faceIndex === 0) return displayCard;
    const selectedFaces: CardBrowserFace[] = displayCard.card_faces ?? [];
    return {
      ...displayCard,
      card_faces: [
        ...selectedFaces.slice(faceIndex),
        ...selectedFaces.slice(0, faceIndex),
      ],
    };
  }, [displayCard, faceIndex, supportsFaceSelection]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && event.target === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const title = originalCard?.name ?? "Card details";

  return (
    <section
      ref={setDialogRef}
      className="card-detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${title}`}
    >
      <header className="card-detail-overlay__toolbar">
        <h2>{title}</h2>
        <button
          ref={closeButtonRef}
          type="button"
          className="card-detail-overlay__close"
          aria-label="Close card details"
          onClick={onClose}
        >
          <IconClose />
        </button>
      </header>

      {!originalCard && cardQuery.isLoading && (
        <p className="card-detail-overlay__message" role="status">
          Loading card…
        </p>
      )}
      {!originalCard && cardQuery.error && (
        <p className="card-detail-overlay__message card-detail-overlay__message--error" role="alert">
          Could not load this card: {cardQuery.error.message}
        </p>
      )}
      {invalidCard && (
        <p className="card-detail-overlay__message card-detail-overlay__message--error" role="alert">
          Scryfall returned card data in an unexpected format.
        </p>
      )}

      {originalCard && displayCard && contentCard && (
        <div className="card-detail-overlay__columns">
          <div className="card-detail-overlay__details">
            <div
              className={`card-detail__art${artCropImage ? "" : " card-detail__art--full"}`}
            >
              {artImage && (
                <img
                  className="card-detail__art-image"
                  src={artImage}
                  alt={`Illustration for ${activeFace?.name ?? displayCard.name}`}
                />
              )}
              <p
                className={`card-detail__artist${artCropImage ? "" : " card-detail__artist--outside"}`}
              >
                Illustration by {activeFace?.artist ?? displayCard.artist ?? "Unknown artist"} · © Wizards of the Coast
              </p>
            </div>

            {nextFace && (
              <div className="card-detail__flip-control">
                <button
                  type="button"
                  aria-label={`Flip to ${nextFace.name}`}
                  onClick={() => setFaceIndex((index) => (index + 1) % faces.length)}
                >
                  Flip to {nextFace.name}
                </button>
              </div>
            )}

            <div className="card-detail__renderer">
              <CardRenderer
                key={`${displayCard.id}-${faceIndex}`}
                card={contentCard}
                showDetailsMetadata
              />
            </div>

            <section className="card-detail__section">
              <h3>Rulings</h3>
              {rulingsQuery.isLoading && <p role="status">Loading rulings…</p>}
              {rulingsQuery.error && (
                <p className="card-detail__error" role="alert">
                  Could not load rulings: {rulingsQuery.error.message}
                </p>
              )}
              {!rulingsQuery.isLoading && !rulingsQuery.error && (
                <ul className="card-detail__rulings">
                  {(rulingsQuery.data ?? []).length > 0 ? (
                    rulingsQuery.data?.map(({ id, source, date, ruling }, index) => (
                      <li key={`${id}-${date}-${index}`}>
                        <OracleText text={ruling} container="span" />
                        <em>{` (${source}, ${date})`}</em>
                      </li>
                    ))
                  ) : (
                    <li>None</li>
                  )}
                </ul>
              )}
            </section>

            <section className="card-detail__section">
              <h3>Legalities</h3>
              <div className="card-detail__legalities">
                {Object.entries(displayCard.legalities ?? {}).map(([format, legality]) => (
                  <span
                    key={format}
                    className={`card-detail__legality card-detail__legality--${legality}`}
                  >
                    {format.replaceAll("_", " ")}: {legality.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <section className="card-detail-overlay__prints" aria-label="Card prints">
            {printsQuery.isLoading && <p role="status">Loading printings…</p>}
            {printsQuery.error && (
              <p className="card-detail__error" role="alert">
                Could not load printings: {printsQuery.error.message}
              </p>
            )}
            {invalidPrintData && (
              <p className="card-detail__error" role="alert">
                Scryfall returned print data in an unexpected format.
              </p>
            )}
            {!printsQuery.isLoading && !printsQuery.error && !invalidPrintData && (
              <div className="card-detail__print-grid">
                {prints.map((print) => (
                  <article className="card-detail__print" key={print.id}>
                    <div className="card-detail__print-info">
                      <h3>{print.set_name ?? "Unknown set"}</h3>
                      <p>
                        {print.set?.toUpperCase() ?? "—"} / {print.collector_number ?? "—"}
                        {print.released_at ? ` · ${print.released_at}` : ""}
                      </p>
                      <div className="card-detail__prices">
                        <span>Non-foil: {print.prices?.eur ? `€${print.prices.eur}` : "—"}</span>
                        <span className="card-detail__foil-price">
                          Foil: {print.prices?.eur_foil ? `€${print.prices.eur_foil}` : "—"}
                        </span>
                      </div>
                    </div>
                    <CardTile
                      card={print}
                      onSelect={setSelectedPrint}
                      onAction={onAction}
                      isFavorite={favoriteIds.has(print.id)}
                      isFavoritePending={favoriteActionDisabled}
                      binderCopies={binderCopiesByScryfallId.get(print.id) ?? []}
                      binders={binders}
                      isBinderPending={isBinderPending}
                      canManageBinder={canManageBinder}
                      onAddBinderCopy={onAddBinderCopy}
                      onUpdateBinderCopy={onUpdateBinderCopy}
                      onDisposeBinderCopy={onDisposeBinderCopy}
                      onRestoreBinderCopy={onRestoreBinderCopy}
                      onDeleteBinderCopy={onDeleteBinderCopy}
                      deckActions={deckActions}
                      canManageDeck={canManageDeck}
                      popoverPortalTarget={popoverPortalTarget}
                    />
                  </article>
                ))}
                {prints.length === 0 && <p>No printings found.</p>}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
