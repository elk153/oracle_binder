import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import NavBarDesktop from "./NavBarDesktop.tsx";
import NavBarMobile from "./NavBarMobile.tsx";
import type { SearchSource } from "../search/types.ts";
import "./navbar-shared.css";
import "./navbar-desktop.css";
import "./navbar-mobile.css";

/**
 * Drop <NavBar /> once, near the root of the app (inside the Router).
 * Both bars render in the DOM; navbar-desktop.css / navbar-mobile.css
 * use the same breakpoint to show exactly one of them at a time, so
 * there's no layout-shift flash from a JS-driven media query check.
 */
export default function NavBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const searchSource: SearchSource =
    searchParams.get("source") === "collection" ? "collection" : "scryfall";
  const isCollectionMode = searchSource === "collection";

  function handleSearch(query: string) {
    const next = new URLSearchParams(searchParams);
    if (query) {
      next.set("q", query);
    } else {
      next.delete("q");
    }

    if (isCollectionMode) {
      next.set("source", "collection");
      navigate(`search?${next.toString()}`);
      return;
    }

    next.delete("source");
    navigate(query ? `search?${next.toString()}` : "search/random");
  }

  function toggleSearchSource() {
    const next = new URLSearchParams(searchParams);
    if (isCollectionMode) {
      next.delete("source");
    } else {
      next.set("source", "collection");
    }
    setSearchParams(next, { preventScrollReset: true });
  }

  async function handleLogout() {
    setLogoutError("");
    setIsSigningOut(true);

    try {
      const { error } = await signOut();
      if (error) {
        setLogoutError(error.message);
        return;
      }

      navigate("/v2/home", { replace: true });
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Sign-out could not be completed.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  const navProps = {
    searchSource,
    onSearchSourceToggle: toggleSearchSource,
    onSearch: handleSearch,
    isAuthenticated: Boolean(user),
    isSigningOut,
    onLogout: () => void handleLogout(),
  };

  return (
    <>
      <NavBarDesktop {...navProps} />
      <NavBarMobile {...navProps} />
      {logoutError && (
        <p className="nav-mode-notice" role="alert">
          Could not log out: {logoutError}
        </p>
      )}
    </>
  );
}
