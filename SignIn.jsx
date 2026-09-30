/***** IMPORT NECESSARY OBJECTS, COMPONENTS, ELEMENT, HOOKS FROM BUILT-IN LIBRARIES *****/
import { useEffect, useRef, useState } from 'react' //import react and hooks
import { useNavigate , Link } from 'react-router-dom' //import react-router-dom for navigation and linking
import { Spin, Input, message as antdMessage } from "antd"; //import Ant Design components for UI elements
import Checkbox from 'antd/es/checkbox/Checkbox'; //import Ant Design checkbox component
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'; //import Ant Design icons for password visibility toggle
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"; //import FontAwesomeIcon component for using font awesome icons
import { faFingerprint, faXmark, faCheck, faCheckDouble } from "@fortawesome/free-solid-svg-icons"; //import specific font awesome icons for use in the component
import 'antd/dist/reset.css'; //import Ant Design CSS reset for consistent styling across different browsers

//here import the functions from simplewebauthn to handle biometric login flow on the client side (generate options, verify response)
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { Capacitor } from "@capacitor/core";
import { authenticateWithBiometric, isNativeBiometricAvailable, enableBiometricLogin } from "./src/Services/biometricService.js";
/* IMPORT STYLES AND LOCAL COMPONENTS */
import './SignIn.css' 
import '../Client/SignUp.jsx'
import '../Client/PssForgot.jsx'
//to manage authentication state and session in a centralized way across the app
//define login function from AuthContext to call after OTP verification is successful, to set auth state and store session
import { useAuth } from "./src/AuthContext.jsx";
//declare regex patterns for validating mobile number, email address, and password formats
var MobRegExp = /^01[0-2,5]{1}[0-9]{8}$/;
var EmlRegExp = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
var pswdRegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!_@#$%^&*]).{10,}$/;


