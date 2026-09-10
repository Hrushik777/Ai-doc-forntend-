import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "./theme/ThemeProvider";
import { AuthProvider } from "./auth/AuthProvider";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* reducedMotion="user" collapses every Motion animation to an instant state
        change when the operating system asks for reduced motion. The CSS-driven
        animations are handled by the matching media query in styles/base.css. */}
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        {/* Wraps App because useWorkflow reads the session, and App owns the one
            workflow instance. Nothing here touches the backend on mount: a stored
            session is read from sessionStorage, and Google's script is fetched
            only when someone actually signs in. */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  </StrictMode>
);
