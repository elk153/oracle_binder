// CSS guardrails from D-053 Phase 7. Run with `npm run lint:css`.
// - Colors come from src/styles/tokens.css (splash.css loads before the tokens).
// - !important only in src/styles/base.css (the reduced-motion rule).
// - Class selectors only; element selectors live in base.css and splash.css.
//   The few allowed exceptions (markup rendered by other components) carry a
//   `stylelint-disable-next-line` comment with the reason.
const colorRules = {
  "color-no-hex": true,
  "color-named": "never",
  "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch"],
};

export default {
  rules: {
    ...colorRules,
    "declaration-no-important": true,
    "selector-max-type": 0,
  },
  overrides: [
    {
      files: ["src/styles/tokens.css"],
      rules: { "color-no-hex": null, "color-named": null, "function-disallowed-list": null },
    },
    {
      files: ["src/styles/splash.css"],
      rules: { "color-no-hex": null, "color-named": null, "function-disallowed-list": null, "selector-max-type": null },
    },
    {
      files: ["src/styles/base.css"],
      rules: { "declaration-no-important": null, "selector-max-type": null },
    },
  ],
};
