import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefCallback,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import BinderIcon from "../../assets/icons/navigation/BinderIcon.tsx";
import DecksIcon from "../../assets/icons/navigation/DecksIcon.tsx";
import FavoritesIcon from "../../assets/icons/navigation/FavoritesIcon.tsx";
import IconTurnAround from "../../assets/icons/IconTurnAround.tsx";
import type { BinderCopy } from "../binder/useBinderCopies.ts";
import type { Binder } from "../binder/useBinders.ts";
import type { CopyFormValues } from "../binder/BinderCopyForm.tsx";
import BinderCopiesPopover from "../binder/BinderCopiesPopover.tsx";
import DeckCardPopover from "../decks/DeckCardPopover.tsx";
import type { DeckActions, DeckCard } from "../decks/useDeckManagement.ts";
import type { CardAction, CardBrowserCard } from "./types.ts";
import "./CardTile.css";

type CardTileProps = {
  card: CardBrowserCard;
  onSelect?: (card: CardBrowserCard) => void;
  selectLabel?: string;
  onAction?: (action: CardAction, card: CardBrowserCard) => void;
  isFavorite?: boolean;
  isFavoritePending?: boolean;
  binderCopies?: BinderCopy[];
  binders?: Binder[];
  isBinderPending?: boolean;
  canManageBinder?: boolean;
  onAddBinderCopy?: (card: CardBrowserCard) => void;
  onUpdateBinderCopy?: (
    copy: BinderCopy,
    values: CopyFormValues,
  ) => Promise<boolean>;
  onDisposeBinderCopy?: (
    copy: BinderCopy,
    status: "sold" | "lost" | "given_away",
  ) => void;
  onRestoreBinderCopy?: (copy: BinderCopy) => void;
  onDeleteBinderCopy?: (copy: BinderCopy) => void;
  deckActions?: DeckActions;
  canManageDeck?: boolean;
  deckEntryKind?: DeckCard["kind"];
  showKindLabel?: boolean;
  showActions?: boolean;
  popoverPortalTarget?: HTMLElement | null;
};

type PopoverMode = "hover" | "pinned" | null;

type CardPopoverPortalProps = {
  target: HTMLElement;
  position: { left: number; top: number } | null;
  mode: PopoverMode;
  setMode: Dispatch<SetStateAction<PopoverMode>>;
  panelRef: RefCallback<HTMLDivElement>;
  children: ReactNode;
};

function CardPopoverPortal({
  target,
  position,
  mode,
  setMode,
  panelRef,
  children,
}: CardPopoverPortalProps) {
  return createPortal(
    <div
      ref={panelRef}
      className="card-detail-overlay__popover-portal"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
      onPointerLeave={(event) => {
        const nextTarget = event.relatedTarget;
        const isActionTarget =
          nextTarget instanceof Element &&
          nextTarget.closest(".browser-card__action-wrap");
        if (event.pointerType === "mouse" && mode === "hover" && !isActionTarget) {
          setMode(null);
        }
      }}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        const isActionTarget =
          nextTarget instanceof Element &&
          nextTarget.closest(".browser-card__action-wrap");
        if (
          mode === "hover" &&
          (!(nextTarget instanceof Node) ||
            (!event.currentTarget.contains(nextTarget) && !isActionTarget))
        ) {
          setMode(null);
        }
      }}
    >
      {children}
    </div>,
    target,
  );
}

const CARD_ACTIONS = [
  { action: "favorite", label: "Favorites", Icon: FavoritesIcon },
  { action: "binder", label: "Binder", Icon: BinderIcon },
  { action: "deck", label: "Decks", Icon: DecksIcon },
] as const;

