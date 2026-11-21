import { useState } from 'react';
import OracleText from "./OracleText.tsx";
import { CardFaceMetadata } from './CardFrame.tsx';
import type { ShapeComponentProps } from '../types.ts';

/**
 * Covers: split, adventure. Both faces are legal casting options on the
 * same piece of card stock, shown at once rather than toggled.
 */
export default function SplitFacesCard({ card, showDetailsMetadata = false }: ShapeComponentProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const resolvedRotation = card.faces[activeIndex].rotation;
  const differentFaceOrientation = card.faces[0].rotation !== card.faces[1].rotation
  const activeFace = card.faces[activeIndex];
  const nextFace = activeIndex === 0 ? 1 : 0;
  console.log(card)

  if (!differentFaceOrientation) {
  return (
    <div className="card-frame">
      <div className={`card-frame-${resolvedRotation}`}>
        <img
          className={"card"}
          src={card.faces[activeIndex].image ?? card.rootImage ?? undefined}
          alt={card.faces[activeIndex].name}
        />
      </div>

      <div className="card-frame">
        {card.faces.map((face) => (
          <div className="card-description">
            <div className="scryfall-card__header">
              <h3 className="scryfall-card__name">{face.name}</h3>
            </div>
    
            {face.typeLine && (
              <em><span className="scryfall-card__type-line">{face.typeLine}</span></em>
            )}
            {showDetailsMetadata ? (
              <CardFaceMetadata face={face} />
            ) : (
              <>
                {face.manaCost && (
                  <span className="scryfall-card__mana-cost"><OracleText text={face.manaCost} /></span>
                )}
                {face.power && <span className="color-pill color__M">{face.power}/{face.toughness ?? "—"}</span>}
                {face.loyalty && <span className="color-pill color__M">{face.loyalty}</span>}
                {face.defense && <span className="color-pill color__M">{face.defense}</span>}
              </>
            )}
    
            {face.oracleText && (
              <>
                <hr style={{ border: "none", height: "1px", backgroundColor: "#805e24" }} />
                <div className="scryfall-card__oracle-text"><OracleText text={face.oracleText} /></div>
              </>
            )}
    
            {face.flavorText && (
              <>
                <hr style={{ border: "none", height: "1px", backgroundColor: "#805e24" }} />
                <p className="scryfall-card__flavor-text"><em>{face.flavorText}</em></p>
              </>
            )}
          
          </div>
        ))}
      </div>
    </div>
  )}

  if (differentFaceOrientation) {
    return(
      <>
        <div className="card-frame">
          <div className={`card-frame-${resolvedRotation}`}>
            <img
              className={"card"}
              src={card.faces[activeIndex].image ?? card.rootImage ?? undefined}
              alt={card.faces[activeIndex].name}
            />
          </div>

          <div className="card-frame">
            <div className="card-description">
              <div className="scryfall-card__header">
                <h3 className="scryfall-card__name">{activeFace.name}</h3>
              </div>
      
              {activeFace.typeLine && (
                <em><span className="scryfall-card__type-line">{activeFace.typeLine}</span></em>
              )}
              {showDetailsMetadata ? (
                <CardFaceMetadata face={activeFace} />
              ) : (
                <>
                  {activeFace.manaCost && (
                    <span className="scryfall-card__mana-cost"><OracleText text={activeFace.manaCost} /></span>
                  )}
                  {activeFace.power && <span className="color-pill color__M">{activeFace.power}/{activeFace.toughness ?? "—"}</span>}
                  {activeFace.loyalty && <span className="color-pill color__M">{activeFace.loyalty}</span>}
                  {activeFace.defense && <span className="color-pill color__M">{activeFace.defense}</span>}
                </>
              )}
      
              {activeFace.oracleText && (
                <>
                  <hr style={{ border: "none", height: "1px", backgroundColor: "#805e24" }} />
                  <p className="scryfall-card__oracle-text"><OracleText text={activeFace.oracleText} /></p>
                </>
              )}
      
              {activeFace.flavorText && (
                <>
                  <hr style={{ border: "none", height: "1px", backgroundColor: "#805e24" }} />
                  <p className="scryfall-card__flavor-text"><em>{activeFace.flavorText}</em></p>
                </>
              )}
            
            </div>
          </div>        
        </div>
        <div className="input">
          <button
            type="button"
            onClick={() => setActiveIndex((i) => (i === 0 ? 1 : 0))}
          >
            ↺ Rotate to {card.faces[nextFace].name}
          </button>
        </div>
      </>
  )}

}
