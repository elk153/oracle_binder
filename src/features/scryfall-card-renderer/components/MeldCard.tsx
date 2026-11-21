import CardFrame from './CardFrame.tsx';
import useScryfallCardsSearch from '../../card-browser/useScryfallCardsSearch.ts';
import type { ShapeComponentProps } from '../types.ts';

type MeldResultView = {
  name: string;
  image: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads the two fields shown here from an unvalidated API record. The
 * value comes from the network as `unknown`, so each field is checked
 * before use instead of trusting its shape.
 */
function toMeldResultView(value: unknown): MeldResultView | null {
  if (!isRecord(value) || typeof value.name !== 'string') return null;

  const imageUris = isRecord(value.image_uris) ? value.image_uris : undefined;
  const image =
    typeof imageUris?.normal === 'string' ? imageUris.normal
    : typeof imageUris?.large === 'string' ? imageUris.large
    : null;

  return { name: value.name, image };
}

/**
 * Covers: meld. The rarest shape — lazy-loaded, and the only one that
 * needs a network call to show the combined card.
 *
 * A meld piece shows the card it melds into: the name from `all_parts`
 * right away, then the meld result's image once it has loaded. The result
 * is fetched through the shared Scryfall card query (same cache key as the
 * details overlay uses for `cards/<id>`), so reopening it costs nothing.
 * If the request fails, only the name is shown.
 *
 * The meld result itself lists its pieces instead.
 */
export default function MeldCard({ card, showDetailsMetadata = false }: ShapeComponentProps) {
  const face = card.faces[0];
  const allParts = card.allParts ?? [];
  const meldResultPart = allParts.find((part) => part.component === 'meld_result');
  const isMeldResult = meldResultPart?.id === card.id;
  const meldPieceNames = allParts
    .filter((part) => part.component === 'meld_part')
    .map((part) => part.name);

  const meldResultQuery = useScryfallCardsSearch(
    meldResultPart && !isMeldResult ? `cards/${encodeURIComponent(meldResultPart.id)}` : null,
    {},
    0,
  );
  const meldResult = toMeldResultView(meldResultQuery.data?.[0]);

  return (
    <div className="scryfall-card scryfall-card--meld">
      <CardFrame
        face={face}
        image={card.rootImage}
        showDetailsMetadata={showDetailsMetadata}
      />
      {isMeldResult && meldPieceNames.length > 0 && (
        <>
          <div>&nbsp;</div>
          <ul className="rulings">
            <li>Melded from <strong>{meldPieceNames.join(' and ')}</strong></li>
          </ul>
        </>
      )}
      {meldResultPart && !isMeldResult && (
        <>
          <div>&nbsp;</div>
          <ul className="rulings">
            <li>Melds into <strong>{meldResult?.name ?? meldResultPart.name}</strong></li>
          </ul>
          {meldResult?.image && (
            <img
              className="scryfall-card__meld-result-image"
              src={meldResult.image}
              alt={meldResult.name}
              loading="lazy"
            />
          )}
        </>
      )}
    </div>
  );
}
