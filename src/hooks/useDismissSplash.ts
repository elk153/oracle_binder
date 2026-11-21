import { useEffect } from "react";

declare global {
  interface Window {
    reactIsReady: boolean;
  }
}

/**
 * Fades out the splash screen from index.html and reveals #root (the
 * `.ready` / `.visible` handshake described in src/styles/splash.css).
 *
 * Every top-level screen must call it: the app layout (App.tsx) and the route
 * error page, which replaces the layout when a route fails. Calling it again
 * after the splash is gone changes nothing, because the classes are already
 * set.
 */
export default function useDismissSplash(): void {
  useEffect(() => {
    window.reactIsReady = true;

    const splashLogo = document.getElementById("splash-logo");
    const splashBackground = document.getElementById("splash-background");
    const root = document.getElementById("root");

    if (!splashLogo || !splashBackground || !root) {
      return;
    }

    // Trigger the visual transition: both splash background and logo
    // will transition their opacity to the same level to keep a uniform color.
    splashBackground.classList.add("ready");
    splashLogo.classList.add("ready");

    const handleTransitionEnd = (event: TransitionEvent): void => {
      if (event.target !== splashBackground || event.propertyName !== "opacity") return;

      // Reveal the app root and move the splash behind the app content
      root.classList.add("visible");
      splashBackground.classList.add("background");

      // Clean up listener
      splashBackground.removeEventListener("transitionend", handleTransitionEnd);
    };

    // Attach to splashBackground so we observe the container opacity end
    splashBackground.addEventListener("transitionend", handleTransitionEnd);

    return () => {
      splashBackground.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, []);
}
