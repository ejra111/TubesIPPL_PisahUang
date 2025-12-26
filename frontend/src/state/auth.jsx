import React, { createContext, useContext, useEffect, useState } from "react";

const AuthCtx = createContext(null);

// Provider untuk state autentikasi
export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("sb_token") || "");
  const [username, setUsername] = useState(localStorage.getItem("sb_username") || "");
  
  useEffect(() => {
    if (token) localStorage.setItem("sb_token", token);
    else localStorage.removeItem("sb_token");
  }, [token]);
  
  useEffect(() => {
    if (username) localStorage.setItem("sb_username", username);
    else localStorage.removeItem("sb_username");
  }, [username]);
  
  const logout = () => {
    setToken("");
    setUsername("");
  };
  
  return <AuthCtx.Provider value={{ token, setToken, username, setUsername, logout }}>{children}</AuthCtx.Provider>;
}

// Hook untuk menggunakan context autentikasi
export function useAuth() {
  return useContext(AuthCtx);
}

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

