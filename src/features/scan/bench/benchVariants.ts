import { toGray } from "../imageMath.ts";
import { prepareStrip, splitStripRows } from "../prepareStrip.ts";
import {
  COLLECTOR_CHARACTERS,
  NUMBER_ROW_CHARACTERS,
  parseCollectorLine,
  SET_ROW_CHARACTERS,
} from "../parseCollectorLine.ts";
import {
  contrastStretch,
  invertIfDarkBackground,
  sauvolaBinarize,
  splitRow,
} from "../stripFilters.ts";
import type { TextReader } from "../ocr.ts";

// The strip clean-up variants compared by the scan benchmark (D-062
// follow-up, phase 1). Each reads one raw collector strip and returns the
// OCR text, which is then parsed like in the app.

export type BenchVariant = {
  id: string;
  description: string;
  // `height`: the strip height the resizing variants scale to (stripHeight).
  read: (
    raw: HTMLCanvasElement,
    reader: TextReader,
    height: number,
  ) => Promise<{ text: string; ms: number }>;
};

// The strip height that makes the info text (about 1 mm tall) about 30 px,
// the size Tesseract reads best:
// - "card" guide (D-061): the zone is about 5.7 mm tall → 170 px;
// - "code" guide (D-065): a 4:1 box with the 28 mm info line across it is
//   about 7.8 mm tall → 230 px.
export function stripHeight(guide: "card" | "code" | undefined): number {
  return guide === "code" ? 230 : 170;
}
const PADDING = 12;

type GrayImage = { gray: Uint8Array; width: number; height: number };

function scaledGray(raw: HTMLCanvasElement, height: number): GrayImage {
  const width = Math.max(1, Math.round((raw.width * height) / raw.height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("No 2D canvas.");
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(raw, 0, 0, width, height);
  return { gray: toGray(context.getImageData(0, 0, width, height).data), width, height };
}

// Gray pixels back to a canvas, with a white margin around the text.
function toCanvas({ gray, width, height }: GrayImage): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width + PADDING * 2;
  canvas.height = height + PADDING * 2;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No 2D canvas.");
  }
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const image = context.createImageData(width, height);
  for (let i = 0; i < gray.length; i += 1) {
    image.data[i * 4] = gray[i];
    image.data[i * 4 + 1] = gray[i];
    image.data[i * 4 + 2] = gray[i];
    image.data[i * 4 + 3] = 255;
  }
  context.putImageData(image, PADDING, PADDING);
  return canvas;
}

function rows({ gray, width }: GrayImage, from: number, to: number): GrayImage {
  return { gray: gray.slice(from * width, to * width), width, height: to - from };
}

function stretched(raw: HTMLCanvasElement, height: number): GrayImage {
  const image = scaledGray(raw, height);
  return { ...image, gray: contrastStretch(invertIfDarkBackground(image.gray)) };
}

function sauvola(image: GrayImage): GrayImage {
  // A window about twice the text height, so it spans text and background.
  const window = Math.round(image.height * 0.35) | 1;
  return { ...image, gray: sauvolaBinarize(image.gray, image.width, image.height, window) };
}

async function readBlock(reader: TextReader, canvas: HTMLCanvasElement) {
  const result = await reader.readText(canvas, { characters: COLLECTOR_CHARACTERS, layout: "block" });
  return { text: result.text, ms: result.durationMs };
}

// Splits at the emptiest middle row of `forSplit` (binary) and reads each
// line of `image` on its own, with the characters that line can contain.
async function readLines(reader: TextReader, image: GrayImage, forSplit: GrayImage) {
  const cut = splitRow(forSplit.gray, forSplit.width, forSplit.height);
  const top = await reader.readText(toCanvas(rows(image, 0, cut)), {
    characters: NUMBER_ROW_CHARACTERS,
    layout: "line",
  });
  const bottom = await reader.readText(toCanvas(rows(image, cut, image.height)), {
    characters: SET_ROW_CHARACTERS,
    layout: "line",
  });
  return { text: `${top.text.trim()}\n${bottom.text.trim()}`, ms: top.durationMs + bottom.durationMs };
}

export const BENCH_VARIANTS: BenchVariant[] = [
  {
    id: "otsu-block",
    description: "The app before rows: enlarge to ≥120 px, Otsu black and white, block",
    read: (raw, reader) => readBlock(reader, prepareStrip(raw)),
  },
  {
    id: "otsu-rows",
    description:
      "What the app does: otsu-block's strip cut into two rows, number row without S, block if that gives nothing",
    read: async (raw, reader) => {
      const strip = prepareStrip(raw);
      const [numberRow, setRow] = splitStripRows(strip);
      const top = await reader.readText(numberRow, { characters: NUMBER_ROW_CHARACTERS, layout: "line" });
      const bottom = await reader.readText(setRow, { characters: SET_ROW_CHARACTERS, layout: "line" });
      const text = `${top.text.trim()}\n${bottom.text.trim()}`;
      const ms = top.durationMs + bottom.durationMs;
      if (parseCollectorLine(text)) {
        return { text, ms };
      }
      const block = await readBlock(reader, strip);
      return { text: block.text, ms: ms + block.ms };
    },
  },
  {
    id: "gray",
    description: "Resize (text ≈30 px), gray, light text inverted, no black and white, block",
    read: (raw, reader, height) => {
      const image = scaledGray(raw, height);
      return readBlock(reader, toCanvas({ ...image, gray: invertIfDarkBackground(image.gray) }));
    },
  },
  {
    id: "stretch",
    description: "gray + contrast stretch (2nd–98th percentile), block",
    read: (raw, reader, height) => readBlock(reader, toCanvas(stretched(raw, height))),
  },
  {
    id: "sauvola",
    description: "stretch + Sauvola local threshold, block",
    read: (raw, reader, height) => readBlock(reader, toCanvas(sauvola(stretched(raw, height)))),
  },
  {
    id: "sauvola-lines",
    description: "sauvola, split into two lines, each read as one line with its own characters (number row without S)",
    read: (raw, reader, height) => {
      const binary = sauvola(stretched(raw, height));
      return readLines(reader, binary, binary);
    },
  },
  {
    id: "stretch-lines",
    description: "stretch, split into two lines (cut found on the Sauvola image), no black and white",
    read: (raw, reader, height) => {
      const image = stretched(raw, height);
      return readLines(reader, image, sauvola(image));
    },
  },
];
