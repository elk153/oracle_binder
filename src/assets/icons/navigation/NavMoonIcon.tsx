import type { SVGProps } from "react";

const iconProps = {
  viewBox: "0 0 24 24",
  width: "1em",
  height: "1em",
  className: "nav-icon",
  "aria-hidden": "true",
  focusable: "false",
} satisfies SVGProps<SVGSVGElement>;

export default function NavMoonIcon() {
  return (
    <svg {...iconProps}>
      <path
        className="nc-trace"
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        className="nc-core"
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
        transform="translate(4.73 6.08) scale(0.55)"
      />
    </svg>
  );
}
