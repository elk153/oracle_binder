import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createTextReader } from "./ocr.ts";
import type { ReadTextOptions, TextReader } from "./ocr.ts";
import { prepareStrip, splitStripRows } from "./prepareStrip.ts";
import {
  COLLECTOR_CHARACTERS,
  NUMBER_ROW_CHARACTERS,
  parseCollectorLine,
  SET_ROW_CHARACTERS,
} from "./parseCollectorLine.ts";
import type { CollectorLine } from "./parseCollectorLine.ts";
import { matchCardName, NAME_CHARACTERS } from "./matchCardName.ts";
import type { NameIndex } from "./matchCardName.ts";
import type { SteadyCapture } from "./useSteadyFrame.ts";

// Stage 2 of the recognition pipeline (D-062): read the guide-box strip of
// each steady capture with OCR. What the box should hold is the `target`
// (D-065): the info line ("collector", parsed into a set code and number) or,
// for the name fallback, the card name ("title", matched against the name
// catalog).

export type ReadTarget = "collector" | "title";

export type StripReading =
  | { status: "idle" } // nothing captured yet
  | { status: "reading" } // OCR running for the latest capture
  | {
      status: "done";
      target: ReadTarget; // what the box was read as
      // "rows": the two collector rows read one at a time; "block": the
      // whole strip at once (titles, and collector rows that gave nothing).
      method: "rows" | "block";
      strip: HTMLCanvasElement; // the cleaned-up strip the OCR read
      text: string; // raw OCR text
      confidence: number;
      readMs: number; // OCR time for this strip
      totalMs: number; // including waiting for the engine to load
      parsed: CollectorLine | null; // "collector": set and number, if found
      name: string | null; // "title": the catalog name, if found
    }
  | { status: "error"; message: string };

// A finished reading, remembered together with the capture it belongs to.
type Result = { capturedAt: number; reading: StripReading };

const OCR_OPTIONS: Record<ReadTarget, ReadTextOptions> = {
  collector: { characters: COLLECTOR_CHARACTERS, layout: "block" },
  // A block, not one line: the box may also catch a piece of the art or the
  // border. Each line is then tried on its own.
  title: { characters: NAME_CHARACTERS, layout: "block" },
};

// The collector line read row by row, each row with only the characters it
// can contain (no S in the number row, so a 5 can't come out as S). If that
// gives no set and number, for example when the cut between the rows went
// wrong, the whole strip is read as one block as before.
async function readCollector(reader: TextReader, strip: HTMLCanvasElement) {
  const [numberRow, setRow] = splitStripRows(strip);
  const top = await reader.readText(numberRow, { characters: NUMBER_ROW_CHARACTERS, layout: "line" });
  const bottom = await reader.readText(setRow, { characters: SET_ROW_CHARACTERS, layout: "line" });
  const rowsText = `${top.text.trim()}\n${bottom.text.trim()}`;
  const rowsMs = top.durationMs + bottom.durationMs;
  const parsed = parseCollectorLine(rowsText);
  if (parsed) {
    return {
      method: "rows" as const,
      text: rowsText,
      confidence: Math.min(top.confidence, bottom.confidence),
      readMs: rowsMs,
      parsed,
    };
  }
  const block = await reader.readText(strip, OCR_OPTIONS.collector);
  return {
    method: "block" as const,
    text: block.text,
    confidence: block.confidence,
    readMs: rowsMs + block.durationMs,
    parsed: parseCollectorLine(block.text),
  };
}

function nameIn(text: string, index: NameIndex): string | null {
  for (const line of text.split(/\r?\n/)) {
    const name = matchCardName(line, index);
    if (name) {
      return name;
    }
  }
  return null;
}

// `enabled`: start the OCR engine (once) while the camera is live, so the
// download starts before the first card is held up. It is stopped when
// `enabled` turns false or the component unmounts.
// `target` and `nameIndex` are read when a capture arrives: switching the
// target later doesn't re-read a capture that was taken for the other one.
export default function useStripReading(
  capture: SteadyCapture | null,
  enabled: boolean,
  target: ReadTarget,
  nameIndex: NameIndex,
): StripReading {
  const readerRef = useRef<Promise<TextReader> | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const currentSettings = useEffectEvent(() => ({ target, nameIndex }));

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const reader = createTextReader();
    // Marks the rejection as handled here; reads report it themselves.
    reader.catch(() => undefined);
    readerRef.current = reader;
    return () => {
      readerRef.current = null;
      reader.then((loaded) => loaded.terminate()).catch(() => undefined);
    };
  }, [enabled]);

  useEffect(() => {
    const reader = readerRef.current;
    if (!capture || !reader) {
      return;
    }
    // A newer capture (or unmount) makes this reading outdated: its result
    // is then dropped instead of overwriting the newer one.
    let cancelled = false;
    const started = performance.now();
    const settings = currentSettings();

    (async () => {
      let reading: StripReading;
      try {
        const strip = prepareStrip(capture.collector);
        const loaded = await reader;
        if (settings.target === "collector") {
          const result = await readCollector(loaded, strip);
          reading = {
            status: "done",
            target: "collector",
            strip,
            ...result,
            totalMs: performance.now() - started,
            name: null,
          };
        } else {
          const ocr = await loaded.readText(strip, OCR_OPTIONS.title);
          reading = {
            status: "done",
            target: "title",
            method: "block",
            strip,
            text: ocr.text,
            confidence: ocr.confidence,
            readMs: ocr.durationMs,
            totalMs: performance.now() - started,
            parsed: null,
            name: nameIn(ocr.text, settings.nameIndex),
          };
        }
      } catch (error) {
        reading = {
          status: "error",
          message: error instanceof Error ? error.message : "The text could not be read.",
        };
      }
      if (!cancelled) {
        setResult({ capturedAt: capture.capturedAt, reading });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [capture]);

  // Derived instead of stored: a capture without its own result yet is being
  // read. This avoids setting state synchronously inside the effect.
  if (!capture) {
    return { status: "idle" };
  }
  if (result?.capturedAt !== capture.capturedAt) {
    return { status: "reading" };
  }
  return result.reading;
}
