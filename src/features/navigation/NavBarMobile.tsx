import { useState } from "react";
import { resolvePath, useLocation, useNavigate, useResolvedPath } from "react-router";
import navItems from "./navItems";
import NavSearchField from "./NavSearchField";
import SearchSourceToggle from "../search/SearchSourceToggle.tsx";
import type { NavBarProps } from "./types.ts";
import NavThemeToggle from "./NavThemeToggle.tsx";
import LogoutIcon from "../../assets/icons/navigation/LogoutIcon.tsx";
import useScrollVisibility from "../../hooks/useScrollVisibility";

export default function NavBarMobile({
  searchSource,
  onSearchSourceToggle,
  onSearch,
  isAuthenticated,
  isSigningOut,
  onLogout,
}: NavBarProps) {
  const scrollVisible = useScrollVisibility({ threshold: 10, topGuard: 40 });
  const [searchFocused, setSearchFocused] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const routeBasePath = useResolvedPath(".").pathname;

  // Keep the bar on-screen while the person is actively typing in it,
  // even if a scroll event fires (e.g. page reflow on keyboard open).
  const visible = scrollVisible || searchFocused;

  return (
    <nav
      className={`nav-bar nav-bar--mobile nav-surface${visible ? "" : " nav-bar--hidden"}${searchFocused ? " nav-bar--search-focused" : ""}`}
      data-visible={visible}
      aria-label="Primary"
    >
      <div className="nav-bar__row">
        <NavThemeToggle />
        <SearchSourceToggle
          value={searchSource}
          onToggle={onSearchSourceToggle}
        />
        <NavSearchField
          onSearch={onSearch}
          expanded={searchFocused}
          expandOnSubmit
          onFocusChange={setSearchFocused}
          id="nav-search-mobile"
        />

        <ul className="nav-bar__list">
          {navItems.map(({ id, label, path, Icon }) => {
            const isActive = pathname === resolvePath(path, routeBasePath).pathname;
            return (
              <li key={id}>
                <button
                  type="button"
                  className={`nav-item${isActive ? " is-active" : ""}`}
                  onClick={() => navigate(path)}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={label}
                >
                  <Icon />
                </button>
              </li>
            );
          })}
          {isAuthenticated && (
            <li>
              <button
                type="button"
                className="nav-item"
                onClick={onLogout}
                disabled={isSigningOut}
                aria-label={isSigningOut ? "Logging out" : "Log out"}
                title={isSigningOut ? "Logging out" : "Log out"}
              >
                <LogoutIcon />
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
