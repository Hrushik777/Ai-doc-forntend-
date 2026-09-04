import { useCallback, useMemo, useState } from "react";
import { groupBoxes } from "../explain";
import Icon from "./ui/Icon";

/**
 * Renders the page raster the backend already produced and overlays the real
 * bounding boxes on top of it. Falls back to a plain field list when the
 * pipeline returned no page images, no geometry, or an image that will not
 * decode.
 */
export default function DocumentPane({
  explanation,
  activeFieldIndex,
  revealedFieldIndexes,
  onFieldHover,
  registerAnchor,
}) {
  const [page, setPage] = useState(1);
  const [naturalSize, setNaturalSize] = useState(null);
  const [brokenPages, setBrokenPages] = useState(() => new Set());

  const pages = explanation.pages;
  const currentPage = pages.find((entry) => entry.pageNumber === page) ?? pages[0];

  // renderPageImages base64s the raw upload for any non-PDF, so a .docx run
  // yields "images" that are really Word bytes and never decode. Detecting the
  // failure is the only way to tell them apart from a real page.
  const imageBroken = currentPage ? brokenPages.has(currentPage.pageNumber) : false;
  const showCanvas = Boolean(currentPage) && !imageBroken;

  const boxGroups = useMemo(
    () => groupBoxes(explanation.fields, currentPage?.pageNumber ?? 1),
    [explanation.fields, currentPage]
  );

  // Boxes arrive either as page fractions or as pixels in the 150-DPI raster.
  // Converting both to percentages keeps the overlay correct at any display size.
  const toPercent = useCallback(
    (box) => {
      if (explanation.boxUnits === "normalized") {
        return {
          left: `${box.x * 100}%`,
          top: `${box.y * 100}%`,
          width: `${box.width * 100}%`,
          height: `${box.height * 100}%`,
        };
      }
      if (!naturalSize) return null;
      return {
        left: `${(box.x / naturalSize.width) * 100}%`,
        top: `${(box.y / naturalSize.height) * 100}%`,
        width: `${(box.width / naturalSize.width) * 100}%`,
        height: `${(box.height / naturalSize.height) * 100}%`,
      };
    },
    [explanation.boxUnits, naturalSize]
  );

  // With no usable page image every field goes in the strip, not just the ones
  // the model gave no coordinates for.
  const strippedFields = showCanvas
    ? explanation.fields.filter((field) => !field.box)
    : explanation.fields;

  return (
    <section className="pane pane--document">
      <header className="pane__head">
        <div>
          <p className="pane__eyebrow">Source document</p>
          <h4 className="pane__title">Extracted fields</h4>
        </div>

        {pages.length > 1 && showCanvas && (
          <div className="pageswitch">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <Icon name="chevronLeft" size={15} strokeWidth={2} />
            </button>
            <span className="mono">
              {page} / {pages.length}
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(pages.length, value + 1))}
              disabled={page >= pages.length}
              aria-label="Next page"
            >
              <Icon name="chevronRight" size={15} strokeWidth={2} />
            </button>
          </div>
        )}
      </header>

      {showCanvas ? (
        <div className="page-canvas">
          <img
            src={currentPage.src}
            alt={`Document page ${currentPage.pageNumber}`}
            onLoad={(event) =>
              setNaturalSize({
                width: event.target.naturalWidth,
                height: event.target.naturalHeight,
              })
            }
            onError={() =>
              setBrokenPages((current) => {
                const next = new Set(current);
                next.add(currentPage.pageNumber);
                return next;
              })
            }
          />

          {boxGroups.map((group) => {
            const style = toPercent(group.box);
            if (!style) return null;

            const isRevealed = group.fields.some((field) =>
              revealedFieldIndexes.has(field.index)
            );
            const isActive = group.fields.some(
              (field) => field.index === activeFieldIndex
            );

            return (
              <div
                key={group.key}
                // Every field sharing this rectangle anchors to it, so all of
                // their connectors draw — not just the first one's.
                ref={(node) => {
                  for (const field of group.fields) {
                    registerAnchor(`field-${field.index}`, node);
                  }
                }}
                className={`bbox ${isRevealed ? "bbox--revealed" : ""} ${
                  isActive ? "bbox--active" : ""
                }`}
                style={style}
                onMouseEnter={() => onFieldHover(group.fields[0].index)}
                onMouseLeave={() => onFieldHover(null)}
              >
                <span className="bbox__tag">
                  {group.fields.length === 1
                    ? group.fields[0].name
                    : `${group.fields.length} fields`}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="pane__note">
          {imageBroken
            ? "This document has no page preview — the pipeline only rasterizes PDFs. The extracted fields below are still real."
            : "This response contained no page images, so the document itself cannot be shown. The extracted fields below are still real."}
        </p>
      )}

      {strippedFields.length > 0 && (
        <div className="fieldstrip">
          <p className="fieldstrip__label">
            {showCanvas ? "Fields without page coordinates" : "Extracted fields"}
          </p>
          <ul>
            {strippedFields.map((field) => (
              <li
                key={field.index}
                ref={(node) => registerAnchor(`field-${field.index}`, node)}
                className={`chip ${
                  revealedFieldIndexes.has(field.index) ? "chip--revealed" : ""
                } ${field.index === activeFieldIndex ? "chip--active" : ""}`}
                onMouseEnter={() => onFieldHover(field.index)}
                onMouseLeave={() => onFieldHover(null)}
              >
                <span className="chip__name">{field.name}</span>
                <span className="chip__value mono">{field.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
