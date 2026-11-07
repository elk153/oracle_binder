import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { QueryClient, Query } from "@tanstack/react-query";
import type { ReactNode } from "react";

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

const dehydrateOptions = {
  shouldDehydrateQuery: (query: Query) =>
    (query.queryKey[0] === "fetchedUrl" &&
      query.queryKey[1] !== "cardNames") ||
    (query.queryKey[0] === "scryfallCards" &&
      query.queryKey[1] === "cards/search"),
};

type PersistenceProviderProps = {
  queryClient: QueryClient;
  children: ReactNode;
};

export default function PersistenceProvider({
  queryClient,
  children,
}: PersistenceProviderProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        dehydrateOptions,
      }}
      onSuccess={() => {
        console.log("✅ Cache restored from localStorage");
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

// in browser console code to check the persisted cache in localStorage
// JSON.parse(localStorage.getItem("REACT_QUERY_OFFLINE_CACHE"))
