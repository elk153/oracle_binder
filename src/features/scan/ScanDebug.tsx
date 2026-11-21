import { useMemo } from "react";
import type { SteadyCapture, SteadyStatus } from "./useSteadyFrame.ts";
import "./ScanDebug.css";

type ScanDebugProps = {
  status: SteadyStatus;
  difference: number | null;
  capture: SteadyCapture | null;
};

// Development-only panel for the recognition prototype (D-062): shows the
// change value used for steady detection and the last two cut-out zones, to
// tune the thresholds and check the zones on a real phone. ScanCamera renders
// it only when import.meta.env.DEV is true, so it never reaches production.
export default function ScanDebug({ status, difference, capture }: ScanDebugProps) {
  // Canvas → image URL once per capture, not on every render.
  const images = useMemo(
    () =>
      capture && {
        title: capture.title.toDataURL(),
        collector: capture.collector.toDataURL(),
        size: `${capture.collector.width}×${capture.collector.height}`,
        time: new Date(capture.capturedAt).toLocaleTimeString(),
      },
    [capture],
  );

  return (
    <section className="scan-debug" aria-label="Scanner debug (development only)">
      <p className="scan-debug__line">
        {status} · change {difference === null ? "–" : difference.toFixed(1)}
      </p>
      {images && (
        <>
          <p className="scan-debug__line">Captured {images.time}</p>
          <img className="scan-debug__image" src={images.title} alt="Title zone" />
          <img className="scan-debug__image" src={images.collector} alt="Collector zone" />
          <p className="scan-debug__line">Collector strip {images.size} px</p>
        </>
      )}
    </section>
  );
}
