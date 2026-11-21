// Choices and helpers shared by the forms that describe a binder copy: the
// copy form (BinderCopyForm) and the scanner's Add session setup (D-064).
// Kept in one place so both forms always offer the same values.

export const ACQUISITION_TYPES = [
  "Purchase",
  "Trade",
  "Gift",
  "Prize / Reward",
  "Found",
  "Other",
] as const;

export const ACQUISITION_FORMATS = [
  "Single",
  "Booster pack",
  "Booster box",
  "Preconstructed deck",
  "Collection / lot",
  "Other",
] as const;

export const CONDITIONS = [
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
] as const;

export const FINISHES = ["Non-foil", "Foil", "Etched foil"] as const;

export const LANGUAGES = [
  "French",
  "English",
  "German",
  "Italian",
  "Japanese",
  "Spanish",
] as const;

// An empty or blank text field is stored as null, not as "".
export function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
