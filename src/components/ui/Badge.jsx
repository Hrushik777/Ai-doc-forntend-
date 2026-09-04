import Icon from "./Icon";

/**
 * A small status or count marker.
 *
 * Tone is never the only signal: every non-neutral tone pairs with an icon, so
 * the meaning survives greyscale printing and colour-blind vision.
 */
export default function Badge({ children, tone = "neutral", icon, className = "" }) {
  return (
    <span className={`badge badge--${tone} ${className}`.trim()}>
      {icon && <Icon name={icon} size={13} strokeWidth={1.9} />}
      {children}
    </span>
  );
}
