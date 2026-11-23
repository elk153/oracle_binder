import { createBrowserRouter, Navigate, redirect } from "react-router";
import { NuqsAdapter } from "nuqs/adapters/react-router/v8";
import AppV2 from "./App.tsx";
import CardBrowserPage from "../features/card-browser/CardBrowserPage.tsx";
import RequireAuth from "../features/auth/RequireAuth.tsx";
import { Home } from "./App.tsx";
import { lazyPages, lazyRoute } from "./lazyPages.ts";
import RouteErrorPage from "./RouteErrorPage.tsx";

const router = createBrowserRouter([ // be aware of the capitals
  {
    path: "/",
    loader: () => redirect("/v2/home"),   // default route
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/v2",
    element: (
      <NuqsAdapter>
        <AppV2 />
      </NuqsAdapter>
    ),
    // Catches errors in any /v2 page, including a code chunk that fails to
    // load after a deploy, and unknown /v2 addresses (404).
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        loader: () => redirect("/v2/home"),
      },
      {
        path: "home",
        element: <Home />,
      },
      {
        path: "login",
        lazy: lazyRoute(lazyPages.login),
      },
      {
        path: "auth/callback",
        lazy: lazyRoute(lazyPages.authCallback),
      },
      {
        path: "search/advanced",
        element: <Navigate to="/v2/search?s_mode=advanced" replace />,
      },
      {
        path: "search",
        element: <CardBrowserPage />,
      },
      {
        path: "search/random",
        element: <CardBrowserPage />,
      },
      {
        // Public: Identify works signed out; Add checks the session itself (D-061).
        path: "scan",
        lazy: lazyRoute(lazyPages.scan),
      },
      // Development-only OCR benchmark for the scanner (D-062 follow-up). In a
      // production build import.meta.env.DEV is false, so the route and its
      // code are left out.
      ...(import.meta.env.DEV
        ? [
            {
              path: "scan-bench",
              lazy: async () => {
                const { default: Component } = await import(
                  "../features/scan/bench/ScanBenchPage.tsx"
                );
                return { Component };
              },
            },
          ]
        : []),
      {
        path: "collection",
        element: <Navigate to="/v2/binder" replace />,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: "favorites",
            lazy: lazyRoute(lazyPages.favorites),
          },
          {
            path: "binder",
            lazy: lazyRoute(lazyPages.binder),
          },
          {
            path: "decks",
            lazy: lazyRoute(lazyPages.decks),
          },
        ],
      },
    ],
  }
]);

export default router;