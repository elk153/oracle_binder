import { Link, useLocation } from "react-router";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import ScanCamera from "./ScanCamera.tsx";
import "./ScanPage.css";

// The two scanner modes (D-061). The mode lives in the URL (?mode=), so a
// reload keeps it and Back returns to the mode choice.
const SCAN_MODES = ["identify", "add"] as const;
type ScanMode = (typeof SCAN_MODES)[number];

const MODE_TITLES: Record<ScanMode, string> = {
  identify: "Identify a card",
  add: "Add cards",
};

export default function ScanPage() {
  // No default: a missing or unknown ?mode= means "no mode chosen yet".
  // history: "push" adds a browser history entry when a mode is picked.
  const [mode, setMode] = useQueryState(
    "mode",
    parseAsStringLiteral(SCAN_MODES).withOptions({ history: "push" }),
  );

  if (mode === null) {
    return <ModeChoice onChoose={setMode} />;
  }

  return (
    <section className="page scan-page">
      <div className="page__heading scan-page__heading">
        <h1 className="page__title">{MODE_TITLES[mode]}</h1>
        <button
          type="button"
          className="page__action scan-page__change"
          onClick={() => setMode(null)}
        >
          Change mode
        </button>
      </div>
      {mode === "add" ? <AddModeGate /> : <ScanCamera />}
    </section>
  );
}

type ModeChoiceProps = {
  onChoose: (mode: ScanMode) => void;
};

function ModeChoice({ onChoose }: ModeChoiceProps) {
  return (
    <section className="page scan-page">
      <div className="page__heading scan-page__heading">
        <h1 className="page__title">Scan a card</h1>
      </div>
      <p className="scan-page__intro">What do you want to do?</p>
      <div className="scan-page__modes">
        <button
          type="button"
          className="scan-page__mode"
          onClick={() => onChoose("identify")}
        >
          <span className="scan-page__mode-title">Identify</span>
          <span className="scan-page__mode-text">
            Find a card and open its details.
          </span>
        </button>
        <button
          type="button"
          className="scan-page__mode"
          onClick={() => onChoose("add")}
        >
          <span className="scan-page__mode-title">Add</span>
          <span className="scan-page__mode-text">
            Add cards one after another to a binder or a deck. Requires sign-in.
          </span>
        </button>
      </div>
    </section>
  );
}

// Add mode needs a signed-in user, because binders and decks belong to one.
// The route itself stays public (Identify works signed out), so the check
// happens here instead of in RequireAuth.
function AddModeGate() {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <p className="page__message" aria-live="polite" aria-busy="true">
        Checking your session…
      </p>
    );
  }

  if (!user) {
    const nextPath = `${location.pathname}${location.search}`;
    return (
      <div className="scan-page__signin">
        <p className="page__message">Sign in to add cards to your binders and decks.</p>
        <Link
          className="page__action scan-page__signin-link"
          to={`/v2/login?next=${encodeURIComponent(nextPath)}`}
        >
          Sign in
        </Link>
      </div>
    );
  }

  return <ScanCamera />;
}
