// Name fallback of the scanner (D-065 step 2): finding the card name in the
// OCR text of the guide box.
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildNameIndex,
  matchCardName,
  nameKey,
  substringDistance,
} from "../../src/features/scan/matchCardName.ts";

const index = buildNameIndex([
  "Lightning Bolt",
  "Lightning",
  "Opt",
  "Counterspell",
  "Delver of Secrets // Insectile Aberration",
  "Lim-Dûl's Vault",
  "Llanowar Elves",
]);

test("nameKey keeps only lowercase letters, without accents", () => {
  assert.equal(nameKey("Lim-Dûl's Vault"), "limdulsvault");
});

test("substringDistance ignores extra letters around the name", () => {
  assert.equal(substringDistance("bolt", "xxboltyy", 2), 0);
  assert.equal(substringDistance("bolt", "xxbo1tyy".replace("1", "i"), 2), 1);
  assert.equal(substringDistance("bolt", "nothing", 1), Number.POSITIVE_INFINITY);
});

test("an exact name is found", () => {
  assert.equal(matchCardName("Counterspell", index), "Counterspell");
});

test("a few misread letters and stray mana letters are allowed", () => {
  assert.equal(matchCardName("Lightnirg Bo1t RR", index), "Lightning Bolt");
  assert.equal(matchCardName("i Counterspel UU", index), "Counterspell");
});

test("the name that explains more of the text wins", () => {
  assert.equal(matchCardName("Lightning Bolt", index), "Lightning Bolt");
});

test("the front face finds a double-faced card", () => {
  assert.equal(
    matchCardName("Delver of Secrets", index),
    "Delver of Secrets // Insectile Aberration",
  );
});

test("accents and punctuation do not matter", () => {
  assert.equal(matchCardName("Lim Duls Vault", index), "Lim-Dûl's Vault");
});

test("a short name does not win inside a long misread", () => {
  assert.equal(matchCardName("Optimistic random words here", index), null);
});

test("unrelated text gives null", () => {
  assert.equal(matchCardName("Xyzzy Plugh", index), null);
  assert.equal(matchCardName("", index), null);
});
