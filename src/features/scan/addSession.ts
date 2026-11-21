import type { BinderCopyUpdate } from "../binder/useBinderCopies.ts";
import { FINISHES } from "../binder/copyOptions.ts";
import type { FoilMark } from "./parseCollectorLine.ts";

// The choices made once at the start of an Add session (D-064), applied to
// every card scanned in that session.

// Where the cards go. Names are kept for the summary line.
export type AddTarget =
  | { kind: "loose" }
  | { kind: "binder"; id: string; name: string }
  | { kind: "deck"; id: string; name: string };

// Owned copies, or proxy deck entries. The data model has no binder
// proxies, so "proxy" is only possible with a deck target.
export type AddType = "owned" | "proxy";

// Copy details applied to every owned copy of the session: the fields of the
// binder copy form except finish (chosen per card) and status (always owned).
export type AddCopyDefaults = Pick<
  BinderCopyUpdate,
  | "acquisition_type"
  | "acquisition_format"
  | "condition"
  | "language"
  | "purchase_price"
  | "acquired_at"
  | "location"
  | "notes"
>;

export type AddSession = {
  target: AddTarget;
  type: AddType;
  defaults: AddCopyDefaults;
};

export function describeTarget(target: AddTarget): string {
  return target.kind === "loose" ? "Loose" : target.name;
}

export function describeType(type: AddType): string {
  return type === "owned" ? "Owned" : "Proxy";
}

// The finish names of the copy form, and Scryfall's names for them.
export type Finish = (typeof FINISHES)[number];
const SCRYFALL_FINISHES: Record<string, Finish> = {
  nonfoil: "Non-foil",
  foil: "Foil",
  etched: "Etched foil",
};

// The finish the confirm step starts at (D-066), from the foil mark read on
// the card and the finishes the printing exists in (Scryfall `finishes`):
// - a dot: Non-foil;
// - a star: Foil, or Etched foil when the printing has etched but not foil
//   (no separate sign for etched foils is known);
// - no mark, or a finish the printing doesn't have: the printing's first
//   finish. Without a finishes list, all three count as possible.
export function guessFinish(foilMark: FoilMark | null, finishes: unknown): Finish {
  const available = Array.isArray(finishes)
    ? FINISHES.filter((finish) =>
        finishes.some((name) => typeof name === "string" && SCRYFALL_FINISHES[name] === finish),
      )
    : [];
  const possible: readonly Finish[] = available.length > 0 ? available : FINISHES;
  const wanted: Finish[] =
    foilMark === "dot" ? ["Non-foil"] : foilMark === "star" ? ["Foil", "Etched foil"] : [];
  return wanted.find((finish) => possible.includes(finish)) ?? possible[0];
}
