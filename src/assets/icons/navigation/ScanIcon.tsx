// Camera-viewfinder corners around a card: the navbar icon of the card
// scanner (/v2/scan, D-061). Uses the same nc-trace / nc-core classes as the
// other navigation icons, so it picks up their colors and active state.
export default function ScanIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      className="nav-icon"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="nc-trace"
        d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect className="nc-core" x="8.5" y="6.5" width="7" height="11" rx="1" />
    </svg>
  );
}
