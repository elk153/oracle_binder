// D-056: keeps the binder cover palette compatible with the app logo.
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"
//
// The logo colors are read from `public/logo.svg` and the database default from
// the `*_binder_color.sql` migration, so changing either without the palette
// fails here. The rules are the ones D-056 used to choose the colors:
//   - at least 3:1 contrast with every logo gold and sparkle color,
//   - at least 20 CIEDE2000 away from both lens colors, so the dark teal lens
//     does not vanish into the cover,
//   - palette swatches at least 8 apart from each other.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  BINDER_COLORS,
  DEFAULT_BINDER_COLOR,
  LOOSE_BINDER_COLOR,
  coverColorOrDefault,
  isBinderColor,
} from "../../src/features/binder/binderColors.ts";

const MIN_CONTRAST = 3;
const MIN_LENS_DISTANCE = 20;
const MIN_SWATCH_DISTANCE = 8;

type Lab = readonly [number, number, number];

function channels(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio, from 1 to 21. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function toLab(hex: string): Lab {
  const [r, g, b] = channels(hex).map(linear);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number) =>
    t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const rad = (degrees: number) => (degrees * Math.PI) / 180;
const deg = (radians: number) => (radians * 180) / Math.PI;

/** CIEDE2000 color difference (Sharma, Wu and Dalal's formulation). */
function deltaE2000([L1, a1, b1]: Lab, [L2, a2, b2]: Lab): number {
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const meanC = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(meanC ** 7 / (meanC ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h1p = (deg(Math.atan2(b1, a1p)) + 360) % 360;
  const h2p = (deg(Math.atan2(b2, a2p)) + 360) % 360;

  const dL = L2 - L1;
  const dC = C2p - C1p;
  let dh = 0;
  if (C1p * C2p !== 0) {
    dh = h2p - h1p;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dh / 2));

  const meanL = (L1 + L2) / 2;
  const meanCp = (C1p + C2p) / 2;
  let meanH = h1p + h2p;
  if (C1p * C2p !== 0) {
    meanH = (h1p + h2p) / 2;
    if (Math.abs(h1p - h2p) > 180) meanH += h1p + h2p < 360 ? 180 : -180;
  }
  const T =
    1 -
    0.17 * Math.cos(rad(meanH - 30)) +
    0.24 * Math.cos(rad(2 * meanH)) +
    0.32 * Math.cos(rad(3 * meanH + 6)) -
    0.2 * Math.cos(rad(4 * meanH - 63));
  const dTheta = 30 * Math.exp(-(((meanH - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(meanCp ** 7 / (meanCp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (meanL - 50) ** 2) / Math.sqrt(20 + (meanL - 50) ** 2);
  const Sc = 1 + 0.045 * meanCp;
  const Sh = 1 + 0.015 * meanCp * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;

  return Math.sqrt(
    (dL / Sl) ** 2 +
      (dC / Sc) ** 2 +
      (dH / Sh) ** 2 +
      Rt * (dC / Sc) * (dH / Sh),
  );
}

// --- the logo's own colors, read from public/logo.svg ---------------------
const logoSvg = readFileSync(
  new URL("../../public/logo.svg", import.meta.url),
  "utf8",
);

function logoColor(name: string): string {
  const match = logoSvg.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match?.[1], `logo.svg defines --${name}`);
  return match[1].toLowerCase();
}

const GOLD = ["gold-1", "gold-2", "gold-3"].map(logoColor);
const SPARKLE = ["sparkle-1", "sparkle-2"].map(logoColor);
const LENS = ["lens-1", "lens-2"].map(logoColor);

// --- the palette plus the fixed "Loose" cover ------------------------------
const COVERS = [
  ...BINDER_COLORS,
  { name: "Loose (fixed)", value: LOOSE_BINDER_COLOR },
];

test("the palette has ten valid, unique, named colors", () => {
  assert.equal(BINDER_COLORS.length, 10);
  assert.equal(new Set(BINDER_COLORS.map((c) => c.value)).size, 10);
  assert.equal(new Set(BINDER_COLORS.map((c) => c.name)).size, 10);
  for (const { name, value } of BINDER_COLORS) {
    assert.ok(name.length > 0, "every swatch has a name");
    assert.ok(isBinderColor(value), `${name} is lowercase #rrggbb`);
  }
});

test("the default is the first swatch and matches the database default", () => {
  assert.equal(BINDER_COLORS[0]?.value, DEFAULT_BINDER_COLOR);

  const migrationsDir = new URL("../../supabase/migrations/", import.meta.url);
  const file = readdirSync(migrationsDir).find((name) =>
    name.endsWith("_binder_color.sql"),
  );
  assert.ok(file, "the binder color migration exists");
  const sql = readFileSync(new URL(file, migrationsDir), "utf8");
  assert.match(sql, new RegExp(`default '${DEFAULT_BINDER_COLOR}'`));
});

test("the Loose cover is fixed and not offered in the picker", () => {
  assert.ok(isBinderColor(LOOSE_BINDER_COLOR));
  assert.ok(!BINDER_COLORS.some((c) => c.value === LOOSE_BINDER_COLOR));
});

for (const { name, value } of COVERS) {
  test(`${name} ${value}: contrast with the logo gold and sparkle`, () => {
    for (const logo of [...GOLD, ...SPARKLE]) {
      const ratio = contrast(value, logo);
      assert.ok(
        ratio >= MIN_CONTRAST,
        `${value} vs ${logo} is ${ratio.toFixed(2)}:1, needs ${MIN_CONTRAST}:1`,
      );
    }
  });

  test(`${name} ${value}: far enough from the logo lens`, () => {
    for (const lens of LENS) {
      const distance = deltaE2000(toLab(value), toLab(lens));
      assert.ok(
        distance >= MIN_LENS_DISTANCE,
        `${value} vs lens ${lens} is ${distance.toFixed(1)}, needs ${MIN_LENS_DISTANCE}`,
      );
    }
  });
}

test("palette swatches are distinguishable from each other", () => {
  for (const [i, first] of BINDER_COLORS.entries()) {
    for (const second of BINDER_COLORS.slice(i + 1)) {
      const distance = deltaE2000(toLab(first.value), toLab(second.value));
      assert.ok(
        distance >= MIN_SWATCH_DISTANCE,
        `${first.name} and ${second.name} are only ${distance.toFixed(1)} apart`,
      );
    }
  }
});

test("isBinderColor mirrors the database check", () => {
  assert.ok(isBinderColor("#1f2a6b"));
  for (const bad of ["", "red", "#1F2A6B", "#1f2a6", "#1f2a6bb", "1f2a6b", "#gggggg"]) {
    assert.ok(!isBinderColor(bad), `${JSON.stringify(bad)} is rejected`);
  }
});

test("an unusable stored color falls back to the default", () => {
  assert.equal(coverColorOrDefault("#7a2a2a"), "#7a2a2a");
  assert.equal(coverColorOrDefault("not-a-color"), DEFAULT_BINDER_COLOR);
});
