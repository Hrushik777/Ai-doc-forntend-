import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "./theme/ThemeProvider";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* reducedMotion="user" collapses every Motion animation to an instant state
        change when the operating system asks for reduced motion. The CSS-driven
        animations are handled by the matching media query in styles/base.css. */}
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </MotionConfig>
  </StrictMode>
);
