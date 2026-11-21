import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { createTextReader } from "../ocr.ts";
import { parseCollectorLine } from "../parseCollectorLine.ts";
import type { CollectorLine } from "../parseCollectorLine.ts";
import type { ScanSample } from "../scanSample.ts";
import { BENCH_VARIANTS } from "./benchVariants.ts";
import "./ScanBenchPage.css";

// Development-only benchmark for the scanner's OCR (D-062 follow-up, phase
// 1): loads saved scan samples, reads each with every clean-up variant and
// counts correct, wrong and missing readings, per variant and per camera.
// The route exists only when import.meta.env.DEV is true.

type Outcome = "correct" | "wrong" | "none";

type BenchResult = {
  sampleIndex: number;
  variantId: string;
  text: string;
  parsed: CollectorLine | null;
  outcome: Outcome;
  ms: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Checks the fields the benchmark uses; files are trusted otherwise (they
// come from the developer's own debug panel).
function isScanSample(value: unknown): value is ScanSample {
  return (
    isRecord(value) &&
    value.format === "oracle-binder-scan-sample" &&
    isRecord(value.collector) &&
    typeof value.collector.dataUrl === "string"
  );
}

function loadCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d")?.drawImage(image, 0, 0);
      resolve(canvas);
    };
    image.onerror = () => reject(new Error("A sample image could not be decoded."));
    image.src = dataUrl;
  });
}

function sameLine(a: CollectorLine | null, b: CollectorLine | null): boolean {
  return Boolean(a && b && a.setCode === b.setCode && a.collectorNumber === b.collectorNumber);
}

function toOutcome(parsed: CollectorLine | null, truth: CollectorLine | null): Outcome {
  if (!parsed) return "none";
  return sameLine(parsed, truth) ? "correct" : "wrong";
}

function groupOf(sample: ScanSample): string {
  return `${sample.camera?.label ?? "unknown camera"} ${sample.videoWidth}×${sample.videoHeight}`;
}

type SummaryRow = {
  variantId: string;
  group: string;
  total: number;
  correct: number;
  wrong: number;
  none: number;
  averageMs: number;
};

function summarize(samples: ScanSample[], results: BenchResult[]): SummaryRow[] {
  const rows = new Map<string, SummaryRow & { totalMs: number }>();
  for (const result of results) {
    const sample = samples[result.sampleIndex];
    for (const group of ["all", groupOf(sample)]) {
      const key = `${result.variantId}|${group}`;
      const row = rows.get(key) ?? {
        variantId: result.variantId,
        group,
        total: 0,
        correct: 0,
        wrong: 0,
        none: 0,
        averageMs: 0,
        totalMs: 0,
      };
      row.total += 1;
      row[result.outcome] += 1;
      row.totalMs += result.ms;
      row.averageMs = row.totalMs / row.total;
      rows.set(key, row);
    }
  }
  return [...rows.values()];
}

function percent(part: number, total: number): string {
  return total ? `${Math.round((100 * part) / total)}%` : "–";
}

function summaryText(rows: SummaryRow[], sampleCount: number): string {
  const lines = [`Scan benchmark, ${sampleCount} samples`, "variant | group | correct | wrong | none | avg ms"];
  for (const row of rows) {
    lines.push(
      `${row.variantId} | ${row.group} | ${row.correct}/${row.total} (${percent(row.correct, row.total)}) | ${row.wrong} | ${row.none} | ${Math.round(row.averageMs)}`,
    );
  }
  return lines.join("\n");
}

