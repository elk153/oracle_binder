import type { ComponentType } from "react";

// Code for pages other than Home, loaded on demand (D-071).
//
// Each entry is a function that returns a dynamic `import()`. Vite/Rolldown
// turns every dynamic import into its own JavaScript file ("chunk"), so the
// code of these pages is no longer in the startup download. The router calls
// these functions through React Router's `lazy` route property, and
// `preloadLikelyPages` calls them in idle time so the next tap is still fast.
//
// Calling the same import twice is cheap: the browser keeps the module after
// the first load, so a page preloaded in idle time opens without a new request.

export const lazyPages = {
  favorites: () => import("../features/favorites/FavoritesPage.tsx"),
  binder: () => import("../features/binder/BinderPage.tsx"),
  decks: () => import("../features/decks/DecksPage.tsx"),
  scan: () => import("../features/scan/ScanPage.tsx"),
  login: () => import("../features/auth/LoginPage.tsx"),
  authCallback: () => import("../features/auth/AuthCallbackPage.tsx"),
};

type PageModule = { default: ComponentType };

/**
 * Turns a page import into the shape React Router's `lazy` expects:
 * `{ Component }` instead of the module's `default` export.
 */
export function lazyRoute(load: () => Promise<PageModule>) {
  return async () => {
    const { default: Component } = await load();
    return { Component };
  };
}

/**
 * Downloads the code of the pages a user most often opens after Home, one at a
 * time, when the browser has nothing else to do. Failures are ignored: the
 * route will simply load the code again when the user opens it.
 */
export function preloadLikelyPages() {
  const likely = [lazyPages.binder, lazyPages.decks, lazyPages.favorites];
  likely.reduce<Promise<unknown>>(
    (previous, load) => previous.then(() => load().catch(() => undefined)),
    Promise.resolve(),
  );
}
