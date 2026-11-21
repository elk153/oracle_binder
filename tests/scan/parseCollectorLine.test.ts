// D-062: parsing the OCR text of a card's collector info line.
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCollectorLine } from "../../src/features/scan/parseCollectorLine.ts";

test("number with set size, then set and language", () => {
  assert.deepEqual(parseCollectorLine("0123/280 R\nDMU EN"), {
    setCode: "dmu",
    collectorNumber: "123",
  });
});

test("number without set size (newer cards)", () => {
  assert.deepEqual(parseCollectorLine("0045 R\nMKM EN"), {
    setCode: "mkm",
    collectorNumber: "45",
  });
});

test("rarity before the number", () => {
  assert.deepEqual(parseCollectorLine("R 0123\nMOM EN"), {
    setCode: "mom",
    collectorNumber: "123",
  });
});

test("rarity letter stuck to the number (no space read)", () => {
  // Seen on a phone: Door of Destinies read as "R0277".
  assert.deepEqual(parseCollectorLine("R0277\nCMM EN"), {
    setCode: "cmm",
    collectorNumber: "277",
  });
  assert.deepEqual(parseCollectorLine("0277R\nCMM EN"), {
    setCode: "cmm",
    collectorNumber: "277",
  });
  assert.deepEqual(parseCollectorLine("0123/280R\nDMU EN"), {
    setCode: "dmu",
    collectorNumber: "123",
  });
});

test("set code, language and artist glued together", () => {
  // Seen on a phone: Door of Destinies, second line "LTCEN" + artist name.
  assert.deepEqual(parseCollectorLine("R0277\nLTCENJOHNAVO"), {
    setCode: "ltc",
    collectorNumber: "277",
  });
  assert.deepEqual(parseCollectorLine("0123 R\nDMUEN"), {
    setCode: "dmu",
    collectorNumber: "123",
  });
  // Four-letter set code.
  assert.deepEqual(parseCollectorLine("0010 C\nPLSTEN"), {
    setCode: "plst",
    collectorNumber: "10",
  });
});

test("a word of the artist name is not taken for the set", () => {
  assert.deepEqual(parseCollectorLine("0277 R\nLTC EN JOHN AVON"), {
    setCode: "ltc",
    collectorNumber: "277",
  });
});

test("land rarity L stuck to a 4-digit number, also read as I or 1", () => {
  for (const line of ["L0277", "I0277", "10277", "0277L", "0277I", "02771"]) {
    assert.deepEqual(
      parseCollectorLine(`${line}\nLTC EN`),
      { setCode: "ltc", collectorNumber: "277" },
      line,
    );
  }
});

test("a real 4-digit number starting with 1 is kept", () => {
  assert.deepEqual(parseCollectorLine("1234 R\nSLD EN"), {
    setCode: "sld",
    collectorNumber: "1234",
  });
});

test("O, I and L misread in the number become digits", () => {
  assert.deepEqual(parseCollectorLine("O1I/280 C\nDMU EN"), {
    setCode: "dmu",
    collectorNumber: "11",
  });
});

test("S misread for 5 in the number becomes 5", () => {
  for (const [line, number] of [
    ["0S12 R", "512"],
    ["012S R", "125"],
    ["R012S", "125"],
    ["01S5/280 C", "155"],
  ]) {
    assert.deepEqual(
      parseCollectorLine(`${line}\nDMU EN`),
      { setCode: "dmu", collectorNumber: number },
      line,
    );
  }
});

test("a leading S, or an S after 4 digits, is the special rarity", () => {
  assert.deepEqual(parseCollectorLine("S0125\nTSR EN"), { setCode: "tsr", collectorNumber: "125" });
  assert.deepEqual(parseCollectorLine("0125S\nTSR EN"), { setCode: "tsr", collectorNumber: "125" });
  assert.deepEqual(parseCollectorLine("0125 S\nTSR EN"), { setCode: "tsr", collectorNumber: "125" });
});

test("a padded number wins over a short one before it", () => {
  // "S 0125" read with a number row that has no S: the rarity became 5.
  assert.deepEqual(parseCollectorLine("5 0125\nTSR EN"), { setCode: "tsr", collectorNumber: "125" });
});

test("set codes with S stay letters", () => {
  assert.deepEqual(parseCollectorLine("0045 R\nSNC EN"), { setCode: "snc", collectorNumber: "45" });
});

test("set codes made of O, I and L stay letters", () => {
  assert.deepEqual(parseCollectorLine("0201 U\nLCI EN"), {
    setCode: "lci",
    collectorNumber: "201",
  });
  assert.deepEqual(parseCollectorLine("0010 C\nONE EN"), {
    setCode: "one",
    collectorNumber: "10",
  });
});

test("set codes with a digit", () => {
  assert.deepEqual(parseCollectorLine("0123 R\n2X2 EN"), {
    setCode: "2x2",
    collectorNumber: "123",
  });
});

test("noise lines and stray characters are skipped", () => {
  assert.deepEqual(parseCollectorLine("\n  /  \n0123/280 R\nDMU  EN\nXX"), {
    setCode: "dmu",
    collectorNumber: "123",
  });
});

test("a language code alone is not a set code", () => {
  assert.equal(parseCollectorLine("0123 R\nEN"), null);
});

test("no number gives no result", () => {
  assert.equal(parseCollectorLine("DMU EN"), null);
  assert.equal(parseCollectorLine(""), null);
});

test("collector number zero keeps one digit", () => {
  assert.deepEqual(parseCollectorLine("000 R\nSLD EN"), {
    setCode: "sld",
    collectorNumber: "0",
  });
});
