/**
 * Normalizes the backend's /process/explain payload into a stable internal shape.
 *
 * Everything the visualization renders comes from here, so if the backend DTO
 * shifts, this file is the only thing that needs to change. Reads are tolerant
 * (camelCase variants, missing arrays) but never invent values: a field the
 * backend does not send stays null and the UI omits it rather than guessing.
 */

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function pick(source, ...names) {
  for (const name of names) {
    const value = source?.[name];
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

function toFiniteNumber(value) {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

export function base64ToBlob(base64, type) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

function normalizeBox(raw) {
  const x = toFiniteNumber(pick(raw, "x", "xmin"));
  const y = toFiniteNumber(pick(raw, "y", "ymin"));
  const width = toFiniteNumber(pick(raw, "width", "w"));
  const height = toFiniteNumber(pick(raw, "height", "h"));

  if (x === null || y === null || width === null || height === null) return null;
  if (width <= 0 || height <= 0) return null;

  return { x, y, width, height };
}

/**
 * Nemotron's bbox units are not documented in the pipeline, and the pages are
 * rasterized at 150 DPI, so coordinates could plausibly arrive normalized (0-1)
 * or in image pixels. Decide from the data instead of assuming: if nothing
 * reaches beyond ~1, the values must be fractions of the page.
 */
export function detectBoxUnits(fields) {
  let largest = 0;
  for (const field of fields) {
    if (!field.box) continue;
    largest = Math.max(
      largest,
      field.box.x + field.box.width,
      field.box.y + field.box.height
    );
  }
  if (largest === 0) return "none";
  return largest <= 1.5 ? "normalized" : "pixels";
}

function normalizeField(raw, index) {
  return {
    index: toFiniteNumber(pick(raw, "fieldIndex", "index")) ?? index,
    name: pick(raw, "name", "label") ?? "Unnamed field",
    value: pick(raw, "value", "text") ?? "",
    pageNumber: toFiniteNumber(pick(raw, "pageNumber", "page")) ?? 1,
    sourceType: pick(raw, "sourceType", "type"),
    box: normalizeBox(raw.box ?? raw.bbox ?? raw),
  };
}

function normalizeSource(raw) {
  const source = String(raw ?? "").toUpperCase();
  return source === "SEMANTIC" ? "SEMANTIC" : "DETERMINISTIC";
}

/**
 * resolveValuesByColumn rebuilds semantic mappings with fieldIndex -1, dropping
 * the link back to the document. The id survives it though: fieldId is built as
 * "field-<fieldIndex>", and one source field split into several logical values
 * gets sub-ids like field-2-1. Recovering the leading index restores the anchor
 * a semantic connector needs.
 */
function resolveFieldIndex(raw) {
  const direct = toFiniteNumber(pick(raw, "fieldIndex", "index"));
  if (direct !== null && direct >= 0) return direct;

  const fieldId = pick(raw, "fieldId", "sourceFieldId");
  const match = typeof fieldId === "string" ? /^field-(\d+)/i.exec(fieldId) : null;
  return match ? Number(match[1]) : -1;
}

function normalizeMapping(raw) {
  return {
    fieldIndex: resolveFieldIndex(raw),
    columnIndex: toFiniteNumber(pick(raw, "columnIndex", "column")) ?? -1,
    value: pick(raw, "value") ?? "",
    confidence: toFiniteNumber(pick(raw, "confidence")),
    source: normalizeSource(pick(raw, "source", "mappingSource")),
    reason: pick(raw, "reason", "explanation"),
  };
}

function normalizeHeader(raw, index) {
  return {
    columnIndex: toFiniteNumber(pick(raw, "columnIndex", "index")) ?? index,
    headerName: pick(raw, "headerName", "name", "header") ?? `Column ${index + 1}`,
  };
}

function normalizePages(raw) {
  const images = pick(raw, "pageImagesBase64", "pageImages", "pages") ?? [];
  if (!Array.isArray(images)) return [];

  return images
    .map((image, index) => {
      const data = typeof image === "string" ? image : pick(image, "base64", "data");
      if (!data) return null;
      const src = data.startsWith("data:") ? data : `data:image/png;base64,${data}`;
      const pageNumber =
        typeof image === "string"
          ? index + 1
          : toFiniteNumber(pick(image, "pageNumber", "page")) ?? index + 1;
      return { pageNumber, src };
    })
    .filter(Boolean);
}

export function normalizeExplanation(raw) {
  const rawFields = pick(raw, "fields", "extractedFields") ?? [];
  const rawHeaders = pick(raw, "headers", "columns") ?? [];
  const rawMappings = pick(raw, "mappings", "resolvedMappings") ?? [];
  const workbookBase64 = pick(raw, "workbookBase64", "workbook", "contentBase64");

  const fields = (Array.isArray(rawFields) ? rawFields : []).map(normalizeField);
  const headers = (Array.isArray(rawHeaders) ? rawHeaders : []).map(normalizeHeader);
  const mappings = (Array.isArray(rawMappings) ? rawMappings : []).map(normalizeMapping);

  const fieldsByIndex = new Map(fields.map((field) => [field.index, field]));
  const headersByColumn = new Map(
    headers.map((header) => [header.columnIndex, header])
  );

  // Only mappings that resolve to a real header can be drawn. A semantic mapping
  // carries fieldIndex -1 by design, so an absent field is expected, not an error.
  const links = mappings
    .map((mapping) => ({
      ...mapping,
      field: fieldsByIndex.get(mapping.fieldIndex) ?? null,
      header: headersByColumn.get(mapping.columnIndex) ?? null,
    }))
    .filter((link) => link.header !== null);

  return {
    // Identifies this particular result so the visualizer can be keyed on it and
    // remount (restarting its replay) when a new document is processed.
    runId:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),
    filename: pick(raw, "filename") ?? "completed-document.xlsx",
    workbook: workbookBase64 ? base64ToBlob(workbookBase64, XLSX_MIME) : null,
    pages: normalizePages(raw),
    fields,
    headers,
    links,
    boxUnits: detectBoxUnits(fields),
  };
}

/**
 * Several extracted fields can share one rectangle: splitTableField copies the
 * parent table's bbox onto every row it splits out. Collapsing them keeps the
 * overlay readable and lets a region honestly report how many fields it covers.
 */
export function groupBoxes(fields, pageNumber) {
  const groups = new Map();

  for (const field of fields) {
    if (!field.box || field.pageNumber !== pageNumber) continue;
    const key = `${field.box.x},${field.box.y},${field.box.width},${field.box.height}`;
    const existing = groups.get(key);
    if (existing) existing.fields.push(field);
    else groups.set(key, { key, box: field.box, fields: [field] });
  }

  return [...groups.values()];
}
