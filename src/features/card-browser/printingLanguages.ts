/*
 * D-074: the language choices of a card's printings list.
 *
 * The details overlay loads every printing in every language once, then
 * shows only the languages the person ticks. These pure functions work out
 * which languages the card has, which start ticked, and which printings
 * pass, so they are unit tested without React.
 */
import { CARD_LANGUAGES } from "../cardLanguages.ts";

export type PrintingLanguage = {
  code: string;
  name: string;
  /** How many printings in this language were loaded. */
  count: number;
};

type WithLang = { lang?: string };

/** Scryfall gives every card a `lang`; a card without one is English. */
export function langOf(card: WithLang): string {
  return card.lang ?? "en";
}

/**
 * The languages the card has printings in, in the app's language order
 * (English first, as in `CARD_LANGUAGES`); a code the app does not know
 * comes last, named by its code.
 */
export function printingLanguages(prints: readonly WithLang[]): PrintingLanguage[] {
  const counts = new Map<string, number>();
  for (const print of prints) {
    const code = langOf(print);
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  const known = CARD_LANGUAGES.filter((language) => counts.has(language.code)).map(
    (language) => ({ code: language.code, name: language.name, count: counts.get(language.code) ?? 0 }),
  );
  const knownCodes = new Set<string>(known.map((language) => language.code));
  const unknown = [...counts]
    .filter(([code]) => !knownCodes.has(code))
    .map(([code, count]) => ({ code, name: code, count }));
  return [...known, ...unknown];
}

/**
 * The languages ticked at first: English, plus the opened printing's own
 * language so that printing is always in the list. When the card has
 * neither (a card printed only in Japanese, say), its first language.
 */
export function defaultPrintingLanguages(
  openedLang: string | undefined,
  available: readonly PrintingLanguage[],
): Set<string> {
  const codes = new Set(available.map((language) => language.code));
  const chosen = new Set(["en", openedLang ?? "en"].filter((code) => codes.has(code)));
  if (chosen.size === 0 && available.length > 0) chosen.add(available[0].code);
  return chosen;
}

/** Adds the language when it is not ticked, removes it when it is. */
export function toggleLanguage(selected: ReadonlySet<string>, code: string): Set<string> {
  const next = new Set(selected);
  if (next.has(code)) next.delete(code);
  else next.add(code);
  return next;
}

/** The printings in the ticked languages, in their original order. */
export function filterByLanguages<T extends WithLang>(
  prints: readonly T[],
  selected: ReadonlySet<string>,
): T[] {
  return prints.filter((print) => selected.has(langOf(print)));
}
