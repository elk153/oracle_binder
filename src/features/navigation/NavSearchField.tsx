import { useRef, useState, type FormEvent } from "react";
import QuickSearchIcon from "../../assets/icons/navigation/QuickSearchIcon.tsx";

type NavSearchFieldProps = {
  onSearch?: (query: string) => void;
  expanded?: boolean;
  expandOnSubmit?: boolean;
  onFocusChange?: (focused: boolean) => void;
  id?: string;
};

/**
 * Compact name search. Enter (or tapping the torch icon) submits.
 * An empty query is treated as "surprise me" and routes to a random card.
 *
 * onSearch(query: string) — parent decides how to route:
 *   query === ""  -> navigate('/search/random')
 *   query !== ""  -> navigate(`/search?q=${encodeURIComponent(query)}`)
 */
export default function NavSearchField({
  onSearch,
  expanded = false,
  expandOnSubmit = false,
  onFocusChange,
  id,
}: NavSearchFieldProps) {
  const [value, setValue] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    inputRef.current?.blur();
    onSearch?.(value.trim());
  }

  return (
    <form
      ref={formRef}
      className={`nav-search${expanded ? " nav-search--expanded" : ""}`}
      onSubmit={submit}
      role="search"
    >
      <button
        type={expandOnSubmit ? "button" : "submit"}
        className="nav-search__glyph"
        aria-label={value.trim() ? "Search for card" : "Random card"}
        title={value.trim() ? "Search" : "Random card"}
        onPointerDown={(event) => {
          if (expandOnSubmit) event.preventDefault();
        }}
        onClick={() => {
          if (!expandOnSubmit) return;
          if (expanded) {
            formRef.current?.requestSubmit();
          } else {
            inputRef.current?.focus();
          }
        }}
      >
        <QuickSearchIcon />
      </button>
      <input
        ref={inputRef}
        id={id}
        className="nav-search__input"
        type="search"
        inputMode="search"
        placeholder="Find a card, or leave blank…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.currentTarget.blur();
        }}
        aria-label="Quick card name search"
      />
    </form>
  );
}
