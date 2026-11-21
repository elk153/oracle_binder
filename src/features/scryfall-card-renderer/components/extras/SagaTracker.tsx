/**
 * STUB: Scryfall doesn't return saga chapters as structured data — they're
 * embedded in oracle_text as lines like "I, II — Do a thing.". Real
 * implementation should parse those numeral prefixes into discrete steps;
 * for now this just labels the block so the shape is visible.
 */
export default function SagaTracker() {
  return (
    <div className="scryfall-card__extra scryfall-card__extra--saga">
      {/*<span className="scryfall-card__extra-label">Chapters</span>*/}
      {/* TODO: parse face.oracleText into { numerals, effect }[] and render a tracker */}
      {/*<p className="scryfall-card__extra-raw">{face.oracleText}</p>*/}
    </div>
  );
}
