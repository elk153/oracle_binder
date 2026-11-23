import HomeIcon from "../../assets/icons/navigation/HomeIcon.tsx";
import AdvancedSearchIcon from "../../assets/icons/navigation/AdvancedSearchIcon.tsx";
import ScanIcon from "../../assets/icons/navigation/ScanIcon.tsx";
import FavoritesIcon from "../../assets/icons/navigation/FavoritesIcon.tsx";
import BinderIcon from "../../assets/icons/navigation/BinderIcon.tsx";
import DecksIcon from "../../assets/icons/navigation/DecksIcon.tsx";
import { lazyPages } from "../../app/lazyPages.ts";

// Single source of truth for the 6 options. Both NavBarDesktop and
// NavBarMobile map over this so labels/icons/paths never drift apart.
// `preload` (D-071) downloads the page's code; the bars call it when the
// pointer enters an item or it gets keyboard focus, so the code is usually
// there before the click. Home and Search are in the main chunk: no preload.
const navItems = [
  { id: "home", label: "Home", path: "home", Icon: HomeIcon },
  { id: "search", label: "Search", path: "search", Icon: AdvancedSearchIcon },
  { id: "scan", label: "Scan", path: "scan", preload: lazyPages.scan, Icon: ScanIcon },
  { id: "favorites", label: "Favorites", path: "favorites", preload: lazyPages.favorites, Icon: FavoritesIcon },
  { id: "binder", label: "Binder", path: "binder", preload: lazyPages.binder, Icon: BinderIcon },
  { id: "decks", label: "Decks", path: "decks", preload: lazyPages.decks, Icon: DecksIcon },
];

export default navItems;

/**
 * Starts downloading a page's code, if the nav item has a loader. A failed
 * download is ignored here: the route loads the code again on navigation and
 * shows its own error if that fails too. Repeated calls are cheap, because the
 * browser keeps a module once it has loaded it.
 */
export function preloadPage(preload: (() => Promise<unknown>) | undefined) {
  preload?.().catch(() => undefined);
}
