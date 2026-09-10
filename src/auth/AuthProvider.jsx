import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSession } from "../api";
import { AuthContext, SESSION_KEY, SignInCancelledError } from "./auth-context";

const GSI_SRC = "https://accounts.google.com/gsi/client";

/**
 * Renew this far before the token actually expires, so a long upload that starts
 * on a nearly-expired session does not fail on arrival.
 */
const RENEW_BEFORE_MS = 2 * 60 * 1000;

function readStoredSession() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (!stored?.token || !stored?.expiresAt) return null;
    // A token already past its expiry is not worth holding: the backend would
    // reject it, and keeping it makes the UI claim a session that does not work.
    return Date.parse(stored.expiresAt) > Date.now() ? stored : null;
  } catch {
    // Private mode, blocked site data, or something else wrote to the key.
    return null;
  }
}

function storeSession(session) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Persisting is a convenience; the session still works for this page view.
  }
}

/** Loads Google Identity Services once, and resolves every caller from the same promise. */
let gsiPromise = null;
function loadGoogleIdentityServices() {
  if (gsiPromise) return gsiPromise;

  gsiPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google.accounts.id);
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () =>
      window.google?.accounts?.id
        ? resolve(window.google.accounts.id)
        : reject(new Error("Google sign-in loaded but did not initialise."));
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever: this
      // is usually a blocked script or a dropped connection, not a permanent state.
      gsiPromise = null;
      reject(new Error("Could not load Google sign-in. Check your connection or any blockers."));
    };
    document.head.appendChild(script);
  });

  return gsiPromise;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  // Holds the in-flight sign-in so two rapid clicks share one popup rather than
  // opening a second that the browser would silently suppress.
  const pendingRef = useRef(null);

  useEffect(() => storeSession(session), [session]);

  const signOut = useCallback(() => {
    setSession(null);
    // Google's own record of the last account is separate from ours; clearing it
    // means the next sign-in asks which account rather than assuming the old one.
    try {
      window.google?.accounts?.id?.disableAutoSelect();
    } catch {
      // Nothing to clear if the library never loaded.
    }
  }, []);

  const signIn = useCallback(async () => {
    if (pendingRef.current) return pendingRef.current;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error(
        "Google sign-in is not configured for this build: VITE_GOOGLE_CLIENT_ID is unset.\n\n" +
          "It is inlined at build time, so it must be present when the bundle is built."
      );
    }

    const attempt = (async () => {
      const googleId = await loadGoogleIdentityServices();

      const idToken = await new Promise((resolve, reject) => {
        googleId.initialize({
          client_id: clientId,
          callback: (response) =>
            response?.credential
              ? resolve(response.credential)
              : reject(new SignInCancelledError()),
        });

        // requestAccessToken-style popup rather than One Tap: One Tap can be
        // suppressed entirely by browser settings or a previous dismissal, and a
        // sign-in the user explicitly asked for must not silently do nothing.
        googleId.prompt((notification) => {
          if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
            reject(new SignInCancelledError());
          }
        });
      });

      // Google's token is spent here and never stored: the backend verifies it
      // once and returns a session of its own, which is what every later request
      // carries.
      const issued = await createSession(idToken);
      setSession(issued);
      return issued;
    })();

    pendingRef.current = attempt;
    try {
      return await attempt;
    } finally {
      pendingRef.current = null;
    }
  }, []);

  /**
   * The token to send with a request, refreshing first if it is close enough to
   * expiry that the request might outlive it.
   */
  const getToken = useCallback(async () => {
    const current = session;
    const stillGood =
      current?.token && Date.parse(current.expiresAt) - Date.now() > RENEW_BEFORE_MS;

    if (stillGood) return current.token;
    return (await signIn()).token;
  }, [session, signIn]);

  const value = useMemo(
    () => ({
      user: session ? { email: session.email, name: session.name } : null,
      isSignedIn: Boolean(session?.token),
      getToken,
      signIn,
      signOut,
    }),
    [session, getToken, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
