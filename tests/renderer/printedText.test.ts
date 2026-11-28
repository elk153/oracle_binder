// D-074: printed (non-English) text in the card renderer's pipeline.
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasPrintedText,
  normalizeCard,
  withTextLanguage,
} from "../../src/features/scryfall-card-renderer/normalizeCard.ts";

const FRENCH_BOLT = {
  id: "bolt-fr",
  layout: "normal",
  name: "Lightning Bolt",
  type_line: "Instant",
  oracle_text: "Lightning Bolt deals 3 damage to any target.",
  printed_name: "Foudre",
  printed_type_line: "Éphémère",
  printed_text: "La Foudre inflige 3 blessures à n'importe quelle cible.",
};

const FRENCH_DFC = {
  id: "delver-fr",
  layout: "transform",
  name: "Delver of Secrets // Insectile Aberration",
  card_faces: [
    { name: "Delver of Secrets", type_line: "Creature — Human Wizard", printed_name: "Fureteur des secrets" },
    // No printed text on this face: the English stays.
    { name: "Insectile Aberration", type_line: "Creature — Human Insect" },
  ],
};

test("normalizeCard keeps the English text and adds the printed one", () => {
  const [face] = normalizeCard(FRENCH_BOLT).faces;
  assert.equal(face.name, "Lightning Bolt");
  assert.equal(face.typeLine, "Instant");
  assert.equal(face.printedName, "Foudre");
  assert.equal(face.printedTypeLine, "Éphémère");
  assert.match(face.printedText ?? "", /^La Foudre/);
});

test("an English card has no printed text", () => {
  const card = normalizeCard({ id: "bolt", layout: "normal", name: "Lightning Bolt" });
  assert.equal(card.faces[0].printedName, null);
  assert.equal(hasPrintedText(card), false);
  assert.equal(withTextLanguage(card, "printed"), card);
});

test("printed swaps in the printed text, oracle keeps the English", () => {
  const card = normalizeCard(FRENCH_BOLT);
  const printed = withTextLanguage(card, "printed").faces[0];
  assert.equal(printed.name, "Foudre");
  assert.equal(printed.typeLine, "Éphémère");
  assert.match(printed.oracleText, /^La Foudre/);
  assert.equal(withTextLanguage(card, "oracle"), card);
});

test("each face falls back to English where Scryfall has no printed text", () => {
  const faces = withTextLanguage(normalizeCard(FRENCH_DFC), "printed").faces;
  assert.equal(faces[0].name, "Fureteur des secrets");
  assert.equal(faces[0].typeLine, "Creature — Human Wizard");
  assert.equal(faces[1].name, "Insectile Aberration");
});
