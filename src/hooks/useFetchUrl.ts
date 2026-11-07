import { useQuery } from "@tanstack/react-query";
import type { StaleTimeInSeconds } from "./getSecondsUntilNextLocalFour.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default function useFetchUrl(
  dataPurpose: string,
  urlParam: string | null | undefined,
  staleTimeInSeconds: StaleTimeInSeconds = 86400,
) {
  return useQuery<unknown[], Error>({
    queryKey: ["fetchedUrl", dataPurpose, urlParam],
    queryFn: async () => {
      console.log(urlParam ? urlParam : "No url param");
      if (!urlParam) return [];

      const response = await fetch(urlParam, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`[API error] ${response.status} — ${response.statusText}`);
      }

      const json: unknown = await response.json();
      if (!isRecord(json) || !Array.isArray(json.data)) {
        throw new Error("[API error] Response did not contain a data list");
      }

      console.log(json.data);
      return json.data;
    },
    staleTime:
      typeof staleTimeInSeconds === "function"
        ? (query) => 1000 * staleTimeInSeconds(query)
        : 1000 * staleTimeInSeconds,
  });
}
