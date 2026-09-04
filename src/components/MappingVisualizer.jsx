import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import DocumentPane from "./DocumentPane";
import ExcelPane from "./ExcelPane";
import Button from "./ui/Button";
import useMediaQuery from "../hooks/useMediaQuery";

const REVEAL_INTERVAL_MS = 220;

/** Below this the panes stack, and a connector drawn between them is nonsense. */
const WIDE_LAYOUT = "(min-width: 900px)";

/**
 * Animated replay of one document's real mapping result.
 *
 * The backend resolves everything in a single synchronous call, so this is a
 * replay of finished work rather than a live progress feed — the sequencing is
 * presentational, while every value, coordinate and match type is exactly what
 * the pipeline returned.
 */
export default function MappingVisualizer({ explanation }) {
  const containerRef = useRef(null);
  const anchors = useRef(new Map());
  const [revealedCount, setRevealedCount] = useState(0);
  const [hoveredFieldIndex, setHoveredFieldIndex] = useState(null);
  const [paths, setPaths] = useState([]);
  const isWide = useMediaQuery(WIDE_LAYOUT);

  const links = explanation.links;

  const registerAnchor = useCallback((id, node) => {
    if (node) anchors.current.set(id, node);
    else anchors.current.delete(id);
  }, []);

  useEffect(() => {
    if (revealedCount >= links.length) return undefined;
    const timer = setTimeout(
      () => setRevealedCount((count) => count + 1),
      REVEAL_INTERVAL_MS
    );
    return () => clearTimeout(timer);
  }, [revealedCount, links.length]);

  const revealedLinks = useMemo(
    () => links.slice(0, revealedCount),
    [links, revealedCount]
  );

  const revealedFieldIndexes = useMemo(
    () => new Set(revealedLinks.map((link) => link.fieldIndex)),
    [revealedLinks]
  );

  const revealedColumnIndexes = useMemo(
    () => new Set(revealedLinks.map((link) => link.columnIndex)),
    [revealedLinks]
  );

  // Connector endpoints are read from the live DOM so the lines stay attached
  // through resizes, page switches and scrolling inside either pane.
  useLayoutEffect(() => {
    // Stacked layout: the SVG is not mounted, so nothing needs measuring and
    // the stale paths are never read. They are re-measured on the way back up.
    if (!isWide) return undefined;

    const measure = () => {
      const container = containerRef.current;
      if (!container) return;

      const base = container.getBoundingClientRect();
      const next = [];

      for (const link of links.slice(0, revealedCount)) {
        const source = anchors.current.get(`field-${link.fieldIndex}`);
        const target = anchors.current.get(`column-${link.columnIndex}`);
        if (!source || !target) continue;

        const from = source.getBoundingClientRect();
        const to = target.getBoundingClientRect();

        next.push({
          id: `${link.fieldIndex}:${link.columnIndex}`,
          fieldIndex: link.fieldIndex,
          source: link.source,
          x1: from.right - base.left,
          y1: from.top + from.height / 2 - base.top,
          x2: to.left - base.left,
          y2: to.top + to.height / 2 - base.top,
        });
      }

      setPaths(next);
    };

    measure();

    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [revealedCount, links, explanation, isWide]);

  const exactCount = links.filter((link) => link.source === "DETERMINISTIC").length;
  const semanticCount = links.length - exactCount;
  const isReplaying = revealedCount < links.length;

  return (
    <section className="viz" aria-labelledby="viz-heading">
      <header className="viz__head">
        <div>
          <h3 className="viz__title" id="viz-heading">
            How this document was mapped
          </h3>
          <p className="viz__lead">
            Every value below is what the pipeline actually returned. Hover a field or a
            column to isolate its match.
          </p>
        </div>

        {isReplaying ? (
          <span className="viz__status" aria-live="polite">
            Mapping {revealedCount} of {links.length}…
          </span>
        ) : (
          <Button variant="ghost" size="sm" icon="replay" onClick={() => setRevealedCount(0)}>
            Replay
          </Button>
        )}
      </header>

      <div className="viz__legend">
        <span className="legend">
          <i className="legend__swatch legend__swatch--exact" aria-hidden="true" />
          Exact match · {exactCount}
        </span>
        <span className="legend">
          <i className="legend__swatch legend__swatch--semantic" aria-hidden="true" />
          AI semantic match · {semanticCount}
        </span>
      </div>

      <div className="viz__stage" ref={containerRef}>
        <DocumentPane
          explanation={explanation}
          activeFieldIndex={hoveredFieldIndex}
          revealedFieldIndexes={revealedFieldIndexes}
          onFieldHover={setHoveredFieldIndex}
          registerAnchor={registerAnchor}
        />

        {/* Only mounted on the wide layout: the paths are measured from real
            element positions, which have no meaning once the panes stack. */}
        {isWide && (
          <svg className="viz__links" aria-hidden="true">
            {paths.map((path) => {
              const curve = Math.max(28, (path.x2 - path.x1) / 2);
              const dimmed =
                hoveredFieldIndex !== null && hoveredFieldIndex !== path.fieldIndex;
              const isSemantic = path.source === "SEMANTIC";

              // Motion drives pathLength by writing strokeDasharray, which would
              // overwrite the dashes that mark a semantic link. So exact links draw
              // themselves on, and semantic links keep their dashes and fade in.
              return (
                <motion.path
                  key={path.id}
                  className={`link link--${isSemantic ? "semantic" : "exact"}`}
                  d={`M ${path.x1} ${path.y1} C ${path.x1 + curve} ${path.y1}, ${
                    path.x2 - curve
                  } ${path.y2}, ${path.x2} ${path.y2}`}
                  initial={isSemantic ? { opacity: 0 } : { pathLength: 0, opacity: 1 }}
                  animate={
                    isSemantic
                      ? { opacity: dimmed ? 0.15 : 0.9 }
                      : { pathLength: 1, opacity: dimmed ? 0.15 : 1 }
                  }
                  transition={{
                    pathLength: { duration: 0.5, ease: "easeOut" },
                    opacity: { duration: 0.25 },
                  }}
                />
              );
            })}
          </svg>
        )}

        <ExcelPane
          explanation={explanation}
          activeFieldIndex={hoveredFieldIndex}
          revealedColumnIndexes={revealedColumnIndexes}
          onColumnHover={setHoveredFieldIndex}
          registerAnchor={registerAnchor}
        />
      </div>
    </section>
  );
}
