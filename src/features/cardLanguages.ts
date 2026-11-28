/*
 * D-074: every language Scryfall has card printings in, in one place.
 *
 * - `code` is Scryfall's language code: the card's `lang` field and the
 *   value of the `lang:` search keyword (e.g. "fr").
 * - `name` is the text the app shows and stores in `binder_cards.language`.
 *   The six names the app had before D-074 keep their exact spelling, so
 *   copies saved earlier still match.
 * - `printed` lists the codes printed on a card's collector line (read by
 *   the scanner, D-066): Scryfall's printed code first, then the code newer
 *   cards use where it differs (e.g. Japanese "JP" and "JA"). Empty for the
 *   few languages Scryfall gives no printed code.
 *
 * Source: https://scryfall.com/docs/api/languages, checked on 2026-11-28
 * (20 languages). Recheck there if Scryfall adds one.
 */
export const CARD_LANGUAGES = [
  { code: "en", name: "English", printed: ["EN"] },
  { code: "es", name: "Spanish", printed: ["SP", "ES"] },
  { code: "fr", name: "French", printed: ["FR"] },
  { code: "de", name: "German", printed: ["DE"] },
  { code: "it", name: "Italian", printed: ["IT"] },
  { code: "pt", name: "Portuguese", printed: ["PT"] },
  { code: "ja", name: "Japanese", printed: ["JP", "JA"] },
  { code: "ko", name: "Korean", printed: ["KR", "KO"] },
  { code: "ru", name: "Russian", printed: ["RU"] },
  { code: "zhs", name: "Simplified Chinese", printed: ["CS", "ZHS"] },
  { code: "zht", name: "Traditional Chinese", printed: ["CT", "ZHT"] },
  { code: "he", name: "Hebrew", printed: [] },
  { code: "la", name: "Latin", printed: [] },
  { code: "grc", name: "Ancient Greek", printed: ["AG"] },
  { code: "ar", name: "Arabic", printed: [] },
  { code: "sa", name: "Sanskrit", printed: [] },
  { code: "ph", name: "Phyrexian", printed: ["PH"] },
  { code: "qya", name: "Quenya", printed: [] },
  { code: "dw", name: "Dwarvish", printed: ["DW"] },
  { code: "tlh", name: "Klingon", printed: ["KL"] },
] as const;

export type CardLanguage = (typeof CARD_LANGUAGES)[number];
export type CardLanguageCode = CardLanguage["code"];
export type CardLanguageName = CardLanguage["name"];

export const CARD_LANGUAGE_CODES: readonly CardLanguageCode[] = CARD_LANGUAGES.map(
  (language) => language.code,
);

/**
 * The language names for pickers: French and English first (the order the
 * app has always used), then the rest alphabetically.
 */
export const CARD_LANGUAGE_NAMES: readonly CardLanguageName[] = [
  "French",
  "English",
  ...CARD_LANGUAGES.map((language) => language.name)
    .filter((name) => name !== "French" && name !== "English")
    .sort((a, b) => a.localeCompare(b, "en")),
];

/** The app's name for a Scryfall code ("fr" → "French"), or null. */
export function languageNameOfCode(code: string | null | undefined): CardLanguageName | null {
  return CARD_LANGUAGES.find((language) => language.code === code)?.name ?? null;
}

/** The app's name for a printed code ("FR" → "French"), or null. */
export function languageNameOfPrinted(printed: string | null | undefined): CardLanguageName | null {
  if (!printed) return null;
  const wanted = printed.toUpperCase();
  return (
    CARD_LANGUAGES.find((language) =>
      (language.printed as readonly string[]).includes(wanted),
    )?.name ?? null
  );
}
