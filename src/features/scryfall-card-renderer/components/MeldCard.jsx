import { useEffect, useState } from 'react';
import CardFrame from './CardFrame.tsx';

/**
 * Covers: meld. The rarest shape — lazy-loaded, and the only one that
 * needs a network call (`all_parts[].uri`) to show the combined card.
 *
 * `fetchCardByUri` is injected rather than imported, so this component
 * doesn't hard-code a data-fetching strategy (SWR, React Query, plain
 * fetch, a cached client, etc.) — pass whatever the app already uses.
 */
export default function MeldCard({ card, fetchCardByUri, showDetailsMetadata = false }) {
  const face = card.faces[0];
  const meldPart = card.allParts?.find((part) => part.component === 'meld_result');
  const [meldResult, setMeldResult] = useState(null);

  useEffect(() => {
    if (!meldPart || !fetchCardByUri) return undefined;

    let cancelled = false;
    fetchCardByUri(meldPart.uri).then((data) => {
      if (!cancelled) setMeldResult(data);
    });

    return () => {
      cancelled = true;
    };
  }, [meldPart, fetchCardByUri]);

  return (
    <div className="scryfall-card scryfall-card--meld">
      <CardFrame 
        face={face} 
        image={card.rootImage} 
        showDetailsMetadata={showDetailsMetadata}
      />
      {meldPart && (
        <>
          <div>&nbsp;</div>
          <ul className="rulings">   
            <li>Melds into <strong>{meldResult?.name ?? meldPart.name}</strong></li>
          </ul>
        </>
      )}
    </div>
  );
}
