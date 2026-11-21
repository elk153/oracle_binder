/**
 * STUB: Case cards have labeled sections ("To Solve —" / "Solved —") baked
 * into oracle_text. Real implementation should split on those labels and
 * render each as its own block.
 */
export default function CaseSections() {
  return (
    <div className="scryfall-card__extra scryfall-card__extra--case">
      {/*<span className="scryfall-card__extra-label">Case</span>*/}
      {/* TODO: split face.oracleText on the "To Solve" / "Solved" labels */}
      {/*<p className="scryfall-card__extra-raw">{face.oracleText}</p>*/}
    </div>
  );
}
