export const binderCopiesQueryKey = (userId?: string) =>
  ["binderCopies", userId] as const;

export const deckCardsQueryKey = (userId?: string) =>
  ["deckCards", userId] as const;
