import { useEffect, useRef, useState } from "react";
import { createTextReader } from "./ocr.ts";
import type { TextReader } from "./ocr.ts";
import { prepareStrip } from "./prepareStrip.ts";
import { COLLECTOR_CHARACTERS, parseCollectorLine } from "./parseCollectorLine.ts";
import type { CollectorLine } from "./parseCollectorLine.ts";
import type { SteadyCapture } from "./useSteadyFrame.ts";

// Stage 2 of the recognition pipeline (D-062): read the collector strip of
// each steady capture with OCR and parse it into a set code and number.

export type CollectorReading =
  | { status: "idle" } // nothing captured yet
  | { status: "reading" } // OCR running for the latest capture
  | {
      status: "done";
      strip: HTMLCanvasElement; // the cleaned-up strip the OCR read
      text: string; // raw OCR text
      confidence: number;
      readMs: number; // OCR time for this strip
      totalMs: number; // including waiting for the engine to load
      parsed: CollectorLine | null; // null when no set and number were found
    }
  | { status: "error"; message: string };

// A finished reading, remembered together with the capture it belongs to.
type Result = { capturedAt: number; reading: CollectorReading };

// `enabled`: start the OCR engine (once) while the camera is live, so the
// download starts before the first card is held up. It is stopped when
// `enabled` turns false or the component unmounts.
export default function useCollectorReading(
  capture: SteadyCapture | null,
  enabled: boolean,
): CollectorReading {
  const readerRef = useRef<Promise<TextReader> | null>(null);
  const [result, setResult] = useState<Result | null>(null);

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

    (async () => {
      let reading: CollectorReading;
      try {
        const strip = prepareStrip(capture.collector);
        const ocr = await (await reader).readText(strip, {
          characters: COLLECTOR_CHARACTERS,
          layout: "block",
        });
        reading = {
          status: "done",
          strip,
          text: ocr.text,
          confidence: ocr.confidence,
          readMs: ocr.durationMs,
          totalMs: performance.now() - started,
          parsed: parseCollectorLine(ocr.text),
        };
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
