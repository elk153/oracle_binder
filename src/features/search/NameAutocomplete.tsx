import { useId, useMemo } from "react";

type NameAutocompleteProps = {
  label: string;
  placeholder?: string;
  names: readonly string[];
  value: string;
  onChange: (value: string) => void;
};

export default function NameAutocomplete({
  label,
  placeholder = "Search card names",
  names,
  value,
  onChange,
}: NameAutocompleteProps) {
  const listId = `name-suggestions-${useId()}`;
  const suggestions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();
    if (query.length < 4) return [];

    const matches: string[] = [];
    const seen = new Set<string>();
    for (const name of names) {
      if (!seen.has(name) && name.toLocaleLowerCase().includes(query)) {
        seen.add(name);
        matches.push(name);
        if (matches.length === 20) break;
      }
    }
    return matches;
  }, [names, value]);

  return (
    <div className="name-autocomplete">
      <label htmlFor={listId}>{label}</label>
      <input
        id={listId}
        type="search"
        list={`${listId}-options`}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        autoComplete="off"
      />
      <datalist id={`${listId}-options`}>
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
