import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Mock storage for local browser preview
if (!window.storage) {
  window.storage = {
    get: async (key) => {
      const val = localStorage.getItem(key);
      return val ? { value: val } : null;
    },
    set: async (key, val) => {
      localStorage.setItem(key, val);
    }
  };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register the service worker for PWA installability, offline shell caching,
// and push notifications. Registered after first paint so it never delays
// the initial render.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
