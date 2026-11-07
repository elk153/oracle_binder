import { resolvePath, useLocation, useNavigate, useResolvedPath } from "react-router";
import navItems from "./navItems";
import type { NavBarProps } from "./types.ts";
import NavThemeToggle from "./NavThemeToggle.tsx";
import LogoutIcon from "../../assets/icons/navigation/LogoutIcon.tsx";
import useScrollVisibility from "../../hooks/useScrollVisibility";

export default function NavBarMobile({
  isAuthenticated,
  isSigningOut,
  onLogout,
}: NavBarProps) {
  const scrollVisible = useScrollVisibility({ threshold: 10, topGuard: 40 });
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const routeBasePath = useResolvedPath(".").pathname;

  return (
    <nav
      className={`nav-bar nav-bar--mobile nav-surface${scrollVisible ? "" : " nav-bar--hidden"}`}
      data-visible={scrollVisible}
      aria-label="Primary"
    >
      <div className="nav-bar__row">
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
          <li>
            <NavThemeToggle />
          </li>
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
