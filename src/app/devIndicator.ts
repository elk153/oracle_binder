// Development-only marker: a striped frame around the window, so the dev server
// is easy to tell apart from the deployed app.
//
// main.tsx imports this file only inside `if (import.meta.env.DEV)`. Vite
// replaces that with `false` in "vite build", so the import and this file are
// left out of the production bundle. The frame sits outside React and lets
// every click through (pointer-events: none), so the app itself is unchanged.
import "./devIndicator.css";

const frame = document.createElement("div");
frame.className = "dev-indicator";
frame.setAttribute("aria-hidden", "true");
document.body.append(frame);
