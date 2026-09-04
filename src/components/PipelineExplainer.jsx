import { motion } from "motion/react";
import Icon from "./ui/Icon";

const STEPS = [
  {
    key: "document",
    icon: "document",
    title: "Your document",
    body: "A PDF, Word file or scan — data sheets, reports, forms.",
    sample: { label: "Mfr:", value: "Siemens" },
  },
  {
    key: "extraction",
    icon: "sparkles",
    title: "The model reads it",
    body: "Every labelled value is located on the page.",
    sample: { label: "Field found", value: "Mfr = Siemens" },
  },
  {
    key: "mapping",
    icon: "link",
    title: "Fields are matched",
    body: "Exactly where names line up, semantically where they don't.",
    sample: { label: "Matched to", value: "Manufacturer" },
  },
  {
    key: "excel",
    icon: "spreadsheet",
    title: "Your template fills in",
    body: "Values land in your own columns. Download the workbook.",
    sample: { label: "Manufacturer", value: "Siemens" },
  },
];

/**
 * A standing explanation of what the product does, shown before anything has
 * been uploaded. The worked example is illustrative and labelled as such — the
 * real mapping view, built from pipeline output, appears after processing.
 *
 * The cards reveal as they scroll into view and respond to hover, so the
 * section reads as part of the interface rather than static footer copy.
 */
export default function PipelineExplainer() {
  return (
    <section className="explainer" aria-labelledby="explainer-heading">
      <div className="explainer__head">
        <h2 className="explainer__title" id="explainer-heading">
          How it works
        </h2>
        <span className="explainer__note">Illustrative example</span>
      </div>

      <ol className="explainer__steps">
        {STEPS.map((step, index) => (
          <motion.li
            className="explainer__step spotlight"
            key={step.key}
            initial={{ opacity: 0, y: 16 }}
            // once: true — a card that re-animates every time it scrolls past
            // turns a reference section into a distraction.
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            whileHover={{ y: -4 }}
            transition={{
              duration: 0.42,
              delay: index * 0.07,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="explainer__marker">
              <span className="explainer__icon" aria-hidden="true">
                <Icon name={step.icon} size={16} />
              </span>
              <span className="explainer__index">{String(index + 1).padStart(2, "0")}</span>
            </div>

            <h3 className="explainer__step-title">{step.title}</h3>
            <p className="explainer__step-body">{step.body}</p>

            <div className={`explainer__sample explainer__sample--${step.key}`}>
              <span className="explainer__sample-label">{step.sample.label}</span>
              <span className="explainer__sample-value mono">{step.sample.value}</span>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
