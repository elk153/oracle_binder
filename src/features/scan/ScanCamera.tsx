import { lazy, Suspense, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import useCamera from "./useCamera.ts";
import type { CameraOptions } from "./useCamera.ts";
import type { CameraErrorReason } from "./useCamera.ts";
import GuideFrame from "./GuideFrame.tsx";
import { GUIDE_INSTRUCTIONS } from "./guideFrame.ts";
import type { GuideStatus } from "./guideFrame.ts";
import useSteadyFrame from "./useSteadyFrame.ts";
import type { SteadyStatus } from "./useSteadyFrame.ts";
import useStripReading from "./useStripReading.ts";
import type { ReadTarget, StripReading } from "./useStripReading.ts";
import usePrintingLookup from "./usePrintingLookup.ts";
import useTorch from "./useTorch.ts";
import type { LookupRequest, PrintingLookup } from "./usePrintingLookup.ts";
import { buildNameIndex } from "./matchCardName.ts";
import type { FinishAndLanguage } from "./parseCollectorLine.ts";
import useFetchUrl from "../../hooks/useFetchUrl.ts";
import getSecondsUntilNextLocalFour from "../../hooks/getSecondsUntilNextLocalFour.ts";
import type { CardBrowserCard } from "../card-browser/types.ts";
import "./ScanCamera.css";

// The debug panel is loaded only in development. In a production build
// import.meta.env.DEV is false, so this import (and its CSS) is left out.
const ScanDebug = import.meta.env.DEV ? lazy(() => import("./ScanDebug.tsx")) : null;

const ERROR_MESSAGES: Record<CameraErrorReason, string> = {
  insecure: "The camera only works on a secure (https://) connection.",
  unsupported: "This browser can't use the camera.",
  denied:
    "Camera access is blocked. Allow the camera for this site in your browser settings, then try again.",
  "not-found": "No camera was found on this device.",
  "in-use":
    "The camera couldn't start. Close other apps that use it, then try again.",
  unknown: "The camera couldn't start.",
};

// Trying again can't fix a missing HTTPS connection or camera API.
const CAN_RETRY: Record<CameraErrorReason, boolean> = {
  insecure: false,
  unsupported: false,
  denied: true,
  "not-found": true,
  "in-use": true,
  unknown: true,
};

// How long the success color shows before the found card is reported, so the
// user sees that the scan worked (D-061).
const FOUND_DELAY_MS = 700;

// After this many captures in a row whose set and number couldn't be read
// or found, the scanner asks for the card name instead (D-065 step 2). It
// was 2 before failed readings were retried automatically (step 3), which
// made the name prompt come after about 3 seconds of holding still.
const FAILURES_BEFORE_NAME = 3;

// A failed reading is retried with a fresh capture after this pause, without
// the card having to move (D-065 step 3): the camera may have refocused.
const RETRY_DELAY_MS = 300;

// What the guide shows, from the recognition stages (D-062) and what the box
// should hold (D-065): still working → the box is being read; a printing
// found → the success state; a failed reading or lookup → back to aiming,
// so the user adjusts the card (any movement triggers a new capture).
function toGuideStatus(
  target: ReadTarget,
  steady: SteadyStatus,
  reading: StripReading,
  lookup: PrintingLookup,
): GuideStatus {
  const aiming = target === "title" ? "aiming-title" : "aiming";
  if (steady !== "steady") {
    return aiming;
  }
  if (lookup.status === "found") {
    return "found";
  }
  if (reading.status === "reading" || lookup.status === "loading") {
    return target === "title" ? "reading-title" : "reading-collector";
  }
  return aiming;
}

// What to look up for a finished reading: the set and number, or the name.
function toLookupRequest(reading: StripReading): LookupRequest {
  if (reading.status !== "done") {
    return null;
  }
  if (reading.parsed) {
    return { line: reading.parsed };
  }
  return reading.name ? { name: reading.name } : null;
}

// How a found card was recognized. A card found by name is Scryfall's
// default printing, so the page lets the user pick the one they hold. The
// foil mark and printed language come with a set-and-number reading (D-066).
export type FoundMatch = { byName: boolean } & FinishAndLanguage;

type ScanCameraProps = {
  // Called once a printing has been found and shown as found for a moment.
  // The page decides what happens next (D-063 Identify, D-064 Add).
  onFound?: (card: CardBrowserCard, match: FoundMatch) => void;
  // Drawn over the camera view, e.g. the Add mode's confirm step (D-064).
  // The camera stays mounted underneath, so a found card is not offered
  // again until it has left the frame.
  overlay?: ReactNode;
  // The development-only Test mode: shows the debug panel, keeps each
  // capture until Reset is pressed, and never reports a found card, so the
  // tester can look at the result and save a sample.
  testMode?: boolean;
};

// The live rear-camera view of the scanner (D-061), with the guide frame over
// it and the same guidance as text under it.
export default function ScanCamera({ onFound, overlay, testMode = false }: ScanCameraProps) {
  // Camera choice, set from the debug panel in Test mode; otherwise always
  // the default rear camera at 4K.
  const [cameraOptions, setCameraOptions] = useState<CameraOptions>({});
  const { state, retry } = useCamera(cameraOptions);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = state.status === "live" ? state.stream : null;

  // A MediaStream can't be passed as a JSX attribute; it is set on the DOM
  // element through the ref.
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
    }
  }, [stream]);

  // The name catalog for the name fallback, prefetched by App and cached.
  const namesQuery = useFetchUrl(
    "cardNames",
    "https://api.scryfall.com/catalog/card-names",
    getSecondsUntilNextLocalFour,
  );
  const nameIndex = useMemo(
    () =>
      buildNameIndex(
        (namesQuery.data ?? []).filter((name): name is string => typeof name === "string"),
      ),
    [namesQuery.data],
  );

  // Hooks must run on every render, so this comes before the early return.
  const isLive = state.status === "live";
  const [target, setTarget] = useState<ReadTarget>("collector");
  const steady = useSteadyFrame(videoRef, isLive, { holdCaptures: testMode });
  const reading = useStripReading(steady.capture, isLive, target, nameIndex);
  const lookup = usePrintingLookup(toLookupRequest(reading));
  const guideStatus = toGuideStatus(target, steady.status, reading, lookup);

  // Counts captures in a row whose set and number failed (nothing parsed,
  // or no such printing) and switches to the name after a few. Adjusted
  // while rendering (React's pattern for state that follows other values),
  // keyed by the capture so each one counts once.
  const failedCapture =
    reading.status === "done" &&
    reading.target === "collector" &&
    (!reading.parsed || lookup.status === "not-found")
      ? (steady.capture?.capturedAt ?? null)
      : null;
  // Any failed reading, also of a name: retried with a new capture.
  const failedAnyCapture =
    failedCapture ??
    (reading.status === "done" &&
    reading.target === "title" &&
    (!reading.name || lookup.status === "not-found")
      ? (steady.capture?.capturedAt ?? null)
      : null);
  const [failures, setFailures] = useState({ lastCapture: 0, count: 0 });
  if (failedCapture !== null && failedCapture !== failures.lastCapture) {
    const count = failures.count + 1;
    setFailures({ lastCapture: failedCapture, count });
    if (count >= FAILURES_BEFORE_NAME) {
      setTarget("title");
    }
  }

  // Test mode keeps each capture for a sample until Reset, so no retries.
  const retryCapture = useEffectEvent(() => steady.reset());
  useEffect(() => {
    if (failedAnyCapture === null || testMode) {
      return;
    }
    const timer = window.setTimeout(retryCapture, RETRY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [failedAnyCapture, testMode]);

  const torch = useTorch(stream);

  function readCollector() {
    setTarget("collector");
    setFailures((current) => ({ ...current, count: 0 }));
  }

  const instruction =
    guideStatus === "found" && lookup.status === "found"
      ? `Card found: ${lookup.card.name}.`
      : GUIDE_INSTRUCTIONS[guideStatus];
  // import.meta.env.DEV first, so a production build drops the Test-mode
  // instruction and Reset button entirely.
  const isHolding = import.meta.env.DEV && testMode && steady.capture !== null;

  // The found card while the frame shows it as found. The same cached object
  // stays the same across renders, so the effect below only restarts for a
  // different card or when the found state ends.
  const foundCard = guideStatus === "found" && lookup.status === "found" ? lookup.card : null;
  // useEffectEvent: the effect calls the latest onFound without depending on
  // it. ScanCamera re-renders about four times a second, and an inline
  // onFound from the page is a new function each time; as a dependency it
  // would restart the timer before it could ever fire.
  const reportFound = useEffectEvent((card: CardBrowserCard) => {
    const done = reading.status === "done" ? reading : null;
    onFound?.(card, {
      byName: done?.target === "title",
      foilMark: done?.foilMark ?? null,
      language: done?.language ?? null,
    });
    // The next card starts with its set and number again.
    readCollector();
  });
  useEffect(() => {
    if (!foundCard) {
      return;
    }
    // Moving the card away ends the found state; the cleanup then cancels
    // the report.
    const timer = window.setTimeout(() => reportFound(foundCard), FOUND_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [foundCard]);

  if (state.status === "error") {
    return (
      <div className="scan-camera">
        <div className="scan-camera__view scan-camera__view--message" role="alert">
          <p className="scan-camera__message">{ERROR_MESSAGES[state.reason]}</p>
          {CAN_RETRY[state.reason] && (
            <button type="button" className="page__action" onClick={retry}>
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="scan-camera">
      <div className={`scan-camera__view${overlay ? " scan-camera__view--overlay" : ""}`}>
        {/* playsInline and muted keep iOS Safari from opening the video full
            screen or refusing to autoplay it. */}
        <video
          ref={videoRef}
          className="scan-camera__video"
          autoPlay
          playsInline
          muted
          aria-label="Camera view"
        />
        {state.status === "live" && <GuideFrame status={guideStatus} />}
        {overlay && <div className="scan-camera__overlay">{overlay}</div>}
        {state.status === "starting" && (
          <p className="scan-camera__status" aria-live="polite">
            Starting the camera…
          </p>
        )}
      </div>
      {/* Read out by screen readers whenever the guidance changes. */}
      <p className="scan-camera__instruction" aria-live="polite">
        {state.status !== "live"
          ? ""
          : isHolding
            ? `${instruction} Capture kept: save a sample below if you want, then tap Reset for the next card.`
            : instruction}
      </p>
      {state.status === "live" && (
        <div className="scan-camera__controls">
          {guideStatus !== "found" && (
            <button
              type="button"
              className="page__control page__button"
              onClick={target === "title" ? readCollector : () => setTarget("title")}
            >
              {target === "title" ? "Read the set and number instead" : "Read the name instead"}
            </button>
          )}
          {/* Only where the camera reports a flashlight (D-065 step 3). */}
          {torch.supported && (
            <button
              type="button"
              className="page__control page__button"
              aria-pressed={torch.on}
              onClick={() => void torch.toggle()}
            >
              {torch.on ? "Light off" : "Light on"}
            </button>
          )}
        </div>
      )}
      {isHolding && (
        <button type="button" className="page__action scan-camera__reset" onClick={steady.reset}>
          Reset for a new capture
        </button>
      )}
      {ScanDebug && testMode && state.status === "live" && (
        <Suspense fallback={null}>
          <ScanDebug
            stream={stream}
            cameraOptions={cameraOptions}
            onCameraOptionsChange={setCameraOptions}
            status={steady.status}
            difference={steady.difference}
            capture={steady.capture}
            reading={reading}
            lookup={lookup}
          />
        </Suspense>
      )}
    </div>
  );
}
