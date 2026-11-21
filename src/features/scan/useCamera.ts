import { useEffect, useState } from "react";

// Why the camera can't be shown. Each reason gets its own message.
export type CameraErrorReason =
  | "insecure" // not HTTPS (or localhost): browsers hide the camera API
  | "unsupported" // the browser has no camera API
  | "denied" // the user or the browser blocked camera access
  | "not-found" // no camera, or none matching the request
  | "in-use" // another app holds the camera, or it failed to start
  | "unknown";

// Discriminated union: `status` tells TypeScript which other fields exist.
export type CameraState =
  | { status: "starting" }
  | { status: "live"; stream: MediaStream }
  | { status: "error"; reason: CameraErrorReason };

// Rear camera, at a high resolution so the small collector text stays
// readable for the OCR later (D-062). "ideal" means "if possible": the
// browser picks the closest camera and size instead of failing.
const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
};

// Errors that are known before asking for the camera.
function getInitialState(): CameraState {
  if (!window.isSecureContext) {
    return { status: "error", reason: "insecure" };
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return { status: "error", reason: "unsupported" };
  }
  return { status: "starting" };
}

// getUserMedia rejects with a DOMException whose name says what went wrong.
function toErrorReason(error: unknown): CameraErrorReason {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "OverconstrainedError":
      return "not-found";
    case "NotReadableError":
    case "AbortError":
      return "in-use";
    default:
      return "unknown";
  }
}

function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

// Opens the rear camera while the calling component is mounted and stops it
// when the component unmounts. `retry` asks again after an error, for example
// after the user allowed the camera in the browser settings.
export default function useCamera() {
  const [state, setState] = useState<CameraState>(getInitialState);
  // Changing this number re-runs the effect below: that is how retry works.
  const [attempt, setAttempt] = useState(0);

  // Runs on mount and on each retry. It must not depend on `state`: when the
  // state turns "live", a re-run would call the cleanup and stop the camera
  // it just opened.
  useEffect(() => {
    if (getInitialState().status !== "starting") {
      return;
    }

    // Set by the cleanup. The camera can answer after the component is gone
    // (or after StrictMode's extra cleanup in development); that stream must
    // be stopped at once instead of being shown.
    let cancelled = false;
    let stream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia(CONSTRAINTS)
      .then((newStream) => {
        if (cancelled) {
          stopStream(newStream);
          return;
        }
        stream = newStream;
        setState({ status: "live", stream: newStream });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", reason: toErrorReason(error) });
        }
      });

    return () => {
      cancelled = true;
      if (stream) {
        stopStream(stream);
      }
    };
  }, [attempt]);

  function retry() {
    setState(getInitialState());
    setAttempt((count) => count + 1);
  }

  return { state, retry };
}
