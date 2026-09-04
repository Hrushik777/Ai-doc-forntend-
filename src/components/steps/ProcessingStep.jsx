import ProcessingStages from "../ProcessingStages";
import DocumentList from "../DocumentList";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import { formatBytes, formatDuration, pluralize } from "../../utils/format";

/**
 * The waiting screen.
 *
 * A batch can run for minutes, so this shows the two things that are actually
 * true throughout: how far the upload got, and how long the run has been going.
 * Cancel is genuine — it aborts the in-flight request rather than just hiding
 * the screen.
 */
export default function ProcessingStep({ workflow }) {
  const {
    documents,
    documentCount,
    fileStatuses,
    phase,
    uploadPercent,
    upload,
    elapsedMs,
    totalBytes,
    cancel,
  } = workflow;

  const isUploading = phase === "uploading";

  return (
    <div className="processing">
      <header className="processing__head">
        <div>
          <h2 className="processing__title">
            {isUploading
              ? `Uploading ${documentCount} ${pluralize(documentCount, "document")}`
              : `Reading ${documentCount} ${pluralize(documentCount, "document")}`}
          </h2>
          <p className="processing__lead">
            {isUploading
              ? `${formatBytes(upload.loaded)} of ${formatBytes(upload.total || totalBytes)} sent`
              : "This can take a few minutes for a large batch. Keep this tab open."}
          </p>
        </div>

        <div className="processing__aside">
          <span className="processing__elapsed" aria-live="off">
            <Icon name="clock" size={14} />
            <span className="mono">{formatDuration(elapsedMs)}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={cancel}>
            Cancel run
          </Button>
        </div>
      </header>

      {/* aria-busy tells assistive tech the region is mid-update, so its
          contents are not announced piecemeal as the numbers tick. */}
      <div aria-busy="true">
        <ProcessingStages
          phase={phase}
          uploadPercent={uploadPercent}
          documentCount={documentCount}
        />
      </div>

      <section className="processing__files" aria-label="Per-document status">
        <div className="processing__files-head">
          <h3>Documents</h3>
          <span className="processing__files-note">
            {isUploading
              ? "Progress is measured from bytes sent"
              : "The server reports each document's outcome when the batch finishes"}
          </span>
        </div>

        <DocumentList documents={documents} statuses={fileStatuses} removable={false} />
      </section>
    </div>
  );
}
