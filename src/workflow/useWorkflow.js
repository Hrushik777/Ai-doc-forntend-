import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  ExplainUnavailableError,
  LIMITS,
  createDownloadUrl,
  processBatchDocuments,
  processDocumentExplained,
  processSingleDocument,
} from "../api";
import { fileKey, partitionDocuments } from "../utils/files";
import { formatBytes } from "../utils/format";

/** The four steps the user moves through, in order. */
export const STEPS = [
  { key: "documents", label: "Documents" },
  { key: "template", label: "Template", optional: true },
  { key: "processing", label: "Processing" },
  { key: "results", label: "Results" },
];

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const initialState = {
  // "setup" | "processing" | "results"
  stage: "setup",
  // During "processing": "uploading" (measurable) | "server" (not measurable).
  phase: null,
  documents: [],
  template: null,
  rejected: [],
  upload: { loaded: 0, total: 0 },
  startedAt: null,
  elapsedMs: 0,
  result: null,
  explanation: null,
  explainMissing: false,
  error: "",
  cancelled: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "ADD_DOCUMENTS":
      return {
        ...state,
        documents: [
          ...state.documents,
          ...action.accepted.map((file) => ({ id: makeId(), file })),
        ],
        // Rejections replace rather than accumulate: they describe the drop
        // that just happened, and a stale list from two drops ago is noise.
        rejected: action.rejected,
        error: "",
      };

    case "REMOVE_DOCUMENT":
      return {
        ...state,
        documents: state.documents.filter((entry) => entry.id !== action.id),
      };

    case "CLEAR_DOCUMENTS":
      return { ...state, documents: [], rejected: [] };

    case "SET_TEMPLATE":
      return { ...state, template: action.file, error: "" };

    case "CLEAR_TEMPLATE":
      return { ...state, template: null };

    case "DISMISS_REJECTED":
      return { ...state, rejected: [] };

    case "SET_ERROR":
      return { ...state, error: action.message };

    case "START":
      return {
        ...state,
        stage: "processing",
        phase: "uploading",
        upload: { loaded: 0, total: 0 },
        startedAt: Date.now(),
        elapsedMs: 0,
        result: null,
        explanation: null,
        explainMissing: false,
        error: "",
        cancelled: false,
        rejected: [],
      };

    case "UPLOAD_PROGRESS":
      return {
        ...state,
        upload: { loaded: action.loaded, total: action.total },
      };

    case "UPLOAD_DONE":
      return { ...state, phase: "server" };

    case "TICK":
      return { ...state, elapsedMs: action.elapsedMs };

    case "SUCCESS":
      return {
        ...state,
        stage: "results",
        phase: null,
        result: action.result,
        explanation: action.explanation ?? null,
        explainMissing: action.explainMissing ?? false,
        error: "",
      };

    case "FAILURE":
      return {
        ...state,
        stage: "results",
        phase: null,
        error: action.message,
        result: null,
        explanation: null,
      };

    case "CANCELLED":
      return {
        ...state,
        stage: "setup",
        phase: null,
        cancelled: true,
        upload: { loaded: 0, total: 0 },
      };

    // Returns to the upload screen with the same files still selected, so a
    // second run against a different template does not mean re-picking twenty
    // documents.
    case "BACK_TO_SETUP":
      return {
        ...state,
        stage: "setup",
        phase: null,
        result: null,
        explanation: null,
        explainMissing: false,
        error: "",
        cancelled: false,
        upload: { loaded: 0, total: 0 },
        elapsedMs: 0,
      };

    case "RESET":
      return { ...initialState };

    default:
      return state;
  }
}

/**
 * Per-file status, derived rather than stored.
 *
 * Derivation matters here: the server processes the whole batch inside one
 * request and reports nothing per file, so any stored per-file state would
 * have to be invented to stay in sync. What is real is the byte offset of
 * each file within the multipart body — parts are serialized in append order,
 * so the aggregate upload progress attributes cleanly to individual files.
 * Per-part boundary headers (a couple of hundred bytes each) are ignored.
 */
