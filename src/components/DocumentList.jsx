import { AnimatePresence } from "motion/react";
import FileRow from "./FileRow";

/**
 * The selected documents and, once a run starts, what happened to each.
 *
 * `aria-live="polite"` on the list means a screen reader hears files being
 * added and removed without the focus being pulled out of the drop zone.
 */
export default function DocumentList({
  documents,
  statuses,
  onRemove,
  removable = true,
  disabled = false,
}) {
  // Renders nothing when empty rather than a placeholder box. The drop zone
  // directly above already says what to do, so an empty-state panel repeated
  // the instruction and added 140px of height to both cards in the grid.
  if (documents.length === 0) return null;

  return (
    <ul className="doclist" aria-live="polite" aria-relevant="additions removals">
      <AnimatePresence initial={false}>
        {documents.map((entry) => {
          const state = statuses?.get(entry.id);
          return (
            <FileRow
              key={entry.id}
              entry={entry}
              status={state?.status ?? "queued"}
              progress={state?.progress ?? 0}
              onRemove={onRemove}
              removable={removable}
              disabled={disabled}
            />
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
