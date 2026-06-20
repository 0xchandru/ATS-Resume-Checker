import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const saved = localStorage.getItem("ats-theme") || "dark";
if (saved === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
