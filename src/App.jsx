import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { message } from "antd";
import "./App.css";
import Head from "../Client/Head.jsx";
import SignUp from "../Client/SignUp.jsx";
import SignIn from "../Client/SignIn.jsx";
import FmInfo from "../Client/FmInfo.jsx";
import StFees from "../Client/StFees.jsx";
import BankForm from "../Client/BankForm.jsx";
import StPay from "../Client/StPay.jsx";
import CheckoutPage from "../Client/CheckoutPage.jsx";
import CheckoutResult from "../Client/CheckoutResult.jsx";
import PssForgot from "../Client/PssForgot.jsx";

const API_BASE = import.meta.env.VITE_API_BASE;

function App() {
  const [messageApi, contextHolder] = message.useMessage();

  // ===== AUTH STATE =====
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);

  // ===== OTP STATE =====
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");

  useEffect(() => {
    try {
      const savedAuth = sessionStorage.getItem("isAuthenticated");
      const savedUser = sessionStorage.getItem("userData");

      if (savedAuth === "true" && savedUser) {
        setIsAuthenticated(true);
        setUserData(JSON.parse(savedUser));
      } else {
        setIsAuthenticated(false);
        setUserData(null);
      }
    } catch (err) {
      console.error("Local auth restore error:", err);
      setIsAuthenticated(false);
      setUserData(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  if (authLoading) {
    return (
      <>
        {contextHolder}
        <div style={{ padding: "40px", textAlign: "center" }}>
          Restoring session...
        </div>
      </>
    );
  }

  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/signin" replace />;
    }
    return children;
  };

  return (
    <BrowserRouter>
      {contextHolder}

      <Head />
      {isAuthenticated && userData && (
        <div className="welcome-banner">
          <span className="welcome-text">
            Welcome, <strong>{userData.famnm || userData.name || "User"}</strong>
          </span>
          {(userData.emll || userData.email) && (
            <span className="welcome-email">
              ({userData.emll || userData.email})
            </span>
          )}
        </div>
      )}

      <div className={isAuthenticated && userData ? "app-content with-banner" : "app-content"}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={
              <SignIn
                setIsAuthenticated={setIsAuthenticated}
                setUserData={setUserData}
              />
            }
          />
          <Route
            path="/signin"
            element={
              <SignIn
                setIsAuthenticated={setIsAuthenticated}
                setUserData={setUserData}
              />
            }
          />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-pswd" element={<PssForgot />} />

          {/* Protected routes */}
          <Route
            path="/fminfo"
            element={
              <ProtectedRoute>
                <FmInfo
                  userData={userData}
                  setIsAuthenticated={setIsAuthenticated}
                  setUserData={setUserData}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stfees"
            element={
              <ProtectedRoute>
                <StFees userData={userData} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bnkform"
            element={
              <ProtectedRoute>
                <BankForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stpayhist"
            element={
              <ProtectedRoute>
                <StPay userData={userData} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkoutpage"
            element={
              <ProtectedRoute>
                <CheckoutPage userData={userData}/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout-result"
            element={
              <ProtectedRoute>
                <CheckoutResult userData={userData} />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* ===== OTP FLOW NOTICE ===== */}
      {isOtpStep && (
        <div style={{ padding: "10px", color: "blue" }}>
          OTP verification is required. Please check your email.
        </div>
      )}
      <div className="tckt" >
        <span className="tkt-lnk">For Fees Lists, Visit this link: 
          <strong>
            <a href="http://fees.alsson.com/" target="_blank" 
            rel="noopener noreferrer" style={{marginLeft:"10px"}}>Fees Table 2025-2026</a>
          </strong>
        </span>
      </div>
      <div className="tckt">
        <span className="tkt-lnk">For Help & Support, Please visit this link: 
          <strong>
            <a href="https://support.finance.alsson.app/guest/" target="_blank" 
            rel="noopener noreferrer" style={{marginLeft:"10px"}}>Support Link</a>
          </strong>
        </span>
      </div>    </BrowserRouter>
  );
}

export default App;