import { useEffect, useState } from "react";
import { useIsFetching, useIsRestoring } from "@tanstack/react-query";

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Runs `callback` when the browser has a quiet moment. Uses
 * `requestIdleCallback` where it exists and a short timer elsewhere (Safari).
 * Returns a function that cancels the call.
 */
function whenBrowserIdle(callback: () => void): () => void {
  const idleWindow = window as IdleWindow;
  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 3000 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }
  const timer = window.setTimeout(callback, 300);
  return () => window.clearTimeout(timer);
}

// Longest wait for images; a stalled image must not hold back the background
// work forever. Generous, because on a slow phone network the hand of the day
// takes about 10 s to load (D-071 measurements).
const IMAGE_WAIT_LIMIT_MS = 15_000;

// Height is not checked: an image that is still loading can be 0 px high
// (the card tiles get their height from the image itself).
function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.bottom >= 0 && rect.top < window.innerHeight;
}

/**
 * Runs `callback` once every image the user can see in `<main>` has loaded
 * (or failed). Images below the fold are ignored: with `loading="lazy"` they
 * may never load. The callback gets `true` when it had to wait for at least
 * one image. Returns a function that cancels the wait.
 */
function whenVisibleImagesLoaded(
  callback: (hadToWait: boolean) => void,
): () => void {
  const pending = Array.from(document.querySelectorAll("main img")).filter(
    (image): image is HTMLImageElement =>
      image instanceof HTMLImageElement && !image.complete && isInViewport(image),
  );
  if (pending.length === 0) {
    callback(false);
    return () => {};
  }

  let remaining = pending.length;
  const cleanup = () => {
    window.clearTimeout(timer);
    for (const image of pending) {
      image.removeEventListener("load", handleSettled);
      image.removeEventListener("error", handleSettled);
    }
  };
  const finish = () => {
    cleanup();
    callback(true);
  };
  function handleSettled() {
    remaining -= 1;
    if (remaining === 0) finish();
  }
  const timer = window.setTimeout(finish, IMAGE_WAIT_LIMIT_MS);
  for (const image of pending) {
    image.addEventListener("load", handleSettled);
    image.addEventListener("error", handleSettled);
  }
  return cleanup;
}

// Pause between the two image checks in whenScreenSettled.
const SETTLE_CHECK_GAP_MS = 300;

/**
 * Runs `callback` when the browser is idle and no image on screen is still
 * loading, twice in a row, `SETTLE_CHECK_GAP_MS` apart. One check is not
 * enough: TanStack Query hands new data to React in a later task, so right
 * after the last fetch ends the hand of the day's images may not be on the
 * page yet. Waiting for images restarts the count.
 */
function whenScreenSettled(callback: () => void): () => void {
  let cancel = () => {};
  const check = (cleanChecks: number) => {
    cancel = whenBrowserIdle(() => {
      cancel = whenVisibleImagesLoaded((hadToWait) => {
        if (hadToWait) {
          check(0);
        } else if (cleanChecks + 1 >= 2) {
          callback();
        } else {
          const timer = window.setTimeout(
            () => check(cleanChecks + 1),
            SETTLE_CHECK_GAP_MS,
          );
          cancel = () => window.clearTimeout(timer);
        }
      });
    });
  };
  check(0);
  return () => cancel();
}

/**
 * Becomes `true` once the first screen is done: the persisted cache is
 * restored, no query is fetching any more (so Home's hand of the day has its
 * data), the images on screen have loaded, and the browser is idle. It never
 * goes back to `false`.
 *
 * Use it to start "shadow time" work that the first screen does not need
 * (D-071), so that work does not compete with the first screen for bandwidth,
 * including the card images, which are not queries.
 */
export default function useBackgroundReady(): boolean {
  const isRestoring = useIsRestoring();
  const fetchingCount = useIsFetching();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isReady || isRestoring || fetchingCount > 0) return;
    // If a new fetch starts before the screen settles, this effect re-runs
    // and the cleanup cancels the pending wait.
    return whenScreenSettled(() => setIsReady(true));
  }, [isReady, isRestoring, fetchingCount]);

  return isReady;
}
