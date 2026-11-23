import { useEffect } from "react";
import NavBar from "../features/navigation/NavBar.tsx";
import { Outlet } from "react-router";
import CardBrowserPage from "../features/card-browser/CardBrowserPage.tsx";
import "./App.css";
import usePreFetchUrl from "../hooks/usePreFetchUrl.ts";
import getSecondsUntilNextLocalFour from "../hooks/getSecondsUntilNextLocalFour.ts";
import useDismissSplash from "../hooks/useDismissSplash.ts";
import useBackgroundReady from "../hooks/useBackgroundReady.ts";
import { preloadLikelyPages } from "./lazyPages.ts";
import NotificationProvider from "../features/notifications/NotificationProvider.tsx";

export default function App() {
  const isBackgroundReady = useBackgroundReady();

  useDismissSplash();

  return (
    <div className="App AppV2">
      {/* One notification stack for the whole app; it stays while the
          user changes page (D-080). */}
      <NotificationProvider>
        <NavBar />
        <main className="app-v2__main">
          <Outlet />
        </main>
        {/* Mounted only after the first screen is done (D-071). */}
        {isBackgroundReady && <BackgroundWork />}
      </NotificationProvider>
    </div>
  );
}

/**
 * Loads what the next screens need while the user already sees the first one
 * ("shadow time", D-071). It renders nothing; it exists so its hooks start
 * only when `App` mounts it.
 */
function BackgroundWork() {
  usePreFetchUrl(
    "cardSymbols",
    "https://api.scryfall.com/symbology",
    Infinity,
  );
  usePreFetchUrl("scryfallSets", "https://api.scryfall.com/sets");
  usePreFetchUrl(
    "cardNames",
    "https://api.scryfall.com/catalog/card-names",
    getSecondsUntilNextLocalFour,
  );

  useEffect(() => {
    preloadLikelyPages();
  }, []);

  return null;
}

export function Home() {
  return <CardBrowserPage mode="mulligan" />;
}