export function deriveFileStatuses(state) {
  const statuses = new Map();
  const { stage, phase, documents, upload, result, error, cancelled } = state;

  if (stage === "results") {
    for (const entry of documents) {
      if (error) {
        statuses.set(entry.id, { status: "unknown", progress: 0 });
      } else {
        const failed = result?.failedFiles?.includes(entry.file.name);
        statuses.set(entry.id, {
          status: failed ? "failed" : "succeeded",
          progress: 100,
        });
      }
    }
    return statuses;
  }

  if (stage === "processing" && phase === "server") {
    for (const entry of documents) {
      statuses.set(entry.id, { status: "processing", progress: 100 });
    }
    return statuses;
  }

  if (stage === "processing" && phase === "uploading") {
    let offset = 0;
    for (const entry of documents) {
      const size = entry.file.size;
      const sent = Math.min(Math.max(upload.loaded - offset, 0), size);
      const progress = size === 0 ? 100 : (sent / size) * 100;

      statuses.set(entry.id, {
        status: progress >= 100 ? "uploaded" : progress > 0 ? "uploading" : "queued",
        progress,
      });
      offset += size;
    }
    return statuses;
  }

  for (const entry of documents) {
    statuses.set(entry.id, {
      status: cancelled ? "cancelled" : "queued",
      progress: 0,
    });
  }
  return statuses;
}

