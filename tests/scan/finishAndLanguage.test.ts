// D-066: the foil mark and language read from the collector line, and the
// finish the Add confirm step starts at.
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  languageNameOf,
  parseFinishAndLanguage,
} from "../../src/features/scan/parseCollectorLine.ts";
import { guessFinish } from "../../src/features/scan/addSession.ts";

test("a dot and a star between set code and language", () => {
  assert.deepEqual(parseFinishAndLanguage("0123 R\nDMU • EN", "dmu"), { foilMark: "dot", language: "EN" });
  assert.deepEqual(parseFinishAndLanguage("0123 R\nDMU ★ FR", "dmu"), { foilMark: "star", language: "FR" });
});

test("usual misreads of the signs", () => {
  assert.deepEqual(parseFinishAndLanguage("0123 R\nDMU * DE", "dmu"), { foilMark: "star", language: "DE" });
  assert.deepEqual(parseFinishAndLanguage("0123 R\nDMU · IT", "dmu"), { foilMark: "dot", language: "IT" });
  assert.deepEqual(parseFinishAndLanguage("0123 R\nDMU*JP", "dmu"), { foilMark: "star", language: "JP" });
});

test("no sign read: only the language, also when glued to the set code", () => {
  assert.deepEqual(parseFinishAndLanguage("0123 R\nDMU EN", "dmu"), { foilMark: null, language: "EN" });
  assert.deepEqual(parseFinishAndLanguage("R0277\nLTCENJOHNAVO", "ltc"), { foilMark: null, language: "EN" });
});

test("three-letter Chinese codes and an artist name after the language", () => {
  assert.deepEqual(parseFinishAndLanguage("0123 R\nDMU • ZHS", "dmu"), { foilMark: "dot", language: "ZHS" });
  assert.deepEqual(parseFinishAndLanguage("0123 R\nDMU • EN  CHRIS RAHN", "dmu"), {
    foilMark: "dot",
    language: "EN",
  });
});

test("an unknown language or a missing set line gives null", () => {
  assert.deepEqual(parseFinishAndLanguage("0123 R\nDMU • XX", "dmu"), { foilMark: "dot", language: null });
  assert.deepEqual(parseFinishAndLanguage("0123 R", "dmu"), { foilMark: null, language: null });
});

test("the set code inside another word is not taken", () => {
  assert.deepEqual(parseFinishAndLanguage("0123 R\nXDMU • EN", "dmu"), { foilMark: null, language: null });
});

test("printed codes map to the app's languages (all of Scryfall's, D-074)", () => {
  assert.equal(languageNameOf("FR"), "French");
  assert.equal(languageNameOf("JP"), "Japanese");
  assert.equal(languageNameOf("JA"), "Japanese");
  assert.equal(languageNameOf("KO"), "Korean");
  assert.equal(languageNameOf("PT"), "Portuguese");
  assert.equal(languageNameOf("ZHS"), "Simplified Chinese");
  assert.equal(languageNameOf("CT"), "Traditional Chinese");
  assert.equal(languageNameOf("PH"), "Phyrexian");
  assert.equal(languageNameOf("XX"), null);
  assert.equal(languageNameOf(null), null);
});

test("the finish follows the mark, within the printing's finishes", () => {
  assert.equal(guessFinish("dot", ["nonfoil", "foil"]), "Non-foil");
  assert.equal(guessFinish("star", ["nonfoil", "foil"]), "Foil");
  assert.equal(guessFinish("star", ["etched"]), "Etched foil");
  assert.equal(guessFinish("star", ["nonfoil", "etched"]), "Etched foil");
});

test("a finish the printing doesn't have is never chosen", () => {
  assert.equal(guessFinish("dot", ["foil"]), "Foil");
  assert.equal(guessFinish("star", ["nonfoil"]), "Non-foil");
});

test("no mark: the printing's first finish; no list: all three possible", () => {
  assert.equal(guessFinish(null, ["foil", "etched"]), "Foil");
  assert.equal(guessFinish(null, undefined), "Non-foil");
  assert.equal(guessFinish("star", undefined), "Foil");
});
