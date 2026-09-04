import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a media query from JS.
 *
 * Needed where a CSS media query is not enough — the mapping visualizer draws
 * its connector lines from measured DOM coordinates, so on a stacked layout
 * they have to stop being *rendered*, not merely hidden. A `display: none` SVG
 * would still be measured and still cost work on every resize.
 *
 * useSyncExternalStore rather than useState + useEffect: matchMedia is exactly
 * the external store it exists for, and it reads the current value during
 * render instead of after a first paint at the wrong breakpoint.
 */
export default function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // Server/prerender has no matchMedia; the wide layout is the safe assumption
  // because it is what the desktop-first grid already declares.
  const getServerSnapshot = useCallback(() => true, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
