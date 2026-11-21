import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import { getSafeNextPath } from "./authRedirect.ts";
import "./AuthPages.css";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoading, user } = useAuth();
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const callbackError =
    searchParams.get("error_description") ?? searchParams.get("error");

  useEffect(() => {
    if (!isLoading && user) {
      navigate(nextPath, { replace: true });
    }
  }, [isLoading, navigate, nextPath, user]);

  return (
    <section className="app-v2__page auth-page" aria-live="polite">
      <h1 className="app-v2__page-title">{isLoading ? "Confirming your account…" : "Email confirmation"}</h1>
      {isLoading ? (
        <p className="app-v2__page-text">Finishing authentication. This may take a moment.</p>
      ) : user ? null : (
        <>
          <p className="auth-message auth-message--error" role="alert">
            {callbackError
              ? `Confirmation failed: ${callbackError}`
              : "No authenticated session was created. The confirmation link may have expired or already been used."}
          </p>
          <p className="app-v2__page-text">
            <a className="auth-link" href="/v2/login">
              Return to sign in
            </a>
          </p>
        </>
      )}
    </section>
  );
}
