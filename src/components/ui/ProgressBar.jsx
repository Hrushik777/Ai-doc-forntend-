import { motion } from "motion/react";

/**
 * Determinate when `value` is a number, indeterminate when it is null.
 *
 * The distinction is load-bearing in this product: upload progress is measured
 * in real bytes, while the server's processing phase reports nothing at all. A
 * bar that crept forward on a timer during the second phase would be inventing
 * information, so it visibly loops instead.
 */
export default function ProgressBar({
  value = null,
  tone = "accent",
  size = "md",
  label,
  className = "",
}) {
  const isIndeterminate = value === null;
  const clamped = isIndeterminate ? 0 : Math.min(100, Math.max(0, value));

  return (
    <div
      className={`progress progress--${size} progress--${tone} ${
        isIndeterminate ? "progress--indeterminate" : ""
      } ${className}`.trim()}
      role="progressbar"
      aria-label={label}
      aria-valuemin={isIndeterminate ? undefined : 0}
      aria-valuemax={isIndeterminate ? undefined : 100}
      aria-valuenow={isIndeterminate ? undefined : Math.round(clamped)}
      aria-valuetext={isIndeterminate ? "Working" : `${Math.round(clamped)}%`}
    >
      {isIndeterminate ? (
        <span className="progress__loop" />
      ) : (
        <motion.span
          className="progress__fill"
          initial={false}
          animate={{ width: `${clamped}%` }}
          transition={{ type: "spring", stiffness: 220, damping: 32, mass: 0.6 }}
        />
      )}
    </div>
  );
}
