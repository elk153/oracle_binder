import { useId } from "react";
import { GUIDE_RECT, VIEW_RATIO } from "./guideFrame.ts";
import type { GuideStatus } from "./guideFrame.ts";
import "./GuideFrame.css";

// SVG drawing units: a box the same shape as the camera view, so one unit is
// the same size horizontally and vertically.
const VIEW_WIDTH = 400;
const VIEW_HEIGHT = VIEW_WIDTH / VIEW_RATIO;

// The guide box in drawing units.
const box = {
  x: GUIDE_RECT.x * VIEW_WIDTH,
  y: GUIDE_RECT.y * VIEW_HEIGHT,
  width: GUIDE_RECT.width * VIEW_WIDTH,
  height: GUIDE_RECT.height * VIEW_HEIGHT,
};
const BOX_CORNER = 6;

// A small card sketch in the top-left corner (63:88), with the part that goes
// in the box (the info line, bottom left) filled in, so the user sees what to
// aim at.
const HINT_HEIGHT = Math.min(56, box.y - 16);
const hint = { x: 12, y: 8, width: (HINT_HEIGHT * 63) / 88, height: HINT_HEIGHT };
const hintZone = {
  x: hint.x + hint.width * 0.06,
  y: hint.y + hint.height * 0.9,
  width: hint.width * 0.45,
  height: hint.height * 0.06,
};

type GuideFrameProps = {
  status: GuideStatus;
};

// The guide drawn over the camera view (D-065): the outside is dimmed and the
// box shows where the app reads. Decorative only: ScanCamera gives the same
// guidance as text. Every line is drawn twice, a wide dark edge under a
// narrow light line, so it stays visible on both light and dark cards.
export default function GuideFrame({ status }: GuideFrameProps) {
  // A unique id, because an SVG mask is referenced by id within the page.
  const maskId = useId();
  const isReading = status === "reading-collector" || status === "reading-title";
  const boxClass = `guide-frame__box${isReading ? " guide-frame__box--active" : ""}`;

  return (
    <svg
      className={`guide-frame${status === "found" ? " guide-frame--found" : ""}`}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* White shows the dim layer, black cuts the hole for the box. */}
        <mask id={maskId}>
          <rect className="guide-frame__mask-show" width={VIEW_WIDTH} height={VIEW_HEIGHT} />
          <rect className="guide-frame__mask-hide" rx={BOX_CORNER} {...box} />
        </mask>
      </defs>
      <rect
        className="guide-frame__dim"
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT}
        mask={`url(#${maskId})`}
      />
      <g className={boxClass}>
        <rect className="guide-frame__edge" rx={BOX_CORNER} {...box} />
        <rect className="guide-frame__line" rx={BOX_CORNER} {...box} />
      </g>
      <g className="guide-frame__hint">
        <rect className="guide-frame__hint-card" rx={2} {...hint} />
        <rect className="guide-frame__hint-zone" {...hintZone} />
      </g>
    </svg>
  );
}
