import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("tdl_token"));
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/users/me`);
      setUser(res.data);
    } catch {
      localStorage.removeItem("tdl_token");
      delete axios.defaults.headers.common["Authorization"];
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback (session_id in hash), skip /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [token, fetchMe]);

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem("tdl_token", access_token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (formData) => {
    const res = await axios.post(`${API}/auth/register`, formData);
    const { access_token, user: userData } = res.data;
    localStorage.setItem("tdl_token", access_token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("tdl_token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (token) {
      try {
        const res = await axios.get(`${API}/users/me`);
        setUser(res.data);
        return res.data;
      } catch {
        logout();
      }
    }
  }, [token, logout]);

  const updateUser = useCallback((updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : updates);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
