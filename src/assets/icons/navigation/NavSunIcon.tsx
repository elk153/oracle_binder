import type { SVGProps } from "react";

const iconProps = {
  viewBox: "0 0 24 24",
  width: "1em",
  height: "1em",
  className: "nav-icon",
  "aria-hidden": "true",
  focusable: "false",
} satisfies SVGProps<SVGSVGElement>;

export default function NavSunIcon() {
  return (
    <svg {...iconProps}>
      <path
        className="nc-trace"
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        className="nc-trace"
        cx="12"
        cy="12"
        r="4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle className="nc-core" cx="12" cy="12" r="2.6" />
    </svg>
  );
}
