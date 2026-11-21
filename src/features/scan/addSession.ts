import type { BinderCopyUpdate } from "../binder/useBinderCopies.ts";

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
