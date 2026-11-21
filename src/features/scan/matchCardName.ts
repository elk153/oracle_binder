// Name fallback of the scanner (D-062 stage 3, D-065 step 2): finds the card
// name that the OCR text of the guide box most likely shows, allowing a few
// misread letters. Pure: text and the name catalog in, a name out, so it is
// unit tested.
//
// The box usually holds more than the name: a piece of border before it and
// mana symbols after it, which OCR turns into stray letters. So the name is
// searched for anywhere inside the text (approximate substring matching),
// not compared with the whole text.

// The characters the OCR is limited to when reading a card name.
export const NAME_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',-";

// Only letters count: OCR often adds or drops spaces and punctuation, and
// accents ("Lim-Dûl") are not in the OCR character list.
export function nameKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

// Fewest letter changes (insert, delete, replace) that turn `name` into some
// part of `text`. Extra letters before and after that part are free.
// Returns early with Infinity once the result must exceed `limit`.
export function substringDistance(name: string, text: string, limit: number): number {
  // previous[j]: cost of matching the name so far, ending at text[j - 1].
  let previous = new Array<number>(text.length + 1).fill(0);
  for (let i = 1; i <= name.length; i += 1) {
    const current = new Array<number>(text.length + 1);
    current[0] = i;
    let rowBest = i;
    for (let j = 1; j <= text.length; j += 1) {
      const replace = previous[j - 1] + (name[i - 1] === text[j - 1] ? 0 : 1);
      current[j] = Math.min(replace, previous[j] + 1, current[j - 1] + 1);
      rowBest = Math.min(rowBest, current[j]);
    }
    if (rowBest > limit) {
      return Number.POSITIVE_INFINITY;
    }
    previous = current;
  }
  return Math.min(...previous);
}

// One letter in five may be wrong, at least one in any name.
function allowedErrors(length: number): number {
  return Math.max(1, Math.floor(length / 5));
}

// Names shorter than this are too easily found by chance in stray letters.
const MIN_KEY_LENGTH = 3;

export type NameIndex = { name: string; key: string }[];

// Precomputes the letter keys of the catalog once. A double-faced card
// ("Delver of Secrets // Insectile Aberration") shows only its front name,
// so each face is indexed too, pointing at the full name.
export function buildNameIndex(names: readonly string[]): NameIndex {
  const index: NameIndex = [];
  for (const name of names) {
    const faces = name.includes(" // ") ? [name, ...name.split(" // ")] : [name];
    for (const face of faces) {
      const key = nameKey(face);
      if (key.length >= MIN_KEY_LENGTH) {
        index.push({ name, key });
      }
    }
  }
  return index;
}

// Each text letter the name leaves unexplained counts as half an error when
// ranking, so a name that explains more of the text wins: "Lightning Bolt"
// with two misread letters beats "Lightning" with one.
const LEFTOVER_WEIGHT = 0.5;

// The catalog name found in `text`, or null when nothing is close enough.
// The name must cover at least half of the text's letters, so a short name
// hiding in a long misread ("Opt" in anything) does not win.
export function matchCardName(text: string, index: NameIndex): string | null {
  const textKey = nameKey(text);
  if (textKey.length < MIN_KEY_LENGTH) {
    return null;
  }
  let best: { name: string; score: number } | null = null;
  for (const { name, key } of index) {
    if (key.length * 2 < textKey.length) {
      continue;
    }
    const limit = allowedErrors(key.length);
    if (key.length - limit > textKey.length) {
      continue;
    }
    const distance = substringDistance(key, textKey, limit);
    if (distance > limit) {
      continue;
    }
    const score = distance + LEFTOVER_WEIGHT * Math.max(0, textKey.length - key.length);
    if (!best || score < best.score) {
      best = { name, score };
    }
  }
  return best?.name ?? null;
}
