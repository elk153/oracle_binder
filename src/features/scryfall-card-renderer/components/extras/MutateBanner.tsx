/**
 * STUB: Mutate cards have a "Mutate {cost}" line and a separate mutate
 * trigger, divided by a blank line in oracle_text. Real implementation
 * should split on the divider and render the mutate cost as its own badge.
 */
export default function MutateBanner() {
  return (
    <div className="scryfall-card__extra scryfall-card__extra--mutate">
      {/*<span className="scryfall-card__extra-label">Mutate</span>*/}
      {/* TODO: split face.oracleText on the blank-line divider */}
      {/*<p className="scryfall-card__extra-raw">{face.oracleText}</p>*/}
    </div>
  );
}
