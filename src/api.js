import { normalizeExplanation } from "./explain";

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

// Mirrors spring.servlet.multipart.* in the backend's application.properties.
// Requests that exceed these are killed by Tomcat before Spring can attach CORS
// headers, so the browser surfaces an opaque "Failed to fetch" instead of the
// real 413 message — we must catch them client-side to give a usable error.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_SIZE_BYTES = 20 * 1024 * 1024;

export const LIMITS = {
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
  maxFileSizeLabel: "10 MB",
  maxRequestSizeBytes: MAX_REQUEST_SIZE_BYTES,
  maxRequestSizeLabel: "20 MB",
};

// Mirrors app.cors.allowed-origins in the backend's application.properties. Keep the two in
// step: an origin missing here is diagnosed as a CORS problem even when the backend accepts it.
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  // Spelling is deliberate - the deployed service is "ai-doc-forntend", and CORS compares the
  // origin string exactly.
  "https://ai-doc-forntend.onrender.com",
];

/**
 * Distinguishes "backend is down" from "backend is up but rejected our origin".
 * A no-cors request resolves opaquely whenever the server is reachable, and
 * only rejects when nothing is listening — which is exactly the difference
 * that a plain network failure hides.
 */
async function isBackendReachable() {
  try {
    await fetch(`${BACKEND_URL}/api/documents`, {
      method: "GET",
      mode: "no-cors",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * A transport-level failure reports nothing useful on its own: network error,
 * CORS rejection and a size-limit connection reset are indistinguishable to
 * the caller. Work out which one it actually was, so the user gets a fix
 * instead of a symptom.
 */
async function toFriendlyError(error) {
  if (error.name === "AbortError") return error;
  if (!(error instanceof TypeError)) return error;

  const origin = window.location.origin;

  // Most common cause: Vite fell back past the allowed ports (5175, 5176...)
  // because earlier ones were occupied, so the backend rejects this origin.
  if (!ALLOWED_ORIGINS.includes(origin)) {
    // The remediation differs entirely by where this is running: locally it is Vite drifting
    // off an allowed port, deployed it is the backend's allowed-origin list.
    const fix = origin.startsWith("http://localhost")
      ? `Fix: stop whatever else is using those ports, then restart the dev ` +
        `server so it starts on one of them.`
      : `Fix: add ${origin} to app.cors.allowed-origins on the backend, or set ` +
        `CORS_ORIGINS to a list containing it, then restart the backend.`;

    return new Error(
      `This page is running on ${origin}, but the backend only accepts ` +
        `${ALLOWED_ORIGINS.join(" or ")}.\n\n` +
        `That mismatch makes the browser block every response, which shows up ` +
        `as a connection failure.\n\n` +
        fix
    );
  }

  if (await isBackendReachable()) {
    return new Error(
      `The server at ${BACKEND_URL} is running but refused this request.\n\n` +
        `This is usually an upload over ${LIMITS.maxRequestSizeLabel}, which the ` +
        `server drops before it can send a proper error. Try fewer or smaller files.`
    );
  }

  // A hosted backend that is merely asleep looks identical to one that is not running, and
  // the fix is the opposite of "go start it" - so say which situation this is.
  if (!BACKEND_URL.includes("localhost")) {
    return new Error(
      `No response from ${BACKEND_URL}.\n\n` +
        `A free-tier instance sleeps after 15 minutes idle and takes 30-60 seconds to ` +
        `wake up, so the first request after a quiet spell can fail like this.\n\n` +
        `Wait a moment and try again. If it keeps failing, check that the backend ` +
        `deployed successfully.`
    );
  }

  return new Error(
    `No server is responding at ${BACKEND_URL}.\n\n` +
      `Start the Spring Boot backend (ai-doc), wait until it finishes booting, ` +
      `then try again.`
  );
}

function abortError() {
  return new DOMException("The request was cancelled.", "AbortError");
}

/**
 * POSTs multipart form data and reports how much of the request body has
 * actually reached the server.
 *
 * XMLHttpRequest rather than fetch, for one reason: fetch cannot report upload
 * progress. The whole pipeline is a single synchronous request, so the bytes
 * going up are the only phase of the wait that can be measured honestly —
 * losing them would leave a multi-minute batch with nothing to show but a
 * spinner.
 *
 * A transport failure is rejected as a TypeError so it lands on the same
 * diagnostic path that fetch's failures did.
 */
function sendMultipart({
  url,
  formData,
  responseType = "text",
  signal,
  onUploadProgress,
  onUploadComplete,
}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.responseType = responseType;

    const detach = () => signal?.removeEventListener("abort", onAbort);
    const onAbort = () => xhr.abort();
    signal?.addEventListener("abort", onAbort, { once: true });

    if (onUploadProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        // lengthComputable is false for a chunked body; there is no honest
        // percentage to show in that case, so nothing is reported.
        if (event.lengthComputable) {
          onUploadProgress({ loaded: event.loaded, total: event.total });
        }
      });
    }

    // The moment the last byte is handed off: everything after this is the
    // server working, and the UI has to stop pretending to measure it.
    xhr.upload.addEventListener("load", () => onUploadComplete?.());

    xhr.addEventListener("load", () => {
      detach();
      resolve({
        status: xhr.status,
        response: xhr.response,
        header: (name) => xhr.getResponseHeader(name),
      });
    });

    xhr.addEventListener("error", () => {
      detach();
      reject(new TypeError("Failed to fetch"));
    });

    xhr.addEventListener("timeout", () => {
      detach();
      reject(new TypeError("Failed to fetch"));
    });

    xhr.addEventListener("abort", () => {
      detach();
      reject(abortError());
    });

    xhr.send(formData);
  });
}

