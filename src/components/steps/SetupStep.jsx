import { useId, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import FileDropZone from "../FileDropZone";
import DocumentList from "../DocumentList";
import StatusBanner from "../StatusBanner";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import useSpotlight from "../../hooks/useSpotlight";
import { LIMITS } from "../../api";
import { formatBytes, pluralize } from "../../utils/format";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_TYPE_LABEL,
  TEMPLATE_ACCEPT,
  isTemplateFile,
} from "../../utils/files";

/**
 * Steps 1 and 2 on one screen.
 *
 * They are deliberately not sequential pages: the two inputs are independent,
 * and hiding the template behind a Next button would stop anyone from fixing a
 * wrong template without re-picking their documents.
 */
export default function SetupStep({ workflow }) {
  const folderInputRef = useRef(null);
  const documentsHintId = useId();
  const templateHintId = useId();
  const docSpot = useSpotlight();
  const templateSpot = useSpotlight();

  const {
    documents,
    documentCount,
    template,
    rejected,
    totalBytes,
    requestBytes,
    overRequestLimit,
    fileStatuses,
    canProcess,
    error,
    cancelled,
    addDocuments,
    removeDocument,
    clearDocuments,
    setTemplate,
    clearTemplate,
    dismissRejected,
    setError,
    start,
  } = workflow;

  const handleTemplateFiles = (files) => {
    const file = files[0];
    if (!file) return;
    if (!isTemplateFile(file)) {
      setError(`"${file.name}" is not an Excel file. The template must be .xlsx or .xls.`);
      return;
    }
    setTemplate(file);
  };

  const handleFolderSelect = (event) => {
    addDocuments(Array.from(event.target.files || []));
    event.target.value = "";
  };

  return (
    <div className="setup">
      <div className="setup__grid">
        <section
          {...docSpot}
          id="documents-panel"
          className="panel spotlight"
          aria-labelledby="documents-heading"
        >
          <header className="panel__head">
            <div className="panel__titles">
              <span className="panel__step">Step 1</span>
              <h2 className="panel__title" id="documents-heading">
                Documents
              </h2>
            </div>
            {documentCount > 0 && (
              <Badge tone={overRequestLimit ? "warning" : "neutral"}>
                {documentCount} {pluralize(documentCount, "file")} · {formatBytes(totalBytes)}
              </Badge>
            )}
          </header>

          <p className="panel__lead" id={documentsHintId}>
            {DOCUMENT_TYPE_LABEL}, up to {LIMITS.maxFileSizeLabel} each.
          </p>

          <FileDropZone
            accept={DOCUMENT_ACCEPT}
            icon="document"
            multiple
            title="Drag & drop your documents"
            hint="or click to browse your computer"
            browseLabel="Choose files"
            describedBy={documentsHintId}
            onFiles={addDocuments}
          />

          <div className="setup__folder">
            <button
              type="button"
              className="linkbtn"
              onClick={() => folderInputRef.current?.click()}
            >
              <Icon name="folder" size={14} />
              Select an entire folder
            </button>
            <input
              ref={folderInputRef}
              type="file"
              multiple
              webkitdirectory=""
              directory=""
              hidden
              onChange={handleFolderSelect}
            />
          </div>

          <AnimatePresence>
            {rejected.length > 0 && (
              <StatusBanner
                key="rejected"
                tone="warning"
                title={`${rejected.length} ${pluralize(rejected.length, "file")} not added`}
                onDismiss={dismissRejected}
              >
                <ul className="banner__list">
                  {rejected.map((item) => (
                    <li key={`${item.name}:${item.reason}`}>
                      <span className="banner__list-name">{item.name}</span>
                      <span className="banner__list-reason">{item.reason}</span>
                    </li>
                  ))}
                </ul>
              </StatusBanner>
            )}
          </AnimatePresence>

          {documentCount > 0 && (
            <div className="setup__listhead">
              <span>
                {documentCount} {pluralize(documentCount, "document")} selected
              </span>
              <button type="button" className="linkbtn" onClick={clearDocuments}>
                Clear all
              </button>
            </div>
          )}

          <DocumentList
            documents={documents}
            statuses={fileStatuses}
            onRemove={removeDocument}
          />
        </section>

        <div className="setup__join" aria-hidden="true">
          <span className="setup__join-line" />
          <span className="setup__join-mark">
            <Icon name="plus" size={15} strokeWidth={2.2} />
          </span>
          <span className="setup__join-line" />
        </div>

        <section
          {...templateSpot}
          className="panel panel--template spotlight"
          aria-labelledby="template-heading"
        >
          <header className="panel__head">
            <div className="panel__titles">
              <span className="panel__step">Step 2</span>
              <h2 className="panel__title" id="template-heading">
                Excel template
              </h2>
            </div>
            <Badge tone="neutral">Optional</Badge>
          </header>

          <p className="panel__lead" id={templateHintId}>
            Your own workbook — its first row of headers defines the columns.
            Leave it out and the columns are worked out from the document instead.
          </p>

          <AnimatePresence mode="wait" initial={false}>
            {template ? (
              <motion.div
                key="chosen"
                className="template-card"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="template-card__icon" aria-hidden="true">
                  <Icon name="spreadsheet" size={22} />
                </span>
                <div className="template-card__info">
                  <p className="template-card__name" title={template.name}>
                    {template.name}
                  </p>
                  <p className="template-card__size mono">{formatBytes(template.size)}</p>
                </div>
                <button
                  type="button"
                  className="template-card__remove"
                  aria-label="Remove template"
                  onClick={clearTemplate}
                >
                  <Icon name="close" size={14} strokeWidth={2} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <FileDropZone
                  accept={TEMPLATE_ACCEPT}
                  icon="spreadsheet"
                  variant="template"
                  title="Drop your .xlsx template"
                  hint="or click to browse"
                  browseLabel="Choose template"
                  describedBy={templateHintId}
                  onFiles={handleTemplateFiles}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <ul className="panel__notes">
            <li>With a template, headers must sit in the first row of the sheet.</li>
            <li>Without one, a batch takes its columns from the first document.</li>
            <li>A document containing a table fills several rows, not just one.</li>
            <li>Columns nothing maps to are left untouched.</li>
          </ul>
        </section>
      </div>

      <AnimatePresence>
        {cancelled && (
          <StatusBanner
            key="cancelled"
            tone="info"
            title="Run cancelled"
            message="Nothing was processed. Your files are still selected — start again whenever you are ready."
          />
        )}

        {error && <StatusBanner key="error" tone="error" title="Cannot start" message={error} />}

        {overRequestLimit && (
          <StatusBanner
            key="limit"
            tone="warning"
            title="Batch too large to send"
            message={
              `This batch is ${formatBytes(requestBytes)} including the template, but the ` +
              `server accepts at most ${LIMITS.maxRequestSizeLabel} per upload. Remove some ` +
              `documents and run them in smaller batches.`
            }
          />
        )}
      </AnimatePresence>

      <div className="actionbar">
        <div className="actionbar__summary">
          {documentCount === 0 ? (
            <span className="actionbar__pending">Add at least one document to begin</span>
          ) : (
            <span className="actionbar__ready">
              <Icon name="check" size={14} strokeWidth={2.4} />
              {documentCount} {pluralize(documentCount, "document")} →{" "}
              {template ? (
                <span className="mono">{template.name}</span>
              ) : (
                <span className="actionbar__inferred">
                  columns from{" "}
                  {documentCount > 1 ? "the first document" : "the document"}
                </span>
              )}
            </span>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          icon="sparkles"
          disabled={!canProcess}
          onClick={start}
        >
          {documentCount > 1
            ? `Process ${documentCount} documents`
            : "Process document"}
        </Button>
      </div>
    </div>
  );
}
