import { useCallback, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import Icon from "./ui/Icon";
import useSpotlight from "../hooks/useSpotlight";

/**
 * Drag-and-drop with a real click-to-browse path.
 *
 * The label wraps a genuine file input rather than a div with a click handler,
 * which is what makes the zone keyboard-reachable and screen-reader-announced
 * for free. That also satisfies WCAG 2.2 "Dragging Movements": dragging is
 * never the only way in.
 *
 * Filtering and rejection reporting belong to the caller — this component
 * hands over every file it receives and does not silently discard anything.
 */
export default function FileDropZone({
  accept,
  icon = "document",
  multiple = false,
  disabled = false,
  title,
  hint,
  browseLabel,
  describedBy,
  onFiles,
  variant = "default",
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const spotlight = useSpotlight();

  // dragenter/dragleave fire for every child element the pointer crosses, so a
  // boolean flickers. Counting entries against exits is what keeps the
  // highlight stable while the pointer moves across the zone's own contents.
  const dragDepth = useRef(0);

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList);
      if (files.length > 0) onFiles(files);
    },
    [onFiles]
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      if (disabled) return;
      handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleDragEnter = useCallback(
    (event) => {
      event.preventDefault();
      if (disabled) return;
      dragDepth.current += 1;
      setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  }, []);

  return (
    <div
      {...spotlight}
      className={[
        "dropzone",
        "spotlight",
        `dropzone--${variant}`,
        isDragging ? "dropzone--active" : "",
        disabled ? "dropzone--disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <label htmlFor={inputId} className="dropzone__label">
        <motion.span
          className="dropzone__icon"
          aria-hidden="true"
          animate={isDragging ? { scale: 1.08, y: -2 } : { scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
        >
          <Icon name={isDragging ? "upload" : icon} size={24} />
        </motion.span>

        <span className="dropzone__title">{title}</span>
        <span className="dropzone__hint">{hint}</span>
        <span className="dropzone__browse">{browseLabel}</span>

        <input
          id={inputId}
          ref={inputRef}
          className="dropzone__input"
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          aria-describedby={describedBy}
          onChange={(event) => {
            if (event.target.files?.length) handleFiles(event.target.files);
            // Clearing lets the same file be picked again after removal —
            // without this, re-selecting an identical path fires no change.
            event.target.value = "";
          }}
        />
      </label>

      {/* Covers the zone only while a drag is in flight, so the drop target is
          one unbroken rectangle rather than a grid of child elements. */}
      {isDragging && <span className="dropzone__veil" aria-hidden="true" />}
    </div>
  );
}