/** Pulls the server's message out of a failed response, whatever its type. */
async function messageFromResponse({ status, response }) {
  try {
    if (response instanceof Blob) {
      const text = await response.text();
      return text || `Request failed (${status})`;
    }
    if (typeof response === "string" && response) return response;
    return `Request failed (${status})`;
  } catch {
    return `Request failed (${status})`;
  }
}

function readIntHeader(header, name) {
  const raw = header(name);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * The backend joins failed filenames with a comma, which is ambiguous for a
 * filename that itself contains one. Reconciling against the names we actually
 * submitted resolves that: if every token is a name we sent, the split was
 * clean; otherwise fall back to matching whole submitted names inside the raw
 * header.
 */
function resolveFailedFiles(raw, submittedNames) {
  if (!raw) return [];

  const tokens = raw.split(",").map((name) => name.trim()).filter(Boolean);
  const submitted = new Set(submittedNames);

  if (tokens.every((token) => submitted.has(token))) return tokens;

  return submittedNames.filter((name) => raw.includes(name));
}

export async function processSingleDocument(document, template, options = {}) {
  const formData = new FormData();
  formData.append("document", document);
  // The template part is optional on the server. Sending an empty part is not
  // the same as omitting it — Spring binds an empty MultipartFile rather than
  // null, which sends the request down the "open this workbook" path with
  // nothing to open. Omit it entirely instead.
  if (template) formData.append("template", template);

  let result;
  try {
    result = await sendMultipart({
      url: `${BACKEND_URL}/api/documents/process`,
      formData,
      responseType: "blob",
      ...options,
    });
  } catch (error) {
    throw await toFriendlyError(error);
  }

  if (result.status < 200 || result.status >= 300) {
    throw new Error(await messageFromResponse(result));
  }

  return { blob: result.response, filename: "processed-document.xlsx" };
}

export async function processBatchDocuments(documents, template, options = {}) {
  const formData = new FormData();
  // Append order matters beyond correctness: it is the order the parts are
  // serialized in, which is what lets the UI attribute upload bytes to files.
  documents.forEach((file) => formData.append("documents", file));
  if (template) formData.append("template", template);

  let result;
  try {
    result = await sendMultipart({
      url: `${BACKEND_URL}/api/documents/process/batch`,
      formData,
      responseType: "blob",
      ...options,
    });
  } catch (error) {
    throw await toFriendlyError(error);
  }

  if (result.status < 200 || result.status >= 300) {
    throw new Error(await messageFromResponse(result));
  }

  // DocumentController lists these in @CrossOrigin(exposedHeaders = {...}), so
  // they are readable here. They are still read defensively: an older backend
  // build on the other end would send them unexposed, and null is a real
  // possibility rather than a bug.
  const submittedNames = documents.map((file) => file.name);

  return {
    blob: result.response,
    filename: "processed-documents.xlsx",
    submittedCount: documents.length,
    totalCount: readIntHeader(result.header, "x-batch-total-count"),
    successCount: readIntHeader(result.header, "x-batch-success-count"),
    failedFiles: resolveFailedFiles(result.header("x-batch-failed-files"), submittedNames),
  };
}

/**
 * Signals that this backend build predates the /explain endpoint, so the caller
 * should fall back to the plain binary pipeline instead of showing an error.
 */
export class ExplainUnavailableError extends Error {
  constructor() {
    super("This backend does not expose /api/documents/process/explain yet.");
    this.name = "ExplainUnavailableError";
  }
}

/**
 * Same pipeline as processSingleDocument, but returns the extraction and mapping
 * metadata alongside the workbook so the result can be visualized.
 */
export async function processDocumentExplained(document, template, options = {}) {
  const formData = new FormData();
  formData.append("document", document);
  if (template) formData.append("template", template);

  let result;
  try {
    result = await sendMultipart({
      url: `${BACKEND_URL}/api/documents/process/explain`,
      formData,
      responseType: "text",
      ...options,
    });
  } catch (error) {
    throw await toFriendlyError(error);
  }

  // 404/405 mean the route does not exist on this build — not a processing failure.
  if (result.status === 404 || result.status === 405) {
    throw new ExplainUnavailableError();
  }

  if (result.status < 200 || result.status >= 300) {
    throw new Error(await messageFromResponse(result));
  }

  let payload;
  try {
    payload = JSON.parse(result.response);
  } catch {
    throw new Error(
      "The server returned a response that could not be read as JSON. " +
        "The workbook may still have been produced — try again, or use a " +
        "backend build that matches this frontend."
    );
  }

  return normalizeExplanation(payload);
}

/**
 * Creates an object URL for a finished workbook.
 *
 * It no longer triggers the download itself: the result screen offers an
 * explicit Download button, so the file arrives when the user asks for it
 * rather than landing in their downloads folder unannounced. The caller owns
 * the returned URL and must revoke it.
 */
export function createDownloadUrl(blob) {
  return window.URL.createObjectURL(blob);
}

export function triggerDownload(url, filename) {
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
}
