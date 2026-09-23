import React from "react";
import { createRoot } from "react-dom/client";
import { ExperienceRoot } from "./ExperienceRoot.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ExperienceRoot />
  </React.StrictMode>,
);
