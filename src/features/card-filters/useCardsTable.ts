import { useMemo } from "react";
import { useQueryStates } from "nuqs";
import { useTable } from "@tanstack/react-table";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { createColumns, features } from "./columns.ts";
import { filterParsers } from "./filterParams.ts";
import type { CardPlaces, ScryfallCard } from "./types.ts";

export function useCardsTable<TCard extends ScryfallCard>(
  cards: TCard[] | undefined,
  cardPlaces?: CardPlaces,
) {
  const noCards = useMemo<TCard[]>(() => [], []);
  const tableColumns = useMemo(
    () => createColumns(cardPlaces),
    [cardPlaces],
  );
  // 1. URL state (source of truth). Same shape as useState: [values, setter].
  const [filters, setFilters] = useQueryStates(filterParsers);

  // 2. Translate URL state into TanStack Table state.
  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const active: ColumnFiltersState = [];
    if (filters.colors.length) active.push({ id: "colors", value: filters.colors });
    if (filters.rarity.length) active.push({ id: "rarity", value: filters.rarity });
    if (filters.type.trim()) active.push({ id: "type", value: filters.type.trim() });
    if (cardPlaces && filters.place.length) active.push({ id: "place", value: filters.place });
    if (cardPlaces && filters.kind.length) active.push({ id: "kind", value: filters.kind });
    return active;
  }, [cardPlaces, filters.colors, filters.kind, filters.place, filters.rarity, filters.type]);

  const sorting = useMemo<SortingState>(
    () =>
      filters.sort && (filters.sort !== "place" || cardPlaces)
        ? [{ id: filters.sort, desc: filters.dir === "desc" }]
        : [],
    [cardPlaces, filters.sort, filters.dir],
  );

  // 3. The table is "controlled": it reads our state instead of keeping its own.
  //    The URL is the only place state is written, so the data flow is one-way.
  const table = useTable({
    features,
    columns: tableColumns,
    data: cards ?? noCards,
    state: { columnFilters, sorting },
  });

  const resetFilters = () =>
    setFilters({
      colors: null,
      rarity: null,
      type: null,
      place: null,
      kind: null,
      sort: null,
      dir: null,
    });

  return { table, filters, setFilters, resetFilters };
}
