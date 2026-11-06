import HomeIcon from "../../assets/icons/navigation/HomeIcon.tsx";
import AdvancedSearchIcon from "../../assets/icons/navigation/AdvancedSearchIcon.tsx";
import FavoritesIcon from "../../assets/icons/navigation/FavoritesIcon.tsx";
import BinderIcon from "../../assets/icons/navigation/BinderIcon.tsx";
import DecksIcon from "../../assets/icons/navigation/DecksIcon.tsx";

// Single source of truth for the 5 options. Both NavBarDesktop and
// NavBarMobile map over this so labels/icons/paths never drift apart.
const navItems = [
  { id: "home", label: "Home", path: "home", Icon: HomeIcon },
  { id: "advanced-search", label: "Search", path: "search/advanced", Icon: AdvancedSearchIcon },
  { id: "favorites", label: "Favorites", path: "favorites", Icon: FavoritesIcon },
  { id: "binder", label: "Binder", path: "binder", Icon: BinderIcon },
  { id: "decks", label: "Decks", path: "decks", Icon: DecksIcon },
];

export default navItems;
