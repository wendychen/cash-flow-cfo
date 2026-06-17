import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/registerPwa";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
