import { motion } from "motion/react";
import Icon from "./ui/Icon";
import { STEPS } from "../workflow/useWorkflow";

/** Steps that mean "go back and change the inputs" when clicked. */
const NAVIGABLE = new Set(["documents", "template"]);

/**
 * Where the user is in the run: Documents → Template → Processing → Results.
 *
 * A progress indicator, not a wizard — the first two steps are both visible and
 * editable on the same screen, so this reports state rather than gating it.
 * `aria-current="step"` carries the position for assistive tech instead of the
 * colour doing it alone.
 *
 * Once a run has finished, the first two steps become real controls that take
 * the user back to their files. During a run they are inert: there is nothing
 * to go back to while the request is in flight, and a step that looks clickable
 * but silently does nothing is worse than one that plainly is not.
 */
export default function WorkflowStepper({
  currentStep,
  completedSteps,
  skippedSteps,
  failed = false,
  onStepSelect,
}) {
  const currentIndex = STEPS.findIndex((step) => step.key === currentStep);

  return (
    <nav className="stepper" aria-label="Progress">
      <ol className="stepper__list">
        {STEPS.map((step, index) => {
          const isComplete = completedSteps.has(step.key);
          const isSkipped = Boolean(skippedSteps?.has(step.key));
          const isCurrent = step.key === currentStep;
          const isFailed = failed && step.key === "results";
          const isPast = index < currentIndex;

          const interactive =
            Boolean(onStepSelect) && NAVIGABLE.has(step.key) && (isComplete || isSkipped);

          const state = isFailed
            ? "failed"
            : isComplete
              ? "complete"
              : isSkipped
                ? "skipped"
                : isCurrent
                  ? "current"
                  : isPast
                    ? "past"
                    : "upcoming";

          const body = (
            <>
              <span className="stepper__marker">
                {isFailed ? (
                  <Icon name="close" size={13} strokeWidth={2.4} />
                ) : isSkipped ? (
                  <Icon name="minus" size={13} strokeWidth={2.6} />
                ) : isComplete ? (
                  <motion.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 26 }}
                    className="stepper__tick"
                  >
                    <Icon name="check" size={13} strokeWidth={2.6} />
                  </motion.span>
                ) : (
                  <span className="stepper__index">{index + 1}</span>
                )}

                {isCurrent && !isComplete && !isSkipped && !isFailed && (
                  // One shared element travels between steps instead of four
                  // separate rings cross-fading, so the eye tracks a single
                  // object moving forward.
                  <motion.span
                    layoutId="stepper-halo"
                    className="stepper__halo"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
              </span>

              <span className="stepper__label">
                {step.label}
                {step.optional && !isComplete && !isSkipped && (
                  <span className="stepper__optional"> · optional</span>
                )}
              </span>
            </>
          );

          return (
            <li
              key={step.key}
              className={`stepper__step stepper__step--${state} ${
                interactive ? "stepper__step--interactive" : ""
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {interactive ? (
                <button
                  type="button"
                  className="stepper__hit"
                  onClick={() => onStepSelect(step.key)}
                >
                  {body}
                  <span className="sr-only">— go back to change this</span>
                </button>
              ) : (
                <span className="stepper__hit">{body}</span>
              )}

              {index < STEPS.length - 1 && (
                <span className="stepper__line" aria-hidden="true">
                  <motion.span
                    className="stepper__line-fill"
                    initial={false}
                    animate={{ scaleX: isComplete || isSkipped ? 1 : 0 }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
