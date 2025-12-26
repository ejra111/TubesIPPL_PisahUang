import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import SplitBill from "./pages/SplitBill.jsx";
import Share from "./pages/Share.jsx";
import { AuthProvider, useAuth } from "./state/auth.jsx";
import { ToastProvider } from "./state/toast.jsx";
import { ModalProvider } from "./state/modal.jsx";
import "./styles.css";

// Komponen untuk route yang memerlukan autentikasi
function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

// Komponen utama aplikasi dengan providers dan routing
const App = () => (
  <AuthProvider>
    <ToastProvider>
      <ModalProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/bills/share/:token" element={<Share />} />
            <Route path="/" element={<PrivateRoute><SplitBill /></PrivateRoute>} />
          </Routes>
        </BrowserRouter>
      </ModalProvider>
    </ToastProvider>
  </AuthProvider>
);

// Render aplikasi ke DOM
createRoot(document.getElementById("root")).render(<App />);
