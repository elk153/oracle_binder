import { useEffect } from "react";
import NavBar from "../features/navigation/NavBar.tsx";
import { Outlet } from "react-router";
import CardBrowserPage from "../features/card-browser/CardBrowserPage.tsx";
import FavoritesPage from "../features/favorites/FavoritesPage.tsx";
import BinderPage from "../features/binder/BinderPage.tsx";
import DecksPage from "../features/decks/DecksPage.tsx";
import "./App.css";
import usePreFetchUrl from "../hooks/usePreFetchUrl.ts";
import getSecondsUntilNextLocalFour from "../hooks/getSecondsUntilNextLocalFour.ts";

declare global {
  interface Window {
    reactIsReady: boolean;
  }
}

export default function App() {
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
    window.reactIsReady = true;

    const splashLogo = document.getElementById("splash-logo");
    const splashBackground = document.getElementById("splash-background");
    const root = document.getElementById("root");

    if (!splashLogo || !splashBackground || !root) {
      return;
    }

    // Trigger the visual transition: both splash background and logo
    // will transition their opacity to the same level to keep a uniform color.
    splashBackground.classList.add("ready");
    splashLogo.classList.add("ready");

    const handleTransitionEnd = (event: TransitionEvent): void => {
      if (event.target !== splashBackground || event.propertyName !== "opacity") return;

      // Reveal the app root and move the splash behind the app content
      root.classList.add("visible");
      splashBackground.classList.add("background");

      // Clean up listener
      splashBackground.removeEventListener("transitionend", handleTransitionEnd);
    };

    // Attach to splashBackground so we observe the container opacity end
    splashBackground.addEventListener("transitionend", handleTransitionEnd);

    return () => {
      splashBackground.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, []);

  return (
    <div className="App AppV2">
      <NavBar />
      <main className="app-v2__main">
        <Outlet />
      </main>
    </div>
  );
}

export function Home() {
  return <CardBrowserPage mode="mulligan" />;
}

export function Favorites() {
  return <FavoritesPage />;
}

export function Binder() {
  return <BinderPage />;
}

export function Decks() {
  return <DecksPage />;
}