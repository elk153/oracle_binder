// The "truth" field of a saved scan sample: what the card really says.
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTruth } from "../../src/features/scan/scanSample.ts";

test("set and number separated by a space, slash or hash", () => {
  for (const value of ["ltc 277", "LTC/277", "ltc #277", " ltc  277 "]) {
    assert.deepEqual(parseTruth(value), { setCode: "ltc", collectorNumber: "277" }, value);
  }
});

test("leading zeros are dropped and letter suffixes kept", () => {
  assert.deepEqual(parseTruth("dmu 0012"), { setCode: "dmu", collectorNumber: "12" });
  assert.deepEqual(parseTruth("sld 123a"), { setCode: "sld", collectorNumber: "123a" });
});

test("anything else gives null", () => {
  assert.equal(parseTruth(""), null);
  assert.equal(parseTruth("ltc"), null);
});

test("an optional foil mark and language follow the number", () => {
  assert.deepEqual(parseTruth("ltc 277 star fr"), {
    setCode: "ltc",
    collectorNumber: "277",
    foilMark: "star",
    language: "FR",
  });
  assert.deepEqual(parseTruth("ltc 277 en"), { setCode: "ltc", collectorNumber: "277", language: "EN" });
  assert.deepEqual(parseTruth("ltc 277 dot"), { setCode: "ltc", collectorNumber: "277", foilMark: "dot" });
});
