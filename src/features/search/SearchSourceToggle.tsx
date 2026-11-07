import type { SearchSource } from "./types.ts";
import "./SearchSourceToggle.css";

type SearchSourceToggleProps = {
  value: SearchSource;
  onToggle: () => void;
};

export default function SearchSourceToggle({
  value,
  onToggle,
}: SearchSourceToggleProps) {
  const isCollection = value === "collection";

  return (
    <button
      type="button"
      className="search-source-toggle"
      role="switch"
      aria-checked={isCollection}
      aria-label="Search personal collection"
      title={`Search source: ${isCollection ? "personal collection" : "Scryfall"}`}
      onClick={onToggle}
    >
      <span className="search-source-toggle__label">
        {isCollection ? "Collection" : "Scryfall"}
      </span>
      <span className="search-source-toggle__track" aria-hidden="true">
        <span className="search-source-toggle__thumb" />
      </span>
    </button>
  );
}
