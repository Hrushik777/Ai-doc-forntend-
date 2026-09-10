import { createContext, useContext } from "react";

/**
 * sessionStorage, not localStorage.
 *
 * The backend has no database and therefore no way to revoke a session: a token
 * works until it expires, and nothing can call it back. Persisting it past the
 * tab that created it would widen that window for no benefit the user asked
 * for — closing the tab is the one signal we have that they are done.
 */
export const SESSION_KEY = "docintel:session";

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider");
  return context;
}

/** Thrown by signIn when the user closes the Google popup rather than completing it. */
export class SignInCancelledError extends Error {
  constructor() {
    super("Sign-in was cancelled.");
    this.name = "SignInCancelledError";
  }
}
