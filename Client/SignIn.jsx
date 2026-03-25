import React, { useEffect, useRef, useState } from 'react'
import './SignIn.css'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCheckDouble, faGreaterThan } from "@fortawesome/free-solid-svg-icons";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import 'antd/dist/reset.css';
import { Button, Alert, Spin, Table, Tag, Input } from "antd";
import { message as antdMessage} from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { Typography } from 'antd';
import { Link } from 'react-router-dom'
import { useNavigate } from "react-router-dom";
//const { Link } = Typography;
import '../Client/SignUp.jsx'
import '../Client/PssForgot.jsx'

// import FmInfo from '../Client/FmInfo.jsx'

var MobRegExp = /^01[0-2,5]{1}[0-9]{8}$/;
var EmlRegExp = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
var pswdRegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!_@#$%^&*]).{10,}$/;


export default function SignIn() {
  
  useEffect(() => {
    localStorage.clear();
  }, []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // const [message, setMessage] = useState("");
  const [selectedFamid, setSelectedFamid] = useState("");
  const [selectedFamNm, setSelectedFamNM] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [mobb, setMobb] = useState("");
  const [regEmll, setRegEmll] = useState("");
  const [fmEml, setFmEml] = useState("");
  const [regMob, setRegMob] = useState("");
  const [fmMob, setFmMob] = useState("");
  const [errors, setErrors] = useState({ email: "", mobile: "", password: "" });
  const [vll, setVll] = useState('');
  const [vllerr, setVllErr] = useState('');
  const [fmDtt, setFmDtt] = useState({});
  const [fmno, setFmNo] = useState(0);
  const [fmnmm, setFmNmm] = useState("");
  const [pss, setPss] = useState('')
  const [fmpss, setFmPss] = useState('')
  const [mobTouched, setMobTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);  
  const [pssTouched, setPssTouched] = useState(false);  
  const navigate = useNavigate()
  const emlRef = useRef(null);
  const mobRef = useRef(null);
  const YrNmm = import.meta.env.VITE_CUR_YEAR
  // const REACT_PORT = import.meta.env.VITE_PORT || 3000;
  // const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  //Define state variables for OTP login flow
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [otpError, setOtpError] = useState("");  
  //const [otpCode, setOtpCode] = useState("");
  //Define state variables for resend OTP 
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [showResendOtp, setShowResendOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);  
  //Define state variables to track OTP expiration and attempt limits (optional, can also rely on backend responses)
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);   // ISO string from backend
  const [timeLeft, setTimeLeft] = useState(0);              // seconds remaining
  const [attemptsLeft, setAttemptsLeft] = useState(3);      // start with 3
  const [maxAttempts, setMaxAttempts] = useState(3);

  const [messageApi, contextHolder] = antdMessage.useMessage();
  //API base URL from environment variable
  const API_BASE = `${import.meta.env.VITE_API_URL}`;
  if (!API_BASE) {
    throw new Error("VITE_API_URL is not defined");
  }
  // console.log(API_URL)
  // console.log(YrNmm)
  //console.log(API_BASE) 
  //To check the family login using mobile number

  useEffect(() => {
    const handleMobileCheck = async () => {
      const mobileValue = String(regMob || "").trim();
      const yearValue = String(YrNmm || "").trim();

      // 1) Empty field -> no API call, no error
      if (mobileValue === "") {
        setErrors((prev) => ({ ...prev, mobile: "" }));
        setFmMob("");
        return;
      }

      // 2) While typing less than 11 digits -> no API call, no "invalid" yet
      if (mobileValue.length < 11) {
        setErrors((prev) => ({ ...prev, mobile: "" }));
        setFmMob("");
        return;
      }

      // 3) Safety: prevent more than 11
      if (mobileValue.length > 11) {
        setErrors((prev) => ({ ...prev, mobile: "Invalid Mobile Number" }));
        setFmMob("");
        return;
      }

      // 4) Validate exact 11-digit format
      if (!MobRegExp.test(mobileValue)) {
        setErrors((prev) => ({ ...prev, mobile: "Invalid Mobile Number" }));
        setFmMob("");
        return;
      }

      // 5) Do not call API if year is missing
      if (!yearValue) {
        setErrors((prev) => ({ ...prev, mobile: "Year is missing" }));
        setFmMob("");
        return;
      }

      try {
        setErrors((prev) => ({ ...prev, mobile: "" }));
        const res = await fetch(`${API_BASE}/chkLoginByMob`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            yr: yearValue,
            mobb: mobileValue,
          }),
        });
        const data = await res.json();
        // if (res.ok && data && data.famid && data.famnm) {
        if (res.ok && data.success && data.famid && data.famnm) {
          console.log(data.famid, data.famnm);
          setFmMob(data.famid);
          setFmDtt(data);
          setErrors((prev) => ({ ...prev, mobile: "" }));
          // focus email only after success
          setTimeout(() => emlRef.current?.focus(), 100);
        } else {
          setFmMob("");
          setFmDtt(null);
          setErrors((prev) => ({
            ...prev,
            mobile: mobileValue !== "" ? (data.message || "Unregistered Mobile Number") : ""
          }));
        }
      } catch (err) {
        console.error("Error fetching family data:", err);
        setFmMob("");
        setFmDtt(null);
        setErrors((prev) => ({ ...prev, mobile: "Server error" }));
      }
    };
    handleMobileCheck();
  }, [regMob, YrNmm]);
  //To allow only digits in mobile input and auto-clear dependent fields while editing
  const handleMobileChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setRegMob(onlyDigits);

    // clear dependent fields while editing
    setFmMob("");
    setFmDtt(null);
  };  
  //To format remaining time in mm:ss for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };
  // To check the family login using email address
  useEffect(() => {
    const handleEmailBlur = async () => {
      if (regEmll === '') {
        setErrors((prev) => ({ ...prev, email: "" }));
      }
      //if (!regEmll) return; // don’t run if empty
      if (!EmlRegExp.test(regEmll) && regEmll !== '') {
        setErrors((prev) => ({ ...prev, email: "Invalid Email Address" }));
        setFmEml(""); // clear previous valid email
        return;
      } 
      // else {
      //   setFmEml("");
      //   if (regEmll !== '') {
      //   setErrors((prev) => ({ ...prev, email: "Unregistered Email Address" }));
      //   }
      //   else {
      //     setErrors((prev) => ({ ...prev, email: "" }));
      //   }
      // }

      try {
        setErrors((prev) => ({ ...prev, email: "" }));
        //const res = await fetch("http://localhost:3000/api/chkLoginByEml", {
        const res = await fetch(`${API_BASE}/chkLoginByEml`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            yr: YrNmm,
            emll: String(regEmll).trim(),
          }),
        });

        const data = await res.json();
        //console.log(data);

        if (data && data.famid && data.famnm) {
          setFmEml(data.famid);
          setFmDtt(data)
          console.log(data.famid, data.famnm);
          setErrors((prev) => ({ ...prev, email: "" }));
        } else {
          setFmEml("");
          console.log("Unregistered Email Address");
          if (regEmll !== '') {
          setErrors((prev) => ({ ...prev, email: "Unregistered Email Address" }));
          }
          else {
            setErrors((prev) => ({ ...prev, email: "" }));
          }          
          // setErrors((prev) => ({ ...prev, email: "Unregistered Email Address" }));
        }
      } catch (err) {
        console.error("Error fetching family data:", err);
        setErrors((prev) => ({ ...prev, email: "Server error" }));
      }
    };

    handleEmailBlur();
  }, [regEmll]); //  
  //To manage OTP expiration countdown and auto-enable resend option when expired 
  useEffect(() => {
    if (!otpExpiresAt || !showOtpSection) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const expiry = new Date(otpExpiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));

      setTimeLeft(diff);

      if (diff === 0) {
        setShowResendOtp(true); // UI can show resend when timer ends
        setOtpError((prev) =>
          prev || "Verification code expired. Please request a new OTP."
        );
      }
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [otpExpiresAt, showOtpSection]);

  // To check the family login using password
  //useEffect(() => {
  // const pswdExst = async () => {
  //   if (!pss) return; // don’t run if empty
  //   if (!pswdRegExp.test(pss)) {
  //     setFmPss(""); // clear previous valid email
  //     return;
  //   }
  //   // console.log(pss)
  //   try {
  //     //const res = await fetch("http://localhost:3000/api/chkLoginByPswd", {
  //     const res = await fetch(`${API_BASE}/chkLoginByPswd`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         yr: YrNmm,
  //         pswd: pss,
  //         email_reg: String(regEmll).trim(),
  //         phone_reg: String(regMob).trim(),
  //       }),
  //     });

  //     const data = await res.json();
  //     console.log(data);

  //     if (data && data.pswd && data.famid && data.famnm) {
  //       setFmPss(data.pswd);
  //       setFmEml(regEmll);
  //       setFmMob(regMob);
  //       setFmNmm(data.famnm)
  //       setFmNo(data.famid)
  //       console.log(fmno, fmnmm)
  //       // console.log(fmpss)

  //       //console.log( data.famid, data.famnm);
  //     } else {
  //       setFmPss("");
  //     }
  //   } catch (err) {
  //     console.error("Error fetching family data:", err);
  //   }
  // };
  const pswdExst = async () => {
  if (!pss) {
  setFmPss("");
  setErrors((prev) => ({ ...prev, password: "" }));
  return;
  }

  // if password format itself is invalid
  if (!pswdRegExp.test(pss)) {
  setFmPss("");
  setErrors((prev) => ({ ...prev, password: "Invalid Password Format" }));
  return;
  }

  try {
  setErrors((prev) => ({ ...prev, password: "" }));

  const res = await fetch(`${API_BASE}/chkLoginByPswd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      yr: YrNmm,
      pswd: pss,
      email_reg: String(regEmll).trim(),
      phone_reg: String(regMob).trim(),
    }),
  });

  const data = await res.json();
  console.log(data);

  if (data && data.pswd && data.famid && data.famnm) {
    setFmPss(data.pswd);
    setFmEml(regEmll);
    setFmMob(regMob);
    setFmNmm(data.famnm);
    setFmNo(data.famid);

    setErrors((prev) => ({ ...prev, password: "" }));
  } else {
    setFmPss("");
    setErrors((prev) => ({ ...prev, password: "Invalid Password" }));
  }
  } catch (err) {
  console.error("Error fetching family data:", err);
  setFmPss("");
  setErrors((prev) => ({ ...prev, password: "Server error" }));
  }
  };
  //handleEmailBlur();
  //}, [pss]); //  


  // // To check the family login using email address & mobile number
  // //  useEffect(() => {
  // const chkLogin = async () => {
  //   const loginData = {
  //     yr: YrNmm,
  //     emll: regEmll,
  //     mobb: regMob,

  //   };
  //   //console.log(loginData);

  //   try {
  //     //const res = await fetch("http://localhost:3000/api/chkLogin", {
  //     const res = await fetch(`${API_BASE}/chkLogin`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         yr: YrNmm,
  //         emll: String(regEmll).trim(),
  //         mobb: String(regMob).trim(),
  //       }),
  //     });

  //     const data = await res.json();
  //     // console.log(data);

  //     if (data && data.famid && data.famnm) {
  //       setFmDtt(data);
  //       localStorage.setItem("curFmNo", data.famid)
  //       localStorage.setItem("curFmNm", data.famnm)
  //     } else {
  //       setFmDtt("");
  //     }
  //   } catch (err) {
  //     console.error("Error fetching family data:", err);
  //   }
  //   localStorage.setItem("curEmailAddress",regEmll)
  //   handleVerifyCode() // trigger OTP verification after checking credentials
  //   navigate('/fminfo')
  // };

  // // Call the function only when both fields are filled
  // if (regEmll && regMob) {
  //   chkLogin();
  // }
  //}, [regEmll, regMob]); 


  useEffect(() => {
    if (mobRef.current) {
      mobRef.current.focus();
    }
  }, []);
  // console.log(String(pss).trim().toLowerCase())
  // console.log(String(fmpss).trim().toLowerCase())
  // console.log(errors.mobile)
  // console.log(errors.email)
  // console.log(regEmll)
  // console.log(regMob)
  // console.log(fmEml)
  // console.log(fmMob)
  // console.log(pswdRegExp.test(pss))

  //Handle login submission using email, mobile and password, then trigger OTP flow if credentials are valid
  const handleLoginChk = async () => {
    if (isSubmittingLogin || !isFormValid) return;
    setIsSubmittingLogin(true);
    setOtpError("");
    try {
      const res = await fetch(`${API_BASE}/loginchk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          yr: YrNmm,
          emll: String(regEmll).trim(),
          pswd: String(pss).trim(),
          mobno: String(regMob).trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        messageApi.open({
          type: "error",
          content: data.message || "Invalid login credentials"
        });
        setIsSubmittingLogin(false);
        return;
      }

      if (data.otpRequired && data.verificationToken) {
        setVerificationToken(data.verificationToken);
        setIsOtpStep(true);
        setVerificationCode("");
        setOtpError("");
        setShowOtpSection(true);
        //setOtpCode("");
        setShowResendOtp(false);

        setOtpExpiresAt(data.expiresAt || null);
        setMaxAttempts(data.maxAttempts || 3);
        setAttemptsLeft(data.maxAttempts || 3);        

        messageApi.open({
          type: "success",
          content: "Verification code sent to your email"
        });

        // keep button disabled in OTP mode by design until verify/reload
        setIsSubmittingLogin(false);
        return;
      }

      messageApi.open({
        type: "error",
        content: "Unexpected login response"
      });
      setIsSubmittingLogin(false);

    } catch (err) {
      console.error("Login error:", err);
      messageApi.open({
        type: "error",
        content: "Server error"
      });
      setIsSubmittingLogin(false);
    }
  };

  //Handle OTP verification submission, then finalize login if OTP is valid
  const handleVerifyCode = async () => {
    if (isVerifyingCode) return;

    if (!verificationCode || verificationCode.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code");
      return;
    }

    setIsVerifyingCode(true);
    setOtpError("");

    try {
      const res = await fetch(`${API_BASE}/verify-login-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          verificationToken,
          code: verificationCode.trim()
        })
      });

      const data = await res.json();

      // ❌ Failed verification
      if (!res.ok || !data.success) {
        setOtpError(data.message || "Invalid verification code");

        // IMPORTANT: update attempts left from backend
        if (typeof data.attemptsLeft === "number") {
          setAttemptsLeft(data.attemptsLeft);
        }

        // IMPORTANT: show resend immediately when attempts exceeded
        if (data.allowResend || data.reason === "ATTEMPTS_EXCEEDED") {
          setShowResendOtp(true);
        } else {
          setShowResendOtp(false);
        }

        setIsVerifyingCode(false);
        return;
      }

      // ✅ SUCCESS: login approved only here
      setOtpError("");
      setShowResendOtp(false);
      setTimeLeft(0);

      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("loggedFamid", String(data.user.famid));
      localStorage.setItem("loggedFamNm", data.user.famnm || "");
      localStorage.setItem("loggedEmail", data.user.emll || "");
      localStorage.setItem("loggedMobile", data.user.mobno || "");

      messageApi.open({
        type: "success",
        content: "Login to our portal is successful"
      });

      navigate("/fminfo");

    } catch (err) {
      console.error("OTP verify error:", err);
      setOtpError("Server error");
      setIsVerifyingCode(false);
    }
  };
  //Create a unified submit handler that checks the login credentials first, then triggers OTP verification if valid, or directly finalizes login if OTP step is not needed
  const handleSubmitAction = async () => {
  if (!isOtpStep) {
    await handleLoginChk();      // Step 1: validate credentials + send OTP
  } else {
    await handleVerifyCode();    // Step 2: verify OTP + finalize login
  }
};

// const handleVerifyOtp = async () => {
//   if (!verificationToken || !otpCode.trim()) {
//     setOtpError("Please enter the verification code");
//     return;
//   }
//   try {
//     const res = await fetch(`${API_BASE}/verify-login-code`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({
//         verificationToken,
//         code: otpCode.trim()
//       })
//     });
//     const data = await res.json();
//     if (data.success) {
//       setOtpError("");
//       setShowResendOtp(false);
//       // Optional: clear timer
//       setTimeLeft(0);
//       // TODO: continue final login here
//       // e.g. save user info / navigate
//       return;
//     }
//     setOtpError(data.message || "Verification failed");
//     if (typeof data.attemptsLeft === "number") {setAttemptsLeft(data.attemptsLeft);}

//     if (data.allowResend) {
//       setShowResendOtp(true);
//     } else {
//       setShowResendOtp(false);
//     }

//   } catch (err) {
//     console.error(err);
//     setOtpError("Server error");
//   }
// };

const handleResendOtp = async () => {
  if (!verificationToken) return;
  try {
    setIsResendingOtp(true);
    setOtpError("");

    const res = await fetch(`${API_BASE}/resend-login-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        verificationToken
      })
    });

    const data = await res.json();

    if (!data.success) {
      setOtpError(data.message || "Unable to resend OTP");
      return;
    }

    // IMPORTANT: replace old token with NEW token
    setVerificationToken(data.verificationToken);
    //setOtpCode("");
    setVerificationCode("");
    setShowResendOtp(false);

    // reset countdown + attempts
    setOtpExpiresAt(data.expiresAt || null);
    setMaxAttempts(data.maxAttempts || 3);
    setAttemptsLeft(data.maxAttempts || 3);
    setOtpError("A new verification code has been sent to your email");
  } catch (err) {
    console.error(err);
    setOtpError("Server error while resending OTP");
  } finally {
    setIsResendingOtp(false);
  }
};
  // console.log(fmEml + ' '+ fmMob)
  const isFormValid = !errors.email 
  && !errors.mobile 
  && regEmll 
  && regMob 
  && fmEml 
  && fmMob 
  && pswdRegExp.test(pss) 
  && pss != '' 
  && fmpss != undefined 
  && pss != undefined 
  && fmpss === pss
  && String(pss).trim().toLowerCase() === String(fmpss).trim().toLowerCase();
  const isMobInvalid = mobTouched && (!regMob || !MobRegExp.test(regMob) || !!errors.mobile);
  const isEmailInvalid = emailTouched && (!regEmll || !EmlRegExp.test(regEmll) || !!errors.email);
  const isPasswordInvalid =pssTouched && (!pss || !pswdRegExp.test(pss) || !!errors.password);  
  const attemptsLabel = (count) => {if (count === 1) return "1 attempt left";return `${count} attempts left`;};
  return (
    <div>
      {contextHolder}
      <form className="allDiv" onSubmit={(e) => {e.preventDefault(); handleSubmitAction();} }>
        {/* FORM TITLE */}
        <div className="frmtitle">
          <h3 style={{fontSize:"1.1rem"}}>Sign In to Parents' Fees Portal</h3>
        </div>
        {/* Mobile */}
        <div className="mobb">
          <input
          type="tel" id="regmobno" maxLength={11} className={`inp ${isMobInvalid ? "inp-error" : ""}`} 
          placeholder="Write Registered Mobile Number" ref={mobRef} value={regMob} disabled={isOtpStep}
          onChange={(e) => { setMobTouched(true);  handleMobileChange(e);}} onBlur={() => setMobTouched(true)}/>          
          { !fmMob ? (<label className="lblworn">{errors.mobile}</label>) :
          (errors.mobile ? (
            <label className="lblworn" style={{ color: "red" }}>{errors.mobile}<FontAwesomeIcon icon={faXmark} /></label>) :
            (<label className="lblworn" style={{ color: "green" }}>Correct Mobile Number!!<FontAwesomeIcon icon={faCheck} /></label>))
          }
        </div>
        {/* Email */}
        <div className="emll">
          <input type="email" id="regEmll" className={`inp ${isEmailInvalid ? "inp-error" : ""}`}
          ref={emlRef} placeholder="Write Registered Email Address" disabled={isOtpStep || !fmMob}
          value={regEmll} onChange={(e) => {setEmailTouched(true);  setRegEmll(e.target.value);}}
          onBlur={() => setEmailTouched(true)} required
          />          
          { !fmEml ? (<label className="lblworn">{errors.email}</label>) :
            (errors.email ? (<label className="lblworn" style={{ color: "red" }}>{errors.email}<FontAwesomeIcon icon={faXmark} /></label>) :
              (<label className="lblworn" style={{ color: "green", display: "flow" }}>Correct Email Address!!<FontAwesomeIcon icon={faCheck} /></label>))
          }
        </div>
        {/* User Password */}
        <div className="divpss12">
          {/* <label id="lbl2" className="lbl" htmlFor="pss1" >Write own password:</label>             */}
          {/* <Input.Password id="pss1" placeholder='password' className="inp_1" type="password" maxLength={10} value={pss}
            iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
            onChange={(e) => setPss(e.target.value)} onKeyUp={pswdExst} /> */}
          <Input.Password id="pss1" placeholder="password" disabled={isOtpStep} className={`inp_1 ${isPasswordInvalid ? "inp-password-error" : ""}`}
          maxLength={10} value={pss} iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          onChange={(e) => { setPssTouched(true); setPss(e.target.value);}} onBlur={() => setPssTouched(true)} onKeyUp={pswdExst}
          />
          { !fmpss ? (<label className="lblworn">{errors.password}</label>) :
            (errors.password ? (<label className="lblworn" style={{ color: "red" }}>{errors.password}<FontAwesomeIcon icon={faXmark} /></label>) :
              (<label className="lblworn" style={{ color: "green" }}>Correct Password!!<FontAwesomeIcon icon={faCheck} /></label>))
          }
        </div>
        {/* OTP Code Input */}
        {isOtpStep && (
          <div className="otpdiv">
            <input type="text" inputMode="numeric" maxLength={6} className={`inp ${otpError ? "inp-error" : ""}`}
            placeholder="Enter 6-digit verification code" value={verificationCode} disabled={timeLeft === 0 && showResendOtp}
            onChange={(e) => {const digitsOnly = e.target.value.replace(/\D/g, ""); setVerificationCode(digitsOnly); setOtpError("");}}
            />
            {otpError && (<label className="lblworn" style={{ color: "red" }}> {otpError}</label>)}
          </div>
        )}        
        {/* Submit */}
        {/* <div className="sbmtt">
          {isFormValid ? (<button className="enbtn" type="button" tabIndex="9" id="btnSubmit" onClick={chkLogin} >Submit<FontAwesomeIcon icon={faCheckDouble} /></button>) :
            (<button className="disbtn" type="button" tabIndex="9" id="btnSubmit" disabled>Submit</button>)}
        </div> */}
        <div className="sbmtt">
        {(!isOtpStep && !isFormValid) ? (<button className="disbtn" type="button" tabIndex="9" id="btnSubmit" disabled>Submit</button>) 
        : 
        (
          <button className="enbtn" type="submit" tabIndex="9" id="btnSubmit" disabled={isSubmittingLogin || isVerifyingCode || (timeLeft === 0 && showResendOtp)}>
          {isSubmittingLogin ? (
            <>Sending OTP Code... <Spin size="small" /></>
          ) : isVerifyingCode ? (
            <>Verifying OTP Code... <Spin size="small" /></>
          ) : isOtpStep ? (
            <>Verify Code <FontAwesomeIcon icon={faCheckDouble} /></>
          ) : (
            <>Submit <FontAwesomeIcon icon={faCheckDouble} /></>
          )}
          </button>
        )}
        </div>
        {showOtpSection && (
          <div className="otp-resnd">
            {showResendOtp && (<button type="button" className='enbtn' onClick={handleResendOtp} disabled={isResendingOtp}>
                {isResendingOtp ? "Sending..." : "Request New OTP"}</button>)}
          </div>
        )}
        {showOtpSection && !showResendOtp && (<div className="otp-info-row">
          <span className="otp-timer">
          OTP Code expires in: <strong style={{color:"red"}}>{formatTime(timeLeft)}</strong>
          </span>
          <span className="otp-attempts">
          Attempts left: <strong style={{color:"red"}}>{attemptsLabel(attemptsLeft)}</strong>
          </span>
        </div>)}
        
        {!isFormValid ? (<p></p>) :
          (<div className="fminfo"><strong >Family ID:{fmDtt.famid} - Family Name:{fmDtt.famnm} </strong></div>)}
        <div className="forgotdiv">
          {isFormValid ? (<p></p>) :
          <Link to="/forgot-pswd" className="forgotlnk">Forgot Password</Link>}
        </div>
      </form >

      <div className="signupdiv">
        <p className='signup'>Don't have an account?{''}</p>
        <Link to="/signup" className="signuplnk">Sign Up</Link>
      </div>
      {/* <div className="forgt">
        <button className="enbtn" type="button" tabIndex="10" id="btnForgt" disabled  onClick={() => navigate("/forgot-pswd")}>Forgot Password</button>)
      </div> */}

    </div>
  )
}

