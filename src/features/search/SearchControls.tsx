import { useSearchParams } from "react-router";
import SearchSourceToggle from "./SearchSourceToggle.tsx";
import type { SearchMode, SearchSource } from "./types.ts";
import "./SearchControls.css";

export default function SearchControls() {
  const [searchParams, setSearchParams] = useSearchParams();
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
      {searchMode === "advanced" && (
        <p className="search-controls__notice">
          Advanced search is not available yet.
        </p>
      )}
    </section>
  );
}
