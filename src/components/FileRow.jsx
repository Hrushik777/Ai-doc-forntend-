import { motion } from "motion/react";
import Icon from "./ui/Icon";
import { formatBytes } from "../utils/format";
import { iconForFile, labelForFile } from "../utils/files";

/**
 * How each per-file state presents itself.
 *
 * `uploading` and `uploaded` are measured from real bytes on the wire.
 * `processing` is deliberately vague — the server handles the whole batch in
 * one request and reports nothing per file, so claiming "extracting" or
 * "mapping" for an individual document here would be a fabrication.
 */
const PRESENTATION = {
  queued: { label: "Queued", tone: "idle", icon: null },
  uploading: { label: "Uploading", tone: "busy", icon: null },
  uploaded: { label: "Sent", tone: "busy", icon: "check" },
  processing: { label: "Processing", tone: "busy", icon: null },
  succeeded: { label: "Extracted", tone: "success", icon: "check" },
  failed: { label: "Failed", tone: "danger", icon: "close" },
  cancelled: { label: "Cancelled", tone: "idle", icon: null },
  unknown: { label: "Not processed", tone: "idle", icon: null },
};

export default function FileRow({
  entry,
  status = "queued",
  progress = 0,
  onRemove,
  removable = false,
  disabled = false,
}) {
  const { file } = entry;
  const presentation = PRESENTATION[status] ?? PRESENTATION.queued;
  const isBusy = presentation.tone === "busy";

  return (
    <motion.li
      layout="position"
      className={`filerow filerow--${presentation.tone}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="filerow__icon" aria-hidden="true">
        <Icon name={iconForFile(file)} size={17} />
      </span>

      <span className="filerow__main">
        <span className="filerow__name" title={file.name}>
          {file.name}
        </span>
        <span className="filerow__meta">
          <span className="filerow__type">{labelForFile(file)}</span>
          <span className="filerow__dot" aria-hidden="true" />
          <span className="mono">{formatBytes(file.size)}</span>
        </span>
      </span>

      <span className={`filerow__status filerow__status--${presentation.tone}`}>
        {isBusy && status !== "uploaded" && (
          <span className="filerow__pulse" aria-hidden="true" />
        )}
        {presentation.icon && <Icon name={presentation.icon} size={13} strokeWidth={2.4} />}
        <span className="filerow__status-label">
          {status === "uploading" ? `${Math.round(progress)}%` : presentation.label}
        </span>
      </span>

      {removable && (
        <button
          type="button"
          className="filerow__remove"
          aria-label={`Remove ${file.name}`}
          disabled={disabled}
          onClick={() => onRemove(entry.id)}
        >
          <Icon name="close" size={14} strokeWidth={2} />
        </button>
      )}

      {/* Sits along the bottom edge of the row rather than as a separate bar,
          so a long list stays scannable while every row still shows progress. */}
      {status === "uploading" && (
        <motion.span
          className="filerow__progress"
          aria-hidden="true"
          initial={false}
          animate={{ scaleX: Math.min(1, Math.max(0, progress / 100)) }}
          transition={{ duration: 0.2, ease: "linear" }}
        />
      )}
    </motion.li>
  );
}
