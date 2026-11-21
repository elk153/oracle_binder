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

// Language codes printed after the set code; never a set code themselves.
const LANGUAGE_CODES = new Set([
  "EN", "DE", "FR", "IT", "ES", "PT", "JA", "JP", "KO", "RU", "ZHS", "ZHT", "CS", "CT", "PH",
]);

// A number token: up to 4 digits, optionally "/set size". OCR often reads
// 0 as O and 1 as I or L, so those letters are allowed but at least one real
// digit is required (otherwise set codes like "ONE" would become numbers).
// OCR also often drops the space between the rarity letter and the number
// ("R0277", "0277R"), so one rarity letter may be stuck to either side; group
// 1 is the number without it. L (land) is left out of those letters because
// a leading L is more often a misread 1.
const NUMBER_TOKEN =
  /^[CURMSTP]?((?=[^/]*\d)[0-9OIL]{1,4}(?:\/[0-9OIL]{1,4})?)[CURMSTP]?$/;

// Lands have rarity L, which OCR also reads as I or 1. Newer cards pad the
// number to exactly 4 digits, so in a 5-character token ("L0277", "10277",
// "0277L") the extra character cannot be part of the number: it is the
// rarity. Group 1 or 2 is the number.
const LAND_NUMBER_TOKEN =
  /^[LI1]((?=[0-9OIL]{0,3}\d)[0-9OIL]{4})$|^((?=[0-9OIL]{0,3}\d)[0-9OIL]{4})[LI1]$/;

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
  return token.replace(/O/g, "0").replace(/[IL]/g, "1");
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

  // The collector number: the first number-like token on any line.
  let numberLine = -1;
  let collectorNumber = "";
  for (let i = 0; i < lines.length && numberLine < 0; i += 1) {
    for (const candidate of lines[i]) {
      const number = numberOf(candidate);
      if (number) {
        numberLine = i;
        collectorNumber = stripLeadingZeros(fixDigits(number).split("/")[0]);
        break;
      }
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
