import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SignPage from "./pages/sign.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SignPage />
  </StrictMode>
);
