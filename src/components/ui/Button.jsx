import { forwardRef } from "react";
import Icon from "./Icon";

/**
 * The one button in the product.
 *
 * Variants are roles, not colours: `primary` is the single forward action on a
 * screen, `secondary` is a real alternative, `ghost` is a low-stakes control
 * sitting inside dense UI, and `danger` destroys something.
 *
 * Every variant is at least 44px tall at `md` so it clears the touch-target
 * minimum without a separate mobile rule.
 */
const Button = forwardRef(function Button(
  {
    children,
    variant = "secondary",
    size = "md",
    icon,
    iconAfter,
    loading = false,
    fullWidth = false,
    className = "",
    disabled,
    type = "button",
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      // Announces the wait without removing the button from the a11y tree,
      // which is what happens if a spinner simply replaces the label.
      aria-busy={loading || undefined}
      className={[
        "btn",
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth ? "btn--full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {loading ? (
        <span className="btn__spinner" aria-hidden="true" />
      ) : (
        icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />
      )}

      {children && <span className="btn__label">{children}</span>}

      {iconAfter && !loading && <Icon name={iconAfter} size={size === "sm" ? 15 : 17} />}
    </button>
  );
});

export default Button;