export default function CardTile({
  card,
  onSelect,
  selectLabel,
  onAction,
  isFavorite = false,
  isFavoritePending = false,
  binderCopies = [],
  binders = [],
  isBinderPending = false,
  canManageBinder = true,
  onAddBinderCopy,
  onUpdateBinderCopy,
  onDisposeBinderCopy,
  onRestoreBinderCopy,
  onDeleteBinderCopy,
  deckActions,
  canManageDeck = true,
  deckEntryKind,
  showKindLabel = true,
  showActions = true,
  popoverPortalTarget,
}: CardTileProps) {
  const [showBack, setShowBack] = useState(false);
  const [binderPopoverMode, setBinderPopoverMode] = useState<PopoverMode>(null);
  const [deckPopoverMode, setDeckPopoverMode] = useState<PopoverMode>(null);
  const [popoverPosition, setPopoverPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const binderPopoverRef = useRef<HTMLSpanElement>(null);
  const deckPopoverRef = useRef<HTMLSpanElement>(null);
  const [binderPopoverPanel, setBinderPopoverPanel] =
    useState<HTMLDivElement | null>(null);
  const [deckPopoverPanel, setDeckPopoverPanel] =
    useState<HTMLDivElement | null>(null);
  const mouseIsHoveringFlip = useRef(false);
  const faces = card.card_faces ?? [];
  const canFlip =
    ["transform", "modal_dfc", "reversible_card", "double_faced_token"].includes(
      card.layout,
    ) &&
    faces.length > 1 &&
    Boolean(faces[0].image_uris?.normal && faces[1].image_uris?.normal);
  const activeFace = canFlip ? faces[showBack ? 1 : 0] : undefined;
  const image =
    activeFace?.image_uris?.normal ??
    card.image_uris?.normal ??
    faces[0]?.image_uris?.normal;
  const imageAlt = activeFace?.name ?? card.name;
  const entryKindLabel =
    deckEntryKind === "binder"
      ? "Binder copy"
      : deckEntryKind === "proxy"
        ? "Proxy"
        : deckEntryKind === "virtual"
          ? "Virtual"
          : null;

  const activePopover =
    binderPopoverMode !== null
      ? "binder"
      : deckPopoverMode !== null
        ? "deck"
        : null;

  useLayoutEffect(() => {
    if (!popoverPortalTarget || !activePopover) return;
    const portalTarget = popoverPortalTarget;

    const anchorRef =
      activePopover === "binder" ? binderPopoverRef : deckPopoverRef;
    const panel =
      activePopover === "binder" ? binderPopoverPanel : deckPopoverPanel;

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor || !panel) return;

      const anchorRect = anchor.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const targetRect = portalTarget.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const margin = 12;

      if (anchorRect.bottom <= 0 || anchorRect.top >= viewportHeight) {
        if (activePopover === "binder") setBinderPopoverMode(null);
        else setDeckPopoverMode(null);
        return;
      }

      const leftRoom = anchorRect.left - margin;
      const rightRoom = viewportWidth - anchorRect.right - margin;
      let left =
        leftRoom >= panelRect.width
          ? anchorRect.left - panelRect.width
          : rightRoom >= panelRect.width
            ? anchorRect.right
            : Math.max(margin, Math.min(anchorRect.left, viewportWidth - panelRect.width - margin));
      left = Math.max(margin, Math.min(left, viewportWidth - panelRect.width - margin));

      const top = Math.max(
        margin,
        Math.min(
          anchorRect.top + panelRect.height <= viewportHeight - margin
            ? anchorRect.top
            : anchorRect.bottom - panelRect.height,
          viewportHeight - panelRect.height - margin,
        ),
      );
      const position = {
        left: left - targetRect.left,
        top: top - targetRect.top + portalTarget.scrollTop,
      };
      setPopoverPosition((current) =>
        current?.left === position.left && current.top === position.top
          ? current
          : position,
      );
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const resizeObserver = new ResizeObserver(updatePosition);
    if (panel) resizeObserver.observe(panel);
    if (anchorRef.current) resizeObserver.observe(anchorRef.current);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resizeObserver.disconnect();
    };
  }, [
    activePopover,
    binderPopoverPanel,
    deckPopoverPanel,
    popoverPortalTarget,
  ]);

  function renderPopoverPanel(
    content: ReactNode,
    panelRef: RefCallback<HTMLDivElement>,
    setMode: Dispatch<SetStateAction<PopoverMode>>,
    mode: PopoverMode,
  ) {
    if (!content) return null;
    if (!popoverPortalTarget) return content;

    return (
      <CardPopoverPortal
        target={popoverPortalTarget}
        position={popoverPosition}
        mode={mode}
        setMode={setMode}
        panelRef={panelRef}
      >
        {content}
      </CardPopoverPortal>
    );
  }

  useEffect(() => {
    if (binderPopoverMode !== "pinned" && deckPopoverMode !== "pinned") return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (
        !binderPopoverRef.current?.contains(event.target) &&
        !binderPopoverPanel?.contains(event.target)
      ) {
        setBinderPopoverMode(null);
      }
      if (
        !deckPopoverRef.current?.contains(event.target) &&
        !deckPopoverPanel?.contains(event.target)
      ) {
        setDeckPopoverMode(null);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setBinderPopoverMode(null);
        setDeckPopoverMode(null);
      }
    }

    document.addEventListener("click", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [
    binderPopoverMode,
    binderPopoverPanel,
    deckPopoverMode,
    deckPopoverPanel,
  ]);

  return (
    <article
      className={`browser-card${deckEntryKind ? ` browser-card--${deckEntryKind}` : ""}`}
    >
      <button
        type="button"
        className="browser-card__media"
        onClick={() => onSelect?.(card)}
        aria-label={`${selectLabel ?? `View details for ${card.name}`}${
          entryKindLabel ? `, ${entryKindLabel}` : ""
        }`}
      >
        {image ? (
          <img src={image} alt={imageAlt} loading="lazy" />
        ) : (
          <span className="browser-card__placeholder" role="img" aria-label={card.name}>
            Card image unavailable
          </span>
        )}
      </button>
      {entryKindLabel && showKindLabel && (
        <span className="browser-card__kind-label" aria-hidden="true">
          {entryKindLabel}
        </span>
      )}

      {showActions && (
        <div className="browser-card__actions" aria-label={`${card.name} actions`}>
          {CARD_ACTIONS.map(({ action, label, Icon }) => {
            const isFavoriteAction = action === "favorite";
            const isBinderAction = action === "binder";
            const isDeckAction = action === "deck";
            const ownedBinderCount = binderCopies.filter(
              (copy) => copy.status === "owned",
            ).length;
            const deckEntryCount =
              deckActions?.deckCards.filter(
                (entry) => entry.scryfall_id === card.id,
              ).length ?? 0;
            const favoriteLabel = isFavorite
              ? "Remove from Favorites"
              : "Add to Favorites";
            const binderLabel = ownedBinderCount
              ? `${ownedBinderCount} binder ${ownedBinderCount === 1 ? "copy" : "copies"}`
              : "Add to Binder";
            const deckLabel = deckEntryCount
              ? `${deckEntryCount} ${deckEntryCount === 1 ? "deck entry" : "deck entries"}`
              : "Add to Deck";
            const actionLabel = isFavoriteAction
              ? favoriteLabel
              : isBinderAction
                ? binderLabel
                : isDeckAction
                  ? deckLabel
                  : label;
            return (
              <span
                key={action}
                ref={
                  isBinderAction
                    ? binderPopoverRef
                    : isDeckAction
                      ? deckPopoverRef
                      : undefined
                }
                className="browser-card__action-wrap"
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse") return;
                  if (isBinderAction && canManageBinder) {
                    setBinderPopoverMode((mode) => mode ?? "hover");
                  } else if (isDeckAction && canManageDeck) {
                    setDeckPopoverMode((mode) => mode ?? "hover");
                  }
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== "mouse") return;
                  const nextTarget = event.relatedTarget;
                  const isPopoverTarget =
                    nextTarget instanceof Element &&
                    nextTarget.closest(".card-detail-overlay__popover-portal");
                  if (isPopoverTarget) return;
                  if (isBinderAction && binderPopoverMode === "hover") {
                    setBinderPopoverMode(null);
                  } else if (isDeckAction && deckPopoverMode === "hover") {
                    setDeckPopoverMode(null);
                  }
                }}
                onFocus={() => {
                  if (isBinderAction && canManageBinder) {
                    setBinderPopoverMode((mode) => mode ?? "hover");
                  } else if (isDeckAction && canManageDeck) {
                    setDeckPopoverMode((mode) => mode ?? "hover");
                  }
                }}
                onBlur={(event) => {
                  const nextTarget = event.relatedTarget;
                  const isPopoverTarget =
                    nextTarget instanceof Element &&
                    nextTarget.closest(".card-detail-overlay__popover-portal");
                  if (
                    !(nextTarget instanceof Node) ||
                    (!event.currentTarget.contains(nextTarget) && !isPopoverTarget)
                  ) {
                    if (isBinderAction && binderPopoverMode === "hover") {
                      setBinderPopoverMode(null);
                    } else if (isDeckAction && deckPopoverMode === "hover") {
                      setDeckPopoverMode(null);
                    }
                  }
                }}
              >
                <button
                  type="button"
                  className={`browser-card__action${isFavoriteAction && isFavorite ? " browser-card__action--favorite-active" : ""}${isBinderAction && ownedBinderCount > 0 ? " browser-card__action--binder-active" : ""}${isDeckAction && deckEntryCount > 0 ? " browser-card__action--deck-active" : ""}`}
                  aria-label={
                    isFavoriteAction
                      ? `${favoriteLabel}: ${card.name}`
                      : isBinderAction
                        ? `${canManageBinder ? binderLabel : "Sign in to manage Binder"}: ${card.name}`
                        : isDeckAction
                          ? `${canManageDeck ? deckLabel : "Sign in to manage decks"}: ${card.name}`
                          : `${label} action for ${card.name}`
                  }
                  aria-pressed={
                    isFavoriteAction
                      ? isFavorite
                      : isBinderAction
                        ? ownedBinderCount > 0
                        : isDeckAction
                          ? deckEntryCount > 0
                          : undefined
                  }
                  aria-expanded={
                    isBinderAction
                      ? binderPopoverMode !== null
                      : isDeckAction
                        ? deckPopoverMode !== null
                        : undefined
                  }
                  title={`${actionLabel}${isFavoritePending && isFavoriteAction ? " — updating" : ""}`}
                  disabled={
                    (isFavoriteAction && isFavoritePending) ||
                    (isBinderAction && isBinderPending) ||
                    (isDeckAction && Boolean(deckActions?.isPending))
                  }
                  onClick={() => {
                    if (isBinderAction && canManageBinder) {
                      setBinderPopoverMode((mode) =>
                        mode === "pinned" ? null : "pinned",
                      );
                    } else if (isDeckAction && canManageDeck && deckActions) {
                      setDeckPopoverMode((mode) =>
                        mode === "pinned" ? null : "pinned",
                      );
                    } else if (isBinderAction || isDeckAction) {
                      onAction?.(action, card);
                    } else {
                      onAction?.(action, card);
                    }
                  }}
                >
                  <Icon />
                  {isBinderAction && ownedBinderCount > 0 && (
                    <span className="browser-card__binder-count" aria-hidden="true">
                      {ownedBinderCount}
                    </span>
                  )}
                  {isDeckAction && deckEntryCount > 0 && (
                    <span className="browser-card__deck-count" aria-hidden="true">
                      {deckEntryCount}
                    </span>
                  )}
                </button>
                {isBinderAction && binderPopoverMode !== null && (
                  renderPopoverPanel(
                    <BinderCopiesPopover
                      card={card}
                      copies={binderCopies}
                      binders={binders}
                      deckCards={deckActions?.deckCards ?? []}
                      decks={deckActions?.decks ?? []}
                      isBusy={isBinderPending}
                      onAdd={() => onAddBinderCopy?.(card)}
                      onUpdate={(copy, values) =>
                        onUpdateBinderCopy?.(copy, values) ?? Promise.resolve(false)
                      }
                      onDispose={(copy, status) =>
                        onDisposeBinderCopy?.(copy, status)
                      }
                      onRestore={(copy) => onRestoreBinderCopy?.(copy)}
                      onDelete={(copy) => onDeleteBinderCopy?.(copy)}
                      onClose={() => setBinderPopoverMode(null)}
                    />,
                    setBinderPopoverPanel,
                    setBinderPopoverMode,
                    binderPopoverMode,
                  )
                )}
                {isDeckAction &&
                  deckPopoverMode !== null &&
                  deckActions &&
                  canManageDeck && (
                    renderPopoverPanel(
                      <DeckCardPopover
                        card={card}
                        copies={binderCopies}
                        actions={deckActions}
                        onClose={() => setDeckPopoverMode(null)}
                      />,
                      setDeckPopoverPanel,
                      setDeckPopoverMode,
                      deckPopoverMode,
                    )
                  )}
              </span>
            );
          })}
          {canFlip && (
            <button
              type="button"
              className="browser-card__action browser-card__action--flip"
              aria-label={`Show ${showBack ? faces[0].name : faces[1].name}`}
              aria-pressed={showBack}
              title="Flip card"
              onPointerEnter={(event) => {
                if (event.pointerType !== "mouse") return;
                mouseIsHoveringFlip.current = true;
                setShowBack(true);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== "mouse") return;
                mouseIsHoveringFlip.current = false;
                setShowBack(false);
              }}
              onClick={() => {
                if (!mouseIsHoveringFlip.current) {
                  setShowBack((current) => !current);
                }
              }}
            >
              <IconTurnAround />
            </button>
          )}
        </div>
      )}
    </article>
  );
}
