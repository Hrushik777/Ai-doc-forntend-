import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import Icon from "./ui/Icon";
import Button from "./ui/Button";
import MagneticButton from "./MagneticButton";
import { LIMITS } from "../api";
import { DOCUMENT_TYPE_LABEL } from "../utils/files";

/*
 * The opening screen.
 *
 * Cinematic while the workspace is empty, then it gets out of the way: once a
 * file or a template is picked it collapses to a compact header. A full-height
 * hero is the right first impression for a product page and the wrong permanent
 * fixture in a tool someone runs twenty batches through — this way it is both.
 */

/* Every figure here is a real constraint read off the backend contract, not
   marketing filler. */
const FACTS = [
  { icon: "document", label: DOCUMENT_TYPE_LABEL },
  { icon: "upload", label: `${LIMITS.maxFileSizeLabel} per file` },
  { icon: "spreadsheet", label: "Your template, or none" },
];

const EASE = [0.22, 1, 0.36, 1];

/* Entrance is a stagger, not a wall of things fading in together. */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

const rise = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.62, ease: EASE } },
};

export default function Hero({ compact, onStart, onExplain }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  // Scrub-linked scroll, the same job ScrollTrigger's scrub does: progress runs
  // 0 → 1 as the hero leaves the viewport, and every parallax layer reads it.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const giantY = useTransform(scrollYProgress, [0, 1], ["0%", "34%"]);
  const giantScale = useTransform(scrollYProgress, [0, 1], [1, 1.16]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 74]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);
  const auroraScroll = useTransform(scrollYProgress, [0, 1], [0, -110]);

  // Pointer parallax on the aurora, so the light shifts with the cursor.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const auroraX = useSpring(useTransform(pointerX, [-0.5, 0.5], [-52, 52]), {
    stiffness: 60,
    damping: 20,
  });
  const auroraY = useSpring(useTransform(pointerY, [-0.5, 0.5], [-34, 34]), {
    stiffness: 60,
    damping: 20,
  });

  const handlePointerMove = (event) => {
    if (reduced || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <motion.section
      ref={ref}
      className={`hero ${compact ? "hero--compact" : ""}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      // Height is animated rather than swapped so the collapse reads as the
      // hero stepping aside, not as the page jumping.
      layout
      transition={{ duration: 0.55, ease: EASE }}
    >
      <div className="hero__grid" aria-hidden="true" />

      <motion.div
        className="hero__aurora"
        aria-hidden="true"
        style={reduced ? undefined : { x: auroraX, y: auroraY, translateY: auroraScroll }}
      />

      {/* The destination, set as a watermark behind everything. Presentational
          only — the accessible name of this section comes from the heading. */}
      {!compact && (
        <motion.div
          className="hero__watermark"
          aria-hidden="true"
          style={reduced ? undefined : { y: giantY, scale: giantScale }}
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          EXCEL
        </motion.div>
      )}

      <motion.div
        className="hero__content"
        style={reduced || compact ? undefined : { y: contentY, opacity: contentOpacity }}
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.h1 className="hero__title" variants={rise}>
          <span className="hero__title-line">Turn documents into</span>
          <span className="hero__title-line hero__title-glow">structured Excel</span>
        </motion.h1>

        <motion.p className="hero__lead" variants={rise}>
          Upload your documents and <em>your own Excel template</em>. Each document is
          read, its fields matched to your column headers, and the workbook returned
          filled in — with <em>every match shown</em>, so you can check it.
        </motion.p>

        {!compact && (
          <>
            <motion.div className="hero__actions" variants={rise}>
              <MagneticButton>
                <Button variant="primary" size="lg" icon="upload" onClick={onStart}>
                  Start with your files
                </Button>
              </MagneticButton>

              <MagneticButton strength={0.22} tilt={6}>
                <Button variant="secondary" size="lg" icon="info" onClick={onExplain}>
                  See how it works
                </Button>
              </MagneticButton>
            </motion.div>

            <motion.ul className="hero__facts" variants={rise}>
              {FACTS.map((fact) => (
                <li className="hero__fact glass-pill" key={fact.label}>
                  <Icon name={fact.icon} size={14} />
                  {fact.label}
                </li>
              ))}
            </motion.ul>
          </>
        )}
      </motion.div>

      {!compact && (
        <motion.div
          className="hero__scrollcue"
          aria-hidden="true"
          style={reduced ? undefined : { opacity: contentOpacity }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <motion.span
            className="hero__scrollcue-dot"
            animate={reduced ? undefined : { y: [0, 9, 0] }}
            transition={
              reduced ? undefined : { duration: 1.9, repeat: Infinity, ease: "easeInOut" }
            }
          />
        </motion.div>
      )}
    </motion.section>
  );
}
