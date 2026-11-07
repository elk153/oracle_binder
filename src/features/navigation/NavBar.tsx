import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import NavBarDesktop from "./NavBarDesktop.tsx";
import NavBarMobile from "./NavBarMobile.tsx";
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
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

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
