import { useEffect, useRef } from "react";
import useCamera from "./useCamera.ts";
import type { CameraErrorReason } from "./useCamera.ts";
import GuideFrame from "./GuideFrame.tsx";
import { GUIDE_INSTRUCTIONS } from "./guideFrame.ts";
import type { GuideStatus } from "./guideFrame.ts";
import "./ScanCamera.css";

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

type ScanCameraProps = {
  // What the scanner is doing; recognition (D-062) will change it.
  guideStatus?: GuideStatus;
};

// The live rear-camera view of the scanner (D-061), with the guide frame over
// it and the same guidance as text under it.
export default function ScanCamera({ guideStatus = "aiming" }: ScanCameraProps) {
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
        {state.status === "live" ? GUIDE_INSTRUCTIONS[guideStatus] : ""}
      </p>
    </div>
  );
}
