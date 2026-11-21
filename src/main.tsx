import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "./app/AppProviders.tsx";
import "./styles/tokens.css";

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
