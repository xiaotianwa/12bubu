import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installDevBridge } from "./devBridge";
import "./styles/global.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

installDevBridge();

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
