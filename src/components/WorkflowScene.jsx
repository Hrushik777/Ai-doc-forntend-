import { useId } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

/*
 * The ambient workflow scene.
 *
 * A continuously running picture of what the product does — a page being read,
 * values lifting off it and landing in spreadsheet cells — driven by the real
 * run rather than its own clock. Adding files, uploading and finishing all
 * visibly change it.
 *
 * Two rules it follows, because it sits directly above a status display:
 *
 *   1. It never asserts data. Sample labels appear only on the setup screen,
 *      where nothing is running and the neighbouring "How it works" section is
 *      already marked illustrative. Once a real run starts the pills go
 *      abstract — a value reading "Siemens" flying past while the user's own
 *      documents are being processed would be inventing a result.
 *   2. It is aria-hidden. The stepper beneath it carries the actual state for
 *      assistive tech; this is a picture of it, and announcing both would
 *      duplicate everything.
 */

const SCENE = { width: 980, height: 260 };

const DOC = { x: 56, y: 34, w: 184, h: 192 };
const SHEET = { x: 628, y: 34, w: 296, h: 192 };

/* Row-number gutter and header band inside the sheet. */
const GUTTER = 28;
const HEAD_H = 26;
const COLS = 4;
const ROWS = 5;
const CELL_W = (SHEET.w - GUTTER) / COLS;
const CELL_H = (SHEET.h - HEAD_H) / ROWS;

const COLUMN_LETTERS = ["A", "B", "C", "D"];

const cellX = (col) => SHEET.x + GUTTER + col * CELL_W;
const cellY = (row) => SHEET.y + HEAD_H + row * CELL_H;

/* The five label/value pairs on the page, and their widths. */
const FIELD_ROWS = [
  { y: DOC.y + 62, label: 34, value: 62 },
  { y: DOC.y + 80, label: 28, value: 76 },
  { y: DOC.y + 98, label: 38, value: 54 },
  { y: DOC.y + 116, label: 30, value: 70 },
  { y: DOC.y + 134, label: 36, value: 48 },
];

/* Small table at the foot of the page — the shape that splitTableField reads. */
const TABLE_ROWS = [DOC.y + 166, DOC.y + 178, DOC.y + 190];
const TABLE_COLS = [DOC.x + 16, DOC.x + 72, DOC.x + 122];

/* Which page field flies to which cell. */
const LANES = [
  { from: 0, row: 0, col: 0, delay: 0, label: "Siemens" },
  { from: 1, row: 1, col: 1, delay: 0.9, label: "6ES7414" },
  { from: 2, row: 2, col: 0, delay: 1.8, label: "24 V DC" },
  { from: 3, row: 3, col: 2, delay: 2.7, label: "IP65" },
  { from: 4, row: 0, col: 3, delay: 3.6, label: "Rev. C" },
  { from: 1, row: 4, col: 1, delay: 4.5, label: "18.4 kg" },
  { from: 3, row: 2, col: 2, delay: 5.4, label: "Class II" },
];

/**
 * How alive the scene is, and where the camera sits, for a given run state.
 *
 * `activity` drives particle rate and count; `pan` slides the camera from the
 * page toward the sheet as the run progresses, so the composition itself
 * reports roughly where the user is.
 */
function readScene({ stage, phase, uploadPercent, documentCount, hasTemplate, failed }) {
  if (stage === "results") {
    return failed
      ? { activity: 0, pan: -20, scale: 1, fill: 0, particles: false, tone: "failed" }
      : { activity: 0, pan: -34, scale: 1, fill: 1, particles: false, tone: "done" };
  }

  if (stage === "processing") {
    // The upload is measured, so the stream visibly accelerates with it; the
    // server phase runs at full tilt because that is all that is known.
    const activity = phase === "server" ? 1 : 0.45 + (uploadPercent / 100) * 0.45;
    return {
      activity,
      pan: -22,
      scale: 1.02,
      fill: phase === "server" ? 0.75 : 0.4,
      particles: true,
      tone: "running",
    };
  }

  if (documentCount > 0 && hasTemplate) {
    return { activity: 0.34, pan: -10, scale: 1.01, fill: 0.25, particles: true, tone: "ready" };
  }
  // No template means no columns to write into, so nothing in the sheet may
  // read as filled yet — the scene must not promise a result that cannot exist.
  if (documentCount > 0) {
    return { activity: 0.22, pan: 4, scale: 1.02, fill: 0, particles: true, tone: "idle" };
  }
  return { activity: 0.12, pan: 16, scale: 1.04, fill: 0, particles: true, tone: "idle" };
}

