import { useQuery } from "@tanstack/react-query";
import createApiClient, { type ApiParams, type ApiRecord } from "../../services/createApiClient.ts";

const scryfallClient = createApiClient("https://api.scryfall.com");

export default function useScryfallCardsSearch(
  routeParam: string | null | undefined,
  queryParam: ApiParams = {},
  seedParam = 0,
  staleTimeInSeconds = 86400,
) {
  return useQuery<ApiRecord[], Error>({
    queryKey: ["scryfallCards", routeParam, queryParam, seedParam],
    queryFn: () => scryfallClient.fetchData(routeParam ?? "", queryParam),
    enabled: Boolean(routeParam),
    staleTime: 1000 * staleTimeInSeconds,
  });
}
