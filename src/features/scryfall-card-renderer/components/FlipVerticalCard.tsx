import { useState } from 'react';
import CardFrame from './CardFrame.tsx';
import type { ShapeComponentProps } from '../types.ts';

/**
 * Covers: flip. A single physical image with two text halves printed
 * upside-down relative to each other; "flipping" rotates 180deg rather
 * than swapping to a different image.
 *
 * Rotation now comes from the normalized face (face.rotation: 0 for the
 * first face, 180 for the second — see ROTATION_BY_LAYOUT), and CardFrame
 * applies it to the whole block. Previously this component computed
 * `isFlipped` locally and only rotated the <img>, leaving the text
 * unrotated — using face.rotation via CardFrame fixes that, since flip
 * cards print the *entire* second face (art + text) upside-down, not just
 * the art.
 */
export default function FlipVerticalCard({ card, showDetailsMetadata = false }: ShapeComponentProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const face = card.faces[activeIndex];
  const image = face.image ?? card.rootImage;

  return (
    <div className="">
      
      <CardFrame 
        face={face} 
        image={image} 
        showDetailsMetadata={showDetailsMetadata}
      />

      {card.faces.length > 1 && (
        <div className="input">
          <button
            type="button"
            className=""
            onClick={() => setActiveIndex((i) => (i === 0 ? 1 : 0))}
          >
            ⇅ Flip
          </button>
        </div>
      )}
    </div>
  );
}