export default function WorkflowScene(props) {
  const uid = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const scene = readScene(props);

  const { stage, documentCount, hasTemplate } = props;
  const showLabels = stage === "setup";

  // Pointer parallax. Held as motion values rather than React state so moving
  // the mouse animates the SVG directly and never triggers a re-render.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 90, damping: 18, mass: 0.5 });
  const smoothY = useSpring(pointerY, { stiffness: 90, damping: 18, mass: 0.5 });

  // Each layer moves a different distance against the pointer, which is what
  // produces the depth. Written out rather than looped: useTransform is a hook,
  // and a helper that calls it would be calling a hook from a plain function.
  const auroraX = useTransform(smoothX, [-0.5, 0.5], [-26, 26]);
  const auroraY = useTransform(smoothY, [-0.5, 0.5], [-16, 16]);
  const docX = useTransform(smoothX, [-0.5, 0.5], [12, -12]);
  const docY = useTransform(smoothY, [-0.5, 0.5], [8, -8]);
  const sheetX = useTransform(smoothX, [-0.5, 0.5], [-14, 14]);
  const sheetY = useTransform(smoothY, [-0.5, 0.5], [-9, 9]);
  const streamY = useTransform(smoothY, [-0.5, 0.5], [5, -5]);

  const handlePointerMove = (event) => {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  // Fewer, slower particles when little is happening; a full stream at speed
  // once the server has the batch.
  const flightDuration = 5.4 - scene.activity * 3.4;
  const laneCount = Math.max(2, Math.round(2 + scene.activity * 5));
  const lanes = LANES.slice(0, laneCount);

  const filledCount = Math.round(scene.fill * ROWS * COLS);
  const isFilled = (row, col) => row * COLS + col < filledCount;

  const loop = (config) =>
    reduced ? undefined : { repeat: Infinity, repeatType: "loop", ...config };

  return (
    <div
      className={`scene scene--${scene.tone}`}
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <svg
        className="scene__svg"
        viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        <defs>
          <radialGradient id={`${uid}-aurora-a`}>
            <stop className="scene__stop-accent" offset="0%" />
            <stop className="scene__stop-fade" offset="100%" />
          </radialGradient>
          <radialGradient id={`${uid}-aurora-b`}>
            <stop className="scene__stop-semantic" offset="0%" />
            <stop className="scene__stop-fade" offset="100%" />
          </radialGradient>
          <linearGradient id={`${uid}-scan`} x1="0" y1="0" x2="0" y2="1">
            <stop className="scene__stop-fade" offset="0%" />
            <stop className="scene__stop-accent" offset="50%" />
            <stop className="scene__stop-fade" offset="100%" />
          </linearGradient>
          <clipPath id={`${uid}-doc-clip`}>
            <rect x={DOC.x} y={DOC.y} width={DOC.w} height={DOC.h} rx="10" />
          </clipPath>
          <clipPath id={`${uid}-sheet-clip`}>
            <rect x={SHEET.x} y={SHEET.y} width={SHEET.w} height={SHEET.h} rx="10" />
          </clipPath>
        </defs>

        {/* Ambient drift. Radial gradients rather than a blur filter: the same
            soft look for a fraction of the paint cost. */}
        <motion.g className="scene__aurora" style={{ x: auroraX, y: auroraY }}>
          <motion.ellipse
            fill={`url(#${uid}-aurora-a)`}
            rx="270"
            ry="160"
            initial={false}
            animate={reduced ? { cx: 300, cy: 120 } : { cx: [250, 390, 250], cy: [104, 140, 104] }}
            transition={loop({ duration: 18, ease: "easeInOut" })}
          />
          <motion.ellipse
            fill={`url(#${uid}-aurora-b)`}
            rx="240"
            ry="150"
            initial={false}
            animate={reduced ? { cx: 720, cy: 140 } : { cx: [760, 640, 760], cy: [150, 112, 150] }}
            transition={loop({ duration: 22, ease: "easeInOut" })}
          />
        </motion.g>

        {/* Camera. Everything solid rides on this group, so the composition
            slides from the page toward the sheet as the run advances. */}
        <motion.g
          initial={false}
          animate={{ x: scene.pan, scale: scene.scale }}
          transition={{ type: "spring", stiffness: 60, damping: 20, mass: 1.1 }}
          style={{ originX: "490px", originY: "130px" }}
        >
          {/* =========================================== source document */}
          <motion.g
            className="scene__doc"
            style={{ x: docX, y: docY }}
            whileHover={reduced ? undefined : { scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            {/* Emitted before the page so they paint behind it: SVG has no
                z-index, only document order. */}
            {documentCount > 1 && (
              <>
                <rect
                  className="scene__doc-stack"
                  x={DOC.x + 16}
                  y={DOC.y - 14}
                  width={DOC.w}
                  height={DOC.h}
                  rx="10"
                />
                <rect
                  className="scene__doc-stack"
                  x={DOC.x + 8}
                  y={DOC.y - 7}
                  width={DOC.w}
                  height={DOC.h}
                  rx="10"
                />
              </>
            )}

            <rect
              className="scene__doc-page"
              x={DOC.x}
              y={DOC.y}
              width={DOC.w}
              height={DOC.h}
              rx="10"
            />

            <g clipPath={`url(#${uid}-doc-clip)`}>
              {/* Letterhead */}
              <rect className="scene__doc-title" x={DOC.x + 16} y={DOC.y + 16} width="86" height="9" rx="3" />
              <rect className="scene__doc-sub" x={DOC.x + 16} y={DOC.y + 31} width="58" height="6" rx="3" />
              <rect className="scene__doc-logo" x={DOC.x + DOC.w - 44} y={DOC.y + 14} width="28" height="28" rx="7" />
              <rect className="scene__doc-rule" x={DOC.x + 16} y={DOC.y + 50} width={DOC.w - 32} height="1.5" rx="0.75" />

              {/* Label / value pairs — the fields the pipeline reads */}
              {FIELD_ROWS.map((row, index) => (
                <g key={row.y}>
                  <rect className="scene__doc-label" x={DOC.x + 16} y={row.y} width={row.label} height="6" rx="3" />
                  <motion.rect
                    className="scene__doc-value"
                    x={DOC.x + 62}
                    y={row.y - 2}
                    width={row.value}
                    height="10"
                    rx="3"
                    initial={false}
                    animate={
                      reduced || !scene.particles
                        ? { opacity: 0.9 }
                        : { opacity: [0.45, 1, 0.45] }
                    }
                    transition={loop({
                      duration: flightDuration,
                      delay: (index / FIELD_ROWS.length) * flightDuration,
                      ease: "easeInOut",
                    })}
                  />
                </g>
              ))}

              {/* Foot table */}
              <rect className="scene__doc-label" x={DOC.x + 16} y={DOC.y + 152} width="44" height="5" rx="2.5" />
              {TABLE_ROWS.map((y) => (
                <g key={y}>
                  <rect className="scene__doc-rule" x={DOC.x + 16} y={y + 8} width={DOC.w - 32} height="1" />
                  {TABLE_COLS.map((x, col) => (
                    <rect
                      key={x}
                      className="scene__doc-cellbar"
                      x={x}
                      y={y}
                      width={col === 1 ? 38 : 30}
                      height="5"
                      rx="2.5"
                    />
                  ))}
                </g>
              ))}

              {/* Reading pass down the page. */}
              {!reduced && (
                <motion.rect
                  className="scene__scan"
                  fill={`url(#${uid}-scan)`}
                  x={DOC.x}
                  width={DOC.w}
                  height="40"
                  initial={{ y: DOC.y - 20 }}
                  animate={{ y: [DOC.y - 20, DOC.y + DOC.h - 10, DOC.y - 20] }}
                  transition={loop({ duration: flightDuration * 1.7, ease: "easeInOut" })}
                />
              )}
            </g>

            <rect
              className="scene__doc-edge"
              x={DOC.x}
              y={DOC.y}
              width={DOC.w}
              height={DOC.h}
              rx="10"
            />
          </motion.g>

          {/* =========================================== the stream */}
          <motion.g style={{ y: streamY }}>
            {/* The route the values take, drawn faintly so the flight reads as
                following a path rather than drifting. */}
            <path
              className="scene__route"
              d={`M ${DOC.x + DOC.w + 6} ${DOC.y + 100} C 380 60, 480 190, ${SHEET.x - 6} ${SHEET.y + 96}`}
            />

            {scene.particles &&
              lanes.map((lane, index) => {
                const fromY = FIELD_ROWS[lane.from].y + 3;
                const toY = cellY(lane.row) + CELL_H / 2;

                return (
                  <motion.g
                    key={`${lane.label}-${index}`}
                    initial={{ opacity: 0 }}
                    animate={
                      reduced
                        ? { opacity: 0.9, x: 440, y: (fromY + toY) / 2 }
                        : {
                            x: [DOC.x + DOC.w, 360, 480, 600, SHEET.x + GUTTER + 8],
                            y: [fromY, fromY - 16, (fromY + toY) / 2, toY + 12, toY],
                            opacity: [0, 1, 1, 1, 0],
                            scale: [0.7, 1, 1, 1, 0.75],
                          }
                    }
                    transition={loop({
                      duration: flightDuration,
                      delay: (lane.delay / LANES.length) * flightDuration,
                      ease: "easeInOut",
                      times: [0, 0.16, 0.5, 0.86, 1],
                    })}
                  >
                    <rect
                      className="scene__pill"
                      x={showLabels ? -34 : -16}
                      y="-9"
                      width={showLabels ? 68 : 32}
                      height="18"
                      rx="9"
                    />
                    {showLabels ? (
                      <text className="scene__pill-text" x="0" y="4" textAnchor="middle">
                        {lane.label}
                      </text>
                    ) : (
                      // Abstract once a real run is under way: shape and motion,
                      // never a value the pipeline has not actually returned.
                      <g className="scene__pill-marks">
                        <circle cx="-7" cy="0" r="1.8" />
                        <circle cx="0" cy="0" r="1.8" />
                        <circle cx="7" cy="0" r="1.8" />
                      </g>
                    )}
                    <motion.circle
                      className="scene__pill-glow"
                      r="3"
                      cx={showLabels ? 34 : 16}
                      cy="0"
                      initial={false}
                      animate={reduced ? { opacity: 0.6 } : { opacity: [0.25, 1, 0.25] }}
                      transition={loop({ duration: 1.4, delay: index * 0.2, ease: "easeInOut" })}
                    />
                  </motion.g>
                );
              })}
          </motion.g>

          {/* =========================================== target sheet */}
          <motion.g
            className="scene__sheet"
            style={{ x: sheetX, y: sheetY }}
            whileHover={reduced ? undefined : { scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <rect
              className="scene__sheet-frame"
              x={SHEET.x}
              y={SHEET.y}
              width={SHEET.w}
              height={SHEET.h}
              rx="10"
            />

            <g clipPath={`url(#${uid}-sheet-clip)`}>
              {/* Column header band with letters */}
              <rect
                className="scene__sheet-headrow"
                x={SHEET.x}
                y={SHEET.y}
                width={SHEET.w}
                height={HEAD_H}
              />
              {COLUMN_LETTERS.map((letter, col) => (
                <text
                  key={letter}
                  className="scene__sheet-letter"
                  x={cellX(col) + CELL_W / 2}
                  y={SHEET.y + 17}
                  textAnchor="middle"
                >
                  {letter}
                </text>
              ))}

              {/* Row-number gutter */}
              <rect
                className="scene__sheet-gutter"
                x={SHEET.x}
                y={SHEET.y}
                width={GUTTER}
                height={SHEET.h}
              />
              {Array.from({ length: ROWS }, (_, row) => (
                <text
                  key={row}
                  className="scene__sheet-rownum"
                  x={SHEET.x + GUTTER / 2}
                  y={cellY(row) + CELL_H / 2 + 3.5}
                  textAnchor="middle"
                >
                  {row + 1}
                </text>
              ))}

              {/* Grid */}
              {Array.from({ length: ROWS + 1 }, (_, row) => (
                <line
                  key={`h${row}`}
                  className="scene__grid"
                  x1={SHEET.x}
                  y1={cellY(row)}
                  x2={SHEET.x + SHEET.w}
                  y2={cellY(row)}
                />
              ))}
              {Array.from({ length: COLS + 1 }, (_, col) => (
                <line
                  key={`v${col}`}
                  className="scene__grid"
                  x1={cellX(col)}
                  y1={SHEET.y}
                  x2={cellX(col)}
                  y2={SHEET.y + SHEET.h}
                />
              ))}

              {/* Header labels sitting in row 0 of the template */}
              {COLUMN_LETTERS.map((letter, col) => (
                <rect
                  key={`hb${letter}`}
                  className="scene__sheet-head"
                  x={cellX(col) + 10}
                  y={SHEET.y + HEAD_H + 12}
                  width={CELL_W - 20}
                  height="6"
                  rx="3"
                />
              ))}

              {/* Values */}
              {Array.from({ length: ROWS }, (_, row) =>
                Array.from({ length: COLS }, (_, col) => {
                  // Row 0 holds the header labels, so values start at row 1.
                  if (row === 0) return null;
                  const filled = isFilled(row, col);
                  const order = row * COLS + col;

                  return (
                    <motion.rect
                      key={`${row}-${col}`}
                      className={`scene__cell ${filled ? "scene__cell--filled" : ""}`}
                      x={cellX(col) + 8}
                      y={cellY(row) + CELL_H / 2 - 5}
                      width={CELL_W - 16 - (col % 2 === 0 ? 0 : 12)}
                      height="10"
                      rx="3"
                      initial={false}
                      animate={
                        reduced || !scene.particles
                          ? { opacity: filled ? 1 : 0.2 }
                          : { opacity: filled ? [0.35, 1, 1] : [0.2, 0.2, 0.2] }
                      }
                      transition={
                        filled && scene.particles && !reduced
                          ? loop({
                              duration: flightDuration,
                              delay: (order / (ROWS * COLS)) * flightDuration * 0.7,
                              ease: "easeOut",
                              times: [0, 0.3, 1],
                            })
                          : { duration: 0.4, ease: "easeOut" }
                      }
                    />
                  );
                })
              )}

              {/* The active cell outline, the way a spreadsheet shows focus. */}
              {scene.particles && !reduced && (
                <motion.rect
                  className="scene__selection"
                  width={CELL_W}
                  height={CELL_H}
                  rx="2"
                  initial={false}
                  animate={{
                    x: LANES.slice(0, laneCount).map((lane) => cellX(lane.col)),
                    y: LANES.slice(0, laneCount).map((lane) => cellY(lane.row)),
                  }}
                  transition={loop({
                    duration: flightDuration * laneCount * 0.5,
                    ease: "easeInOut",
                  })}
                />
              )}
            </g>

            <rect
              className="scene__sheet-edge"
              x={SHEET.x}
              y={SHEET.y}
              width={SHEET.w}
              height={SHEET.h}
              rx="10"
            />

            {/* Sheet tab, and a marker that the template is loaded. */}
            <rect
              className="scene__sheet-tab"
              x={SHEET.x + 14}
              y={SHEET.y + SHEET.h - 4}
              width="52"
              height="14"
              rx="4"
            />
            {hasTemplate && (
              <rect
                className="scene__sheet-loaded"
                x={SHEET.x + 74}
                y={SHEET.y + SHEET.h - 4}
                width="34"
                height="14"
                rx="4"
              />
            )}
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}
