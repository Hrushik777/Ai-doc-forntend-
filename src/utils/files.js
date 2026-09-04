import { LIMITS } from "../api";
import { formatBytes } from "./format";

/**
 * Mirrors DocumentFileValidator.ALLOWED_CONTENT_TYPES on the backend.
 *
 * The server matches on the reported MIME type, so that is the primary check;
 * extensions are the fallback for the cases where a browser hands us an empty
 * or generic type (common for .docx dragged out of some file managers).
 */
const ACCEPTED_DOCUMENTS = [
  { mime: "application/pdf", ext: ".pdf", icon: "document", label: "PDF" },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: ".docx",
    icon: "documentText",
    label: "Word",
  },
  { mime: "image/png", ext: ".png", icon: "image", label: "PNG" },
  { mime: "image/jpeg", ext: ".jpg", icon: "image", label: "JPEG" },
  { mime: "image/jpeg", ext: ".jpeg", icon: "image", label: "JPEG" },
];

const ACCEPTED_TEMPLATES = [
  { ext: ".xlsx", icon: "spreadsheet", label: "Excel" },
  { ext: ".xls", icon: "spreadsheet", label: "Excel" },
];

/** The `accept` attribute for the document picker. */
export const DOCUMENT_ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";
export const TEMPLATE_ACCEPT = ".xlsx,.xls";

/** Human-readable list for the drop-zone hint, e.g. "PDF, Word, PNG or JPEG". */
export const DOCUMENT_TYPE_LABEL = "PDF, Word, PNG or JPEG";

function extensionOf(name) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

function descriptorFor(file) {
  const ext = extensionOf(file.name);
  return (
    ACCEPTED_DOCUMENTS.find((entry) => entry.mime === file.type && file.type) ??
    ACCEPTED_DOCUMENTS.find((entry) => entry.ext === ext) ??
    null
  );
}

export function isTemplateFile(file) {
  return ACCEPTED_TEMPLATES.some((entry) => entry.ext === extensionOf(file.name));
}

/** Which icon represents this file in a list. */
export function iconForFile(file) {
  return descriptorFor(file)?.icon ?? "document";
}

/** Short type label ("PDF", "Word") for a file row. */
export function labelForFile(file) {
  return descriptorFor(file)?.label ?? extensionOf(file.name).replace(".", "").toUpperCase();
}

/** Stable identity for a picked file, so the same file cannot be added twice. */
export function fileKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * Sorts incoming files into what can be sent and what cannot, with a reason
 * for every rejection.
 *
 * The previous drop zone silently discarded anything that was not a PDF, which
 * left the user staring at a file that simply never appeared. Nothing is
 * dropped without being named here.
 */
export function partitionDocuments(files, existingKeys = new Set()) {
  const accepted = [];
  const rejected = [];
  const seen = new Set(existingKeys);

  for (const file of files) {
    const key = fileKey(file);

    if (seen.has(key)) {
      rejected.push({ name: file.name, reason: "Already added" });
      continue;
    }

    if (!descriptorFor(file)) {
      rejected.push({
        name: file.name,
        reason: `Unsupported type — ${DOCUMENT_TYPE_LABEL} only`,
      });
      continue;
    }

    if (file.size === 0) {
      rejected.push({ name: file.name, reason: "File is empty" });
      continue;
    }

    if (file.size > LIMITS.maxFileSizeBytes) {
      rejected.push({
        name: file.name,
        reason: `${formatBytes(file.size)} — over the ${LIMITS.maxFileSizeLabel} limit`,
      });
      continue;
    }

    seen.add(key);
    accepted.push(file);
  }

  return { accepted, rejected };
}
