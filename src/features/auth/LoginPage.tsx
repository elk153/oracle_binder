import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import { supabase } from "../../services/supabaseClient.ts";
import { getAuthCallbackUrl, getSafeNextPath } from "./authRedirect.ts";
import "./AuthPages.css";

type AuthMode = "sign-in" | "sign-up";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoading, user } = useAuth();
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!isLoading && user) {
      navigate(nextPath, { replace: true });
    }
  }, [isLoading, navigate, nextPath, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        if (!data.session) {
          setErrorMessage("Sign-in succeeded without creating a session. Please try again.");
          return;
        }

        navigate(nextPath, { replace: true });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl(nextPath),
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        navigate(nextPath, { replace: true });
        return;
      }

      setStatusMessage(
        "If this address can be registered, check its inbox for a confirmation email before signing in.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Authentication could not be completed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || user) {
    return (
      <section className="app-v2__page auth-page" aria-live="polite">
        <p className="app-v2__page-text">Checking your session…</p>
      </section>
    );
  }

  const isSigningIn = mode === "sign-in";

  return (
    <section className="app-v2__page auth-page">
      <h1 className="app-v2__page-title">{isSigningIn ? "Sign in" : "Create account"}</h1>
      <p className="app-v2__page-text auth-page__intro">
        {isSigningIn
          ? "Sign in with your email address and password."
          : "Create an account with your email address and a password."}
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-form__label" htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          className="field__input auth-form__input"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
        />

        <label className="auth-form__label" htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          className="field__input auth-form__input"
          name="password"
          type="password"
          autoComplete={isSigningIn ? "current-password" : "new-password"}
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
        />

        {errorMessage && (
          <p className="auth-message auth-message--error" role="alert">
            {errorMessage}
          </p>
        )}
        {statusMessage && (
          <p className="auth-message" role="status">
            {statusMessage}
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Please wait…"
            : isSigningIn
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="auth-mode-switch">
        {isSigningIn ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="auth-link"
          onClick={() => {
            setMode(isSigningIn ? "sign-up" : "sign-in");
            setErrorMessage("");
            setStatusMessage("");
          }}
          disabled={isSubmitting}
        >
          {isSigningIn ? "Create an account" : "Sign in"}
        </button>
      </p>
    </section>
  );
}
