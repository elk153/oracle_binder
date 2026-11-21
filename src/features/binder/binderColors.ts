/*
 * D-056: binder cover colors.
 *
 * The database stores any lowercase `#rrggbb` value (`binders.color`), but the
 * picker offers only these twelve. Each one passes the logo checks in
 * `tests/binder/binderColors.test.ts`: enough contrast with the logo's gold
 * and sparkle, and far enough from its dark teal lens that the lens does not
 * disappear. The one exception is Gray, which fails the gold contrast and is
 * kept on purpose (D-056 amendment). Check them again before changing a color
 * or the logo.
 */

export type BinderColorOption = {
  /** Shown under the swatch and used as its accessible name. */
  name: string;
  /** Lowercase `#rrggbb`, exactly what is stored in the database. */
  value: string;
};

/** Also the default of `binders.color` in the database migration. */
export const DEFAULT_BINDER_COLOR = "#1f2a6b";

/** The fixed cover of the "Loose" tile. It is not a binder, so it is not editable. */
export const LOOSE_BINDER_COLOR = "#33302d";

export const BINDER_COLORS: readonly BinderColorOption[] = [
  { name: "Navy", value: DEFAULT_BINDER_COLOR },
  { name: "Forest", value: "#1f4526" },
  { name: "Olive", value: "#3f3d14" },
  { name: "Violet", value: "#4a3766" },
  { name: "Magenta", value: "#6b1f5e" },
  { name: "Wine", value: "#5a1a2e" },
  { name: "Oxblood", value: "#7a2a2a" },
  { name: "Rust", value: "#6e3312" },
  { name: "Umber", value: "#523823" },
  { name: "Espresso", value: "#2e1f1a" },
  { name: "Gray", value: "#8da399" },
  { name: "Black", value: "#11161a" },
];

const HEX_COLOR = /^#[0-9a-f]{6}$/;

/** Same rule as the database check constraint `binders_color_hex_check`. */
export function isBinderColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/** A valid color, or the default when the stored value is not usable. */
export function coverColorOrDefault(value: string): string {
  return isBinderColor(value) ? value : DEFAULT_BINDER_COLOR;
}
