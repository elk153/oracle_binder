import React, { Suspense, useMemo } from 'react';
import { CARD_SHAPES } from './scryfallCardLayouts.ts';
import { normalizeCard } from './normalizeCard.ts';

// Eager: ONE_FACE covers 15 of the 24 layouts and is the overwhelming
// majority of any real card pool — no reason to pay a lazy-load waterfall
// for the common case.
import OneFaceCard from './components/OneFaceCard.jsx';

// Lazy: each of these is rare in a typical card pool, so their code (and
// any extras they pull in) is only downloaded when actually needed.
const ToggleFacesCard = React.lazy(() => import('./components/ToggleFacesCard.jsx'));
const SplitFacesCard = React.lazy(() => import('./components/SplitFacesCard.jsx'));
const FlipVerticalCard = React.lazy(() => import('./components/FlipVerticalCard.jsx'));
const MeldCard = React.lazy(() => import('./components/MeldCard.jsx')); // rarest of all

const SHAPE_COMPONENTS = {
  [CARD_SHAPES.ONE_FACE]: OneFaceCard,
  [CARD_SHAPES.TOGGLE_FACES]: ToggleFacesCard,
  [CARD_SHAPES.SPLIT_FACES]: SplitFacesCard,
  [CARD_SHAPES.FLIP_VERTICAL]: FlipVerticalCard,
  [CARD_SHAPES.MELD]: MeldCard,
};

function CardFallback() {
  return <div className="scryfall-card scryfall-card--loading" aria-busy="true" />;
}

/**
 * Renders any Scryfall card object, regardless of layout.
 *
 * Usage: <CardRenderer card={scryfallCard} />
 * Meld cards accept an extra `fetchCardByUri` prop for resolving all_parts.
 *
 */
/** @param {{ card: object, [key: string]: unknown }} props */
function CardRenderer(props) {
  const { card, ...rest } = props;
  const normalized = useMemo(() => normalizeCard(card), [card]);
  const Component = SHAPE_COMPONENTS[normalized.shape] ?? OneFaceCard;

  console.log(`Card Layout: ${normalized.layout}, Normalized Shape: ${normalized.shape}, Name: ${normalized.name}`);

  return (
    <Suspense fallback={<CardFallback />}>
      <Component card={normalized} {...rest} />
    </Suspense>
  );
}

export default React.memo(CardRenderer);
