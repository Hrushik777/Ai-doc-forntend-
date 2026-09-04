import { motion } from "motion/react";
import Icon from "./ui/Icon";

const TONES = {
  success: { icon: "check", role: "status", live: "polite" },
  partial: { icon: "alert", role: "status", live: "polite" },
  error: { icon: "error", role: "alert", live: "assertive" },
  warning: { icon: "alert", role: "status", live: "polite" },
  info: { icon: "info", role: "status", live: "polite" },
};

/**
 * The one place the product tells the user how something went.
 *
 * Errors from the API layer are written as multi-paragraph explanations with a
 * diagnosis and a fix, so blank lines are rendered as real paragraphs instead
 * of being collapsed into one wall of text.
 *
 * An error is assertive because the user's run just stopped and they need to
 * know now; everything else is polite so it does not interrupt them mid-task.
 */
export default function StatusBanner({
  tone = "info",
  title,
  message,
  children,
  actions,
  onDismiss,
}) {
  const config = TONES[tone] ?? TONES.info;
  const paragraphs = typeof message === "string" ? message.split(/\n{2,}/) : [];

  return (
    <motion.div
      className={`banner banner--${tone}`}
      role={config.role}
      aria-live={config.live}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      // Faster on the way out than in: a banner being dismissed should not
      // make the user wait to see what is underneath it.
      exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="banner__icon" aria-hidden="true">
        <Icon name={config.icon} size={17} strokeWidth={2} />
      </span>

      <div className="banner__body">
        {title && <p className="banner__title">{title}</p>}

        {paragraphs.map((paragraph, index) => (
          <p className="banner__text" key={index}>
            {paragraph}
          </p>
        ))}

        {children}

        {actions && <div className="banner__actions">{actions}</div>}
      </div>

      {onDismiss && (
        <button type="button" className="banner__dismiss" aria-label="Dismiss" onClick={onDismiss}>
          <Icon name="close" size={14} strokeWidth={2} />
        </button>
      )}
    </motion.div>
  );
}
