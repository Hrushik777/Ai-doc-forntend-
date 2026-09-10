import { useState } from "react";
import { useAuth } from "../auth/auth-context";
import { SignInCancelledError } from "../auth/auth-context";
import Button from "./ui/Button";

/**
 * Signed-in state in the topbar.
 *
 * Signing in from here is optional — pressing Process does it too. It exists so
 * someone who wants to sort out their account before choosing twenty documents
 * can, and so that being signed in is visible rather than implied.
 *
 * A text label rather than a Google "G": Icon.jsx is a single-colour 24px stroke
 * registry with no brand marks, and an approximated multicolour logo would be
 * both off-brand and against Google's mark guidelines.
 */
export default function AccountControl() {
  const { user, isSignedIn, signIn, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSignIn() {
    setBusy(true);
    setError("");
    try {
      await signIn();
    } catch (cause) {
      // Closing the popup is a decision, not a fault, so it gets no error text.
      if (!(cause instanceof SignInCancelledError)) {
        setError(cause.message || "Could not sign in.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (isSignedIn) {
    return (
      <div className="account">
        <span className="account__email" title={user.email}>
          {user.email}
        </span>
        <button type="button" className="linkbtn" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="account">
      {error ? (
        <span className="account__error" role="alert">
          {error}
        </span>
      ) : null}
      <Button variant="ghost" size="sm" loading={busy} onClick={onSignIn}>
        Sign in
      </Button>
    </div>
  );
}
