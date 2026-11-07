import type { SearchSource } from "../search/types.ts";

export type NavBarProps = {
  searchSource: SearchSource;
  onSearchSourceToggle: () => void;
  onSearch: (query: string) => void;
  isAuthenticated: boolean;
  isSigningOut: boolean;
  onLogout: () => void;
};
