import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import useDismissSplash from "../hooks/useDismissSplash.ts";
import "./RouteErrorPage.css";

// Browsers word a failed dynamic import differently (Chromium, Firefox,
// Safari). It happens when the app was open during a deploy: the old page
// asks for a code chunk whose file name no longer exists on the server.
const CHUNK_LOAD_ERRORS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
];

function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    CHUNK_LOAD_ERRORS.some((pattern) => pattern.test(error.message))
  );
}

function describeError(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

/**
 * Error boundary for the /v2 routes (React Router `errorElement`). It
 * replaces the page when rendering or loading a route throws, and offers a
 * reload. Error details are shown only in development.
 */
export default function RouteErrorPage() {
  // This page replaces the App layout, whose effect normally hides the
  // splash; without this call a direct visit to an error route keeps the
  // pulsing logo on screen.
  useDismissSplash();
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const newVersion = isChunkLoadError(error);

  const title = notFound
    ? "Page not found"
    : newVersion
      ? "A new version of Oracle Binder is available"
      : "Something went wrong";
  const text = notFound
    ? "This address does not match a page in Oracle Binder."
    : newVersion
      ? "Reload the page to load the latest version."
      : "Reload the page to try again.";

  return (
    <main className="page route-error" role="alert">
      <div className="route-error__content">
        <h1 className="page__title">{title}</h1>
        <p className="route-error__text">{text}</p>
        {notFound ? (
          <Link className="page__control page__button route-error__action" to="/v2/home">
            Go to home
          </Link>
        ) : (
          <button
            type="button"
            className="page__control page__button route-error__action"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        )}
        {import.meta.env.DEV && (
          <pre className="route-error__details">{describeError(error)}</pre>
        )}
      </div>
    </main>
  );
}
