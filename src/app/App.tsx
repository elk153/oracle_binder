import NavBar from "../features/navigation/NavBar.tsx";
import { Outlet } from "react-router";
import CardBrowserPage from "../features/card-browser/CardBrowserPage.tsx";
import FavoritesPage from "../features/favorites/FavoritesPage.tsx";
import BinderPage from "../features/binder/BinderPage.tsx";
import DecksPage from "../features/decks/DecksPage.tsx";
import "./App.css";
import usePreFetchUrl from "../hooks/usePreFetchUrl.ts";
import getSecondsUntilNextLocalFour from "../hooks/getSecondsUntilNextLocalFour.ts";
import useDismissSplash from "../hooks/useDismissSplash.ts";

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

  useDismissSplash();

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