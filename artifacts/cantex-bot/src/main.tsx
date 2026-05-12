import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Force dark mode on root element for terminal vibe
document.documentElement.classList.add("dark");
document.documentElement.style.backgroundColor = "hsl(0 0% 3%)";

createRoot(document.getElementById("root")!).render(<App />);
