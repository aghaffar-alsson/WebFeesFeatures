import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const AuthContext = createContext();
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();  
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);

  const logoutTimerRef = useRef(null);

  // ---------- Helpers ----------
  const clearSession = () => {
    sessionStorage.clear();
    setIsAuthenticated(false);
    setUserData(null);
  };

  const logout = () => {
    sessionStorage.removeItem("phpHandled");
    clearSession();
    navigate("/signin");
  };

  const startAutoLogoutTimer = (expiryTime) => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }

    const remaining = expiryTime - Date.now();

    if (remaining <= 0) {
      logout();
      return;
    }

    logoutTimerRef.current = setTimeout(() => {
      logout();
    }, remaining);
  };

  // ---------- Login ----------
  const login = (user) => {
    const expiryTime = Date.now() + SESSION_DURATION;

    sessionStorage.setItem("isAuthenticated", "true");
    sessionStorage.setItem("userData", JSON.stringify(user));
    sessionStorage.setItem("sessionExpiry", expiryTime.toString());

    setIsAuthenticated(true);
    setUserData(user);

    startAutoLogoutTimer(expiryTime);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    console.log("URL Params:", Object.fromEntries(params.entries())); // Debug log
    console.log(location.search)
    const emllParam = params.get("emll");
    const famnmParam = params.get("FAMNM");

    if (!emllParam && !famnmParam) return;

    if (sessionStorage.getItem("phpHandled")) return;

    const savedUser = sessionStorage.getItem("userData");
    let parsed = savedUser ? JSON.parse(savedUser) : {};

    const famidParam = params.get("famid");
    const mobnoParam = params.get("mobno");

    const updatedUser = {
      ...parsed,
      famid: famidParam || parsed.famid || null,
      mobno: mobnoParam || parsed.mobno || "",
      emll: emllParam || parsed.emll || "",
      famnm: famnmParam || parsed.famnm || ""
    };

    login(updatedUser);

    sessionStorage.setItem("phpHandled", "1");

    navigate("/fminfo", { replace: true });

  }, [location.search]);
  // ---------- Restore session on refresh ----------
  // useEffect(() => {
  //   const storedAuth = sessionStorage.getItem("isAuthenticated");
  //   const storedUser = sessionStorage.getItem("userData");
  //   const expiry = sessionStorage.getItem("sessionExpiry");

  //   if (storedAuth && storedUser && expiry) {
  //     if (Date.now() > Number(expiry)) {
  //       clearSession();
  //     } else {
  //       setIsAuthenticated(true);
  //       setUserData(JSON.parse(storedUser));
  //       startAutoLogoutTimer(Number(expiry));
  //     }
  //   }
  // }, []);
  useEffect(() => {
    const storedAuth = sessionStorage.getItem("isAuthenticated");
    const storedUser = sessionStorage.getItem("userData");
    const expiry = sessionStorage.getItem("sessionExpiry");

    if (storedAuth && storedUser && expiry) {
      if (Date.now() > Number(expiry)) {
        clearSession();
      } else {
        setIsAuthenticated(true);
        setUserData(JSON.parse(storedUser));
        startAutoLogoutTimer(Number(expiry));
      }
    }

    setLoading(false); // ✅ VERY IMPORTANT
  }, []);
  // ---------- Optional: extend session on activity ----------
  useEffect(() => {
    const extendSession = () => {
      if (!isAuthenticated) return;

      const newExpiry = Date.now() + SESSION_DURATION;
      sessionStorage.setItem("sessionExpiry", newExpiry.toString());

      startAutoLogoutTimer(newExpiry);
    };

    window.addEventListener("click", extendSession);
    window.addEventListener("keydown", extendSession);

    return () => {
      window.removeEventListener("click", extendSession);
      window.removeEventListener("keydown", extendSession);
    };
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userData,
        login,
        logout,
        loading   // ✅ add this
      }}
    >
    {children}
  </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  return useContext(AuthContext)
};