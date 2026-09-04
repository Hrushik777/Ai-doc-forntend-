import { motion } from "motion/react";
import StatusBanner from "../StatusBanner";
import ProcessingStages from "../ProcessingStages";
import MappingVisualizer from "../MappingVisualizer";
import DocumentList from "../DocumentList";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import useSpotlight from "../../hooks/useSpotlight";
import { triggerDownload } from "../../api";
import { formatDuration, pluralize } from "../../utils/format";

function OutcomeSummary({ result, hadTemplate }) {
  const knowsCounts =
    typeof result.successCount === "number" && typeof result.totalCount === "number";

  if (!knowsCounts) {
    // The outcome headers are exposed by DocumentController, but an older
    // backend build would not send them. Report only what is known rather than
    // implying a success count that was never received.
    return (
      <p className="banner__text">
        {result.submittedCount} {pluralize(result.submittedCount, "document")} submitted. The
        server did not report a per-document breakdown for this run.
      </p>
    );
  }

  return (
    <p className="banner__text">
      <strong>{result.successCount}</strong> of {result.totalCount}{" "}
      {pluralize(result.totalCount, "document")} written into{" "}
      {hadTemplate ? "your template" : "a workbook built from their own columns"}.
    </p>
  );
}

/**
 * The end of the run: what happened, the workbook, and the evidence behind it.
 *
 * Four outcomes are distinct here and none of them are collapsed into each
 * other — a batch where three of twenty documents failed is not a success, and
 * the previous UI reported it as one.
 */
export default function ResultsStep({ workflow }) {
  const downloadSpot = useSpotlight();
  const {
    result,
    error,
    explanation,
    explainMissing,
    documents,
    documentCount,
    fileStatuses,
    elapsedMs,
    isSingle,
    template,
    backToSetup,
    reset,
    start,
  } = workflow;

  const hadTemplate = Boolean(template);

  if (error) {
    return (
      <div className="results">
        <StatusBanner
          tone="error"
          title="The run failed"
          message={error}
          actions={
            <>
              <Button variant="primary" icon="replay" onClick={start}>
                Try again
              </Button>
              <Button variant="ghost" onClick={backToSetup}>
                Back to files
              </Button>
            </>
          }
        />

        <section className="results__files">
          <h3 className="results__files-title">Documents in this run</h3>
          <DocumentList documents={documents} statuses={fileStatuses} removable={false} />
        </section>
      </div>
    );
  }

  if (!result) return null;

  const failedCount = result.failedFiles.length;
  const isPartial = failedCount > 0;

  return (
    <div className="results">
      <StatusBanner
        tone={isPartial ? "partial" : "success"}
        title={
          isPartial
            ? `Finished with ${failedCount} ${pluralize(failedCount, "failure")}`
            : documentCount === 1
              ? "Document processed"
              : `All ${documentCount} documents processed`
        }
      >
        <OutcomeSummary result={result} hadTemplate={hadTemplate} />

        {isPartial && (
          <>
            <p className="banner__text">
              The workbook still contains every row. Failed rows carry a
              <span className="mono"> PROCESSING FAILED </span> note in their first column
              instead of extracted values.
            </p>
            <ul className="banner__list">
              {result.failedFiles.map((name) => (
                <li key={name}>
                  <span className="banner__list-name">{name}</span>
                  <span className="banner__list-reason">Could not be read</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </StatusBanner>

      <motion.div
        {...downloadSpot}
        className="download spotlight"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="download__icon" aria-hidden="true">
          <Icon name="spreadsheet" size={26} />
        </span>

        <div className="download__info">
          <p className="download__name mono">{result.filename}</p>
          <p className="download__meta">
            {documentCount} {pluralize(documentCount, "document")} · finished in{" "}
            {formatDuration(elapsedMs)}
          </p>
        </div>

        <div className="download__actions">
          <Button
            variant="primary"
            icon="download"
            onClick={() => triggerDownload(result.url, result.filename)}
            disabled={!result.url}
          >
            Download Excel
          </Button>
        </div>
      </motion.div>

      {explainMissing && (
        <StatusBanner
          tone="info"
          title="Detailed mapping view unavailable"
          message="This backend build does not expose POST /api/documents/process/explain yet, so the field-by-field breakdown cannot be shown. The workbook above is unaffected."
        />
      )}

      {isSingle && explanation && (
        <>
          <ProcessingStages phase="done" documentCount={1} />

          {explanation.links.length > 0 ? (
            // Keyed on the result so a new document remounts the visualizer and
            // restarts its replay, rather than resetting state from an effect.
            <MappingVisualizer key={explanation.runId} explanation={explanation} />
          ) : (
            <StatusBanner
              tone="info"
              title="Nothing to visualize"
              message="The pipeline resolved no mappings for this document, so there is no field-by-field view to show."
            />
          )}
        </>
      )}

      {!isSingle && (
        <section className="results__files">
          <h3 className="results__files-title">Per-document outcome</h3>
          <DocumentList documents={documents} statuses={fileStatuses} removable={false} />
          <p className="results__files-note">
            The server reports which documents failed, but not why. The workbook's failed rows
            carry the reason.
          </p>
        </section>
      )}

      <div className="results__actions">
        <Button variant="secondary" icon="upload" onClick={backToSetup}>
          {hadTemplate ? "Run another template" : "Add a template and rerun"}
        </Button>
        <Button variant="ghost" icon="trash" onClick={reset}>
          Start over
        </Button>
      </div>
    </div>
  );
}
