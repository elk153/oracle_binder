import CardFrame from './CardFrame.tsx';
import CardExtras from './extras/CardExtras.tsx';
import type { ShapeComponentProps } from '../types.ts';

/**
 * Covers: normal, leveler, class, case, saga, mutate, prototype, battle,
 * planar, scheme, vanguard, token, emblem, augment, host.
 *
 * This is the overwhelming majority of any real card pool, so it's the one
 * shape component imported eagerly in CardRenderer rather than lazy-loaded.
 */
export default function OneFaceCard({ card, showDetailsMetadata = false }: ShapeComponentProps) {
  const face = card.faces[0];

  return (
    <div className="scryfall-card scryfall-card--one-face">
      <CardFrame 
        face={face} 
        image={face.image ?? card.rootImage} 
        showDetailsMetadata={showDetailsMetadata}
      />
      <CardExtras 
        layout={card.layout} 
        face={face} 
      />
    </div>
  );
}
