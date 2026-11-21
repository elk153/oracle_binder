import { useState } from 'react';
import CardFrame from './CardFrame.tsx';

/**
 * Covers: transform, modal_dfc, double_faced_token, art_series,
 * reversible_card. Two independent-or-related faces, one visible at a
 * time, toggled by the person.
 */
export default function ToggleFacesCard({ card, showDetailsMetadata = false }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const face = card.faces[activeIndex];
  const canToggle = card.faces.length > 1;
  const nextFace = canToggle
    ? card.faces[(activeIndex + 1) % card.faces.length]
    : null;

  return (
    <div className="scryfall-card scryfall-card--toggle-faces">
      <CardFrame 
        face={face} 
        image={face.image} 
        showDetailsMetadata={showDetailsMetadata}
      />
      {canToggle && (
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
