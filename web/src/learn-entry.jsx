import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LearnPage from "./pages/learn.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LearnPage />
  </StrictMode>
);
