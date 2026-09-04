# Rowan — frontend

React + Vite interface for the `ai-doc` Spring Boot backend. Upload documents and
an Excel template; each document is read, its fields matched to your column
headers, and the filled-in workbook returned.

Named for the unit of work: documents come out as rows.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

The backend must be running separately. Its `@CrossOrigin` allows only
`localhost:5173` and `localhost:5174`, so if Vite falls back past those ports the
app will say so explicitly rather than failing with an opaque network error.

Point the app at a different backend with `VITE_BACKEND_URL` in `.env`.

```bash
npm run build    # production bundle into dist/
npm run lint     # oxlint
```

## Backend contract

Consumed from `DocumentController`, all `multipart/form-data`:

| Endpoint | Parts | Returns |
|---|---|---|
| `POST /api/documents/process` | `document`, `template?` | `.xlsx` bytes |
| `POST /api/documents/process/explain` | `document`, `template?` | JSON: workbook + extracted fields + resolved mappings + page rasters |
| `POST /api/documents/process/batch` | `documents[]`, `template?` | `.xlsx` bytes + `X-Batch-{Total,Success}-Count`, `X-Batch-Failed-Files` |

**The template is optional.** With none supplied the backend reads the document,
infers what its columns should be, and builds a workbook around them. In a batch
the columns come from the *first* document and every later one is filled against
that same header row. The frontend omits the `template` part entirely rather than
sending an empty one — Spring binds an empty part as a non-null `MultipartFile`,
which would take the request down the "open this workbook" path with nothing to
open.

A document containing a table contributes **several rows**, not one: the service
writes `mapping.records()` and advances `rowIndex` by however many were written.

Limits mirrored in `src/api.js`: 10 MB per file, 20 MB per request. Accepted
document types mirror `DocumentFileValidator`: PDF, DOCX, PNG, JPEG.

A single document takes the `/explain` route so the result can be visualized
field by field; more than one takes the batch route. If a backend build predates
`/explain`, the app falls back to `/process` and says why the detail view is
missing.

## What the progress display can and cannot show

The whole pipeline runs inside one synchronous request. The backend emits no
stage events and no per-document progress, so the UI reports only what is real:

- **Upload** — measured from actual bytes on the wire (`XMLHttpRequest`; `fetch`
  cannot report upload progress). Attributed to individual files by their byte
  offset in the multipart body, which is append order.
- **Server processing** — indeterminate, with elapsed time. Not broken down per
  document, because that information does not exist on this side.
- **Outcome** — per-document success or failure, from `X-Batch-Failed-Files`.

Per-document *reasons* for failure exist server-side in `BatchItemResult` but are
not sent over HTTP; the workbook's failed rows carry them instead.

## Layout

```
src/
  api.js            transport + error translation (CORS drift, backend down, 413)
  explain.js        normalizes the /explain DTO — tolerant reads, never invents values
  workflow/         the run's state machine, and per-file status derivation
  theme/            light/dark/system, persisted, applied before first paint
  components/
    steps/          Setup, Processing, Results
    ui/             Button, Badge, ProgressBar, Icon
  styles/
    tokens.css      primitive → semantic tokens, light + dark
    *.css           one sheet per area of the product
```

Design tokens follow the UI UX Pro Max "Minimalism & Swiss Style" direction:
trust-navy chrome, Plus Jakarta Sans for UI, Fira Code for extracted values.
Blue and violet are reserved for match semantics (deterministic vs. AI-resolved)
and are not used decoratively anywhere else.
