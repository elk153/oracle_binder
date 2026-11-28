// D-074: the shared list of card languages.
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CARD_LANGUAGES,
  CARD_LANGUAGE_CODES,
  CARD_LANGUAGE_NAMES,
  languageNameOfCode,
  languageNameOfPrinted,
} from "../../src/features/cardLanguages.ts";

test("the names the app stored before D-074 keep their spelling", () => {
  for (const name of ["French", "English", "German", "Italian", "Japanese", "Spanish"]) {
    assert.ok((CARD_LANGUAGE_NAMES as readonly string[]).includes(name), name);
  }
});

test("pickers list French and English first, then the rest alphabetically", () => {
  assert.deepEqual(CARD_LANGUAGE_NAMES.slice(0, 2), ["French", "English"]);
  const rest = CARD_LANGUAGE_NAMES.slice(2);
  assert.deepEqual(rest, [...rest].sort((a, b) => a.localeCompare(b, "en")));
  assert.equal(CARD_LANGUAGE_NAMES.length, CARD_LANGUAGES.length);
});

test("codes, names and printed codes are unique", () => {
  const printed = CARD_LANGUAGES.flatMap((language) => [...language.printed]);
  assert.equal(new Set(CARD_LANGUAGE_CODES).size, CARD_LANGUAGE_CODES.length);
  assert.equal(new Set(CARD_LANGUAGE_NAMES).size, CARD_LANGUAGE_NAMES.length);
  assert.equal(new Set(printed).size, printed.length);
});

test("Scryfall codes and printed codes map to names", () => {
  assert.equal(languageNameOfCode("fr"), "French");
  assert.equal(languageNameOfCode("zht"), "Traditional Chinese");
  assert.equal(languageNameOfCode("xx"), null);
  assert.equal(languageNameOfCode(undefined), null);
  assert.equal(languageNameOfPrinted("sp"), "Spanish");
  assert.equal(languageNameOfPrinted("KR"), "Korean");
  assert.equal(languageNameOfPrinted("AG"), "Ancient Greek");
  assert.equal(languageNameOfPrinted("KL"), "Klingon");
  assert.equal(languageNameOfPrinted(""), null);
});

test("all 20 Scryfall languages are listed (scryfall.com/docs/api/languages, 2026-11-28)", () => {
  assert.equal(CARD_LANGUAGES.length, 20);
  assert.equal(languageNameOfCode("dw"), "Dwarvish");
  assert.equal(languageNameOfCode("tlh"), "Klingon");
});
