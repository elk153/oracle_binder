import { useState } from 'react';
import CardFrame from './CardFrame.tsx';
import type { ShapeComponentProps } from '../types.ts';

/**
 * Covers: transform, modal_dfc, double_faced_token, art_series,
 * reversible_card. Two independent-or-related faces, one visible at a
 * time, toggled by the person.
 */
export default function ToggleFacesCard({ card, showDetailsMetadata = false }: ShapeComponentProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const face = card.faces[activeIndex];
  const nextFace = card.faces.length > 1
    ? card.faces[(activeIndex + 1) % card.faces.length]
    : null;

  return (
    <div className="scryfall-card scryfall-card--toggle-faces">
      <CardFrame 
        face={face} 
        image={face.image} 
        showDetailsMetadata={showDetailsMetadata}
      />
      {/* Checking nextFace (not a separate boolean) lets TypeScript know it is not null below. */}
      {nextFace && (
        <div className="input">
          <button
            type="button"
            className="scryfall-card__flip-button"
            onClick={() => setActiveIndex((i) => (i + 1) % card.faces.length)}
            aria-label={`Show ${nextFace.name}`}
          >
            ⟲ Flip to {nextFace.name}
          </button>
        </div>
      )}
    </div>
  );
}
