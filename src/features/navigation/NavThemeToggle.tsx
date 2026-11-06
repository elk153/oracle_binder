import { useTheme } from "../../app/AppProviders/ThemeContext.ts";
import NavMoonIcon from "../../assets/icons/navigation/NavMoonIcon.tsx";
import NavSunIcon from "../../assets/icons/navigation/NavSunIcon.tsx";
import "./NavThemeToggle.css";

/**
 * Switches the whole app between the dark and light theme.
 *
 * The state lives in ThemeProvider (shared through React context). This
 * button only reads it with the `useTheme` custom hook and asks for the
 * other value; ThemeProvider then updates <html data-theme="...">, and
 * theme.css recolors everything that uses the CSS variables.
 *
 * The icon shows the theme you will GET when you click, and the
 * aria-label says the same in words for screen readers.
 */
export default function NavThemeToggle() {
  const { theme, setTheme } = useTheme();

  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = `Switch to ${nextTheme} theme`;

  return (
    <button
      type="button"
      className="nav-theme-toggle"
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      title={label}
    >
      {nextTheme === "light" ? <NavSunIcon /> : <NavMoonIcon />}
    </button>
  );
}
