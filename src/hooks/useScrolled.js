import { useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";

/**
 * True once the page has scrolled past `threshold`.
 *
 * Reads scroll through a motion value and only calls setState when the boolean
 * actually flips, so the component re-renders twice for a whole page of
 * scrolling rather than on every frame. A plain scroll listener writing scrollY
 * into state would re-render the entire app tree continuously.
 */
export default function useScrolled(threshold = 32) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (value) => {
    const next = value > threshold;
    setScrolled((current) => (current === next ? current : next));
  });

  return scrolled;
}
