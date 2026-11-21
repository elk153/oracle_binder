import { useMemo, useState } from "react";
import { describeCamera } from "./cameraInfo.ts";

// The camera's flashlight (torch) for scanning in poor light (D-065 step 3).
// Not every browser or camera offers it (D-062: feature-detect, never
// assume), so `supported` is checked before the scanner shows its button.

// `torch` is a camera constraint that browsers support but TypeScript's DOM
// types don't list yet; this adds it to the constraint type.
declare global {
  interface MediaTrackConstraintSet {
    torch?: ConstrainBoolean;
  }
}

export default function useTorch(stream: MediaStream | null) {
  // Remembered per stream: a new stream (another camera, or a restart)
  // starts with the light off.
  const [state, setState] = useState<{ stream: MediaStream; on: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const reported = useMemo(() => stream !== null && describeCamera(stream)?.torch === true, [stream]);
  const supported = !failed && reported;
  const on = supported && state?.stream === stream && state.on;

  async function toggle() {
    const track = stream?.getVideoTracks()[0];
    if (!stream || !track) {
      return;
    }
    const next = !on;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setState({ stream, on: next });
    } catch {
      // The camera reported a torch but refused to switch it: hide the button.
      setFailed(true);
    }
  }

  return { supported, on, toggle };
}
