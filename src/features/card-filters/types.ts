// Only the Scryfall fields the filters need. Scryfall sends many more.
export type CardColor = "W" | "U" | "B" | "R" | "G";

export type ScryfallCard = {
  id: string;
  name: string;
  cmc?: number;
  type_line?: string;
  rarity: string;
  colors?: CardColor[]; // missing on double-faced cards
  prices?: { eur?: string | null };
  card_faces?: Array<{ colors?: CardColor[]; type_line?: string }>;
};

export type CardPlace = {
  id: string;
  name: string;
};

export type CardPlaceDeck = CardPlace & {
  kind: "binder" | "proxy" | "virtual";
};

export type CardPlaceEntry = {
  favorite: boolean;
  binders: CardPlace[];
  decks: CardPlaceDeck[];
};

export type CardPlaces = ReadonlyMap<string, CardPlaceEntry>;

export const binderPlaceFilterValue = (binderId: string) =>
  `binder:${binderId}`;
export const deckPlaceFilterValue = (deckId: string) => `deck:${deckId}`;
