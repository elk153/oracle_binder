import { lazy, Suspense, useEffect, useEffectEvent, useRef } from "react";
import useCamera from "./useCamera.ts";
import type { CameraErrorReason } from "./useCamera.ts";
import GuideFrame from "./GuideFrame.tsx";
import { GUIDE_INSTRUCTIONS } from "./guideFrame.ts";
import type { GuideStatus } from "./guideFrame.ts";
import useSteadyFrame from "./useSteadyFrame.ts";
import type { SteadyStatus } from "./useSteadyFrame.ts";
import useCollectorReading from "./useCollectorReading.ts";
import type { CollectorReading } from "./useCollectorReading.ts";
import usePrintingLookup from "./usePrintingLookup.ts";
import type { PrintingLookup } from "./usePrintingLookup.ts";
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

// What the guide frame shows, from the recognition stages (D-062):
// still working → the collector zone is being read; a printing found → the
// success state; a failed reading or lookup → back to aiming, so the user
// adjusts the card (any movement triggers a new capture).
function toGuideStatus(
  steady: SteadyStatus,
  reading: CollectorReading,
  lookup: PrintingLookup,
): GuideStatus {
  if (steady !== "steady") {
    return "aiming";
  }
  if (lookup.status === "found") {
    return "found";
  }
  if (reading.status === "reading" || lookup.status === "loading") {
    return "reading-collector";
  }
  return "aiming";
}

type ScanCameraProps = {
  // Called once a printing has been found and shown as found for a moment.
  // The page decides what happens next (D-063 Identify, D-064 Add).
  onFound?: (card: CardBrowserCard) => void;
};

// The live rear-camera view of the scanner (D-061), with the guide frame over
// it and the same guidance as text under it.
export default function ScanCamera({ onFound }: ScanCameraProps) {
  const { state, retry } = useCamera();
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

  // Hooks must run on every render, so this comes before the early return.
  const isLive = state.status === "live";
  const steady = useSteadyFrame(videoRef, isLive);
  const reading = useCollectorReading(steady.capture, isLive);
  const lookup = usePrintingLookup(reading.status === "done" ? reading.parsed : null);
  const guideStatus = toGuideStatus(steady.status, reading, lookup);
  const instruction =
    guideStatus === "found" && lookup.status === "found"
      ? `Card found: ${lookup.card.name}.`
      : GUIDE_INSTRUCTIONS[guideStatus];

  // The found card while the frame shows it as found. The same cached object
  // stays the same across renders, so the effect below only restarts for a
  // different card or when the found state ends.
  const foundCard = guideStatus === "found" && lookup.status === "found" ? lookup.card : null;
  // useEffectEvent: the effect calls the latest onFound without depending on
  // it. ScanCamera re-renders about four times a second, and an inline
  // onFound from the page is a new function each time; as a dependency it
  // would restart the timer before it could ever fire.
  const reportFound = useEffectEvent((card: CardBrowserCard) => onFound?.(card));
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
      <div className="scan-camera__view">
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
        {state.status === "starting" && (
          <p className="scan-camera__status" aria-live="polite">
            Starting the camera…
          </p>
        )}
      </div>
      {/* Read out by screen readers whenever the guidance changes. */}
      <p className="scan-camera__instruction" aria-live="polite">
        {state.status === "live" ? instruction : ""}
      </p>
      {ScanDebug && state.status === "live" && (
        <Suspense fallback={null}>
          <ScanDebug
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
