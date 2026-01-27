import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { GlobalErrorBoundary } from "./components/layout/GlobalErrorBoundary";

createRoot(document.getElementById("root")!).render(
    <GlobalErrorBoundary>
        <App />
    </GlobalErrorBoundary>
);
