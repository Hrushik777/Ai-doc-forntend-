import { AnimatePresence, motion } from "motion/react";
import Icon from "./ui/Icon";
import { useTheme } from "../theme/theme-context";

const NEXT_LABEL = {
  light: "Switch to system theme",
  dark: "Switch to light theme",
  system: "Switch to dark theme",
};

const ICON_FOR = { light: "sun", dark: "moon", system: "monitor" };

/**
 * Cycles light → system → dark → light.
 *
 * The icon shows the *current* setting rather than the one a press would move
 * to, and the accessible name says what pressing it does — a toggle that shows
 * its destination leaves people unsure which state they are actually in.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={NEXT_LABEL[theme]}
      title={NEXT_LABEL[theme]}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          className="theme-toggle__icon"
          initial={{ opacity: 0, rotate: -35, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 35, scale: 0.7 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <Icon name={ICON_FOR[theme]} size={17} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
