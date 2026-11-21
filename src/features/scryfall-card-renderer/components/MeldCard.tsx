import { useMemo } from 'react';
import CardFrame from './CardFrame.tsx';
import useScryfallCardsForIds from '../../../hooks/useScryfallCardsForIds.ts';
import type { RawAllPart, ShapeComponentProps } from '../types.ts';

/** One of the two other cards in a meld trio, as shown under this card. */
type MeldRelation = {
  part: RawAllPart;
  label: 'Melds with' | 'Melds into' | 'Melded from';
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads the image URL from an unvalidated API record. The value comes from
 * the network, so each level is checked before use instead of trusting it.
 */
function toImageUrl(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.image_uris)) return null;
  const { normal, large } = value.image_uris;
  if (typeof normal === 'string') return normal;
  if (typeof large === 'string') return large;
  return null;
}

/**
 * A meld trio is two pieces (`meld_part`) and the card they form
 * (`meld_result`); every card in the trio lists all three in `all_parts`.
 * Returns the two cards other than this one, labelled from this card's
 * point of view.
 */
function getMeldRelations(cardId: string, allParts: readonly RawAllPart[]): MeldRelation[] {
  const result = allParts.find((part) => part.component === 'meld_result');
  const pieces = allParts.filter((part) => part.component === 'meld_part');

  if (result?.id === cardId) {
    return pieces.map((part) => ({ part, label: 'Melded from' }));
  }

  const relations: MeldRelation[] = pieces
    .filter((part) => part.id !== cardId)
    .map((part) => ({ part, label: 'Melds with' }));
  if (result) relations.push({ part: result, label: 'Melds into' });
  return relations;
}

/**
 * Covers: meld. The rarest shape — lazy-loaded, and the only one that
 * needs a network call to show its related cards.
 *
 * Each card of a meld trio shows the other two: a piece shows its partner
 * ("Melds with") and the result ("Melds into"); the result shows both
 * pieces ("Melded from"). Names come from `all_parts` right away; both
 * images load in one cached Scryfall collection request. If that fails,
 * only the names are shown. With `onOpenCard`, each related card is a
 * button that opens it.
 */
export default function MeldCard({ card, showDetailsMetadata = false, onOpenCard }: ShapeComponentProps) {
  const face = card.faces[0];
  const relations = useMemo(
    () => getMeldRelations(card.id, card.allParts ?? []),
    [card.id, card.allParts],
  );
  const relatedIds = useMemo(() => relations.map(({ part }) => part.id), [relations]);
  const relatedCardsQuery = useScryfallCardsForIds('meldRelations', relatedIds, true);
  const imageById = useMemo(
    () => new Map((relatedCardsQuery.data ?? []).map((record) => [record.id, toImageUrl(record)])),
    [relatedCardsQuery.data],
  );

  return (
    <div className="scryfall-card scryfall-card--meld">
      <CardFrame
        face={face}
        image={card.rootImage}
        showDetailsMetadata={showDetailsMetadata}
      />
      {relations.length > 0 && (
        <ul className="scryfall-card__meld-relations">
          {relations.map(({ part, label }) => {
            const image = imageById.get(part.id);
            const content = (
              <>
                <span className="scryfall-card__meld-label">
                  {label} <strong>{part.name}</strong>
                </span>
                {/* alt="" because the label above already names the card. */}
                {image && <img className="scryfall-card__meld-image" src={image} alt="" loading="lazy" />}
              </>
            );

            return (
              <li key={part.id} className="scryfall-card__meld-relation">
                {onOpenCard ? (
                  <button
                    type="button"
                    className="scryfall-card__meld-link"
                    onClick={() => onOpenCard(part.id)}
                  >
                    {content}
                  </button>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
