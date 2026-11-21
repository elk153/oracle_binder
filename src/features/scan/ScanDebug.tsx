import { useEffect, useMemo, useState } from "react";
import type { SteadyCapture, SteadyStatus } from "./useSteadyFrame.ts";
import type { StripReading } from "./useStripReading.ts";
import type { PrintingLookup } from "./usePrintingLookup.ts";
import type { CameraOptions } from "./useCamera.ts";
import { describeCamera, listCameras } from "./cameraInfo.ts";
import type { CameraInfo } from "./cameraInfo.ts";
import { SHARPNESS_HEIGHT } from "./stripSharpness.ts";
import { downloadSample, parseTruth } from "./scanSample.ts";
import type { ScanSample, StripImage } from "./scanSample.ts";
import "./ScanDebug.css";

type ScanDebugProps = {
  stream: MediaStream | null;
  cameraOptions: CameraOptions;
  onCameraOptionsChange: (options: CameraOptions) => void;
  status: SteadyStatus;
  difference: number | null;
  capture: SteadyCapture | null;
  reading: StripReading;
  lookup: PrintingLookup;
};

// The info line text is roughly 1 mm tall on the card.
const TEXT_HEIGHT_MM = 1;

function toStripImage(canvas: HTMLCanvasElement): StripImage {
  return { width: canvas.width, height: canvas.height, dataUrl: canvas.toDataURL("image/png") };
}

function rangeText(range: { min: number; max: number } | null): string {
  return range ? `${range.min}–${range.max}` : "not reported";
}

