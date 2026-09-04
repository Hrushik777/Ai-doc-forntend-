import { motion } from "motion/react";

/**
 * The target side of the mapping: every template header, in template order,
 * with the value that actually landed in it. Headers the pipeline could not
 * fill stay visibly empty rather than being hidden — an unfilled column is a
 * result the user needs to see, not an absence to tidy away.
 */
export default function ExcelPane({
  explanation,
  activeFieldIndex,
  revealedColumnIndexes,
  onColumnHover,
  registerAnchor,
}) {
  const linkByColumn = new Map(
    explanation.links.map((link) => [link.columnIndex, link])
  );

  const filledCount = explanation.headers.filter((header) =>
    revealedColumnIndexes.has(header.columnIndex)
  ).length;

  return (
    <section className="pane pane--excel">
      <header className="pane__head">
        <div>
          <p className="pane__eyebrow">Excel template</p>
          <h4 className="pane__title">Target columns</h4>
        </div>
        <span className="pane__count mono">
          {filledCount} / {explanation.headers.length} filled
        </span>
      </header>

      <ul className="sheet">
        {explanation.headers.map((header) => {
          const link = linkByColumn.get(header.columnIndex);
          const isRevealed = revealedColumnIndexes.has(header.columnIndex);
          const isActive =
            link && link.fieldIndex >= 0 && link.fieldIndex === activeFieldIndex;

          return (
            <motion.li
              key={header.columnIndex}
              ref={(node) => registerAnchor(`column-${header.columnIndex}`, node)}
              className={`sheet__row ${isRevealed ? "sheet__row--filled" : ""} ${
                isActive ? "sheet__row--active" : ""
              }`}
              onMouseEnter={() => link && onColumnHover(link.fieldIndex)}
              onMouseLeave={() => onColumnHover(null)}
              // The value arriving in the cell is the moment worth animating, so
              // the spring fires on reveal rather than on mount.
              animate={isRevealed ? { opacity: 1 } : { opacity: 0.55 }}
              initial={false}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <div className="sheet__header">{header.headerName}</div>

              <div className="sheet__cell">
                {isRevealed && link ? (
                  <>
                    <span className="sheet__value mono">{link.value}</span>
                    <span
                      className={`tag tag--${link.source === "SEMANTIC" ? "semantic" : "exact"}`}
                    >
                      {link.source === "SEMANTIC" ? "AI matched" : "Exact match"}
                      {link.confidence !== null &&
                        link.source === "SEMANTIC" &&
                        ` · ${Math.round(link.confidence * 100)}%`}
                    </span>
                  </>
                ) : (
                  <span className="sheet__empty">—</span>
                )}
              </div>

              {isRevealed && link?.reason && (
                <p className="sheet__reason">{link.reason}</p>
              )}
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
