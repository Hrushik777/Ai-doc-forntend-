import WorkflowScene from "./WorkflowScene";
import WorkflowStepper from "./WorkflowStepper";

/**
 * The scene and the step rail as one unit.
 *
 * They are deliberately paired: the scene is the picture and the rail is the
 * caption. Keeping them in one component means the rail can never drift out of
 * sync with what the scene is depicting, because both read the same run state
 * from the same place.
 */
export default function WorkflowHeader({ workflow }) {
  const failed = Boolean(workflow.error);

  // Only offer step navigation once a run has ended. Mid-request there is
  // nothing to go back to, and cancelling is the button that does that job.
  const onStepSelect = workflow.stage === "results" ? () => workflow.backToSetup() : null;

  return (
    <section className="workflow-header" aria-label="Run progress">
      <WorkflowScene
        stage={workflow.stage}
        phase={workflow.phase}
        uploadPercent={workflow.uploadPercent}
        documentCount={workflow.documentCount}
        hasTemplate={Boolean(workflow.template)}
        failed={failed}
      />

      <WorkflowStepper
        currentStep={workflow.currentStep}
        completedSteps={workflow.completedSteps}
        skippedSteps={workflow.skippedSteps}
        failed={failed}
        onStepSelect={onStepSelect}
      />
    </section>
  );
}
