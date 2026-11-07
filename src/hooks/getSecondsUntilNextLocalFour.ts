export type StaleTimeQuery = {
  state: {
    dataUpdatedAt: number;
  };
};

export type StaleTimeInSeconds =
  | number
  | ((query: StaleTimeQuery) => number);

export default function getSecondsUntilNextLocalFour(query: StaleTimeQuery): number {
  const dataUpdatedAt = query.state.dataUpdatedAt;
  if (dataUpdatedAt === 0) return 0;

  const nextRefresh = new Date(dataUpdatedAt);
  nextRefresh.setHours(4, 0, 0, 0);
  if (nextRefresh.getTime() <= dataUpdatedAt) {
    nextRefresh.setDate(nextRefresh.getDate() + 1);
  }

  return (nextRefresh.getTime() - dataUpdatedAt) / 1000;
}
