/**
 * STUB: Prototype cards carry alternate mana cost + P/T on the card object
 * itself (not in this normalized face shape yet). Real implementation
 * should surface card.prototype.{mana_cost,power,toughness} alongside the
 * normal cost, and extend normalizeCard/toNormalizedFace to pass it through.
 */
export default function PrototypeBanner() {
  return (
    <div className="scryfall-card__extra scryfall-card__extra--prototype">
      {/*<span className="scryfall-card__extra-label">Prototype</span>*/}
      {/* TODO: pass card.prototype through normalizeCard and render it here */}
      {/*<p className="scryfall-card__extra-raw">{face.oracleText}</p>*/}
    </div>
  );
}