export function useWorkflow() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef(null);
  const urlRef = useRef(null);

  const releaseUrl = useCallback(() => {
    if (urlRef.current) {
      window.URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      releaseUrl();
    },
    [releaseUrl]
  );

  // Elapsed time is the only honest thing to show while the server works, so
  // it ticks for exactly as long as that phase lasts.
  useEffect(() => {
    if (state.stage !== "processing" || !state.startedAt) return undefined;
    const startedAt = state.startedAt;
    const timer = setInterval(
      () => dispatch({ type: "TICK", elapsedMs: Date.now() - startedAt }),
      1000
    );
    return () => clearInterval(timer);
  }, [state.stage, state.startedAt]);

  const totalBytes = useMemo(
    () => state.documents.reduce((sum, entry) => sum + entry.file.size, 0),
    [state.documents]
  );

  // The backend caps the whole multipart request at 20 MB, template included.
  // Exceeding it gets the connection cut before CORS headers are sent, so it is
  // blocked here and explained rather than failing as an opaque network error.
  const requestBytes = totalBytes + (state.template?.size ?? 0);
  const overRequestLimit = requestBytes > LIMITS.maxRequestSizeBytes;

  const addDocuments = useCallback(
    (files) => {
      const existing = new Set(state.documents.map((entry) => fileKey(entry.file)));
      const { accepted, rejected } = partitionDocuments(Array.from(files), existing);
      if (accepted.length > 0 || rejected.length > 0) {
        dispatch({ type: "ADD_DOCUMENTS", accepted, rejected });
      }
    },
    [state.documents]
  );

  const removeDocument = useCallback((id) => dispatch({ type: "REMOVE_DOCUMENT", id }), []);
  const clearDocuments = useCallback(() => dispatch({ type: "CLEAR_DOCUMENTS" }), []);
  const clearTemplate = useCallback(() => dispatch({ type: "CLEAR_TEMPLATE" }), []);
  const dismissRejected = useCallback(() => dispatch({ type: "DISMISS_REJECTED" }), []);
  const setTemplate = useCallback((file) => dispatch({ type: "SET_TEMPLATE", file }), []);
  const setError = useCallback(
    (message) => dispatch({ type: "SET_ERROR", message }),
    []
  );

  const backToSetup = useCallback(() => {
    releaseUrl();
    dispatch({ type: "BACK_TO_SETUP" });
  }, [releaseUrl]);

  const reset = useCallback(() => {
    releaseUrl();
    dispatch({ type: "RESET" });
  }, [releaseUrl]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const start = useCallback(async () => {
    if (state.stage === "processing") return;
    // The template is optional on the server: with none, the backend infers the
    // columns from the document itself. Only the documents are required.
    if (state.documents.length === 0) return;

    if (overRequestLimit) {
      dispatch({
        type: "SET_ERROR",
        message:
          `This batch is ${formatBytes(requestBytes)}, but the server accepts at most ` +
          `${LIMITS.maxRequestSizeLabel} per upload. Remove some documents and ` +
          `process them in smaller batches.`,
      });
      return;
    }

    releaseUrl();
    dispatch({ type: "START" });

    const controller = new AbortController();
    abortRef.current = controller;

    const transport = {
      signal: controller.signal,
      onUploadProgress: ({ loaded, total }) =>
        dispatch({ type: "UPLOAD_PROGRESS", loaded, total }),
      onUploadComplete: () => dispatch({ type: "UPLOAD_DONE" }),
    };

    const files = state.documents.map((entry) => entry.file);
    const template = state.template;

    try {
      // A single document takes the explained pipeline, which returns the same
      // workbook plus the extraction and mapping evidence behind it.
      if (files.length === 1) {
        try {
          const explanation = await processDocumentExplained(files[0], template, transport);
          const url = explanation.workbook ? createDownloadUrl(explanation.workbook) : null;
          urlRef.current = url;

          dispatch({
            type: "SUCCESS",
            explanation,
            result: {
              url,
              filename: explanation.filename,
              submittedCount: 1,
              totalCount: 1,
              successCount: 1,
              failedFiles: [],
            },
          });
          return;
        } catch (explainError) {
          if (!(explainError instanceof ExplainUnavailableError)) throw explainError;

          // This backend predates /explain. Fall back to the binary pipeline so
          // the product still works, and say plainly why the detail view is gone.
          const { blob, filename } = await processSingleDocument(files[0], template, transport);
          const url = createDownloadUrl(blob);
          urlRef.current = url;

          dispatch({
            type: "SUCCESS",
            explainMissing: true,
            result: {
              url,
              filename,
              submittedCount: 1,
              totalCount: 1,
              successCount: 1,
              failedFiles: [],
            },
          });
          return;
        }
      }

      const outcome = await processBatchDocuments(files, template, transport);
      const url = createDownloadUrl(outcome.blob);
      urlRef.current = url;

      dispatch({
        type: "SUCCESS",
        result: {
          url,
          filename: outcome.filename,
          submittedCount: outcome.submittedCount,
          totalCount: outcome.totalCount,
          successCount: outcome.successCount,
          failedFiles: outcome.failedFiles,
        },
      });
    } catch (error) {
      if (error.name === "AbortError") {
        dispatch({ type: "CANCELLED" });
        return;
      }
      dispatch({ type: "FAILURE", message: error.message || "Something went wrong." });
    }
  }, [
    state.stage,
    state.documents,
    state.template,
    overRequestLimit,
    requestBytes,
    releaseUrl,
  ]);

  const fileStatuses = useMemo(() => deriveFileStatuses(state), [state]);

  const uploadPercent =
    state.upload.total > 0 ? (state.upload.loaded / state.upload.total) * 100 : 0;

  const documentCount = state.documents.length;

  // Which step the stepper should mark as current.
  const currentStep = useMemo(() => {
    if (state.stage === "results") return "results";
    if (state.stage === "processing") return "processing";
    if (documentCount === 0) return "documents";
    return "template";
  }, [state.stage, documentCount]);

  const completedSteps = useMemo(() => {
    const done = new Set();
    if (documentCount > 0) done.add("documents");
    if (state.template) done.add("template");
    if (state.stage === "results") {
      done.add("processing");
      if (!state.error) done.add("results");
    }
    return done;
  }, [documentCount, state.template, state.stage, state.error]);

  // A run that went ahead without a template did not leave the step unfinished
  // — it deliberately skipped it, and the rail should say so rather than
  // showing an incomplete step next to a finished result.
  const skippedSteps = useMemo(() => {
    const skipped = new Set();
    if (!state.template && state.stage !== "setup") skipped.add("template");
    return skipped;
  }, [state.template, state.stage]);

  return {
    ...state,
    documentCount,
    totalBytes,
    requestBytes,
    overRequestLimit,
    uploadPercent,
    fileStatuses,
    currentStep,
    completedSteps,
    skippedSteps,
    isSingle: documentCount === 1,
    // No template requirement: the server builds one from the document when
    // none is supplied.
    canProcess:
      documentCount > 0 && state.stage !== "processing" && !overRequestLimit,
    addDocuments,
    removeDocument,
    clearDocuments,
    setTemplate,
    clearTemplate,
    dismissRejected,
    setError,
    start,
    cancel,
    backToSetup,
    reset,
  };
}
