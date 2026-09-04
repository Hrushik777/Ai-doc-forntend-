import { AnimatePresence, motion } from "motion/react";
import Icon from "./ui/Icon";
import { formatDuration, pluralize } from "../utils/format";

/**
 * Live run state in the top bar.
 *
 * This is what replaced the product name and tagline sitting here. A name that
 * never changes is read once and then becomes furniture; the top bar is sticky,
 * so the one thing genuinely worth keeping in permanent view is what the run is
 * doing right now — visible after the user has scrolled past the stepper.
 *
 * Nothing here is new information: every value is already on screen somewhere
 * below. It is the same state, kept reachable.
 */
function describe({ stage, phase, uploadPercent, elapsedMs, documentCount, result, error }) {
  if (stage === "processing") {
    return phase === "uploading"
      ? { tone: "busy", text: `Uploading ${Math.round(uploadPercent)}%`, icon: null }
      : { tone: "busy", text: `Processing · ${formatDuration(elapsedMs)}`, icon: null };
  }

  if (stage === "results") {
    if (error) return { tone: "danger", text: "Run failed", icon: "error" };

    const failed = result?.failedFiles?.length ?? 0;
    if (failed > 0) {
      return {
        tone: "warning",
        text: `${failed} of ${documentCount} failed`,
        icon: "alert",
      };
    }

    return {
      tone: "success",
      text: `${documentCount} ${pluralize(documentCount, "document")} done`,
      icon: "check",
    };
  }

  return null;
}

export default function TopbarStatus({ workflow }) {
  const status = describe(workflow);

  return (
    <AnimatePresence mode="wait">
      {status && (
        <motion.span
          key={status.text}
          className={`topstatus topstatus--${status.tone}`}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6, transition: { duration: 0.14 } }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          // The stepper below is the authoritative announcement; this mirror
          // would otherwise interrupt a screen reader twice for one change.
          aria-hidden="true"
        >
          {status.icon ? (
            <Icon name={status.icon} size={13} strokeWidth={2.2} />
          ) : (
            <span className="topstatus__pulse" />
          )}
          {status.text}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
