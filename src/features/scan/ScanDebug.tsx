import { useMemo } from "react";
import type { SteadyCapture, SteadyStatus } from "./useSteadyFrame.ts";
import type { CollectorReading } from "./useCollectorReading.ts";
import "./ScanDebug.css";

type ScanDebugProps = {
  status: SteadyStatus;
  difference: number | null;
  capture: SteadyCapture | null;
  reading: CollectorReading;
};

// Development-only panel for the recognition prototype (D-062): shows the
// change value used for steady detection, the last two cut-out zones, and the
// OCR result for the collector strip (cleaned-up image, raw text, parsed set
// and number, confidence, timings), to tune the pipeline on a real phone.
// ScanCamera loads it only when import.meta.env.DEV is true, so it never
// reaches production.
export default function ScanDebug({ status, difference, capture, reading }: ScanDebugProps) {
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
  const stripImage = useMemo(
    () => (reading.status === "done" ? reading.strip.toDataURL() : null),
    [reading],
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
      <p className="scan-debug__line">OCR: {reading.status}</p>
      {reading.status === "error" && <p className="scan-debug__line">{reading.message}</p>}
      {reading.status === "done" && (
        <>
          {stripImage && <img className="scan-debug__image" src={stripImage} alt="Strip as read by OCR" />}
          <pre className="scan-debug__text">{reading.text.trim() || "(no text)"}</pre>
          <p className="scan-debug__line">
            {reading.parsed
              ? `Set ${reading.parsed.setCode} · number ${reading.parsed.collectorNumber}`
              : "No set and number found"}
          </p>
          <p className="scan-debug__line">
            Confidence {Math.round(reading.confidence)} · read {Math.round(reading.readMs)} ms ·
            total {Math.round(reading.totalMs)} ms
          </p>
        </>
      )}
    </section>
  );
}
