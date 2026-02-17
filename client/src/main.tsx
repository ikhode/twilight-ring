import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize Sentry for error tracking
import { initSentry } from "./lib/sentry";
import { SentryBoundary } from "./components/ErrorBoundary";
initSentry();

createRoot(document.getElementById("root")!).render(
    <SentryBoundary>
        <App />
    </SentryBoundary>
);
