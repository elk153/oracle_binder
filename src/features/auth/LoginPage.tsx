import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import { supabase } from "../../services/supabaseClient.ts";
import { getAuthCallbackUrl, getSafeNextPath } from "./authRedirect.ts";
import "./AuthPages.css";

// D-067/D-069: OAuth providers enabled in the Supabase dashboard (D-068).
const SOCIAL_PROVIDERS = [
  { id: "github", label: "GitHub" },
  { id: "discord", label: "Discord" },
] as const;

type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]["id"];

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoading, user } = useAuth();
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isLoading && user) {
      navigate(nextPath, { replace: true });
    }
  }, [isLoading, navigate, nextPath, user]);

  async function handleProviderSignIn(provider: SocialProvider) {
    setErrorMessage("");
    setIsSubmitting(true);

    // On success the browser leaves the app for the provider and returns to
    // /v2/auth/callback, so isSubmitting is only reset when the redirect fails.
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getAuthCallbackUrl(nextPath) },
    });

    if (error) {
      setErrorMessage(error.message);
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

  return (
    <section className="app-v2__page auth-page">
      <h1 className="app-v2__page-title">Sign in</h1>
      <p className="app-v2__page-text auth-page__intro">
        Sign in or create an account with GitHub or Discord. A new account is created the
        first time you sign in.
      </p>

      <div className="auth-providers">
        {SOCIAL_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className="auth-provider"
            onClick={() => void handleProviderSignIn(provider.id)}
            disabled={isSubmitting}
          >
            Continue with {provider.label}
          </button>
        ))}
      </div>

      {errorMessage && (
        <p className="auth-message auth-message--error" role="alert">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
