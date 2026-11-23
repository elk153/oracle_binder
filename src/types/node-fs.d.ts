// Types for the one Node.js function vite.config.ts uses (readFileSync, for
// the inlined splash logo, D-071). The project has no @types/node; if it is
// ever added, delete this file.
declare module "node:fs" {
  export function readFileSync(path: URL): { toString(encoding: "base64"): string };
}
