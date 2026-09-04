import { useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEY, THEMES, ThemeContext } from "./theme-context";

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : "system";
  } catch {
    // Private mode, or site data blocked. Not worth failing over.
    return "system";
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  // Tracks what "system" currently resolves to, so the toggle can reason about
  // the theme the user is actually looking at rather than the word "system".
  const [systemTheme, setSystemTheme] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => setSystemTheme(event.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Persisting is a convenience; the theme still applies for this session.
    }
  }, [theme]);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  const setTheme = useCallback((next) => {
    if (THEMES.includes(next)) setThemeState(next);
  }, []);

  // Cycles through states whose effect the user can actually see: the opposite
  // of the current appearance, then back to following the system.
  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      if (current === "system") return systemTheme === "dark" ? "light" : "dark";
      return current === "dark" ? "light" : "system";
    });
  }, [systemTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
