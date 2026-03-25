
import React, { useEffect, useState, useRef } from "react";
import './PssForgot.css'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCheckDouble, faGreaterThan } from "@fortawesome/free-solid-svg-icons";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import imgg from './img/titlelogo.jpg'
import 'antd/dist/reset.css';
import { Button, Alert, Spin, Table, Tag, Input, message } from "antd";
//import { message } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { Typography } from 'antd';
import { useNavigate } from "react-router-dom";
// const { Link } = Typography;
import { Link } from 'react-router-dom'
import './PssForgot.css'
// import Message from "tedious/lib/message.js";
// import bcrypt from "bcrypt";

var MobRegExp = /^01[0-2,5]{1}[0-9]{8}$/;
var EmlRegExp = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
var pswdRegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!_@#$%^&*]).{10,}$/;

function PssForgot() {
  useEffect(() => {
    localStorage.clear();
  }, []);
  //const [message, setMessage] = useState("");
  const [messageApi, contextHolder] = message.useMessage()
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const emlRef = useRef(null);
  const mobRef = useRef(null);
  const [selectedFamid, setSelectedFamid] = useState("");
  const [selectedFamNm, setSelectedFamNM] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [mobb, setMobb] = useState("");
  const [regEmll, setRegEmll] = useState("");
  const [regMob, setRegMob] = useState("");
  const [errors, setErrors] = useState({ email: "", mobile: "" });
  const [vll, setVll] = useState('');
  const [vllerr, setVllErr] = useState('');
  const [fmDtt, setFmDtt] = useState({});
  const [loginCreated, setLoginCreated] = useState(false)
  const [ownPss1, setOwnPss1] = useState("")
  const [ownPss2, setOwnPss2] = useState("")
  const [usrtmpPss, setusrtmpPss] = useState("")
  const [systempPswd, setSysTempPswd] = useState("")
  const [mobTouched, setMobTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);  
  const [pssTouched, setPssTouched] = useState(false);    
  const [mobileStatus, setMobileStatus] = useState(""); 
  const [emailStatus, setEmailStatus] = useState(""); 
  const [btnSubmitLocked, setBtnSubmitLocked] = useState(false);  
  const [lastCheckedMobile, setLastCheckedMobile] = useState("");
  const navigate = useNavigate();
  const REACT_PORT = import.meta.env.VITE_PORT || 3000;
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  //API base URL from environment variable
  const API_BASE = `${import.meta.env.VITE_API_URL}`;
  if (!API_BASE) {
    throw new Error("VITE_API_URL is not defined");
  }


  localStorage.removeItem("curFmNo");
  localStorage.removeItem("curFmNm");

  const handleChangeOnlyNo = (e) => {
    setRegMob(e.target.value)
    const vl = e.target.value;
    // Validate as user types
    if (!/^\d*$/.test(vl)) {
      setVllErr('Only numbers are allowed');
    } else {
      setVllErr('');
      setVll(vll);
    }
  };

  //CREATE FAMILY LOGIN , TEMP PASSWORD & SEND IT TO EMAIL ADDRESS
  const modifyLogin = async (e) => {
    e.preventDefault();
    const loginData = {
      yr: import.meta.env.VITE_YEAR || "2025",
      famid: selectedFamid,
      famnm: selectedFamNm,
      emll: regEmll,
      mobb: regMob,
      pswd: '01071973',
    };
    console.log(JSON.stringify(loginData))
    try {
      // const res = await fetch("http://localhost:3000/api/modifylogin", {
      const res = await fetch(`${API_BASE}/modifylogin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (res.ok) {
        //alert(data.message);
        messageApi.open({
          type: "success",
          content: data.message,
          key: "modifylogin",
          duration: 4
        });        
        //Alert(data.message)
        setLoginCreated(true)
        console.log(data.tempPswd)
        setSysTempPswd(data.tempPswd)
      } else {
        alert("Error: " + data.message);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };


  // Mobile number validation
  const handleMobileBlur = async (trgtMob) => {
    // empty field
    if (!trgtMob || trgtMob.trim() === "") {
      setErrors((prev) => ({ ...prev, mobile: "" }));
      setSelectedFamid("");
      setMobb("");
      setMobileStatus("");
      return;
    }

    // invalid format
    // console.log("Validating mobile:", trgtMob);
    if (!MobRegExp.test(trgtMob)) {
      setErrors((prev) => ({ ...prev, mobile: "Invalid Mobile Number" }));
      setSelectedFamid("");
      setMobb("");
      setMobileStatus("invalid");
      return;
    }

    try {
      setErrors((prev) => ({ ...prev, mobile: "" }));
      setMobileStatus("checking");

      const res = await fetch(`${API_BASE}/spgetfmdet/${String(trgtMob).trim()}`);
      const data = await res.json();

      if (data && data[0] && data.length > 0) {
        setSelectedFamid(data[0].famid);
        setErrors((prev) => ({ ...prev, mobile: "" }));
        setMobileStatus("valid");
        setTimeout(() => emlRef.current?.focus(), 100);        
      } else {
        setSelectedFamid("");
        setMobb("");
        setErrors((prev) => ({ ...prev, mobile: "Unregistered Mobile Number" }));
        setMobileStatus("invalid");
      }
    } catch (err) {
      console.error("Error fetching family data:", err);
      setSelectedFamid("");
      setMobb("");
      setErrors((prev) => ({ ...prev, mobile: "Server error" }));
      setMobileStatus("invalid");
    }
  };

  // Email Address validation
  const handleEmailBlur = async () => {
    // empty field
    if (!regEmll || regEmll.trim() === "") {
      setErrors((prev) => ({ ...prev, email: "" }));
      setSelectedFamid("");
      setSelectedFamNM("");
      setEmailStatus("");
      return;
    }

    // invalid format
    if (!EmlRegExp.test(regEmll)) {
      setErrors((prev) => ({ ...prev, email: "Invalid Email Address" }));
      setSelectedFamid("");
      setSelectedFamNM("");
      setEmailStatus("invalid");
      return;
    }

    // optional: do not check DB until mobile is valid
    if (!MobRegExp.test(regMob)) {
      setErrors((prev) => ({ ...prev, email: "" }));
      setEmailStatus("");
      return;
    }

    try {
      setErrors((prev) => ({ ...prev, email: "" }));
      setEmailStatus("checking");

      const res = await fetch(`${API_BASE}/sp_GetFmDetByMob&Email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobno: String(regMob).trim(),
          emll: String(regEmll).trim(),
        }),
      });

      const data = await res.json();

      if (data && data.famid && data.famnm) {
        setFmDtt(data);
        setSelectedFamid(data.famid);
        setSelectedFamNM(data.famnm);
        setErrors((prev) => ({ ...prev, email: "" }));
        setEmailStatus("valid");
      } else {
        setSelectedFamid("");
        setSelectedFamNM("");
        setEmail("");
        setErrors((prev) => ({ ...prev, email: "Unregistered Email Address" }));
        setEmailStatus("invalid");
      }
    } catch (err) {
      console.error("Error fetching family data:", err);
      setSelectedFamid("");
      setSelectedFamNM("");
      setErrors((prev) => ({ ...prev, email: "Server error" }));
      setEmailStatus("invalid");
    }
  };

  //Update the password & go to the sign in component
  const updtLogin = async () => {
    // const hashedPswd = await bcrypt.hash(ownPss1, 10);   
    // console.log({
    //       yrno : "2025",
    //       famid: fmDtt.famid,
    //       mobb: String(regMob).trim(),
    //       emll: String(regEmll).trim(),
    //       pswd: ownPss1
    // })
    const loginData = {
      yr: import.meta.env.VITE_YEAR || "2025",
      famid: selectedFamid,
      famnm: selectedFamNm,
      emll: regEmll,
      mobb: regMob,
      pswd: ownPss1,
    };
    console.log(JSON.stringify(loginData))
    try {
      // const res = await fetch("http://localhost:3000/api/updtLogin", {
      const res = await fetch(`${API_BASE}/updtLogin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
        // body: JSON.stringify({
        // yrno : "2025",
        // famid: fmDtt.famid,
        // mobb: String(regMob).trim(),
        // emll: String(regEmll).trim(),
        // pswd: ownPss1
        // }),
      });
      const data = await res.json();
      if (data && data.pswd) {
        //console.log(data.pswd)
        Alert('Password Updated')
      } else {

      }

    } catch (err) {
      console.error("Error fetching family data:", err);
      // setErrors((prev) => ({ ...prev, email: "Server error" }));
    }

    navigate('/signin')
  }

  const isMobInvalid = mobTouched && (!regMob || !MobRegExp.test(regMob) || !!errors.mobile);
  const isEmailInvalid = emailTouched && (!regEmll || !EmlRegExp.test(regEmll) || !!errors.email);
  const isTempPswdValid = usrtmpPss === systempPswd
  
  const isFrstPswdValid = pswdRegExp.test(ownPss1)
  const isScndPswdValid = pswdRegExp.test(ownPss2)  
  const isFormValid = !errors.email 
    && !errors.mobile && regEmll && regMob
    && mobileStatus === "valid" && emailStatus === "valid";  
  const isPssFormValid = String(ownPss1).trim().length === 10
    && mobileStatus === "valid"
    && emailStatus === "valid"
    && String(ownPss2).trim().length === 10
    && ownPss1 === ownPss2
    && usrtmpPss === systempPswd
    && pswdRegExp.test(ownPss1)
    && pswdRegExp.test(ownPss2)

  //console.log(isPssFormValid)
  // console.log(systempPswd + '-' + usrtmpPss )
  //setLoginCreated(false)
  return (
    <>
      <form className="allDivv" onSubmit={(e) => HandleSubmit(e, selectedFamid)}>
        {/* FORM TITLE */}
        <div className="frmtitlee">
          <h3 style={{ paddingTop: "10px", fontSize: "1.25rem", fontWeight: "600", lineHeight: "1.5" }}>Sign Up to Parents' Fees Portal</h3>
          <img style={{height:"14vh" , width:"45%"}} className="titleimg" src={imgg} alt="EL ALSSON" />
        </div>
        {/* Mobile */}
        <div className="mobb">
          <input type="tel" id="regmobno" maxLength={11} className={`inp ${isMobInvalid ? "inp-error" : ""}`} 
          placeholder="Write Your Registered Mobile Number" ref={mobRef} value={regMob} 
          onChange={(e) => {const value = e.target.value.replace(/\D/g, "").slice(0, 11); setMobTouched(true);
          setRegMob(value);setRegEmll(""); setEmailTouched(false); setEmailStatus(""); setSelectedFamid(""); setSelectedFamNM("");
          setErrors((prev) => ({ ...prev, mobile: "", email: "" }));
          if (value.length < 11) {
            setMobileStatus("");
            setLastCheckedMobile("");
            return;
          }
          if (value.length === 11) {
            setRegMob(value);
            handleMobileBlur(value);
          }
          }} />
          {
          !regMob ? (<label className="lblworn"></label>) 
          : mobileStatus === "checking" ? (<label className="lblworn" style={{ color: "#d48806" }}>Checking mobile number, please wait...</label>)
          : errors.mobile ? (<label className="lblworn" style={{ color: "red" }}>{errors.mobile} <FontAwesomeIcon icon={faXmark} /></label>)
          : mobileStatus === "valid" ? (<label className="lblworn" style={{ color: "green" }}>Correct Mobile Number!! <FontAwesomeIcon icon={faCheck} /></label>) 
          : (<label className="lblworn"></label>)
          }
        </div>
        {/* Email */}
        <div className="emll">
          <input type="email" id="regEmll" className={`inp ${isEmailInvalid ? "inp-error" : ""}`} ref={emlRef} disabled={mobileStatus !== "valid"}
          placeholder={mobileStatus === "valid"? "Write Your Registered Email Address": "Enter valid mobile first"} value={regEmll} 
          onChange={(e) => {setEmailTouched(true); setEmailStatus(""); setErrors((prev) => ({ ...prev, email: "" })); 
          setRegEmll(e.target.value);}} onBlur={handleEmailBlur} required
          />
          {
          !regEmll ? (<label className="lblworn"></label>) 
          : emailStatus === "checking" ? (<label className="lblworn" style={{ color: "#d48806" }}>Checking email address, please wait...</label>)
          : errors.email ? (<label className="lblworn" style={{ color: "red" }}>{errors.email} <FontAwesomeIcon icon={faXmark} /></label>)
          : emailStatus === "valid" ? (<label className="lblworn" style={{ color: "green" }}>Correct Email Address!! <FontAwesomeIcon icon={faCheck} /></label>) 
          : (<label className="lblworn"></label>)
          }
          {/* {regEmll === undefined || regEmll === '' ? (<label className="lblworn"></label>) :
            (errors.email ? (<label className="lblworn" style={{ color: "red" }}>{errors.email}<FontAwesomeIcon icon={faXmark} /></label>) :
              (<label className="lblworn" style={{ color: "green", display: "flow" }}>Correct Email Address!!<FontAwesomeIcon icon={faCheck} /></label>))
          } */}
        </div>

        {/* Submit */}
        {!isFormValid ? (<p></p>) :
          (<div ><strong className="fminfo">Family ID:{fmDtt.famid} - Family Name:{fmDtt.famnm} </strong></div>)}
        <div className="sbmtt">
          <button className={isFormValid && !btnSubmitLocked ? "enbtn" : "disbtn"} type="submit" tabIndex="9" id="btnSubmit" 
          disabled={!isFormValid || btnSubmitLocked} onClick={modifyLogin}>
          {btnSubmitLocked ? (loginCreated ? "Password Modified" : "Request Submitted"): "Reset Password"}{" "}
          {!btnSubmitLocked && <FontAwesomeIcon icon={faCheckDouble} />}
          </button>
        </div>
        {/* <div className="sbmtt">
          {isFormValid ? (<button className="enbtn" type="submit" tabIndex="9" id="btnSubmit" onClick={modifyLogin}>Reset Password<FontAwesomeIcon icon={faCheckDouble} /></button>) :
            (<button className="disbtn" type="button" tabIndex="9" id="btnSubmit" disabled>Create Password</button>)}
        </div> */}

        {!loginCreated ? (<p></p>) :
          (<div >
            <div className="pssfrm">
              <div className="pdvv">
                {/* <p className="lblok">Your password was reset & your login was updated successfuly.</p> */}
                <p className="lblok">Temporary password sent to your email address: {regEmll}</p>
                <p className="lblok">Please write it below only once now.</p>
                <p className="lblok">Then change it with your own password immidiately.</p>
              </div>
              {/* <div className="tmppss">
                <label id="lbl1" className="lbl" htmlFor="tmppss">Write temp. password:</label>
                <Input.Password id="tmppss" className="inp_1" type="password" maxLength={10}
                  iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />} value={usrtmpPss}
                  onChange={(e) => setusrtmpPss(e.target.value)} />
              </div> */}
              <div className="tmppss" >
                <label id="lbl1" className="lbl" htmlFor="tmppss">Write your temporary password:</label>
                <Input.Password id="tmppss" className={`inp_1 ${!isTempPswdValid ? "inp-error" : ""}`} type="password" maxLength={10}
                  iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />} value={usrtmpPss}
                  onChange={(e) => setusrtmpPss(e.target.value)} />
                  {
                  !usrtmpPss ? (<label className="lblworn"></label>) 
                  : isTempPswdValid ? (<label className="lblworn" style={{ color: "green" }}>Correct Temporary Password!! <FontAwesomeIcon icon={faCheck} /></label>) 
                  : (<label className="lblworn">Invalid Temporary Password<FontAwesomeIcon icon={faXmark} /></label>)
                  }                  
              </div>     
              <div>
                <p style={{marginBottom:"8px"}}><u>Password Hints:</u></p>
                <ul className="psshints">
                  <li>Should be 10 characters length</li>
                  <li>At least one uppercase letter</li>
                  <li>At least one number</li>
                  <li>At least one special character like: (!_@#$%^&*)</li>
                </ul>
              </div>                       
              {/* <div className="divpss1">
                <label id="lbl2" className="lbl" htmlFor="pss1" >Write own password:</label>
                <Input.Password id="pss1" className="inp_1" type="password" maxLength={10} value={ownPss1}
                  iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                  onChange={(e) => setOwnPss1(e.target.value)} />
              </div> */}
              <div className="divpss1">
                <label id="lbl2" className="lbl" htmlFor="pss1" >Write your own password:</label>
                <Input.Password id="pss1" className={`inp_1 ${!isFrstPswdValid ? "inp-error" : ""}`} type="password" maxLength={10} value={ownPss1}
                  iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                  onChange={(e) => setOwnPss1(e.target.value)} />
                  {
                  !ownPss1 ? (<label className="lblworn"></label>) 
                  : isFrstPswdValid ? (<label className="lblworn" style={{ color: "green" }}>Correct User Password!! <FontAwesomeIcon icon={faCheck} /></label>) 
                  : (<label className="lblworn">Invalid User Password<FontAwesomeIcon icon={faXmark} /></label>)
                  }                     
              </div>              
              {/* <div className="divpss2">
                <label className="lbl" htmlFor="pss2">Confirm your password:</label>
                <Input.Password id="pss2" className="inp_1" type="password" maxLength={10} ovalue={ownPss2}
                  iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                  onChange={(e) => setOwnPss2(e.target.value)} />
              </div> */}
              <div className="divpss2">
                <label className="lbl" htmlFor="pss2">Confirm your password:</label>
                <Input.Password id="pss2" className={`inp_1 ${!isScndPswdValid ? "inp-error" : ""}`} type="password" maxLength={10} ovalue={ownPss2}
                  iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                  onChange={(e) => setOwnPss2(e.target.value)} />
                  {
                  !ownPss2 ? (<label className="lblworn"></label>) 
                  : isScndPswdValid && isPssFormValid ? (<label className="lblworn" style={{ color: "green" }}>Correct User Password!! <FontAwesomeIcon icon={faCheck} /></label>) 
                  : (<label className="lblworn">Invalid User Password<FontAwesomeIcon icon={faXmark} /></label>)
                  }                    
              </div>              
              {/* <div>
                <ul className="psshints">
                  <li>Password Hints:</li>
                  <li>Should be 10 characters length</li>
                  <li>At least one uppercase letter</li>
                  <li>At least one number</li>
                  <li>At least one special character (!_@#$%^&*)</li>
                </ul>
              </div> */}
              <div >
                {!isPssFormValid ? (<p></p>) :
                  <button type="button" className="gotologin" onClick={updtLogin}>Go to login page <FontAwesomeIcon icon={faCheckDouble} /></button >}
              </div>
            </div>
          </div>)}
      </form >

      {/* <div className="signindiv">
        <p className='signin'>Have an account?</p>
        <Link to="/signin" className="signinlnk">Sign In</Link>
      </div> */}
    </>
  )
}


export default PssForgot
