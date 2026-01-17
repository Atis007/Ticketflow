import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./auth/context/AuthContext.jsx";
import { CategoryProvider } from "./categories/CategoryContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <CategoryProvider>
        <App />
      </CategoryProvider>
    </AuthProvider>
  </StrictMode>
);
