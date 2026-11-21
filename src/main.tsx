import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Global CSS first, so component CSS imported by the app comes later and wins ties.
import "./styles/tokens.css";
import "./styles/base.css";
import AppProviders from "./app/AppProviders.tsx";

const container = document.getElementById("root");

if (!container) {
  throw new Error('Missing the DOM element with id="root"');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);
