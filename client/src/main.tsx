import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// CLEANUP: Remove any stale service workers from previous deployments
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
            console.log('Unregistering stale service worker:', registration);
            registration.unregister();
        }
    });
}

createRoot(document.getElementById("root")!).render(<App />);