export default function SignIn() {
  console.log("Supports WebAuthn:", browserSupportsWebAuthn()); //detect browser support for WebAuthn and log the result to the console
  console.log("PublicKeyCredential:", window.PublicKeyCredential); //detect if the PublicKeyCredential interface is available in the browser and log it to the console
  const isNativeApp = Capacitor.isNativePlatform(); //detect if the app is running in a native environment (e.g., mobile app) using Capacitor and store the result in a variable

  //get the login function from AuthContext to call after successful OTP verification, to set authentication state 
  //and store the session created for the authenticated family in the context for use across the app
  const { login } = useAuth(); 
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]); //clear OTP array on every render to ensure a fresh state for OTP input
  const otpRefs = useRef([]); //declare a ref to store references to the OTP input fields for programmatic focus control
  //const [name, setName] = useState(""); //state for family name to display after successful login
  //const [email, setEmail] = useState(""); //state for email input field to capture user input
  // const [message, setMessage] = useState("");
  // const [selectedFamid, setSelectedFamid] = useState("");//state for selected family ID to store the famid of the authenticated family after successful login
  // const [selectedFamNm, setSelectedFamNM] = useState("");//state for selected family name to store the famnm of the authenticated family after successful login
  // const [parentEmail, setParentEmail] = useState("");//state for parent email to store the email address of the authenticated family after successful
  // const [mobb, setMobb] = useState("");//state for mobile number to store the mobb of the authenticated family after successful login
  const [regEmll, setRegEmll] = useState("");//state for email input field to capture user input
  const [fmEml, setFmEml] = useState("");//state for email to store the email address of the authenticated family after successful login
  const [regMob, setRegMob] = useState("");//state for mobile number to capture user input
  const [fmMob, setFmMob] = useState("");//state for mobile number to store the mobb of the authenticated family after successful login
  const [errors, setErrors] = useState({ email: "", mobile: "", password: "" });//state for error messages to display validation errors for email, mobile, and password fields
  // const [vll, setVll] = useState('');//state for validation message to display general validation messages for the form
  // const [vllerr, setVllErr] = useState('');//state for validation error message to display specific validation errors for the form
  const [fmDtt, setFmDtt] = useState({});//state for family details to store the details of the authenticated family after successful login
  const [fmno, setFmNo] = useState(0);//state for family number to store the famid of the authenticated family after successful login
  const [fmnmm, setFmNmm] = useState("");//state for family name to store the famnm of the authenticated family after successful login
  const [pss, setPss] = useState('')// state for password input field to capture user input
  const [fmpss, setFmPss] = useState('')//state for password to store the pswd of the authenticated family after successful login
  const [mobTouched, setMobTouched] = useState(false);//state to track if the mobile input field has been touched (focused and blurred) to trigger validation messages
  const [emailTouched, setEmailTouched] = useState(false);//state to track if the email input field has been touched (focused and blurred) to trigger validation messages
  const [pssTouched, setPssTouched] = useState(false);//state to track if the password input field has been touched (focused and blurred) to trigger validation messages
  // //use this state to enable biometric login option only if the user checked the "Enable Biometric Login" checkbox
  // const [useBiometric, setUseBiometric] = useState(false);
  const navigate = useNavigate() //get the navigate function from react-router-dom to programmatically navigate to different routes after successful login
  const emlRef = useRef(null); //declare a ref to store a reference to the email input field for programmatic focus control
  const mobRef = useRef(null); //declare a ref to store a reference to the mobile input field for programmatic focus control
  const pswdRef = useRef(null); //declare a ref to store a reference to the password input field for programmatic focus control
  const YrNmm = import.meta.env.VITE_CUR_YEAR //get the current academic year from environment variable to use in API requests for login verification
  // const REACT_PORT = import.meta.env.VITE_PORT || 3000;
  // const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  //Define state variables for OTP login flow
  const [isOtpStep, setIsOtpStep] = useState(false); //state to track if the user is in the OTP verification step of the login flow
  const [verificationToken, setVerificationToken] = useState(""); //state to store the verification token received from the backend after sending the OTP, to be used for verifying the OTP entered by the user
  // const [verificationCode, setVerificationCode] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);//state to track if the login form is being submitted to disable the submit button and show a loading spinner during the submission process
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);//state to track if the OTP verification is in progress to disable the verify button and show a loading spinner during the verification process
  const [otpError, setOtpError] = useState("");//state to store error messages related to OTP verification to display validation errors for the OTP input fields
  //const [otpCode, setOtpCode] = useState("");
  //Define state variables for resend OTP
  //state to track if the OTP input section should be displayed to the user after sending the OTP
  const [showOtpSection, setShowOtpSection] = useState(false); 
  //state to track if the "Resend OTP" button should be displayed to the user after the OTP has expired 
  //or if the user requests to resend the OTP
  const [showResendOtp, setShowResendOtp] = useState(false); 
  //state to track if the resend OTP request is in progress to disable the resend button and show a loading spinner 
  //during the resend process
  const [isResendingOtp, setIsResendingOtp] = useState(false); 
  //state to track the validation status of the mobile input field (idle, checking, valid, invalid) 
  //to provide immediate feedback to the user while typing
  const [mobileStatus, setMobileStatus] = useState("idle"); 
  //state to track the validation status of the email input field (idle, checking, valid, invalid) 
  //to provide immediate feedback to the user while typing
  const [emailStatus, setEmailStatus] = useState(""); 
  //state to store the last checked mobile number to prevent redundant API calls when the user types the same 
  //number repeatedly or makes edits that don't change the final number (e.g., adding spaces, retyping the same digits)
  const [lastCheckedMobile, setLastCheckedMobile] = useState(""); 
  //state to track if the OTP has been successfully verified to allow the user to proceed with login 
  //after successful OTP verification
  const [otpVerified, setOtpVerified] = useState(false); 
  //Define state variables to track OTP expiration and attempt limits (optional, can also rely on backend responses)
  //timestamp when the OTP expires, to manage countdown timer and auto-enable resend option when expired
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);   
  //state to track the remaining time in seconds for OTP expiration countdown, to display a countdown timer to the user
  const [timeLeft, setTimeLeft] = useState(0);              
  //state to track the number of remaining attempts for OTP verification, 
  //to limit the number of incorrect attempts and provide feedback to the user
  const [attemptsLeft, setAttemptsLeft] = useState(3);      
  //state to store the maximum number of allowed attempts for OTP verification, to reset the attemptsLeft state 
  //when a new OTP is sent
  const [maxAttempts, setMaxAttempts] = useState(3); 
  //declare a reference to track if the OTP input fields should be refocused when the OTP section is shown 
  //or when the user clears all OTP inputs, to improve user experience by automatically focusing the first OTP input field
  const shouldRefocusOtp = useRef(false); 
  //declare messageApi and contextHolder from Ant Design's message component to display temporary messages 
  //(e.g., success, error) to the user
  const [messageApi, contextHolder] = antdMessage.useMessage();
  //state to track if the user has enabled biometric login option, to conditionally render the biometric login button 
  //and handle biometric authentication flow
  const [enableBiometric, setEnableBiometric] = useState(false);
  // Check if biometric login was previously enabled by the user (e.g. stored in localStorage) and set initial state accordingly
  const [biometricRegistered, setBiometricRegistered] = useState(localStorage.getItem("biometricEnabled") === "true");
  //API base URL from environment variable
  const API_BASE = `${import.meta.env.VITE_API_URL}`;
  //check the API server
  if (!API_BASE) {
    throw new Error("VITE_API_URL is not defined");
  }
  //console.log('API_BASE:', API_BASE);
  // // console.log(YrNmm)
  // //console.log(API_BASE)

  //to test Native Biometric Existance
  useEffect(() => {
      async function test() {
        //check if native biometric authentication is available on the device (e.g., fingerprint, face recognition) 
        // and log the result to the console
        const result = await isNativeBiometricAvailable();
        console.log(result);
      }
      test();
      // await async () => {authenticateWithBiometric()};
      authenticateWithBiometric();
  }, []);  
  //define a ref to store the last checked mobile number, to prevent redundant API calls when user types the same number repeatedly or makes edits that don't change the final number (e.g. adding spaces, retyping the same digits)
  const lastCheckedRef = useRef("");

  //function (1) mobile number validation and API check are now handled in a single function with debouncing, 
  //to provide more immediate feedback and reduce unnecessary API calls while typing
  const handleMobileCheck = async () => {
    const mobileValue = String(regMob || "").trim(); //declare a variable for mobile 
    const yearValue = String(YrNmm || "").trim(); //declare a variable for academic year
    //console.log(mobileValue, yearValue);
    if (mobileValue === lastCheckedRef.current) return; // here to skip duplicate mobile checks
    lastCheckedRef.current = mobileValue; //set the defined reference by the entered value
    // 1) Empty field -> no API call, no error
    if (!mobileValue || mobileValue === "") {
      setErrors((prev) => ({ ...prev, mobile: "" })); 
      setFmMob("");
      setMobileStatus("");
      return;
    }

    // 2) While typing less than 11 digits -> no API call, no "valid" yet so set the defined state by invalid
    if (!MobRegExp.test(mobileValue) || mobileValue.length < 11) {
      setErrors((prev) => ({ ...prev, mobile: "" }));
      setFmMob("");
      setMobileStatus("invalid");
      return;
    }

    // remove the safety check for more than 11 digits, since the regex already enforces exactly 11 digits.
    // This avoids unnecessary API calls and user confusion.
    // // 3) Safety: prevent more than 11
    // if (mobileValue.length > 11) {
    //   setErrors((prev) => ({ ...prev, mobile: "Invalid Mobile Number" }));
    //   setFmMob("");
    //   setMobileStatus("invalid");
    //   return;
    // }

    // 4) Validate exact 11-digit format, if not exact then return
    if (!MobRegExp.test(mobileValue)) {
      setErrors((prev) => ({ ...prev, mobile: "Invalid Mobile Number" }));
      setFmMob("");
      setMobileStatus("invalid");
      return;
    }

    // 5) Do not call API if year is missing , similarly return in this case also
    if (!yearValue || yearValue === "") {
      setErrors((prev) => ({ ...prev, mobile: "Academic year is missing" }));
      setFmMob("");
      setMobileStatus("invalid");
      return;
    }

    try {
      setErrors((prev) => ({ ...prev, mobile: "" })); //clear the mobile error state
      setMobileStatus("checking"); //set the state: checking while calling the API
      const res = await fetch(`${API_BASE}/chkLoginByMob`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          yr: yearValue,
          mobb: mobileValue,
        }),
      });
      console.log(mobileValue, yearValue) //for debugging purposes
      const data = await res.json(); //receive API result
      // if (res.ok && data && data.famid && data.famnm) {
      console.log("Mobile check response:", data); //for debugging purposes
      //check for data integrity
      if (res.ok && data.success && data.famid && data.famnm && data.emailAddrs) {
        console.log(data.famid, data.famnm, data.emailAddrs); //for debugging purposes
        //setFmMob(data.famid);
        console.log("mobile_value", mobileValue) //for debugging purposes
        setFmMob(mobileValue); // store the actual mobile number instead of famid for later use
        setFmDtt(data); //store the returned record on its defined state
        console.log("fmdtt", fmDtt) //for debugging purposes

        setMobileStatus("valid"); //modify the state by 'valid'
        setErrors((prev) => ({ ...prev, mobile: "" }));
        // focus email only after success
        setTimeout(() => emlRef.current?.focus(), 100);
      } else {
        //in case of mistakes with data: clear states, set error message for the user
        setFmMob("");
        setFmDtt(null);
        setMobileStatus("invalid");
        setErrors((prev) => ({...prev, mobile: mobileValue !== "" ? (data.message || "Unregistered Mobile Number") : ""}));
      }
    } catch (err) {
      console.error("Error fetching family data:", err);
      setFmMob("");
      setFmDtt(null);
      setErrors((prev) => ({ ...prev, mobile: "Server error" }));
      setMobileStatus("invalid");
    }
  };
  //add debouncing to mobile check to avoid excessive API calls while typing
  useEffect(() => {
    const mobileValue = String(regMob || "").trim(); 
    const yearValue = String(YrNmm || "").trim();

    // ===== KEEP MY ORIGINAL GUARDS =====
    if (!mobileValue || mobileValue === "") {
      setErrors((prev) => ({ ...prev, mobile: "" }));
      setFmMob("");
      setMobileStatus("");
      return;
    }

    if (!MobRegExp.test(mobileValue) || mobileValue.length < 11) {
      setErrors((prev) => ({ ...prev, mobile: "" }));
      setFmMob("");
      setMobileStatus("invalid");
      return;
    }

    if (!yearValue || yearValue === "") {
      setErrors((prev) => ({ ...prev, mobile: "Academic year is missing" }));
      setFmMob("");
      setMobileStatus("invalid");
      return;
    }

    // ===== DEBOUNCE ONLY THE API CALL =====
    const timer = setTimeout(() => {handleMobileCheck(); }, 400); // Call your existing function
    return () => clearTimeout(timer);

  }, [regMob, YrNmm]);

  //To auto-focus first OTP input when OTP section is shown, and also refocus if user clears all OTP inputs
  useEffect(() => {
    const allEmpty = otpDigits.every((d) => d === ""); //clear OTP array

    if (showOtpSection && allEmpty && shouldRefocusOtp.current) {
      const timer = setTimeout(() => {
        otpRefs.current[0]?.focus();
        shouldRefocusOtp.current = false;
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [otpDigits, showOtpSection]);

  //To allow only digits in mobile input and auto-clear dependent fields while editing
  const handleMobileChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setRegMob(onlyDigits);
    // clear dependent fields while editing
    setFmMob(""); //clear mobile state
    setFmDtt(null); //clear data state
    // setMobileStatus("");
  };
  //To format remaining time in mm:ss for display to the user
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };
  //To check the family login using email address
  useEffect(() => {
    const handleEmailBlur = async () => {
      const email = String(regEmll || "").trim();
      const year = String(YrNmm || "").trim();

      if (!email || email.trim() === "") {
        setErrors((prev) => ({ ...prev, email: "" }));
        setFmEml("");
        setEmailStatus("");
        return;
      }

      if (!year || year === "") {
        // console.log("YrNmm missing:", YrNmm);
        setErrors((prev) => ({ ...prev, email: "Academic year is missing" }));
        setEmailStatus("");
        return;
      }

      if (!EmlRegExp.test(email)) {
        setErrors((prev) => ({ ...prev, email: "Invalid Email Address" }));
        setFmEml("");
        setEmailStatus("invalid");
        return;
      }
      // optional: do not call the API that check the database until mobile is valid
      if (!MobRegExp.test(regMob)) {
        setErrors((prev) => ({ ...prev, email: "" }));
        setEmailStatus("");
        return;
      }
      try {
        setErrors((prev) => ({ ...prev, email: "" }));
        setEmailStatus("checking");
        const res = await fetch(`${API_BASE}/chkLoginByEml`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            yr: year,
            emll: email,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data || !data.famid || !data.famnm || !data.emailAddrs) {
          console.error("Backend returned error:", data);
          setFmEml("");
          setEmailStatus("invalid");
          setErrors((prev) => ({ ...prev, email: data.message || "Email address is not registered", }));
          return;
        }

        if (data && data.famid && data.famnm && data.emailAddrs) {
          setFmEml(data.emailAddrs);
          setFmDtt(data);
          console.log("fmdtt", fmDtt)

          // console.log(data.famid, data.famnm);
          setErrors((prev) => ({ ...prev, email: "" }));
          setEmailStatus("valid");
          // focus email only after success
          setTimeout(() => pswdRef.current?.focus(), 100);

        } else {
          setFmEml("");
          setErrors((prev) => ({ ...prev, email: "Unregistered Email Address", }));
          setEmailStatus("invalid");
        }
      } catch (err) {
        console.error("Error fetching family data:", err);
        setErrors((prev) => ({ ...prev, email: "Server error" }));
        setEmailStatus("invalid");
      }
    };

    handleEmailBlur();
  }, [regEmll, YrNmm]);

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
      // console.log("Time left:", diff, "seconds");
      //to calculate the remaining time in seconds and update the state for display
      setTimeLeft(diff);

      if (diff === 0) {
        setShowResendOtp(true);  //here to show resend when timer ends
        setOtpError((prev) => prev || "Verification code expired. Please request a new one.");
      }
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [otpExpiresAt, showOtpSection]);

  const pswdExst = async () => {
    if (!pss || pss.trim() === "") {
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
        credentials: "include",
        body: JSON.stringify({
          yr: YrNmm,
          pswd: pss,
          email_reg: String(regEmll).trim(),
          phone_reg: String(regMob).trim(),
        }),
      });

      const data = await res.json();
      console.log(data , data.famid , data.pswd , data.famnm );

      if (data && res.ok  && data.pswd && data.famid && data.famnm) {
        setFmPss(data.pswd);
        setFmEml(regEmll);
        console.log("regmob", regMob)
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

  // Auto-focus mobile input after the initial render, to improve user experience by allowing immediate typing without extra clicks
  useEffect(() => {if (mobRef.current) {mobRef.current.focus();}}, []);

  // // Clear OTP inputs and their error state, then focus the first input for a fresh start, 
  // // used after resend or failed attempts
  // const resetOtpAndFocusFirst = () => {
  //   setOtpDigits(["", "", "", "", "", ""]);
  //   setOtpError("");

  //   setTimeout(() => {
  //     setTimeout(() => {
  //       otpRefs.current[0]?.focus();
  //     }, 0);
  //   }, 0);
  // };

  //Handle resend OTP flow, with similar logic to initial login but only for OTP
  const resetOtpAndFocus = () => {
    shouldRefocusOtp.current = true;
    setOtpDigits(["", "", "", "", "", ""]);
  };

  //Handle login submission using email, mobile and password, then trigger OTP flow if credentials are valid
  // console.log("API_BASE in SignIn.jsx:", API_BASE);
  const handleLoginChk = async () => {
    if (isSubmittingLogin || !isFormValid) return;
    setIsSubmittingLogin(true);
    setOtpError("");
    try {
      const res = await fetch(`${API_BASE}/loginchk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          yr: YrNmm,
          emll: String(regEmll).trim(),
          pswd: String(pss).trim(),
          mobno: String(regMob).trim()
        })
      });
      console.log("Login response status:", res.status);
      console.log("Login response headers:", res.headers);
      console.log("Login response body:", await res.clone().text()); // clone to read body without consuming it

      const data = await res.json();
      console.log("Login response data:", data);

      if (!res.ok || !data || !data.success) {
        messageApi.open({
          type: "error",
          content: data.message || "Invalid login credentials"
        });
        setIsSubmittingLogin(false);
        return;
      }

      if (data.otpRequired && data.verificationToken) {
        setVerificationToken(data.verificationToken);
        console.log("Received verification token:", data.verificationToken);
        setIsOtpStep(true);
        //setVerificationCode("");
        setOtpError("");
        setShowOtpSection(true);
        //setOtpCode("");
        setShowResendOtp(false);

        setOtpExpiresAt(data.expiresAt || null);
        setMaxAttempts(data.maxAttempts || 3);
        setAttemptsLeft(data.maxAttempts || 3);
        
        setTimeout(() => {otpRefs.current[0]?.focus();}, 100);
        messageApi.open({
          type: "success",
          content: "Verification code sent to your email",
          duration: 10, // seconds (increase as needed)
          className: "custom-success-message",
        });
        // keep button disabled in OTP mode by design until verify/reload
        setIsSubmittingLogin(false);
        return;
      }

      messageApi.open({
        type: "error",
        content: "Unexpected login response (loginchk API)"
      });
      setIsSubmittingLogin(false);

    } catch (err) {
      console.error("Login error (loginchk API):", err);
      messageApi.open({
        type: "error",
        content: "Server error (loginchk API)"
      });
      setIsSubmittingLogin(false);
    }
  };

  //Handle OTP verification submission, then finalize login if OTP is valid
  const handleVerifyCode = async (codeOverride = null) => {
    if (isVerifyingCode) return;
    const codeToVerify = codeOverride || otpDigits.join("");
    console.log("handleVerifyCode running with:", codeToVerify);
    if (!codeToVerify || codeToVerify.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code");
      return;
    }

    setIsVerifyingCode(true);
    setOtpError("");
    console.log("Before fetch - verificationToken:", verificationToken, "code:", codeToVerify);
    try {
      const res = await fetch(`${API_BASE}/verify-login-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          verificationToken,
          code: codeToVerify.trim()
        })
      });
      console.log("After fetch - verificationToken:", verificationToken, "code:", codeToVerify);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setOtpError(data.message || "Invalid verification code");
        if (typeof data.attemptsLeft === "number") {
          setAttemptsLeft(data.attemptsLeft);
        }
        if (data.allowResend || data.reason === "ATTEMPTS_EXCEEDED") {
          setShowResendOtp(true);
        } else {
          setShowResendOtp(false);
        }
        resetOtpAndFocus();
        return;
      }

      setOtpError("");
      setOtpDigits(["", "", "", "", "", ""]);
      setShowResendOtp(false);
      setTimeLeft(0);
      setIsOtpStep(false);
      setShowOtpSection(false);
      setVerificationToken("");
      setOtpVerified(true);

      // sessionStorage.setItem("isAuthenticated", "true");
      // sessionStorage.setItem("userData", JSON.stringify(data.user));
      // setIsAuthenticated(true);
      // setUserData(data.user);

      messageApi.open({
        type: "success",
        content: "Login to our portal is successful"
      });

      login(data.user, data.expiresAt);
      //calling biometric registration after successful OTP login,
      // to allow users to opt-in for biometric login in the future if they choose,
      // using WebAuthn library and backend endpoints
      // await registerWebAuthn();
      if (enableBiometric) {
        console.log("enable Biometric:", enableBiometric);
        localStorage.setItem("biometricEnabled", "true");
        localStorage.setItem("lastFamilyId", fmDtt.famid);
        localStorage.setItem("lastFamilyEmail", fmDtt.emailAddrs);
        localStorage.setItem("mob_noo", fmDtt.mobb);

        //await registerWebAuthn();
        // if (Capacitor.isNativePlatform()) {
        //     await registerNativeBiometric();
        // } else {
        //     await registerWebAuthn();
        // }        
        await enableBiometricLogin({
          famid: fmDtt.famid,
          email: fmDtt.emailAddrs,
          mobile: fmDtt.mobb,
          registerWebAuthn,
          registerNativeBiometric
        });        
      } else {
        console.log("enable Biometric:", enableBiometric);
        localStorage.setItem("biometricEnabled", "false");
      }
      // Optional: store session ID or token if returned by backend for future authenticated requests
      //sessionStorage.setItem("sessionId", data.sessionId);
      // // After successful OTP verification, you can choose to register biometric for future logins
      // await registerWebAuthn();
      // // Finally, navigate to the protected area - Family Info page
      // navigate("/fminfo");
    } catch (err) {
      console.error("OTP verify error:", err);
      setOtpError("Server error");
      resetOtpAndFocus();
    } finally {
      setIsVerifyingCode(false);
    }
  };

  //Unified handler for OTP input changes, auto-focus, and paste support
  const handleOtpChange = (value, index) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    const newOtp = [...otpDigits];
    newOtp[index] = digit;
    setOtpDigits(newOtp);
    setOtpError("");

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const fullCode = newOtp.join("");
      // console.log("Last digit entered:", digit);
      // console.log("newOtp:", newOtp);
      // console.log("fullCode:", fullCode);
      // console.log("includes empty?", newOtp.includes(""));

      if (!newOtp.includes("")) {
        setTimeout(() => {
          console.log("Triggering auto verify...");
          handleVerifyCode(fullCode);
        }, 150);
      }
    }
  };
  // Handle backspace to move focus back
  const handleOtpKeyDown = (e, index) => {
    // if backspace on empty input, move to previous
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };
  // Handle paste of full OTP code
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (!pasted || pasted.length !== 6) return;
    const newOtp = ["", "", "", "", "", ""];

    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtpDigits(newOtp);
    const nextIndex = Math.min(pasted.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };
  // Combine OTP digits into a single code string for submission
  const verificationCode = otpDigits.join("");
  //start handlers for the biometric login: registration & verification
  const registerWebAuthn = async () => {
    if (!browserSupportsWebAuthn()) {
      console.log("WebAuthn is not supported on this device");
      return;
    }

    console.log(isNativeApp);    
    const res = await fetch(`${API_BASE}/webauthn/register-options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        famid: fmno,
        email: regEmll,
        mobb: regMob,
      })
    });
    const options = await res.json();
    // const attResp = await startRegistration(options);
    const attResp = await startRegistration({ optionsJSON: options });
    console.log("Biometric registration response:", attResp);
    await fetch(`${API_BASE}/webauthn/register-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        famid: fmno,
        email: regEmll,
        response: attResp,
        mobb: regMob,
      })
    });
  };

  const handleBiometricLogin = async () => {
    const isBioEnabled = localStorage.getItem("biometricEnabled") === "true";
    const famid = localStorage.getItem("lastFamilyId");
    const fmEmail = localStorage.getItem("lastFamilyEmail");
    const mob_noo = localStorage.getItem("mob_noo")
    console.log("Biometric enabled:", isBioEnabled, "fmMob:", regMob, "regEmll:", fmEmail, "famid:", famid);
    if (!isBioEnabled) {
      if (!mob_noo || !fmEmail || !famid || !isBioEnabled) {
        antdMessage.error("Enter mobile & email first");
        return;
      }
    }
    if (isBioEnabled) {
      if (!famid || !fmEmail || !mob_noo) {
        antdMessage.error("Please sign in normally first");
        return;
      }
    }
    try {
      console.log("login-verify-params", famid, fmEmail, mob_noo)
      const res = await fetch(`${API_BASE}/webauthn/login-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          famid: famid,
          email: fmEmail,
          mobb: mob_noo,
        })
      });

      const options = await res.json();
      console.log("Biometric login options:", options);

      if (!options || options.success === false) {
        antdMessage.error("No biometric registered");
        return;
      }
      console.log("allowCredentials_line787:", options.allowCredentials);
      // const authResp = await startAuthentication(options);
      const authResp = await startAuthentication({
        optionsJSON: options,
      });
      console.log("Biometric authentication response:", authResp);
      const verifyRes = await fetch(`${API_BASE}/webauthn/login-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          famid: famid,
          email: fmEmail,
          response: authResp,
          mobb: mob_noo,
        })
      });

      const data = await verifyRes.json();
      console.log("Biometric login verify response:", data);
      console.log("Biometric login verify response success:", data.success);
      console.log(famid, fmEmail, mob_noo)

      if (data.success) {
        //sessionStorage.setItem("sessionId", data.sessionId);
        //here call the handler which get the user data object to be passed to fminfo component --ahmed
        const familyRes = await fetch(`${API_BASE}/api/getFamilyLogin`, {
          method: "POST",
          headers: {"Content-Type": "application/json",},
          credentials: "include",
          body: JSON.stringify({
            famid,
            email: fmEmail,
            mobb: mob_noo,
            yrr: YrNmm
          }),
        });

        const familyData = await familyRes.json();

        if (!familyData.success) {
          antdMessage.error("Unable to load family information");
          return;
        }
        console.log("========== BEFORE AUTH LOGIN ==========");
        console.log("familyData:", familyData);
        console.log("familyData.expiresAt:", familyData.expiresAt);
        console.log("familyData.expiresAt type:", typeof familyData.expiresAt);
        console.log("Browser current time:", new Date().toString());
        console.log("Browser current ISO:", new Date().toISOString());

        if (familyData.expiresAt) {
            const expiryTimer = new Date(familyData.expiresAt).getTime();

            console.log("Parsed expiry:", new Date(expiryTimer).toString());
            console.log("Parsed expiry ISO:", new Date(expiryTimer).toISOString());
            console.log("Remaining:", expiryTimer - Date.now());
            console.log(
                "Remaining seconds:",
                Math.round((expiryTimer - Date.now()) / 1000)
            );
        }

        console.log("========================================");
        login(familyData.user, familyData.expiresAt);
        navigate("/fminfo");
      } else {
        antdMessage.error("Biometric login failed");
      }

    } catch (err) {
      console.error(err);
      antdMessage.error("Biometric error");
    }
  };
  // Handle native biometric registration for mobile apps using Capacitor and device biometrics, after successful OTP login
  const registerNativeBiometric = async () => {
    try {
      const result = await authenticateWithBiometric();

      console.log("Native biometric authentication:", result);

      // Save only AFTER successful authentication
      localStorage.setItem("biometricEnabled", "true");
      localStorage.setItem("lastFamilyId", fmDtt.famid);
      localStorage.setItem("lastFamilyEmail", fmDtt.emailAddrs);
      localStorage.setItem("mob_noo", fmDtt.mobb);

      setBiometricRegistered(true);

      messageApi.success("Fingerprint login enabled successfully.");

      return true;
    } catch (err) {
      console.error(err);

      messageApi.error("Fingerprint registration was cancelled.");

      return false;
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
  // console.log(API_BASE);
  const handleResendOtp = async () => {
    console.log("verification token:", verificationToken);

    if (!verificationToken) return;
    try {
      setIsResendingOtp(true);
      setOtpError("");

      const res = await fetch(`${API_BASE}/resend-login-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",

        body: JSON.stringify({
          verificationToken
        })
      });

      const data = await res.json();

      if (!data.success) {
        setOtpError(data.message || "Unable to resend OTP");
        return;
      }
      console.log("Received verification token:", data.verificationToken);

      // IMPORTANT: replace old token with NEW token
      setVerificationToken(data.verificationToken);
      //setOtpCode("");
      //setVerificationCode("");
      setShowResendOtp(false);

      // reset countdown + attempts
      setOtpExpiresAt(data.expiresAt || null);
      setMaxAttempts(data.maxAttempts || 3);
      setAttemptsLeft(data.maxAttempts || 3);
      //setOtpError("A new verification code has been sent to your email");
      //clear OTP inputs
      setOtpDigits(["", "", "", "", "", ""]);
      messageApi.open({
        type: "success",
        content: "Verification code sent to your email",
        duration: 10,
        className: "custom-success-message",
      });

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
    && mobileStatus === "valid" && emailStatus === "valid"
    && pswdRegExp.test(pss)
    && pss != ''
    && fmpss != undefined
    && pss != undefined
    && fmpss === pss
    && String(pss).trim().toLowerCase() === String(fmpss).trim().toLowerCase();
  const isMobInvalid = mobTouched && (!regMob || !MobRegExp.test(regMob) || !!errors.mobile);
  const isEmailInvalid = emailTouched && (!regEmll || !EmlRegExp.test(regEmll) || !!errors.email);
  const isPasswordInvalid = pssTouched && (!pss || !pswdRegExp.test(pss) || !!errors.password);
  const attemptsLabel = (count) => { if (count === 1) return "1 attempt left"; return `${count} attempts left`; };
  const fngrPrntSupported = window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function";
  const fngrPrntAvailable = showOtpSection && showResendOtp && !isOtpStep && !biometricRegistered && !isFormValid
  // console.log(showOtpSection )
  // console.log(showResendOtp )
  // console.log( !isOtpStep )
  // console.log( !biometricRegistered )
  // console.log( !isFormValid)

  return (
    <div>
      {contextHolder}
      <form className="allDiv" onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
        {/* FORM TITLE */}
        <div className="frmtitle">
          <h3 style={{ fontSize: "1.1rem" }}>Sign In to Parents' Fees Portal</h3>
        </div>
        {biometricRegistered ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "20px",
              gap: "10px",
            }}
          >
            {/* <button
              type="button"
              className="biobtn"
              onClick={handleBiometricLogin}
            >
              Sign in using Biometric
            </button> */}
            <button
              type="button"
              className="biobtn fingerprint-btn"
              onClick={handleBiometricLogin}
              title="Sign in with Fingerprint / Face ID"
            >
              <FontAwesomeIcon icon={faFingerprint} size="4x" />
            </button>
            {/* <button
              type="button"
              className="disbtn"
              onClick={() => {
                localStorage.removeItem("biometricEnabled");
                setBiometricRegistered(false);
              }}
            >
              Use another account
            </button> */}
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="mobb">
              <input
                type="tel" id="regmobno" maxLength={11} className={`inp ${isMobInvalid ? "inp-error" : ""}`}
                placeholder="Write Registered Mobile Number" ref={mobRef} value={regMob} disabled={isOtpStep}
                // onChange={(e) => {const value = e.target.value.replace(/\D/g, "").slice(0, 11); setMobTouched(true); handleMobileChange(e);
                // setRegMob(value);setRegEmll(""); setEmailTouched(false); setEmailStatus(""); setSelectedFamid(""); setSelectedFamNM("");
                // setErrors((prev) => ({ ...prev, mobile: "", email: "" }));
                // if (value.length < 11) {
                //   setMobileStatus("");
                //   setLastCheckedMobile("");
                //   return;
                // }
                // if (value.length === 11) {
                //   setRegMob(value);
                //   handleMobileBlur(value);
                // }
                // }
                // }
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 11);

                  setMobTouched(true);
                  setRegMob(e.target.value);

                  // reset dependent state ONLY when editing
                  if (value.length < 11) {
                    setFmMob("");
                    setFmDtt(null);
                    setMobileStatus("");
                  }

                  // setRegEmll("");
                  // setEmailTouched(false);
                  // setEmailStatus("");
                  // setErrors((prev) => ({ ...prev, mobile: "", email: "" }));
                }}

                // onBlur={() => setMobTouched(true)}
                required
              />
              {/* { !fmMob ? (<label className="lblworn">{errors.mobile}</label>) :
          (errors.mobile ? (
            <label className="lblworn" style={{ color: "red" }}>{errors.mobile}<FontAwesomeIcon icon={faXmark} /></label>) :
            (<label className="lblworn" style={{ color: "green" }}>Correct Mobile Number!!<FontAwesomeIcon icon={faCheck} /></label>))
          } */}
              {/* {
          !fmMob ? (<label className="lblworn">{errors.mobile}</label>)
          : mobileStatus === "checking" ? (<label className="lblworn" style={{ color: "#d48806" }}>Checking mobile number, please wait...</label>)
          : errors.mobile ? (<label className="lblworn" style={{ color: "red" }}>{errors.mobile} <FontAwesomeIcon icon={faXmark} /></label>)
          : mobileStatus === "valid" ? (<label className="lblworn" style={{ color: "green" }}>Correct Mobile Number!! <FontAwesomeIcon icon={faCheck} /></label>)
          : (<label className="lblworn"></label>)
          } */}
              {
                mobileStatus === "checking" ? (
                  <label className="lblworn" style={{ color: "#d48806" }}>
                    Checking mobile number, please wait...
                  </label>
                ) : errors.mobile ? (
                  <label className="lblworn" style={{ color: "red" }}>
                    {errors.mobile} <FontAwesomeIcon icon={faXmark} />
                  </label>
                ) : mobileStatus === "valid" ? (
                  <label className="lblworn" style={{ color: "green" }}>
                    {/* Correct Mobile Number!! <FontAwesomeIcon icon={faCheck} /> */}
                    Correct Mobile Number!! <FontAwesomeIcon icon={faCheck} />
                  </label>
                ) : (
                  <label className="lblworn"></label>
                )
              }
            </div>
            {/* Email */}
            <div className="emll">
              <input type="email" id="regEmll" className={`inp ${isEmailInvalid ? "inp-error" : ""}`}
                ref={emlRef} placeholder="Write Registered Email Address" disabled={isOtpStep || !fmMob}
                value={regEmll} onChange={(e) => { setEmailTouched(true); setRegEmll(e.target.value); }}
                onBlur={() => setEmailTouched(true)} required
              />
              {/* { !fmEml ? (<label className="lblworn">{errors.email}</label>) :
            (errors.email ? (<label className="lblworn" style={{ color: "red" }}>{errors.email}<FontAwesomeIcon icon={faXmark} /></label>) :
              (<label className="lblworn" style={{ color: "green", display: "flow" }}>Correct Email Address!!<FontAwesomeIcon icon={faCheck} /></label>))
          } */}
              {
                !fmEml ? (<label className="lblworn"></label>)
                  : emailStatus === "checking" ? (<label className="lblworn" style={{ color: "#d48806" }}>Checking email address, please wait...</label>)
                    : errors.email ? (<label className="lblworn" style={{ color: "red" }}>{errors.email} <FontAwesomeIcon icon={faXmark} /></label>)
                      : emailStatus === "valid" ? (<label className="lblworn" style={{ color: "green" }}>Correct Email Address!! <FontAwesomeIcon icon={faCheck} /></label>)
                        : (<label className="lblworn"></label>)
              }
            </div>
            {/* User Password */}
            <div className="divpss12">
              {/* <label id="lbl2" className="lbl" htmlFor="pss1" >Write own password:</label>             */}
              {/* <Input.Password id="pss1" placeholder='password' className="inp_1" type="password" maxLength={10} value={pss}
            iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
            onChange={(e) => setPss(e.target.value)} onKeyUp={pswdExst} /> */}
              <Input.Password id="pss1" placeholder="password" disabled={isOtpStep} className={`inp_1 ${isPasswordInvalid ? "inp-password-error" : ""}`}
                maxLength={10} ref={pswdRef} value={pss} iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                onChange={(e) => { setPssTouched(true); setPss(e.target.value); }} onBlur={() => setPssTouched(true)} onKeyUp={pswdExst}
              />
              {!fmpss ? (<label className="lblworn">{errors.password}</label>) :
                (errors.password ? (<label className="lblworn" style={{ color: "red" }}>{errors.password}<FontAwesomeIcon icon={faXmark} /></label>) :
                  (<label className="lblworn" style={{ color: "green" }}>Correct Password!!<FontAwesomeIcon icon={faCheck} /></label>))
              }
            </div>
            {/* OTP Code Input */}
            {isOtpStep && (
              <div className="otpdiv">
                {/* <input type="text" inputMode="numeric" maxLength={6} className={`inp ${otpError ? "inp-error" : ""}`}
            placeholder="Enter 6-digit verification code" value={verificationCode} disabled={timeLeft === 0 && showResendOtp}
            onChange={(e) => {const digitsOnly = e.target.value.replace(/\D/g, ""); setVerificationCode(digitsOnly); setOtpError("");}}
            /> */}
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "8px", marginLeft: "10px" }}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, index)}
                      onKeyDown={(e) => handleOtpKeyDown(e, index)}
                      onPaste={handleOtpPaste}
                      style={{
                        width: "35px",
                        height: "35px",
                        textAlign: "center",
                        fontSize: "18px",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        outline: "none",
                      }}
                    />
                  ))}
                </div>
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
                  // <div className="biometric-login">
                  //   <button type="button" className="enbtn" onClick={handleBiometricLogin}>Login with Fingerprint/Face ID in the Future</button>
                  // </div>,
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
            {
              showOtpSection && (
                <div className="otp-resnd">
                  {showResendOtp && (<button type="button" className='enbtn' onClick={handleResendOtp} disabled={isResendingOtp}>
                    {isResendingOtp ? "Sending..." : "Request New OTP"}</button>)}
                </div>
              )
            }
            {
              showOtpSection && !showResendOtp && (<div className="otp-info-row">
                <span className="otp-timer">
                  OTP Code expires in: <strong style={{ color: "red" }}>{formatTime(timeLeft)}</strong>
                </span>
                <span className="otp-attempts">
                  Attempts left: <strong style={{ color: "red" }}>{attemptsLabel(attemptsLeft)}</strong>
                </span>
              </div>)
            }
            {/* {!otpVerified  ? (<p></p>) :
          (<div className="fngrprnt">
          {( !showOtpSection && showResendOtp && isOtpStep && !biometricRegistered && !isFormValid) ? (<div><p></p></div>) :
              (<Checkbox style={{ margin: "10px 10px 10px 10px", fontSize: "13px", fontWeight: "bold" }} className="fngrchkbox" checked={enableBiometric} onChange={(e) => setEnableBiometric(e.target.checked)} disabled={isSubmittingLogin || isVerifyingCode || (timeLeft === 0 && showResendOtp)}>
                Use Fingerprint / Face ID on this device
              </Checkbox>
            )}
          </div>)
          } */}
            {otpVerified && (
              <div className="fngrprnt">
                <Checkbox
                  style={{
                    margin: "10px",
                    fontSize: "13px",
                    fontWeight: "bold"
                  }}
                  className="fngrchkbox"
                  checked={enableBiometric}
                  onChange={(e) => setEnableBiometric(e.target.checked)}
                  disabled={isSubmittingLogin || isVerifyingCode}
                >
                  Enable biometric login on this device
                </Checkbox>
                {/* if (!isBiometricEnabled()) {
                    Modal.confirm({
                        title: "Enable Fingerprint Login?",
                        content:
                            "Use your fingerprint to sign in faster next time.",
                        okText: "Enable",
                        cancelText: "Not Now",
                        async onOk() {
                        await enableBiometric({
                            famid: fmDtt.famid,
                            email: fmDtt.emailAddrs,
                            mobile: fmDtt.mobb,
                            registerWebAuthn,
                            registerNativeBiometric
                        });        
                        }
                    })

                }                 */}

                {enableBiometric && !biometricRegistered && (
                  <button
                    type="button"
                    className="biobtn"
                    // style={{
                    //   backgroundColor: "#15c049 !important",
                    //   color: "white !important",
                    //   transition: "background-color 0.3s ease !important",
                    //   margin: "5px 5px 5px 35px !important",
                    //   width: "200px !important",
                    //   fontSize: "1rem !important",
                    //   padding: "5px 10px !important",
                    // }}
                    // onClick={handleBiometricRegister}
                    // onClick={registerWebAuthn}
                    // console.lo("emailll",fmDtt.emailAddrs);

                    onClick={async () => {
                      if (enableBiometric) {
                        console.log("enable Biometric:", enableBiometric);
                        console.log("fmDtt.famid:", fmDtt.famid, "fmDtt.emailAddrs:", fmDtt.emailAddrs);
                        localStorage.setItem("biometricEnabled", "true");
                        localStorage.setItem("lastFamilyId", fmDtt.famid);
                        localStorage.setItem("lastFamilyEmail", fmDtt.emailAddrs);
                        localStorage.setItem("mob_noo", fmDtt.mobb);
                        await registerWebAuthn();
                      }
                      navigate("/fminfo");
                    }}
                  >
                    Register Biometric Data
                  </button>
                )}

                {biometricRegistered && (
                  <label
                    className="lblworn"
                    style={{ color: "green" }}
                  >
                    Fingerprint / Face ID enabled successfully
                  </label>
                )}
              </div>
            )}
            {!isFormValid ? (<p></p>) :
              (<div className="fminfo"><strong >Family ID:{fmDtt.famid} - Family Name:{fmDtt.famnm} </strong></div>)}
            <div className="forgotdiv" style={{ fontSize: "14px", marginLeft: "20px" }}>
              {isFormValid ? (<p></p>) :
                <Link style={{ fontSize: "14px", marginLeft: "20px" }} to="/forgot-pswd" className="forgotlnk">Forgot Password</Link>}
            </div>
          </>)}
        <div style={{ display: "flex", flexDirection: "row" }}>
          <p style={{ fontSize: "14px", marginLeft: "20px" }}> Don't have an account?{''}</p>
          <Link style={{ fontSize: "14px", marginLeft: "20px" }} to="/signup" >Sign Up</Link>
        </div>
      </form >
      {/* //className="signuplnk" className='signup' className="signupdiv" */}
      {/* <div className="forgt">
        <button className="enbtn" type="button" tabIndex="10" id="btnForgt" disabled  onClick={() => navigate("/forgot-pswd")}>Forgot Password</button>)
      </div> */}

    </div>
  )
}

