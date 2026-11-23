import { useEffect, useState } from "react";

export type MobileNavbarPlacement = {
  /** True while the mobile bar is shown (CSS decides; see NavBar.tsx). */
  shown: boolean;
  /** Distance in px from the viewport bottom to the bar's top edge. */
  clearance: number;
};

/**
 * Tells other parts of the app whether the mobile navbar is shown and how
 * much room it takes at the bottom (D-080: the notification stack sits
 * above it). It follows the bar itself, not a viewport breakpoint: both bars
 * are always in the page, and a ResizeObserver fires when the CSS switches
 * this one between `display: none` and shown. The bar's scroll-hide uses a
 * transform, which does not change these numbers, so the stack does not
 * jump while scrolling.
 */
export default function useMobileNavbar(): MobileNavbarPlacement {
  const [placement, setPlacement] = useState<MobileNavbarPlacement>({
    shown: false,
    clearance: 0,
  });

  useEffect(() => {
    const bar = document.querySelector<HTMLElement>('[data-navbar="mobile"]');
    if (!bar) return;

    const update = () => {
      const shown = bar.getClientRects().length > 0;
      const bottom = Number.parseFloat(getComputedStyle(bar).bottom) || 0;
      const clearance = shown ? Math.round(bottom + bar.offsetHeight) : 0;
      setPlacement((current) =>
        current.shown === shown && current.clearance === clearance
          ? current
          : { shown, clearance },
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return placement;
}
