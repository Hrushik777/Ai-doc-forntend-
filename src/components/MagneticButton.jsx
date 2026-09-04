import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

/**
 * Pulls its contents toward the cursor, then springs back when the pointer
 * leaves.
 *
 * The pull is a motion value written directly by the pointer handler, so
 * nothing re-renders while the mouse moves. The release is a real spring rather
 * than a fixed elastic curve: it inherits whatever velocity the pointer had on
 * the way out, which is what makes a flick feel different from a slow drift.
 *
 * Wraps rather than replaces the control inside it, so the button keeps its own
 * semantics, focus ring and keyboard behaviour untouched. A keyboard user gets
 * no magnetism and loses nothing — there is no pointer to be magnetic toward.
 */
export default function MagneticButton({
  children,
  strength = 0.35,
  tilt = 10,
  className = "",
}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  // Low damping so the return overshoots slightly and settles — the spring
  // equivalent of the reference's elastic.out(1, 0.3).
  const springConfig = { stiffness: 210, damping: 13, mass: 0.7 };
  const x = useSpring(offsetX, springConfig);
  const y = useSpring(offsetY, springConfig);

  const rotateX = useTransform(y, (value) => (-value / 40) * tilt);
  const rotateY = useTransform(x, (value) => (value / 40) * tilt);

  const handlePointerMove = (event) => {
    if (reduced || event.pointerType === "touch") return;
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    offsetX.set((event.clientX - rect.left - rect.width / 2) * strength);
    offsetY.set((event.clientY - rect.top - rect.height / 2) * strength);
  };

  const release = () => {
    offsetX.set(0);
    offsetY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`magnetic ${className}`.trim()}
      style={reduced ? undefined : { x, y, rotateX, rotateY }}
      onPointerMove={handlePointerMove}
      onPointerLeave={release}
      // Releasing on pointer-up as well stops the control sticking to the
      // cursor's last position after a tap on a hybrid touch/trackpad device.
      onPointerUp={release}
      whileHover={reduced ? undefined : { scale: 1.04 }}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}
