
  import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./styles/index.css";
import './i18n';  // Initialize i18n for language support

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
  