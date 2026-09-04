/*
 * One registry for every icon in the product.
 *
 * Previously the same document and spreadsheet outlines were pasted inline in
 * five components, which meant five places to edit and five chances to drift.
 * All paths are drawn on a 24x24 grid with a 1.6 stroke so they sit on the
 * same optical weight next to each other.
 */

const PATHS = {
  document: (
    <>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
    </>
  ),
  documentText: (
    <>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M9.5 13.5h5M9.5 17h3" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m4 17 4.5-4.5 3 3L15 12l5 5" />
      <circle cx="9" cy="9" r="1.4" />
    </>
  ),
  spreadsheet: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 9v11" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />,
  check: <path d="m4.5 12.5 5 5 10-11" strokeLinecap="round" strokeLinejoin="round" />,
  alert: (
    <>
      <path d="M12 4.5 2.8 20h18.4L12 4.5Z" strokeLinejoin="round" />
      <path d="M12 10v4.5M12 17.4v.2" strokeLinecap="round" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V13M12 16.2v.2" strokeLinecap="round" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.8v.2" strokeLinecap="round" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v12" strokeLinecap="round" />
      <path d="m7.5 11 4.5 4.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 17.5v1a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1" strokeLinecap="round" />
    </>
  ),
  upload: (
    <>
      <path d="M12 20.5v-12" strokeLinecap="round" />
      <path d="m7.5 13 4.5-4.5 4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 6.5v-1a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" strokeLinecap="round" />
    </>
  ),
  folder: (
    <path
      d="M3.5 7.5a2 2 0 0 1 2-2h3.4a2 2 0 0 1 1.5.7l1 1.3h7.1a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.5Z"
      strokeLinejoin="round"
    />
  ),
  sparkles: (
    <>
      <path
        d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.6l-1.6-5.4L5 10.6 10.4 9 12 3.5Z"
        strokeLinejoin="round"
      />
      <path d="M18.5 16.5 19.2 19l2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.5Z" strokeLinejoin="round" />
    </>
  ),
  link: (
    <>
      <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7l-1.3 1.3" strokeLinecap="round" />
      <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.3-1.3" strokeLinecap="round" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  replay: (
    <>
      <path d="M3.8 12a8.2 8.2 0 1 1 2.6 6" strokeLinecap="round" />
      <path d="M3.2 20.2v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        strokeLinecap="round"
      />
    </>
  ),
  moon: <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z" strokeLinejoin="round" />,
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M9 20.5h6M12 16.5v4" strokeLinecap="round" />
    </>
  ),
  chevronLeft: <path d="m14 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />,
  chevronRight: <path d="m10 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
  arrowRight: (
    <path d="M4.5 12h15m0 0-5.5-5.5M19.5 12 14 17.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  trash: (
    <>
      <path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" strokeLinecap="round" />
      <path d="M6.5 6.5 7.4 19a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12.5" strokeLinecap="round" />
    </>
  ),
  plus: <path d="M12 5.5v13M5.5 12h13" strokeLinecap="round" />,
  minus: <path d="M5.5 12h13" strokeLinecap="round" />,
};

/**
 * Decorative by default: no name is announced and the glyph is hidden from the
 * accessibility tree. Pass `title` only when the icon is the sole carrier of
 * meaning — an icon-only button should label the *button*, not the icon.
 */
export default function Icon({ name, size = 20, title, className = "", strokeWidth = 1.6 }) {
  const path = PATHS[name];
  if (!path) return null;

  return (
    <svg
      className={`icon ${className}`.trim()}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
      focusable="false"
    >
      {path}
    </svg>
  );
}