// Development-only panel for the recognition prototype (D-062) and the OCR
// reliability study: camera facts and choice, steady detection, the cut-out
// zones with their size and sharpness, the OCR and Scryfall results, and a
// "Save sample" form that downloads the raw strips with what the card really
// says. ScanCamera loads it only when import.meta.env.DEV is true, so it
// never reaches production.
export default function ScanDebug({
  stream,
  cameraOptions,
  onCameraOptionsChange,
  status,
  difference,
  capture,
  reading,
  lookup,
}: ScanDebugProps) {
  const camera = useMemo(() => (stream ? describeCamera(stream) : null), [stream]);
  const [cameras, setCameras] = useState<Array<{ deviceId: string; label: string }>>([]);

  // Camera labels are only known once permission was granted, so the list is
  // read again for each new stream.
  useEffect(() => {
    if (!stream) {
      return;
    }
    let cancelled = false;
    listCameras()
      .then((list) => {
        if (!cancelled) {
          setCameras(list);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [stream]);

  // Canvas → image URL and sharpness once per capture, not on every render.
  const captured = useMemo(
    () =>
      capture && {
        collector: capture.collector.toDataURL(),
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
      <h2 className="scan-debug__heading">Camera</h2>
      <CameraFacts camera={camera} />
      <label className="scan-debug__control">
        Camera
        <select
          className="field__input"
          value={cameraOptions.deviceId ?? ""}
          onChange={(event) =>
            onCameraOptionsChange({
              ...cameraOptions,
              deviceId: event.currentTarget.value || undefined,
            })
          }
        >
          <option value="">Default rear camera</option>
          {cameras.map((item) => (
            <option key={item.deviceId} value={item.deviceId}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="scan-debug__check">
        <input
          type="checkbox"
          checked={cameraOptions.highResolution ?? true}
          onChange={(event) =>
            onCameraOptionsChange({ ...cameraOptions, highResolution: event.currentTarget.checked })
          }
        />
        Ask for 4K (3840×2160)
      </label>

      <h2 className="scan-debug__heading">Capture</h2>
      <p className="scan-debug__line">
        {status} · change {difference === null ? "–" : difference.toFixed(1)}
      </p>
      {capture && captured && (
        <>
          <p className="scan-debug__line">
            Captured {captured.time} · video {capture.videoWidth}×{capture.videoHeight}
          </p>
          <p className="scan-debug__line">
            ≈{capture.pixelsPerMm.toFixed(1)} px/mm if the info line fills the box · info text ≈{" "}
            {Math.round(capture.pixelsPerMm * TEXT_HEIGHT_MM)} px tall (OCR likes 20–30)
          </p>
          <p className="scan-debug__line">
            Box strip {capture.collector.width}×{capture.collector.height} px · sharpness{" "}
            {Math.round(capture.sharpness)} (at {SHARPNESS_HEIGHT} px height, comparable across
            resolutions)
          </p>
          <img className="scan-debug__image" src={captured.collector} alt="Guide box" />
        </>
      )}

      <h2 className="scan-debug__heading">OCR</h2>
      <p className="scan-debug__line">{reading.status}</p>
      {reading.status === "error" && <p className="scan-debug__line">{reading.message}</p>}
      {reading.status === "done" && (
        <>
          {stripImage && <img className="scan-debug__image" src={stripImage} alt="Strip as read by OCR" />}
          <pre className="scan-debug__text">{reading.text.trim() || "(no text)"}</pre>
          <p className="scan-debug__line">
            {reading.target === "title"
              ? reading.name
                ? `Name ${reading.name}`
                : "No card name matched"
              : reading.parsed
                ? `Set ${reading.parsed.setCode} · number ${reading.parsed.collectorNumber} · mark ${reading.foilMark ?? "–"} · language ${reading.language ?? "–"}`
                : "No set and number found"}
          </p>
          <p className="scan-debug__line">
            Read as {reading.method === "rows" ? "two rows" : "one block"} · confidence{" "}
            {Math.round(reading.confidence)} · read {Math.round(reading.readMs)} ms ·
            total {Math.round(reading.totalMs)} ms
          </p>
        </>
      )}

      <h2 className="scan-debug__heading">Scryfall</h2>
      <p className="scan-debug__line">{lookup.status}</p>
      {lookup.status === "found" && (
        <p className="scan-debug__line">
          {lookup.card.name} · {lookup.card.set_name ?? lookup.card.set} #{lookup.card.collector_number}
        </p>
      )}
      {lookup.status === "error" && <p className="scan-debug__line">{lookup.message}</p>}

      {reading.status === "done" && reading.target === "title" && (
        <p className="scan-debug__line">
          Samples are for the set and number only: switch back to save one.
        </p>
      )}
      {capture && captured && !(reading.status === "done" && reading.target === "title") && (
        <SampleSaver
          // A new capture starts with an empty form.
          key={capture.capturedAt}
          capture={capture}
          sharpness={capture.sharpness}
          camera={camera}
          reading={reading}
        />
      )}
    </section>
  );
}

function CameraFacts({ camera }: { camera: CameraInfo | null }) {
  if (!camera) {
    return <p className="scan-debug__line">No camera stream.</p>;
  }
  return (
    <>
      <p className="scan-debug__line">
        {camera.label || "Unnamed camera"} · {camera.width}×{camera.height}
        {camera.frameRate ? ` · ${Math.round(camera.frameRate)} fps` : ""}
      </p>
      <p className="scan-debug__line">
        Zoom {rangeText(camera.zoom)} · torch{" "}
        {camera.torch === null ? "not reported" : camera.torch ? "yes" : "no"}
      </p>
      <p className="scan-debug__line">
        Focus modes {camera.focusModes?.join(", ") ?? "not reported"} · focus distance{" "}
        {rangeText(camera.focusDistance)}
      </p>
    </>
  );
}

type SampleSaverProps = {
  capture: SteadyCapture;
  sharpness: number;
  camera: CameraInfo | null;
  reading: StripReading;
};

// Saves the current capture as a sample file for the benchmark.
function SampleSaver({ capture, sharpness, camera, reading }: SampleSaverProps) {
  const [truthText, setTruthText] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const done = reading.status === "done" ? reading : null;
  const parsed = done?.parsed ?? null;
  // Set and number, then the foil mark and language when read (D-066).
  const parsedText = parsed
    ? [parsed.setCode, parsed.collectorNumber, done?.foilMark, done?.language?.toLowerCase()]
        .filter(Boolean)
        .join(" ")
    : "";
  // An empty field means "the reading above is right".
  const truth = parseTruth(truthText || parsedText);

  function save() {
    const sample: ScanSample = {
      format: "oracle-binder-scan-sample",
      version: 1,
      savedAt: new Date().toISOString(),
      truth,
      note: note.trim(),
      camera,
      videoWidth: capture.videoWidth,
      videoHeight: capture.videoHeight,
      pixelsPerMm: capture.pixelsPerMm,
      sharpness,
      collector: toStripImage(capture.collector),
      guide: "code",
      ocr:
        reading.status === "done"
          ? {
              text: reading.text,
              confidence: reading.confidence,
              readMs: reading.readMs,
              parsed: reading.parsed,
            }
          : null,
    };
    downloadSample(sample);
    setSaved(true);
  }

  return (
    <div className="scan-debug__saver">
      <h2 className="scan-debug__heading">Save sample</h2>
      <label className="scan-debug__control">
        What the card says (set and number, optionally star or dot and language)
        <input
          className="field__input"
          value={truthText}
          placeholder={parsedText || "e.g. ltc 277 dot en"}
          onChange={(event) => setTruthText(event.currentTarget.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </label>
      <label className="scan-debug__control">
        Note (light, foil, …)
        <input
          className="field__input"
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
        />
      </label>
      <button type="button" className="page__control page__button" onClick={save} disabled={!truth}>
        {saved ? "Saved — save again" : "Save sample"}
      </button>
      {!truth && <p className="scan-debug__line">Type the set and number to save.</p>}
    </div>
  );
}
