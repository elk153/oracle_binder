import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CardRenderer from "../scryfall-card-renderer/CardRenderer.tsx";
import OracleText from "../scryfall-card-renderer/components/OracleText.tsx";
import IconClose from "../../assets/icons/IconClose.tsx";
import fetchScryfallPages from "../../services/fetchScryfallPages.ts";
import useScryfallCardsSearch from "./useScryfallCardsSearch.ts";
import fetchCardRulings from "./fetchCardRulings.ts";
import CardTile from "./CardTile.tsx";
import { languageNameOfCode } from "../cardLanguages.ts";
import {
  defaultPrintingLanguages,
  filterByLanguages,
  printingLanguages,
  toggleLanguage,
} from "./printingLanguages.ts";
import type { TextLanguage } from "../scryfall-card-renderer/types.ts";
import type { BinderCopy } from "../binder/useBinderCopies.ts";
import type { Binder } from "../binder/useBinders.ts";
import type { CopyFormValues } from "../binder/BinderCopyForm.tsx";
import type { DeckActions } from "../decks/useDeckManagement.ts";
import type { DeckEntryActions } from "../decks/deckEntryActions.ts";
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
  /** D-079 take-out actions for the deck popover. */
  deckEntryActions?: DeckEntryActions;
  canManageDeck: boolean;
  /** Opens another card in this overlay (used by meld cards); optional. */
  onOpenCard?: (cardId: string) => void;
  onClose: () => void;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const NO_PRINTS: unknown[] = [];

/** D-074: true when Scryfall has printed (non-English) text for this printing. */
function hasPrintedText(card: CardBrowserCard): boolean {
  const parts: (CardBrowserCard | CardBrowserFace)[] = [card, ...(card.card_faces ?? [])];
  return parts.some(
    (part) => Boolean(part.printed_name || part.printed_type_line || part.printed_text),
  );
}

/**
 * D-074: Scryfall's printings list leaves out other languages unless
 * `include_multilingual=true` is added. Returns the URL unchanged when it
 * can't be parsed.
 */
