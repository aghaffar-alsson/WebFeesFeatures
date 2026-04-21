import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate , useNavigate , useLocation } from "react-router-dom";
import { message , Row , Col , Typography, Button} from "antd";
import { LinkOutlined, CustomerServiceOutlined } from "@ant-design/icons";
import 'font-awesome/css/font-awesome.min.css';
import "./App.css";
import Head from "../Head.jsx";
import SignUp from "../SignUp.jsx";
import SignIn from "../SignIn.jsx";
import FmInfo from "../FmInfo.jsx";
import StFees from "../StFees.jsx";
import BankForm from "../BankForm.jsx";
import StPay from "../StPay.jsx";
import CheckoutPage from "../CheckoutPage.jsx";
import CheckoutResult from "../CheckoutResult.jsx";
import PssForgot from "../PssForgot.jsx";
import { openExternal } from "../openExternal.js";
import { useExternalLink } from "../useExternalLink.js";

const API_BASE = import.meta.env.VITE_API_BASE;
const { Text } = Typography;

function App() {
  const [messageApi, contextHolder] = message.useMessage();

  // ===== AUTH STATE =====
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [email, setEmail] = useState("");
  const [famnm, setFamnm] = useState("");

  // ===== OTP STATE =====
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // useEffect(() => {
  //   try {
  //     const savedAuth = sessionStorage.getItem("isAuthenticated");
  //     const savedUser = sessionStorage.getItem("userData");
  //     console.log("Restoring auth from sessionStorage:", { savedAuth, savedUser });
  //     if (savedAuth === "true" && savedUser) {
  //       setIsAuthenticated(true);
  //       setUserData(JSON.parse(savedUser));
  //       setEmail(JSON.parse(savedUser).EMAIL_ADDRESS  || "");
  //       setFamnm(JSON.parse(savedUser).FAMNM ||  "");
  //       console.log("Auth restored successfully:", JSON.parse(savedUser));
  //       console.log("Email and Famnm set to:", JSON.parse(savedUser).EMAIL_ADDRESS, JSON.parse(savedUser).FAMNM);
  //       console.log(email, famnm);
  //     } else {
  //       setIsAuthenticated(false);
  //       setUserData(null);
  //       setEmail("");
  //       setFamnm("");
  //     }
  //   } catch (err) {
  //     console.error("Local auth restore error:", err);
  //     setIsAuthenticated(false);
  //     setUserData(null);
  //     setEmail("");
  //     setFamnm("");
  //   } finally {
  //     setAuthLoading(false);
  //   }
  // }, []);

  // useEffect(() => {
  //     // const params = new URLSearchParams(window.location.search);
  //     // const forceLogout = params.get("logout");

  //     // // ===== FORCE LOGOUT MODE =====
  //     // if (forceLogout === "1") {
  //     //   sessionStorage.clear();

  //     //   setIsAuthenticated(false);
  //     //   setUserData(null);
  //     //   setEmail("");
  //     //   setFamnm("");

  //     //   console.log("Forced logout triggered");
  //     //   return;
  //     // }
  //     try {
  //         console.log("FULL URL:", window.location.href);
  //         console.log("SEARCH:", window.location.search);
  //         const params = new URLSearchParams(window.location.search);

  //         const forceLogout = params.get("logout");
  //         const emllParam = params.get("emll");
  //         const famnmParam = params.get("FAMNM");

  //         // ===== FORCE LOGOUT =====
  //         if (forceLogout === "1") {
  //           sessionStorage.clear();

  //           setIsAuthenticated(false);
  //           setUserData(null);
  //           setEmail("");
  //           setFamnm("");

  //           console.log("Forced logout triggered");
  //           return;
  //         }
  //       // ===== RETURN FROM PHP (MERGE MODE) =====
  //       let handled = false;
  //       if (emllParam || famnmParam) {
  //         const savedUser = sessionStorage.getItem("userData");
  //         let parsed = savedUser ? JSON.parse(savedUser) : {};

  //         const updatedUser = {
  //           ...parsed,
  //           emll: emllParam || parsed.emll || "",
  //           famnm: famnmParam || parsed.famnm || ""
  //         };

  //         sessionStorage.setItem("isAuthenticated", "true");
  //         sessionStorage.setItem("userData", JSON.stringify(updatedUser));

  //         setIsAuthenticated(true);
  //         setUserData(updatedUser);
  //         setEmail(updatedUser.emll);
  //         setFamnm(updatedUser.famnm);

  //         console.log("User merged from PHP العودة:", updatedUser);
  //         handled = true;
  //         navigate("/fminfo", { replace: true });
  //         return;
  //       }
  //     // ===== NORMAL RESTORE =====
  //     if (!handled) {
  //     const savedAuth = sessionStorage.getItem("isAuthenticated");
  //     const savedUser = sessionStorage.getItem("userData");

  //     if (savedAuth === "true" && savedUser) {
  //       const parsed = JSON.parse(savedUser);

  //       console.log("FULL parsed user:", parsed);

  //       setIsAuthenticated(true);
  //       setUserData(parsed);

  //       setEmail(
  //         parsed.EMAIL_ADDRESS ||
  //         parsed.emll ||
  //         parsed.email ||
  //         ""
  //       );

  //       setFamnm(
  //         parsed.FAMNM ||
  //         parsed.famnm ||
  //         ""
  //       );
  //     }
        
  //     } else {
  //       setIsAuthenticated(false);
  //       setUserData(null);
  //       setEmail("");
  //       setFamnm("");
  //     }

  //   } catch (err) {
  //     console.error("Auth restore error:", err);

  //     setIsAuthenticated(false);
  //     setUserData(null);
  //     setEmail("");
  //     setFamnm("");
  //   } finally {
  //     setAuthLoading(false);
  //   }
  // }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);

      const emllParam = params.get("emll");
      const famnmParam = params.get("FAMNM");

      // RETURN FROM PHP
      if (emllParam || famnmParam) {
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
        // const updatedUser = {
        //   ...parsed,
        //   emll: emllParam || parsed.emll || "",
        //   famnm: famnmParam || parsed.famnm || ""
        // };

        sessionStorage.setItem("isAuthenticated", "true");
        sessionStorage.setItem("userData", JSON.stringify(updatedUser));

        setIsAuthenticated(true);
        setUserData(updatedUser);
        setEmail(updatedUser.emll);
        setFamnm(updatedUser.famnm);

        navigate("/fminfo", { replace: true });
        return;
      }

      // NORMAL RESTORE
      const savedAuth = sessionStorage.getItem("isAuthenticated");
      const savedUser = sessionStorage.getItem("userData");

      if (savedAuth === "true" && savedUser) {
        const parsed = JSON.parse(savedUser);

        setIsAuthenticated(true);
        setUserData(parsed);
        setEmail(parsed.emll || parsed.EMAIL_ADDRESS || "");
        setFamnm(parsed.famnm || parsed.FAMNM || "");
      } else {
        setIsAuthenticated(false);
        setUserData(null);
        setEmail("");
        setFamnm("");
      }

    } catch (err) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  }, [location.search]);

  useEffect(() => {
  console.log("UPDATED:", email, famnm);
  }, [email, famnm]);

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

  //open external link with fallback
  const openExternal = useExternalLink();

  return (
    <>
    {contextHolder}

    <Head />
    {isAuthenticated && userData && (
      // <div className="welcome-banner">
      //   <span className="welcome-text">
      //     Welcome, <strong>{userData.famnm || userData.name || "User"}</strong>
      //   </span>
      //   {(userData.emll || userData.email) && (
      //     <span className="welcome-email">
      //       ({userData.emll || userData.email})
      //     </span>
      //   )}
      // </div>
      <div className="finance-topbar">
        <Row
          className="finance-topbar-row"
          align="middle"
          wrap={false}
          gutter={[8, 8]}
        >
          <Col flex="1 1 auto" className="finance-welcome-col">
            <Text className="finance-topbar-text">
              Welcome to El Alsson Fees Portal
            </Text>
          </Col>
          {isAuthenticated && userData && (
          <Col flex="0 0 auto" className="finance-btn-col">
              <Button
              type="primary"
              icon={<LinkOutlined />}
              // href="http://fees.alsson.com/"
              // href="http://feeslist.family.alsson.app/"
              href={`http://feeslist.family.alsson.app/?emll=${encodeURIComponent(email)||""}&FAMNM=${encodeURIComponent(famnm) || ""}&famid=${userData.famid}&mobno=${userData.mobno}`}
              target="_blank"
              rel="noopener noreferrer"
              className="finance-topbar-btn"
            >
              Fees Lists {import.meta.env.VITE_CUR_YEAR_NAME ? `${import.meta.env.VITE_CUR_YEAR_NAME}` : ""}
            </Button>
          </Col>)}
          {isAuthenticated && userData && (
          <Col flex="0 0 auto" className="finance-btn-col">
            <Button
              type="default"
              icon={<CustomerServiceOutlined />}
              href={`https://support.finance.alsson.app/guest/?emll=${encodeURIComponent(email)||""}&FAMNM=${encodeURIComponent(famnm) || ""}&famid=${userData.famid}&mobno=${userData.mobno}`}
              target="_blank"
              rel="noopener noreferrer"
              className="finance-topbar-btn support-btn"
            >
              Help & Support
            </Button>
          </Col>)}:
          {/* <Button
            type="primary"
            icon={<LinkOutlined />}
            onClick={() => openExternal("http://fees.alsson.com/")}
            className="finance-topbar-btn"
          >
            Fees Lists {import.meta.env.VITE_CUR_YEAR_NAME || ""}
          </Button>        
          <Button
            type="default"
            icon={<CustomerServiceOutlined />}
            onClick={() => openExternal("https://support.finance.alsson.app/guest/")}
            className="finance-topbar-btn support-btn"
          >
            Help & Support
          </Button>                 */}
        </Row>
            {(userData.emll || userData.email) && (
            <span  style={{color:'#fff', fontSize:"12px"}} className="welcome-email">
            Registered Email:{userData.emll || userData.email}
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
        {/* <Route
          path="/"
          element={<div>TEST BUILD</div>
          }
        /> */}
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
    {/* <div className="tckt" >
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
    </div>     */}
    </>
  );
}

export default App;