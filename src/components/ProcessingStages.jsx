import { motion } from "motion/react";
import Icon from "./ui/Icon";
import ProgressBar from "./ui/ProgressBar";

/**
 * What the document is going through, split by what can honestly be measured.
 *
 * The run has exactly two observable phases. The upload is real: bytes on the
 * wire, reported by XHR. Everything after it happens inside one synchronous
 * request that returns only when the whole batch is finished — the backend
 * emits no stage events at all.
 *
 * So the three server stages are listed as *what is happening in there*, and
 * animate as a group. Ticking them off one by one on a timer would look more
 * informative while telling the user nothing true.
 */
const SERVER_STAGES = [
  { key: "extraction", label: "Extraction", hint: "Locating labelled values on each page" },
  { key: "mapping", label: "Field mapping", hint: "Matching fields to your column headers" },
  { key: "excel", label: "Excel", hint: "Writing values into your template" },
];

export default function ProcessingStages({ phase, uploadPercent = 0, documentCount = 1 }) {
  const uploadDone = phase === "server" || phase === "done";
  const serverActive = phase === "server";
  const serverDone = phase === "done";

  return (
    <div className="phases">
      <div className={`phase ${uploadDone ? "phase--done" : "phase--active"}`}>
        <div className="phase__head">
          <span className="phase__marker">
            {uploadDone ? (
              <Icon name="check" size={13} strokeWidth={2.6} />
            ) : (
              <Icon name="upload" size={13} strokeWidth={2.2} />
            )}
          </span>
          <div className="phase__titles">
            <p className="phase__title">Upload</p>
            <p className="phase__hint">
              {uploadDone
                ? `${documentCount === 1 ? "Document" : "All documents"} sent to the server`
                : "Sending your files"}
            </p>
          </div>
          {!uploadDone && (
            <span className="phase__value mono">{Math.round(uploadPercent)}%</span>
          )}
        </div>

        {!uploadDone && (
          <ProgressBar value={uploadPercent} label="Upload progress" size="sm" />
        )}
      </div>

      <span className="phases__link" aria-hidden="true" />

      <div
        className={`phase ${
          serverDone ? "phase--done" : serverActive ? "phase--active" : "phase--waiting"
        }`}
      >
        <div className="phase__head">
          <span className="phase__marker">
            {serverDone ? (
              <Icon name="check" size={13} strokeWidth={2.6} />
            ) : (
              <Icon name="sparkles" size={13} strokeWidth={2.2} />
            )}
          </span>
          <div className="phase__titles">
            <p className="phase__title">Processing on the server</p>
            <p className="phase__hint">
              {serverDone
                ? "Finished"
                : serverActive
                  ? "Progress inside this phase is not reported per document"
                  : "Waiting for the upload to finish"}
            </p>
          </div>
        </div>

        {serverActive && <ProgressBar value={null} label="Processing" size="sm" />}

        <ul className="phase__stages">
          {SERVER_STAGES.map((stage, index) => (
            <motion.li
              key={stage.key}
              className={`phase__stage ${serverActive ? "phase__stage--active" : ""} ${
                serverDone ? "phase__stage--done" : ""
              }`}
              initial={false}
              animate={{ opacity: serverActive || serverDone ? 1 : 0.45 }}
              transition={{ duration: 0.3, delay: serverActive ? index * 0.06 : 0 }}
            >
              <span className="phase__stage-dot" aria-hidden="true" />
              <span className="phase__stage-label">{stage.label}</span>
              <span className="phase__stage-hint">{stage.hint}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
