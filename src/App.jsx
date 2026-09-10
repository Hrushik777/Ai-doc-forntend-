import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import "./styles/app.css";
import Hero from "./components/Hero";
import WorkflowHeader from "./components/WorkflowHeader";
import PipelineExplainer from "./components/PipelineExplainer";
import ThemeToggle from "./components/ThemeToggle";
import TopbarStatus from "./components/TopbarStatus";
import AccountControl from "./components/AccountControl";
import SetupStep from "./components/steps/SetupStep";
import ProcessingStep from "./components/steps/ProcessingStep";
import ResultsStep from "./components/steps/ResultsStep";
import { useWorkflow } from "./workflow/useWorkflow";
import useScrolled from "./hooks/useScrolled";

const STEP_TRANSITION = { duration: 0.26, ease: [0.22, 1, 0.36, 1] };

/** Scrolls an element into view and hands it focus, so the pointer and the
 *  keyboard end up in the same place. */
function revealAndFocus(id, focusSelector) {
  const target = document.getElementById(id);
  if (!target) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });

  if (focusSelector) {
    // preventScroll, because scrollIntoView is already handling the movement
    // and focus would otherwise jump the page a second time.
    target.querySelector(focusSelector)?.focus({ preventScroll: true });
  }
}

export default function App() {
  const workflow = useWorkflow();
  const floating = useScrolled();
  const { stage, documentCount, template } = workflow;
  const stepRef = useRef(null);
  const previousStage = useRef(stage);

  // The hero is only an entrance while the workspace is empty. The moment there
  // is something to work on, it collapses to a page title.
  const heroCompact = stage !== "setup" || documentCount > 0 || Boolean(template);

  // Moving between steps replaces the whole screen, so keyboard focus has to
  // move with it — otherwise focus falls back to <body> and the next Tab starts
  // from the top of the page.
  useEffect(() => {
    if (previousStage.current !== stage) {
      previousStage.current = stage;
      stepRef.current?.focus();
    }
  }, [stage]);

  const startUploading = useCallback(
    () => revealAndFocus("documents-panel", 'input[type="file"]'),
    []
  );

  const showExplainer = useCallback(() => revealAndFocus("explainer-heading"), []);

  return (
    <div className="app">
      <a className="skip-link" href="#workflow">
        Skip to the workflow
      </a>

      <header className={`topbar ${floating ? "topbar--floating" : ""}`}>
        <div className="topbar__inner">
          <span className="brand">Dockcel</span>

          <div className="topbar__actions">
            <TopbarStatus workflow={workflow} />
            <AccountControl />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container" id="workflow">
        <Hero compact={heroCompact} onStart={startUploading} onExplain={showExplainer} />

        <WorkflowHeader workflow={workflow} />

        {/* mode="wait" so the outgoing step is gone before the next arrives —
            two full-width screens cross-fading on top of each other reads as a
            glitch rather than a transition. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stage}
            ref={stepRef}
            tabIndex={-1}
            className="step"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={STEP_TRANSITION}
          >
            {stage === "setup" && <SetupStep workflow={workflow} />}
            {stage === "processing" && <ProcessingStep workflow={workflow} />}
            {stage === "results" && <ResultsStep workflow={workflow} />}
          </motion.div>
        </AnimatePresence>

        {stage === "setup" && <PipelineExplainer />}
      </main>
    </div>
  );
}