function withAllLanguages(uri: string | undefined): string | undefined {
  if (!uri) return uri;
  try {
    const url = new URL(uri);
    url.searchParams.set("include_multilingual", "true");
    return url.toString();
  } catch {
    return uri;
  }
}

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
  deckEntryActions,
  canManageDeck,
  onOpenCard,
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
  const [textLanguage, setTextLanguage] = useState<TextLanguage>("printed");
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
  // D-074: every printing in every language is loaded once (all pages);
  // the language checkboxes then filter it locally, with no new request.
  const printsUri = withAllLanguages(originalCard?.prints_search_uri);
  const rulingsQuery = useQuery({
    queryKey: ["fetchedUrl", "cardRulingsNormalized", rulingsUri],
    queryFn: () => {
      if (!rulingsUri) throw new Error("This card has no rulings URL.");
      return fetchCardRulings(rulingsUri);
    },
    enabled: Boolean(rulingsUri),
    staleTime: DAY_IN_MS,
  });
  // Not a "fetchedUrl" key on purpose: those are saved in localStorage, and
  // a list of several hundred printings would fill it.
  const printsQuery = useQuery({
    queryKey: ["cardPrintings", printsUri],
    queryFn: ({ signal }) => {
      if (!printsUri) throw new Error("This card has no printings URL.");
      return fetchScryfallPages(printsUri, { signal });
    },
    enabled: Boolean(printsUri),
    staleTime: DAY_IN_MS,
  });
  const printValues = printsQuery.data?.data ?? NO_PRINTS;
  const invalidPrintData = printValues.some((value) => !isCardBrowserCard(value));
  const prints = useMemo(
    () =>
      invalidPrintData
        ? []
        : printValues.filter(isCardBrowserCard),
    [invalidPrintData, printValues],
  );
  const languages = useMemo(() => printingLanguages(prints), [prints]);
  // null until the person clicks a language: then the defaults apply.
  const [chosenLanguages, setChosenLanguages] = useState<ReadonlySet<string> | null>(null);
  const selectedLanguages =
    chosenLanguages ?? defaultPrintingLanguages(originalCard?.lang, languages);
  const shownPrints = filterByLanguages(prints, selectedLanguages);
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

  const showsPrintedText = displayCard !== undefined && hasPrintedText(displayCard);
  const title =
    (showsPrintedText && textLanguage === "printed" ? displayCard?.printed_name : undefined) ??
    originalCard?.name ??
    "Card details";

  return (
    <section
      ref={setDialogRef}
      className="card-detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${title}`}
    >
      <header className="card-detail-overlay__toolbar">
        <h2 className="card-detail-overlay__title">{title}</h2>
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
                  className="card-detail__flip-button"
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
                textLanguage={textLanguage}
                showDetailsMetadata
                onOpenCard={onOpenCard}
              />
            </div>

            {showsPrintedText && (
              <div className="card-detail__text-language">
                <button
                  className="card-detail__text-language-button"
                  type="button"
                  aria-pressed={textLanguage === "oracle"}
                  onClick={() =>
                    setTextLanguage((current) => (current === "printed" ? "oracle" : "printed"))
                  }
                >
                  {textLanguage === "printed"
                    ? "Show English text"
                    : `Show ${languageNameOfCode(displayCard.lang) ?? "printed"} text`}
                </button>
              </div>
            )}

            <section className="card-detail__section">
              <h3 className="card-detail__section-title">Rulings</h3>
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
                      <li key={`${id}-${date}-${index}`} className="card-detail__ruling">
                        <OracleText text={ruling} container="span" />
                        <em>{` (${source}, ${date})`}</em>
                      </li>
                    ))
                  ) : (
                    <li className="card-detail__ruling">None</li>
                  )}
                </ul>
              )}
            </section>

            <section className="card-detail__section">
              <h3 className="card-detail__section-title">Legalities</h3>
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
            {languages.length > 0 && (
              <div
                className="card-detail__languages"
                role="group"
                aria-labelledby="card-detail-languages-title"
              >
                <h3 id="card-detail-languages-title" className="card-detail__languages-title">
                  Languages
                </h3>
                {/* Toggle buttons (aria-pressed): the code on the pill, the
                    full name in the tooltip and for screen readers. */}
                {languages.map((language) => {
                  const selected = selectedLanguages.has(language.code);
                  const label = `${language.name}: ${language.count} ${
                    language.count === 1 ? "printing" : "printings"
                  }`;
                  return (
                    <button
                      key={language.code}
                      type="button"
                      className={`card-detail__language${
                        selected ? " card-detail__language--selected" : ""
                      }`}
                      aria-pressed={selected}
                      aria-label={label}
                      title={label}
                      onClick={() =>
                        setChosenLanguages(toggleLanguage(selectedLanguages, language.code))
                      }
                    >
                      {language.code.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            )}
            {printsQuery.data?.truncated && (
              <p className="card-detail__languages-note">
                Showing the first {prints.length} of {printsQuery.data.totalCards ?? "more"} printings.
              </p>
            )}
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
                {shownPrints.map((print) => (
                  <article className="card-detail__print" key={print.id}>
                    <div className="card-detail__print-info">
                      <h3 className="card-detail__print-name">{print.set_name ?? "Unknown set"}</h3>
                      <p className="card-detail__print-meta">
                        {print.set?.toUpperCase() ?? "—"} / {print.collector_number ?? "—"}
                        {print.released_at ? ` · ${print.released_at}` : ""}
                        {print.lang && print.lang !== "en"
                          ? ` · ${languageNameOfCode(print.lang) ?? print.lang}`
                          : ""}
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
                      deckEntryActions={deckEntryActions}
                      canManageDeck={canManageDeck}
                      popoverPortalTarget={popoverPortalTarget}
                    />
                  </article>
                ))}
                {prints.length === 0 && <p>No printings found.</p>}
                {prints.length > 0 && shownPrints.length === 0 && (
                  <p>Choose a language to see its printings.</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
