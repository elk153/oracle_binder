// D-074: the language choices of the printings list in the details overlay.
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultPrintingLanguages,
  filterByLanguages,
  printingLanguages,
  toggleLanguage,
} from "../../src/features/card-browser/printingLanguages.ts";

const PRINTS = [
  { id: "a", lang: "fr" },
  { id: "b", lang: "en" },
  { id: "c" }, // no lang: English
  { id: "d", lang: "ja" },
  { id: "e", lang: "fr" },
  { id: "f", lang: "xx" }, // a code the app does not know
];

test("lists each language once, English first, with its count", () => {
  assert.deepEqual(printingLanguages(PRINTS), [
    { code: "en", name: "English", count: 2 },
    { code: "fr", name: "French", count: 2 },
    { code: "ja", name: "Japanese", count: 1 },
    { code: "xx", name: "xx", count: 1 },
  ]);
  assert.deepEqual(printingLanguages([]), []);
});

test("English starts ticked, plus the opened printing's language", () => {
  const available = printingLanguages(PRINTS);
  assert.deepEqual([...defaultPrintingLanguages("en", available)], ["en"]);
  assert.deepEqual([...defaultPrintingLanguages(undefined, available)], ["en"]);
  assert.deepEqual([...defaultPrintingLanguages("fr", available)], ["en", "fr"]);
});

test("a card without English printings starts on its first language", () => {
  const available = printingLanguages([{ lang: "ja" }, { lang: "ko" }]);
  assert.deepEqual([...defaultPrintingLanguages("ko", available)], ["ko"]);
  assert.deepEqual([...defaultPrintingLanguages(undefined, available)], ["ja"]);
  assert.deepEqual([...defaultPrintingLanguages("en", [])], []);
});

test("clicking a language adds or removes it", () => {
  const added = toggleLanguage(new Set(["en"]), "fr");
  assert.deepEqual([...added], ["en", "fr"]);
  assert.deepEqual([...toggleLanguage(added, "en")], ["fr"]);
});

test("only the ticked languages' printings are shown, in their order", () => {
  const shown = filterByLanguages(PRINTS, new Set(["en", "fr"])).map((print) => print.id);
  assert.deepEqual(shown, ["a", "b", "c", "e"]);
  assert.deepEqual(filterByLanguages(PRINTS, new Set()), []);
});
