import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import SearchSourceToggle from "./SearchSourceToggle.tsx";
import NameAutocomplete from "./NameAutocomplete.tsx";
import type { SearchMode, SearchSource } from "./types.ts";
import "./SearchControls.css";

type SearchControlsProps = {
  query: string;
  nameSuggestions: readonly string[];
  nameSuggestionsError: Error | null;
};

export default function SearchControls({
  query: currentQuery,
  nameSuggestions,
  nameSuggestionsError,
}: SearchControlsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(currentQuery);
  const searchSource: SearchSource =
    searchParams.get("source") === "collection" ? "collection" : "scryfall";
  const searchMode: SearchMode =
    searchParams.get("s_mode") === "advanced" ? "advanced" : "simple";

  function setSource() {
    const next = new URLSearchParams(searchParams);
    if (searchSource === "collection") {
      next.delete("source");
    } else {
      next.set("source", "collection");
    }
    setSearchParams(next, { preventScrollReset: true });
  }

  function setMode(mode: SearchMode) {
    const next = new URLSearchParams(searchParams);
    if (mode === "simple") {
      next.delete("s_mode");
    } else {
      next.set("s_mode", mode);
    }
    setSearchParams(next, { preventScrollReset: true });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      next.set("q", trimmedQuery);
    } else {
      next.delete("q");
    }
    next.delete("card");
    setSearchParams(next, { preventScrollReset: true });
  }

  return (
    <section className="search-controls" aria-labelledby="search-controls-title">
      <h1 id="search-controls-title">Search</h1>
      <div className="search-controls__toggles">
        <div className="search-controls__source" role="group" aria-label="Search source">
          <SearchSourceToggle value={searchSource} onToggle={setSource} />
        </div>
        <div className="search-controls__mode" role="group" aria-label="Search type">
          {(["simple", "advanced"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={searchMode === mode}
              onClick={() => setMode(mode)}
            >
              {mode === "simple" ? "Simple" : "Advanced"}
            </button>
          ))}
        </div>
      </div>
      {searchMode === "simple" && (
        <form className="search-controls__form" role="search" onSubmit={submitSearch}>
          <NameAutocomplete
            label="Card name"
            names={nameSuggestions}
            value={query}
            onChange={setQuery}
          />
          <button type="submit">Search</button>
        </form>
      )}
      {searchMode === "simple" && nameSuggestionsError && (
        <p className="search-controls__notice" role="status">
          Name suggestions are unavailable: {nameSuggestionsError.message}
        </p>
      )}
      {searchMode === "advanced" && (
        <p className="search-controls__notice">
          Advanced search is not available yet.
        </p>
      )}
    </section>
  );
}
