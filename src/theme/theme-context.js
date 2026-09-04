import { createContext, useContext } from "react";

export const STORAGE_KEY = "docintel:theme";

/**
 * "system" is a real, persistable choice — not the absence of one. Users who
 * switch their OS between light and dark on a schedule expect the app to
 * follow, and collapsing "system" into whichever theme happened to be active
 * at first paint would silently opt them out of that.
 */
export const THEMES = ["light", "dark", "system"];

export const ThemeContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside a ThemeProvider");
  return context;
}
