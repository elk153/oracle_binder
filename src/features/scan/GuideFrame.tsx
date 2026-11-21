import { useId } from "react";
import {
  CARD_RECT,
  COLLECTOR_ZONE,
  TITLE_ZONE,
  VIEW_RATIO,
} from "./guideFrame.ts";
import type { GuideStatus, Rect } from "./guideFrame.ts";
import "./GuideFrame.css";

// SVG drawing units: a 3:4 box, the same shape as the camera view, so one
// unit is the same size horizontally and vertically.
const VIEW_HEIGHT = 400;
const VIEW_WIDTH = VIEW_HEIGHT * VIEW_RATIO;

// The card in drawing units.
const card = {
  x: CARD_RECT.x * VIEW_WIDTH,
  y: CARD_RECT.y * VIEW_HEIGHT,
  width: CARD_RECT.width * VIEW_WIDTH,
  height: CARD_RECT.height * VIEW_HEIGHT,
};

// A card corner is about 3 mm of its 63 mm width.
const CARD_CORNER = card.width * (3 / 63);

// Converts a zone (fractions of the card) to drawing units.
function toViewRect(zone: Rect): Rect {
  return {
    x: card.x + zone.x * card.width,
    y: card.y + zone.y * card.height,
    width: zone.width * card.width,
    height: zone.height * card.height,
  };
}

const collector = toViewRect(COLLECTOR_ZONE);
const title = toViewRect(TITLE_ZONE);

type OutlineProps = Rect & {
  corner: number;
};

// Every line is drawn twice: a wide dark edge, then a narrow light line on
// top, so it stays visible on both light and dark cards.
function Outline({ corner, ...rect }: OutlineProps) {
  return (
    <>
      <rect className="guide-frame__edge" rx={corner} {...rect} />
      <rect className="guide-frame__line" rx={corner} {...rect} />
    </>
  );
}

type GuideFrameProps = {
  status: GuideStatus;
};

// The card-shaped guide drawn over the camera view (D-061): the outside is
// dimmed, and the collector and title zones show where the app reads.
// Decorative only: ScanCamera gives the same guidance as text.
export default function GuideFrame({ status }: GuideFrameProps) {
  // A unique id, because an SVG mask is referenced by id within the page.
  const maskId = useId();
  const zoneClass = (isActive: boolean) =>
    `guide-frame__zone${isActive ? " guide-frame__zone--active" : ""}`;

  return (
    <svg
      className={`guide-frame${status === "found" ? " guide-frame--found" : ""}`}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* White shows the dim layer, black cuts the card-shaped hole. */}
        <mask id={maskId}>
          <rect className="guide-frame__mask-show" width={VIEW_WIDTH} height={VIEW_HEIGHT} />
          <rect className="guide-frame__mask-hide" rx={CARD_CORNER} {...card} />
        </mask>
      </defs>
      <rect
        className="guide-frame__dim"
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT}
        mask={`url(#${maskId})`}
      />
      <g className="guide-frame__card">
        <Outline corner={CARD_CORNER} {...card} />
      </g>
      <g className={zoneClass(status === "reading-title")}>
        <Outline corner={2} {...title} />
      </g>
      <g className={zoneClass(status === "reading-collector")}>
        <Outline corner={2} {...collector} />
      </g>
    </svg>
  );
}
