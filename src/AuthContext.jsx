import {createContext, useContext, useEffect, useState, useRef} from "react";
import { useNavigate, useLocation } from "react-router-dom";
// import { getSavedUsr } from "../../Server/sessionManager.js";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const authGenerationRef = useRef(0);
  const API_BASE = import.meta.env.VITE_API_URL;
  if (!API_BASE) {
    throw new Error("VITE_API_URL is not defined");
  }
  //declare navigate and location hooks
  const navigate = useNavigate();
  const location = useLocation();
  //declare state variables for loading, authentication status, user data, and session expiration time
  const [loading, setLoading] = useState(true); //declare a state for session loading to determine either to restore the session or not 
  const [isAuthenticated, setIsAuthenticated] = useState(false); //state to detect either the user-session is authenticated or not
  const [userData, setUserData] = useState(null); //so important: hold user data after login
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  //declare refs for logout timer and logging out status
  const logoutTimerRef = useRef(null);
  const loggingOutRef = useRef(false);

  // =========================================================
  // CLEAR FRONTEND AUTHENTICATION STATE
  // =========================================================
  const clearSession = () => {
    //Invalidate every existing logout timer
    authGenerationRef.current += 1;
    // Clear any existing logout timer
    console.log("AUTH GENERATION -> CLEAR:", authGenerationRef.current);
    // Clear any existing logout 
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }

    // sessionStorage.removeItem("phpHandled");
    
    // Clear the frontend authentication state for the current session
    setIsAuthenticated(false);
    setUserData(null);
    setSessionExpiresAt(null);
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = async (redirect = true, reason = "manual") => {
    console.trace("========== LOGOUT CALLED ==========");
    console.log("Logout reason:", reason);
    console.log("Logout time:", new Date().toISOString());
    console.log("Current URL:", window.location.href);

    if (loggingOutRef.current) {
      console.log("Logout already in progress.");
      return;
    }

    // Set the logging out flag to prevent concurrent logouts processes
    loggingOutRef.current = true;
    
    // Invalidate all timers belonging to previous sessions
    authGenerationRef.current += 1;

    console.log("AUTH GENERATION -> LOGOUT:", authGenerationRef.current);
    
    // Clear any existing logout timer
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }

    try 
    {
      await fetch(`${API_BASE}/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Logout-Reason": reason
        }
      });
    } 
    catch (err) 
    {
      console.error("Logout request failed:", err);
    } 
    finally 
    {
      // Clear the frontend authentication state regardless of the logout request outcome
      setIsAuthenticated(false);
      setUserData(null);
      setSessionExpiresAt(null);

      // Clear any session-related data from sessionStorage
      sessionStorage.clear();
      
      // Reset the logging out flag to allow future logout attempts
      loggingOutRef.current = false;

      if (redirect) {
        navigate("/signin", { replace: true });
      }
    }
  };

  // =========================================================
  // AUTOMATIC LOGOUT TIMER
  // =========================================================
  const startAutoLogoutTimer = (expiryTime) => {
    // Invalidate all timers belonging to previous sessions
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }

    // If no expiry time is provided, log a message and return early without any action. This prevents setting a timer with an undefined expity time.
    if (!expiryTime) {
      console.log("No expiry time supplied.");
      return;
    }
    
    // Convert the expiry time to a timestamp in milliseconds
    const expiry = new Date(expiryTime).getTime();
    
    //check if the expiry time is valid. If it's not a number, log an error and return early without setting a timer.
    if (Number.isNaN(expiry)) {
      console.error("Invalid session expiration:", expiryTime);
      return;
    }
    
    // Store the current generation of the authentication state. 
    // This is used to ensure that the timer corresponds to the correct session.
    const generation = authGenerationRef.current;

    // Calculate the remaining time until the session automatically expires 
    // by subtracting the current time from the calculated expiry time 
    const remaining = expiry - Date.now();

    //log all related variables to the console for debugging purposes, 
    // including the generation number, expiry time, current time, and remaining time in seconds.
    console.log("================================");
    console.log("START AUTO LOGOUT TIMER");
    console.log("Generation:", generation);
    console.log("ExpiresAt:", new Date(expiry).toISOString());
    console.log("Current:", new Date().toISOString());
    console.log("Remaining:", Math.round(remaining / 1000), "seconds");
    console.log("================================");

    // If the remaining time is less than or equal to zero, it means the session has to be expired already. 
    // In this case, log a message indicating that the session has already expired 
    // and also call the Logout function to clear the session and redirect the user to the login page. 
    if (remaining <= 0) {
      console.log("Session already expired.","Timer generation:",generation,"Current generation:",authGenerationRef.current);

      // Only log out if the generation numbers match, indicating that this timer is still relevant to the current session.
      if (generation === authGenerationRef.current) {
        logout(true, "expired-before-timer");
      }

      // If the generation numbers do not match, it means that the session has already been cleared or replaced by a new session.
      return;
    }

    // Set a timeout to automatically log out the user when the session expires.
    logoutTimerRef.current = setTimeout(() => {
      console.log("================================");
      console.log("AUTO LOGOUT TIMER FIRED");
      console.log("Timer generation:", generation);
      console.log("Current generation:", authGenerationRef.current);
      console.log("Time:", new Date().toISOString());
      console.log("================================");

      if (generation !== authGenerationRef.current) {
        // If the generation numbers do not match, 
        // it means that the session has already been cleared or replaced by a new session.
        console.log("Ignoring stale logout timer:",generation,"current:",authGenerationRef.current);
        // Do not log out the user, as this timer is no longer 
        // relevant to the current session - just return early without taking any action.
        return;
      }
      // If the generation numbers match, it means that the session is still valid and has expired.
      //so call the logout function to clear the session and redirect the user to the login page.
      logout(true, "session-expired");
    }, remaining);
  };
  // =========================================================
  // RESTORE SESSION FROM SERVER
  // =========================================================
  const login = (user, expiresAtTime) => {
    // Invalidate all timers belonging to previous sessions
    authGenerationRef.current += 1;
    console.log("AUTH GENERATION -> LOGIN:", authGenerationRef.current);
    // set the user data and authentication status
    setUserData(user);
    // set the authentication status to true
    setIsAuthenticated(true);
    // If an expiration time is provided, set the session expiration time and start the automatic logout timer
    if (expiresAtTime) {
      const expiryTime = new Date(expiresAtTime).getTime();
      // Log the expiry time in ISO format for debugging purposes
      console.log("Login expiry time:", new Date(expiryTime).toISOString());
      // Check if the expiry time is valid. If it's not a number, log an error message and return early 
      // without setting the session expiration time or starting the timer. 
      // This prevents potential issues with invalid expiration times.
      if (Number.isNaN(expiryTime)) {
        console.error("Invalid expiry time:", expiryTime);
        return;
      }
      // Store the session expiration time in its state variable
      setSessionExpiresAt(expiryTime);
      // Start the automatic logout timer based on the session expiration time
      console.log("Starting auto logout timer with expiry time from the login function:", new Date(expiryTime).toISOString());
      startAutoLogoutTimer(expiryTime);
    }
  };
  //Here to restore the session from the server if a valid session exists on the database
  const restoreSession = async () => {
    try {
      console.log("Checking existing server session...");
      const response = await fetch(`${API_BASE}/auth/session-status`,
        {
          method: "GET",
          credentials: "include"
        }
      );
      // If the response is not OK (e.g., 401 Unauthorized), it means there is no valid session on the server.
      if (!response.ok) {
        console.log("No valid server session.");
        // Clear the session state to ensure the user is logged out
        clearSession();
        // Return false to indicate that the session restore is failed
        return false;
      }
      // Parse the JSON response from the server
      const sessionData = await response.json();
      console.log("Session status:",sessionData);
      if (!sessionData.success || !sessionData.authenticated) {
        // No valid session on the server
        clearSession();
        console.log("No valid session on the server.", sessionData);
        // Return false to indicate that the session restore is failed
        return false;
      }

      // Restore user data (session information) from the SERVER
      setUserData(sessionData.user);
      // Set the authentication status to true, indicating that the user is now authenticated 
      // based on the restored session from the server. 
      //This is important for controlling access to protected routes and features in the application.
      setIsAuthenticated(true);

      // If the server provides an expiration time for the session, 
      // set the session expiration time and start the automatic logout timer
      if (sessionData.expiresAt) {
        // Convert the expiration time to a timestamp in milliseconds
        const sessionExpiryTime = new Date(sessionData.expiresAt).getTime();
        // Log the expiry time in ISO format for debugging purposes
        setSessionExpiresAt(sessionExpiryTime);
        // Start the automatic logout timer based on the session expiration time
        console.log("Starting auto logout timer with expiry time from the restoreSession function:", new Date(sessionExpiryTime).toISOString());
        startAutoLogoutTimer(sessionExpiryTime);
      }
      // Return true to indicate that the session was successfully restored
      return true;
    } catch (err) {
      //To handle any errors that occur during the session restoration process
      console.error("Session restore error:",err);
      // Clear the session state to ensure the user is logged out
      clearSession();
      // Return false to indicate that the session restoration failed
      return false;
    }
  };

  // =========================================================
  // PHP LOGIN REDIRECT
  // =========================================================
//   // This effect handles the case where the user is redirected from a PHP login page with query parameters.
//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     console.log("URL Params:",Object.fromEntries(params.entries()));
//     const emllParam = params.get("emll");
//     const famnmParam = params.get("FAMNM");
//     if (!emllParam && !famnmParam) {return;}

//     // if (sessionStorage.getItem("phpHandled")) {
//     // return;
//     // }

//     //const savedUser = sessionStorage.getItem("userData");
//     const savedUser = await getSavedUsr(famnmParam, emllParam);

//     let parsed = {};
//     try {
//       parsed = savedUser
//       ? JSON.parse(savedUser)
//       : {};
//     } catch (err) {
//       console.error(
//       "Invalid stored user data:", err
//     );
//     parsed = {};
// }

//   // const famidParam = params.get("famid");
//   // const mobnoParam = params.get("mobno");

//   // const updatedUser = {

//   // ...parsed,

//   // famid:
//   // famidParam ||
//   // parsed.famid ||
//   // null,

//   // mobno:
//   // mobnoParam ||
//   // parsed.mobno ||
//   // "",

//   // emll:
//   // emllParam ||
//   // parsed.emll ||
//   // "",

//   // famnm:
//   // famnmParam ||
//   // parsed.famnm ||
//   // ""
//   // };

//   /*
//     IMPORTANT:
//     This PHP redirect flow assumes that the PHP side
//     has already authenticated the user and created the
//     server session/cookie.

//     Therefore we should NOT manufacture a client-side
//     expiration here.

//     Instead, after redirecting, ask the server for the
//     actual session.
//   */

//   // sessionStorage.setItem("userData",JSON.stringify(updatedUser));
//   // sessionStorage.setItem("phpHandled","1");

//   navigate("/fminfo",{ replace: true });

// }, [location.search]);


// This effect handles the case where the user is redirected from a PHP login page 
// with query parameters (email address & family name).
useEffect(() => {
  const handlePhpRedirect = async () => {
    //grab the query parameters from the URL using the URLSearchParams API
    const params = new URLSearchParams(location.search);
    //print them for debugging purposes
    console.log("URL Params:", Object.fromEntries(params.entries()));
    //define the query parameters for email and family name
    const emllParam = params.get("emll");
    const famnmParam = params.get("FAMNM");

    // Not a PHP redirect
    if (!emllParam && !famnmParam) {return;}
    
    // If the user has already been handled by the PHP redirect, we can skip processing it again.
    try 
    {
      // Retrieve the saved user data from the session manager based on the provided family name and email address
      const savedUser = await fetch("/api/getSavedUsr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          famnm: famnmParam,
          email: emllParam,
        }),
      }).then((res) => res.json());
      // If no saved user data is found, log a message and redirect to the sign-in page
      console.log("PHP login user:", savedUser);
      navigate("/fminfo", {replace: true});
    } 
    catch (err) 
    {
      console.error("PHP login redirect error:",err);
      navigate("/signin", {replace: true});
    }
  };
  // Call the function to handle the PHP redirect
  handlePhpRedirect();
}, [location.search, navigate]);

// =========================================================
// INITIAL SESSION CHECK
// =========================================================
// This effect runs once when the component mounts to check for an existing session on the server.
useEffect(() => {
  //Define a variable to track whether the component is still mounted. 
  // This is used to prevent state updates on an unmounted component, 
  // which can lead to memory leaks and warnings in React.
  let mounted = true;
  // Define an asynchronous function to restore the session from the server
  const initializeAuth = async () => {
    try {
      await restoreSession();
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };
  // Call the function to initialize authentication and restore the session
  initializeAuth();
  // Cleanup function to set the mounted variable to false when the component unmounts.
  return () => {
    mounted = false;
    // Clear any existing logout timer when the component unmounts to prevent memory leaks and unexpected behavior.
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
  };
}, []);

// =========================================================
// CLEANUP TIMER
// =========================================================
// This effect runs once when the component mounts and sets up a cleanup function to clear any existing logout timer 
// when the component unmounts.
useEffect(() => {
  return () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };
}, []);

//Finally, the AuthProvider component returns the AuthContext.Provider component, 
// which provides the authentication state and functions to its child components. 
// The value prop of the provider contains the authentication state variables and functions that
// can be accessed by any component that consumes this context.
return (
  <AuthContext.Provider
    value={{
      isAuthenticated,
      userData,
      sessionExpiresAt,
      login,
      logout,
      loading
    }}
  >
    {children}
  </AuthContext.Provider>
);
};

// =========================================================
// RETURNHOOK
// =========================================================
// This custom hook allows components to easily access the authentication context by calling useAuth().
export const useAuth = () => {
  // Use the useContext hook to access the AuthContext and return its value, 
  // which contains the authentication state and functions.
  return useContext(AuthContext);

};