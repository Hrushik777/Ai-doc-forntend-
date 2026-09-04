import { useCallback, useRef } from "react";

/**
 * Tracks the pointer across an element so a highlight can follow it.
 *
 * The position is written straight onto the node as CSS custom properties
 * rather than held in React state. A card that re-rendered on every pointermove
 * would re-render its whole subtree dozens of times a second for a purely
 * decorative glow — this way the browser does the work in the compositor and
 * React never hears about it.
 *
 * Returns a props bundle meant to be spread onto the element, alongside the
 * `.spotlight` class, which reads --spot-x / --spot-y / --spot-on:
 *
 *   const spot = useSpotlight();
 *   <div {...spot} className="panel spotlight" />
 */
export default function useSpotlight() {
  const ref = useRef(null);

  const onPointerMove = useCallback((event) => {
    const node = ref.current;
    if (!node) return;

    // Coarse pointers have no hover, so a glow chasing a tap is just noise.
    if (event.pointerType === "touch") return;

    const rect = node.getBoundingClientRect();
    node.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    node.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    node.style.setProperty("--spot-on", "1");
  }, []);

  const onPointerLeave = useCallback(() => {
    ref.current?.style.setProperty("--spot-on", "0");
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
