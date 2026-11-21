import OracleText from "./OracleText.tsx";
import type { FaceRotation, NormalizedFace } from "../types.ts";

// Partial: unknown keys return undefined, so the `??` fallbacks below apply.
const COLOR_NAMES: Partial<Record<string, string>> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

const RARITY_NAMES: Partial<Record<string, string>> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  mythic: "Mythic Rare",
  special: "Special",
  bonus: "Bonus",
};

type CardFaceMetadataProps = {
  face: NormalizedFace;
};

export function CardFaceMetadata({ face }: CardFaceMetadataProps) {
  const rarityClass = face.rarity?.replaceAll("_", "-");
  // A known rarity uses its display name; an unknown one is title-cased
  // ("special_edition" -> "Special Edition"); no rarity renders no pill.
  const rarity = face.rarity
    ? (RARITY_NAMES[face.rarity] ??
      face.rarity.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()))
    : null;

  return (
    <>
      <hr className="card-detail__metadata-separator" />
      <div className="card-detail__metadata">
        <div className="card-detail__metadata-line">
          {face.manaCost && (
            <div className="card-detail__mana-cost">
              <OracleText text={face.manaCost} container="span" />
            </div>
          )}
          {(face.power != null || face.toughness != null) && (
            <span
              className="card-detail__stat-pill"
              aria-label={`Power and toughness ${face.power ?? "—"} / ${face.toughness ?? "—"}`}
            >
              {face.power ?? "—"}/{face.toughness ?? "—"}
            </span>
          )}
          {face.loyalty != null && (
            <span className="card-detail__stat-pill" aria-label={`Loyalty ${face.loyalty}`}>
              {face.loyalty}
            </span>
          )}
          {face.defense != null && (
            <span className="card-detail__stat-pill" aria-label={`Defense ${face.defense}`}>
              {face.defense}
            </span>
          )}
        </div>
        <div className="card-detail__color-rarity">
          {face.colors.length > 0
            ? face.colors.map((color) => (
                <span
                  className={`card-detail__color-dot color__${color}`}
                  key={color}
                  role="img"
                  aria-label={COLOR_NAMES[color] ?? color}
                  title={COLOR_NAMES[color] ?? color}
                />
              ))
            : (
                <span
                  className="card-detail__color-dot card-detail__color-dot--colorless"
                  role="img"
                  aria-label="Colorless"
                  title="Colorless"
                />
              )}
          {rarity && (
            <span className={`card-detail__rarity-pill card-detail__rarity-pill--${rarityClass}`}>
              {rarity}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * The visual frame shared by every layout: image, name, mana cost, type
 * line, oracle text, and stats. Every shape component composes this rather
 * than re-implementing it, so the 99%-common case (a face) is written once.
 *
 * `rotation` (degrees: 0/90/180/270) rotates the whole block — image and
 * text together — since that's how split/flip cards are physically
 * printed: the image and its text are one rotated unit, not independent
 * pieces. Defaults to `face.rotation` (set by normalizeCard) but can be
 * overridden explicitly by a caller that manages rotation itself.
 */
type CardFrameProps = {
  face: NormalizedFace;
  image?: string | null;
  rotation?: FaceRotation;
  showDetailsMetadata?: boolean;
};

export default function CardFrame({ face, image, rotation, showDetailsMetadata = false }: CardFrameProps) {
  const resolvedImage = image ?? face.image;
  const resolvedRotation = rotation ?? face.rotation ?? 0;
  console.log(resolvedRotation);

  return (
    <div className="card-frame">
      {resolvedImage && (
        <div className={`card-frame-${resolvedRotation}`} >
          <img
            className={`card rotated-card-${resolvedRotation}`}
            src={resolvedImage}
            alt={face.name}
            loading="lazy"
          />
        </div>
      )}
      <div className="scryfall-card__text card-description">
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
            &nbsp;
            {face.power && (
              <span className="color-pill color__M">
                {face.power}/{face.toughness ?? "—"}
              </span>
            )}
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
    </div>
  );
}
