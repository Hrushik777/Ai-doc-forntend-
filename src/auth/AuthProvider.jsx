import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { createSession } from "../api";
import { AuthContext, SESSION_KEY, SignInCancelledError } from "./auth-context";
import SignInDialog from "./SignInDialog";

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
      // Let a later attempt retry rather than caching the failure forever: this is
      // usually a blocked script or a dropped connection, not a permanent state.
      gsiPromise = null;
      reject(new Error("Could not load Google sign-in. Check your connection or any blockers."));
    };
    document.head.appendChild(script);
  });

  return gsiPromise;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  // The dialog is open exactly while a sign-in is outstanding. Holding the
  // promise's resolve/reject here is what lets start() await a sign-in that
  // completes through Google's button rather than a call we control.
  const [pending, setPending] = useState(null);
  const pendingRef = useRef(null);

  useEffect(() => storeSession(session), [session]);

  const settle = useCallback((outcome) => {
    const waiting = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    if (!waiting) return;
    if (outcome.error) waiting.reject(outcome.error);
    else waiting.resolve(outcome.session);
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    // Google's record of the last account is separate from ours; clearing it means
    // the next sign-in asks which account rather than assuming the previous one.
    try {
      window.google?.accounts?.id?.disableAutoSelect();
    } catch {
      // Nothing to clear if the library never loaded.
    }
  }, []);

  const signIn = useCallback(async () => {
    // A second press while the dialog is open joins the first attempt instead of
    // opening a second dialog over it.
    if (pendingRef.current) return pendingRef.current.promise;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error(
        "Google sign-in is not configured for this build: VITE_GOOGLE_CLIENT_ID is unset.\n\n" +
          "It is inlined at build time, so it must be present when the bundle is built."
      );
    }

    const googleId = await loadGoogleIdentityServices();

    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    pendingRef.current = { promise, resolve, reject };

    googleId.initialize({
      client_id: clientId,
      callback: async (response) => {
        if (!response?.credential) {
          settle({ error: new SignInCancelledError() });
          return;
        }
        try {
          // Google's token is spent here and never stored: the backend verifies it
          // once and returns a session of its own, which every later request carries.
          const issued = await createSession(response.credential);
          setSession(issued);
          settle({ session: issued });
        } catch (error) {
          settle({ error });
        }
      },
    });

    setPending({ googleId, clientId });
    return promise;
  }, [settle]);

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

  const cancelSignIn = useCallback(
    () => settle({ error: new SignInCancelledError() }),
    [settle]
  );

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

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {pending ? (
          <SignInDialog
            key="signin"
            googleId={pending.googleId}
            clientId={pending.clientId}
            onCancel={cancelSignIn}
          />
        ) : null}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}
