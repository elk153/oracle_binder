// Turns the OCR text of a card's collector info line into a set code and a
// collector number (D-062). Pure: text in, result out, so it is unit tested.
//
// The line has two rows on cards since Magic 2015, for example:
//   0123/280 R        (collector number / set size, rarity)
//   DMU • EN          (set code, language)
// Newer cards drop the set size ("0123 R") and some put the rarity first
// ("R 0123"). OCR adds noise, so the parser looks for tokens, not positions.

export type CollectorLine = {
  setCode: string; // lowercase, as Scryfall uses it, e.g. "dmu"
  collectorNumber: string; // without leading zeros, e.g. "123"
};

// The characters the OCR is limited to when reading the collector line.
export const COLLECTOR_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ/";

// When the two rows are read one at a time (prepareStrip's splitStripRows):
// - the number row holds the number, "/set size" and a rarity letter. S is
//   left out on purpose: OCR often reads 5 as S, and without S it must pick
//   5. The rare special rarity S is then read as 5 or dropped.
// - the set row holds the set code and language (and the artist, which the
//   parser ignores).
export const NUMBER_ROW_CHARACTERS = "0123456789/CURMTPLI";
export const SET_ROW_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// Language codes printed after the set code; never a set code themselves.
const LANGUAGE_CODES = new Set([
  "EN", "DE", "FR", "IT", "ES", "PT", "JA", "JP", "KO", "RU", "ZHS", "ZHT", "CS", "CT", "PH",
]);

// A number token: up to 4 digits, optionally "/set size". OCR often reads
// 0 as O, 1 as I or L, and 5 as S, so those letters are allowed but at least
// one real digit is required (otherwise set codes like "ONE" would become
// numbers).
// OCR also often drops the space between the rarity letter and the number
// ("R0277", "0277R"), so one rarity letter may be stuck to either side; group
// 1 is the number without it. L (land) is left out of those letters because
// a leading L is more often a misread 1.
// S is both a rarity (special) and a misread 5. A leading S is taken as the
// rarity ("S0125"); otherwise S counts as a digit while the number has room
// (up to 4 digits): "0S12" and "012S" are 0512 and 0125, "0125S" is 0125
// with rarity S. Special rarity is rare and S for 5 is a frequent misread
// (2026-11-21), so a 3-digit number with S glued ("025S") is read as 0255.
const NUMBER_TOKEN =
  /^[CURMSTP]?((?=[^/]*\d)[0-9OILS]{1,4}(?:\/[0-9OILS]{1,4})?)[CURMSTP]?$/;

// Lands have rarity L, which OCR also reads as I or 1. Newer cards pad the
// number to exactly 4 digits, so in a 5-character token ("L0277", "10277",
// "0277L") the extra character cannot be part of the number: it is the
// rarity. Group 1 or 2 is the number.
const LAND_NUMBER_TOKEN =
  /^[LI1]((?=[0-9OILS]{0,3}\d)[0-9OILS]{4})$|^((?=[0-9OILS]{0,3}\d)[0-9OILS]{4})[LI1]$/;

// The collector number in a token, or null.
function numberOf(token: string): string | null {
  const match = NUMBER_TOKEN.exec(token);
  if (match) {
    return match[1];
  }
  const land = LAND_NUMBER_TOKEN.exec(token);
  return land ? (land[1] ?? land[2]) : null;
}

// A set code: 3 to 5 letters or digits, with at least one letter ("2X2").
const SET_TOKEN = /^(?=.*[A-Z])[A-Z0-9]{3,5}$/;

// OCR often drops the "•" and spaces of the set line, gluing the set code,
// the language and the artist name together: "LTC • EN  Artist" → "LTCEN…".
// Group 1 is the shortest 3–5 character prefix followed by a language code.
const SET_WITH_LANGUAGE = new RegExp(
  `^((?=[A-Z0-9]{0,4}[A-Z])[A-Z0-9]{3,5}?)(?:${[...LANGUAGE_CODES].join("|")})`,
);

// The set code from the first word of a set line, or null.
function setCodeOf(token: string): string | null {
  const glued = SET_WITH_LANGUAGE.exec(token);
  if (glued) {
    return glued[1];
  }
  return SET_TOKEN.test(token) && !LANGUAGE_CODES.has(token) ? token : null;
}

function fixDigits(token: string): string {
  return token.replace(/O/g, "0").replace(/[IL]/g, "1").replace(/S/g, "5");
}

function stripLeadingZeros(number: string): string {
  return number.replace(/^0+(?=\d)/, "");
}

function tokensOf(line: string): string[] {
  return line.split(/[^A-Z0-9/]+/).filter(Boolean);
}

export function parseCollectorLine(text: string): CollectorLine | null {
  const lines = text
    .toUpperCase()
    .split(/\r?\n/)
    .map((line) => tokensOf(line))
    .filter((tokens) => tokens.length > 0);

  // The collector number: on the first line with a number-like token, the
  // first token of at least 3 digits (numbers are printed padded: "025",
  // "0125"), else the first number-like token. So a rarity read as a digit
  // before the number ("5 0125" for "S 0125") is not taken for the number.
  let numberLine = -1;
  let collectorNumber = "";
  for (let i = 0; i < lines.length && numberLine < 0; i += 1) {
    const numbers = lines[i]
      .map((candidate) => numberOf(candidate))
      .filter((number): number is string => number !== null)
      .map((number) => fixDigits(number).split("/")[0]);
    const number = numbers.find((digits) => digits.length >= 3) ?? numbers[0];
    if (number !== undefined) {
      numberLine = i;
      collectorNumber = stripLeadingZeros(number);
    }
  }
  if (numberLine < 0) {
    return null;
  }

  // The set code is printed first on its line, followed by the language and
  // the artist. Only the first word of 3 or more characters on each line
  // after the number is tried, so a word of the artist's name is never taken
  // for a set code.
  for (const tokens of lines.slice(numberLine + 1)) {
    const firstWord = tokens.find((candidate) => candidate.length >= 3);
    const setCode = firstWord ? setCodeOf(firstWord) : null;
    if (setCode) {
      return { setCode: setCode.toLowerCase(), collectorNumber };
    }
  }
  return null;
}
