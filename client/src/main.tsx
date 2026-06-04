import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => {})
      .catch(() => {});
  });
}

// Version check: detect new deploys and reload stale cached JS automatically.
// The server returns its start timestamp — changes on every deploy.
// We store the last seen version in localStorage; if it differs, force reload.
(async () => {
  try {
    const res = await fetch('/api/version', { cache: 'no-store' });
    if (!res.ok) return;
    const { version } = await res.json();
    const stored = localStorage.getItem('cardrop_app_version');
    localStorage.setItem('cardrop_app_version', version);
    if (stored && stored !== version) {
      window.location.reload();
      return;
    }
  } catch {
    // Offline — skip
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
