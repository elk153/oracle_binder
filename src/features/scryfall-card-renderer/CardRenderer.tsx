import { lazy, memo, Suspense, useMemo } from 'react';
import type { ComponentType } from 'react';
import { CARD_SHAPES } from './scryfallCardLayouts.ts';
import type { CardShape } from './scryfallCardLayouts.ts';
import { normalizeCard, withTextLanguage } from './normalizeCard.ts';
import type { RawScryfallCard, ShapeComponentProps, TextLanguage } from './types.ts';

// Eager: ONE_FACE covers 15 of the 24 layouts and is the overwhelming
// majority of any real card pool — no reason to pay a lazy-load waterfall
// for the common case.
import OneFaceCard from './components/OneFaceCard.tsx';

// Lazy: each of these is rare in a typical card pool, so their code (and
// any extras they pull in) is only downloaded when actually needed.
const ToggleFacesCard = lazy(() => import('./components/ToggleFacesCard.tsx'));
const SplitFacesCard = lazy(() => import('./components/SplitFacesCard.tsx'));
const FlipVerticalCard = lazy(() => import('./components/FlipVerticalCard.tsx'));
const MeldCard = lazy(() => import('./components/MeldCard.tsx')); // rarest of all

// Record<CardShape, ...> makes TypeScript require one component per shape:
// adding a shape to CARD_SHAPES without a component here is a type error.
const SHAPE_COMPONENTS: Record<CardShape, ComponentType<ShapeComponentProps>> = {
  [CARD_SHAPES.ONE_FACE]: OneFaceCard,
  [CARD_SHAPES.TOGGLE_FACES]: ToggleFacesCard,
  [CARD_SHAPES.SPLIT_FACES]: SplitFacesCard,
  [CARD_SHAPES.FLIP_VERTICAL]: FlipVerticalCard,
  [CARD_SHAPES.MELD]: MeldCard,
};

function CardFallback() {
  return <div className="scryfall-card scryfall-card--loading" aria-busy="true" />;
}

type CardRendererProps = Omit<ShapeComponentProps, 'card'> & {
  /** A raw Scryfall card; it is normalized here before rendering. */
  card: RawScryfallCard;
  /**
   * D-074: show the card as printed (its language, where Scryfall has the
   * text; the default) or Scryfall's English oracle text.
   */
  textLanguage?: TextLanguage;
};

/**
 * Renders any Scryfall card object, regardless of layout.
 *
 * Usage: <CardRenderer card={scryfallCard} />
 * Meld cards accept an extra `fetchCardByUri` prop for resolving all_parts.
 */
function CardRenderer({ card, textLanguage = 'printed', ...rest }: CardRendererProps) {
  const normalized = useMemo(
    () => withTextLanguage(normalizeCard(card), textLanguage),
    [card, textLanguage],
  );
  const Component = SHAPE_COMPONENTS[normalized.shape];

  return (
    <Suspense fallback={<CardFallback />}>
      <Component card={normalized} {...rest} />
    </Suspense>
  );
}

export default memo(CardRenderer);
