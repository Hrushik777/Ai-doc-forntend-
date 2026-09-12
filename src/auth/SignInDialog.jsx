import { useCallback, useEffect, useRef } from "react";
import { motion } from "motion/react";

/**
 * Renders Google's own Sign in with Google button.
 *
 * This exists rather than calling google.accounts.id.prompt() because prompt()
 * shows One Tap, which is not a sign-in button: the browser can suppress it
 * outright — a previous dismissal, blocked third-party cookies, a private window —
 * and under FedCM the callbacks reporting that it was suppressed are deprecated
 * and can arrive up to a minute late, or not at all. A user who pressed Process
 * would be left watching nothing happen with no way to proceed.
 *
 * renderButton is the supported path for an explicit sign-in, and it cannot be
 * silently suppressed: either the button is on screen or the script failed to load,
 * and the second case is visible.
 */
export default function SignInDialog({ googleId, clientId, onCancel }) {
  const buttonRef = useRef(null);
  const headingId = "signin-heading";

  useEffect(() => {
    if (!buttonRef.current) return;
    googleId.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      // Google sizes the iframe itself; matching the dialog keeps it from
      // rendering narrower than the surrounding card.
      width: 280,
    });
  }, [googleId, clientId]);

  // Escape closes it, like any other dismissible dialog. Cancelling is a decision,
  // not a failure, and the caller treats it as one.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const onBackdropClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) onCancel();
    },
    [onCancel]
  );

  return (
    <motion.div
      className="signin-backdrop"
      onClick={onBackdropClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="signin-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
      >
        <h2 id={headingId} className="signin-card__title">
          Sign in to process
        </h2>
        <p className="signin-card__body">
          Reading a document runs it through an AI pipeline, so this step needs an
          account. Your selected files are still here and will be processed as soon
          as you are signed in.
        </p>

        <div className="signin-card__button" ref={buttonRef} />

        <button type="button" className="linkbtn" onClick={onCancel}>
          Not now
        </button>
      </motion.div>
    </motion.div>
  );
}