export default function ScanBenchPage() {
  const [samples, setSamples] = useState<ScanSample[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [results, setResults] = useState<BenchResult[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.currentTarget.files ?? [])];
    const loaded: ScanSample[] = [];
    let invalid = 0;
    for (const file of files) {
      try {
        const value: unknown = JSON.parse(await file.text());
        if (isScanSample(value) && value.truth) {
          loaded.push(value);
        } else {
          invalid += 1;
        }
      } catch {
        invalid += 1;
      }
    }
    setSamples(loaded);
    setSkipped(invalid);
    setResults([]);
  }

  async function run() {
    setError(null);
    setResults([]);
    const collected: BenchResult[] = [];
    const total = samples.length * BENCH_VARIANTS.length;
    let reader;
    try {
      setProgress("Loading the OCR engine…");
      reader = await createTextReader();
      for (const [sampleIndex, sample] of samples.entries()) {
        const raw = await loadCanvas(sample.collector.dataUrl);
        for (const variant of BENCH_VARIANTS) {
          setProgress(`Reading ${collected.length + 1} of ${total}…`);
          const { text, ms } = await variant.read(raw, reader);
          const parsed = parseCollectorLine(text);
          collected.push({
            sampleIndex,
            variantId: variant.id,
            text,
            parsed,
            outcome: toOutcome(parsed, sample.truth),
            ms,
          });
        }
        // Show results as they come in.
        setResults([...collected]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The benchmark failed.");
    } finally {
      await reader?.terminate();
      setProgress(null);
    }
  }

  const summary = useMemo(() => summarize(samples, results), [samples, results]);
  const summaryAsText = useMemo(() => summaryText(summary, samples.length), [summary, samples.length]);

  return (
    <section className="page scan-bench">
      <div className="page__heading scan-bench__heading">
        <h1 className="page__title">Scan benchmark (development)</h1>
      </div>

      <div className="scan-bench__controls">
        <label className="field">
          Sample files (.json from the scanner's debug panel)
          <input
            className="field__input"
            type="file"
            accept="application/json,.json"
            multiple
            onChange={(event) => void loadFiles(event)}
          />
        </label>
        <p className="scan-bench__line">
          {samples.length} samples loaded
          {skipped > 0 ? ` · ${skipped} files skipped (not a sample, or no truth)` : ""}
        </p>
        <button
          type="button"
          className="page__action"
          disabled={samples.length === 0 || progress !== null}
          onClick={() => void run()}
        >
          Run {BENCH_VARIANTS.length} variants
        </button>
        {progress && <p className="scan-bench__line" role="status">{progress}</p>}
        {error && <p className="page__message page__message--error" role="alert">{error}</p>}
      </div>

      <h2 className="scan-bench__subtitle">Variants</h2>
      <ul className="scan-bench__variants">
        {BENCH_VARIANTS.map((variant) => (
          <li key={variant.id}>
            <strong>{variant.id}</strong>: {variant.description}
          </li>
        ))}
      </ul>

      {summary.length > 0 && (
        <>
          <h2 className="scan-bench__subtitle">Summary</h2>
          <pre className="scan-bench__summary">{summaryAsText}</pre>
          <button
            type="button"
            className="page__control page__button"
            onClick={() => void navigator.clipboard?.writeText(summaryAsText)}
          >
            Copy summary
          </button>

          <h2 className="scan-bench__subtitle">Per sample</h2>
          <div className="scan-bench__table-wrap">
            <table className="scan-bench__table">
              <thead>
                <tr>
                  <th className="scan-bench__cell">Truth</th>
                  <th className="scan-bench__cell">Note</th>
                  <th className="scan-bench__cell">App</th>
                  {BENCH_VARIANTS.map((variant) => (
                    <th key={variant.id} className="scan-bench__cell">
                      {variant.id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {samples.map((sample, sampleIndex) => (
                  <tr key={sample.savedAt}>
                    <td className="scan-bench__cell">
                      {sample.truth?.setCode} {sample.truth?.collectorNumber}
                    </td>
                    <td className="scan-bench__cell">{sample.note}</td>
                    <td className="scan-bench__cell">
                      {OUTCOME_MARK[toOutcome(sample.ocr?.parsed ?? null, sample.truth)]}
                    </td>
                    {BENCH_VARIANTS.map((variant) => {
                      const result = results.find(
                        (item) => item.sampleIndex === sampleIndex && item.variantId === variant.id,
                      );
                      return (
                        <td
                          key={variant.id}
                          className={`scan-bench__cell scan-bench__cell--${result?.outcome ?? "pending"}`}
                          title={result?.text}
                        >
                          {result ? OUTCOME_MARK[result.outcome] : "…"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

const OUTCOME_MARK: Record<Outcome, string> = {
  correct: "✓",
  wrong: "✗ wrong",
  none: "–",
};
