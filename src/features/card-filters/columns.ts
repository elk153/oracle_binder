import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";
import {
  binderPlaceFilterValue,
  deckPlaceFilterValue,
} from "./types.ts";
import type { CardColor, CardPlaces, ScryfallCard } from "./types.ts";

// Features are opt-in in v9: register only what the table uses.
// Keep this at module level so its reference never changes.
export const features = tableFeatures({
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const RARITY_RANK: Record<string, number> = { common: 0, uncommon: 1, rare: 2, mythic: 3 };

// Double-faced cards keep their colors on the faces, so fall back to the front face.
const getColors = (card: ScryfallCard): CardColor[] =>
  card.colors ?? card.card_faces?.[0]?.colors ?? [];

const getTypeLine = (card: ScryfallCard): string =>
  card.type_line ?? card.card_faces?.[0]?.type_line ?? "";

const helper = createColumnHelper<typeof features, ScryfallCard>();

function placeNames(cardId: string, cardPlaces?: CardPlaces): string[] {
  const place = cardPlaces?.get(cardId);
  return [
    ...(place?.binders.map((binder) => binder.name) ?? []),
    ...(place?.decks.map((deck) => deck.name) ?? []),
  ].sort((a, b) => a.localeCompare(b));
}

// A column = how to read a value from a card + how it filters/sorts.
// filterFn(row, columnId, filterValue) returns true to KEEP the row.
export function createColumns(cardPlaces?: CardPlaces) {
  return helper.columns([
    helper.accessor((card) => card.name, { id: "name" }),
    helper.accessor((card) => getColors(card), {
      id: "colors",
      filterFn: (row, columnId, selected: string[]) => {
        const colors = row.getValue<CardColor[]>(columnId);
        return selected.some((c) =>
          c === "C" ? colors.length === 0 : colors.includes(c as CardColor),
        );
      },
    }),
    helper.accessor((card) => getTypeLine(card), {
      id: "type",
      filterFn: (row, columnId, text: string) =>
        row.getValue<string>(columnId).toLowerCase().includes(text.toLowerCase()),
    }),
    helper.accessor((card) => card.cmc ?? 0, { id: "cmc" }),
    helper.accessor((card) => RARITY_RANK[card.rarity] ?? -1, {
      id: "rarity",
      filterFn: (row, _columnId, selected: string[]) =>
        selected.includes(row.original.rarity),
    }),
    helper.accessor((card) => (card.prices?.eur ? Number(card.prices.eur) : undefined), {
      id: "price",
      sortUndefined: "last",
    }),
    helper.accessor(
      (card) => placeNames(card.id, cardPlaces)[0] ?? "",
      {
        id: "place",
        sortFn: (rowA, rowB, columnId) =>
          rowA.getValue<string>(columnId).localeCompare(
            rowB.getValue<string>(columnId),
          ),
        filterFn: (row, _columnId, selected: string[]) => {
          const place = cardPlaces?.get(row.original.id);
          return selected.some(
            (value) =>
              place?.binders.some(
                (binder) => binderPlaceFilterValue(binder.id) === value,
              ) ||
              place?.decks.some((deck) => deckPlaceFilterValue(deck.id) === value),
          );
        },
      },
    ),
    helper.accessor((card) => card.id, {
      id: "kind",
      filterFn: (row, _columnId, selected: string[]) => {
        const place = cardPlaces?.get(row.original.id);
        return selected.some((kind) => {
          if (kind === "favorite") return place?.favorite ?? false;
          if (kind === "owned") {
            return Boolean(
              place?.binders.length ||
                place?.decks.some((deck) => deck.kind === "binder"),
            );
          }
          return place?.decks.some((deck) => deck.kind === kind) ?? false;
        });
      },
    }),
  ]);
}

export const columns = createColumns();
