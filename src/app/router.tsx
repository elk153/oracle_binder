import { createBrowserRouter, Navigate, redirect } from "react-router";
import { NuqsAdapter } from "nuqs/adapters/react-router/v8";
import AppV2 from "./App.tsx";
import CardBrowserPage from "../features/card-browser/CardBrowserPage.tsx";
import LoginPage from "../features/auth/LoginPage.tsx";
import AuthCallbackPage from "../features/auth/AuthCallbackPage.tsx";
import RequireAuth from "../features/auth/RequireAuth.tsx";
import { Home, Favorites, Binder, Decks } from "./App.tsx";

const router = createBrowserRouter([ // be aware of the capitals
  {
    path: "/",
    loader: () => redirect("/v2/home"),   // default route
  },
  {
    path: "/v2",
    element: (
      <NuqsAdapter>
        <AppV2 />
      </NuqsAdapter>
    ),
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
        element: <LoginPage />,
      },
      {
        path: "auth/callback",
        element: <AuthCallbackPage />,
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
        path: "collection",
        element: <Navigate to="/v2/binder" replace />,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: "favorites",
            element: <Favorites />,
          },
          {
            path: "binder",
            element: <Binder />,
          },
          {
            path: "decks",
            element: <Decks />,
          },
        ],
      },
    ],
  }
]);

export default router;