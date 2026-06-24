import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth/AuthProvider";
import App from "./App";
import "./styles.css";

const storedTheme = localStorage.getItem("citrus:theme");
if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
  document.documentElement.dataset.theme = storedTheme;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
