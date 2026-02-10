import React, { useEffect, useRef, useState } from 'react'
import './SignIn.css'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCheckDouble, faGreaterThan } from "@fortawesome/free-solid-svg-icons";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import 'antd/dist/reset.css';
import { Button, Alert, Spin, Table, Tag, Input } from "antd";
import { message } from 'antd';
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
  const [message, setMessage] = useState("");
  const [selectedFamid, setSelectedFamid] = useState("");
  const [selectedFamNm, setSelectedFamNM] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [mobb, setMobb] = useState("");
  const [regEmll, setRegEmll] = useState("");
  const [fmEml, setFmEml] = useState("");
  const [regMob, setRegMob] = useState("");
  const [fmMob, setFmMob] = useState("");
  const [errors, setErrors] = useState({ email: "", mobile: "" });
  const [vll, setVll] = useState('');
  const [vllerr, setVllErr] = useState('');
  const [fmDtt, setFmDtt] = useState({});
  const [fmno, setFmNo] = useState(0);
  const [fmnmm, setFmNmm] = useState("");
  const [pss, setPss] = useState('')
  const [fmpss, setFmPss] = useState('')
  const navigate = useNavigate()
  const emlRef = useRef(null);
  const mobRef = useRef(null);
  const YrNmm = import.meta.env.VITE_CUR_YEAR
  const REACT_PORT = import.meta.env.VITE_PORT || 3000;
  const API_URL = import.meta.env.VITE_API_URL || `http://localhost:${REACT_PORT}/api`;
  // console.log(API_URL)
  // console.log(YrNmm)

  //To check the family login using mobile number
  useEffect(() => {
    const handleMobileBlur = async () => {
      if (!regMob) return; // don’t run if empty
      if (!MobRegExp.test(regMob)) {
        setErrors((prev) => ({ ...prev, mobile: "Invalid Mobile Number" }));
        setFmMob(""); // clear previous value
        return;
      }
      console.log(regMob)
      console.log(YrNmm)

      try {
        setErrors((prev) => ({ ...prev, mobile: "" }));
        //const res = await fetch("http://localhost:3000/api/chkLoginByMob", {
        const res = await fetch(`${API_URL}/chkLoginByMob`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            yr: YrNmm,
            mobb: String(regMob).trim(),
          }),
        });
        const data = await res.json();
        // console.log(data);

        if (data && data.famid && data.famnm) {
          setFmMob(data.famid);
          //console.log(fmMob + " " + data.famid + " " + data.famnm);
          setFmDtt(data)
          setErrors((prev) => ({ ...prev, mobile: "" }));
        } else {
          setFmMob("");
          setErrors((prev) => ({ ...prev, mobile: "Unregistered Mobile Number" }));
        }
      } catch (err) {
        console.error("Error fetching family data:", err);
        setErrors((prev) => ({ ...prev, mobile: "Server error" }));
      }
    };
    handleMobileBlur();
  }, [regMob]);


  // To check the family login using email address
  useEffect(() => {
    const handleEmailBlur = async () => {
      if (!regEmll) return; // don’t run if empty
      if (!EmlRegExp.test(regEmll)) {
        setErrors((prev) => ({ ...prev, email: "Invalid Email Address" }));
        setFmEml(""); // clear previous valid email
        return;
      }

      try {
        setErrors((prev) => ({ ...prev, email: "" }));
        //const res = await fetch("http://localhost:3000/api/chkLoginByEml", {
        const res = await fetch(`${API_URL}/chkLoginByEml`, {
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
          setErrors((prev) => ({ ...prev, email: "Unregistered Email Address" }));
        }
      } catch (err) {
        console.error("Error fetching family data:", err);
        setErrors((prev) => ({ ...prev, email: "Server error" }));
      }
    };

    handleEmailBlur();
  }, [regEmll]); //  

  // To check the family login using password
  //useEffect(() => {
  const pswdExst = async () => {
    if (!pss) return; // don’t run if empty
    if (!pswdRegExp.test(pss)) {
      setFmPss(""); // clear previous valid email
      return;
    }
    // console.log(pss)
    try {
      //const res = await fetch("http://localhost:3000/api/chkLoginByPswd", {
      const res = await fetch(`${API_URL}/chkLoginByPswd`, {
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
        setFmNmm(data.famnm)
        setFmNo(data.famid)
        console.log(fmno, fmnmm)
        // console.log(fmpss)

        //console.log( data.famid, data.famnm);
      } else {
        setFmPss("");
      }
    } catch (err) {
      console.error("Error fetching family data:", err);
    }
  };

  //handleEmailBlur();
  //}, [pss]); //  


  // To check the family login using email address & mobile number
  //  useEffect(() => {
  const chkLogin = async () => {
    const loginData = {
      yr: YrNmm,
      emll: regEmll,
      mobb: regMob,

    };
    //console.log(loginData);

    try {
      //const res = await fetch("http://localhost:3000/api/chkLogin", {
      const res = await fetch(`${API_URL}/chkLogin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yr: YrNmm,
          emll: String(regEmll).trim(),
          mobb: String(regMob).trim(),
        }),
      });

      const data = await res.json();
      // console.log(data);

      if (data && data.famid && data.famnm) {
        setFmDtt(data);
        localStorage.setItem("curFmNo", data.famid)
        localStorage.setItem("curFmNm", data.famnm)
      } else {
        setFmDtt("");
      }
    } catch (err) {
      console.error("Error fetching family data:", err);
    }
    localStorage.setItem("curEmailAddress",regEmll)
    navigate('/fminfo')
  };

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


  // console.log(fmEml + ' '+ fmMob)
  const isFormValid = !errors.email && !errors.mobile &&
    regEmll && regMob && fmEml && fmMob &&
    pswdRegExp.test(pss) && pss != '' && fmpss != undefined && pss != undefined && fmpss === pss
  String(pss).trim().toLowerCase() === String(fmpss).trim().toLowerCase();

  return (
    <div>
      <form className="allDiv" onSubmit={(e) => HandleSubmit(e, selectedFamid)}>
        {/* FORM TITLE */}
        <div className="frmtitle">
          <h3>Sign In to Parents' Fees Portal</h3>
        </div>
        {/* Mobile */}
        <div className="mobb">
          <input type="tel" id="regmobno" maxLength={11} className="inp" placeholder="Write Registered Mobile Number"
            ref={mobRef} value={regMob} onChange={(e) => setRegMob(e.target.value)} />
          {regMob === undefined || regMob === '' || !fmMob ? (<label className="lblworn">Unregistered or invalid mobile number</label>) :
            (errors.mobile ? (
              <label className="lblworn" style={{ color: "red" }}>{errors.mobile}<FontAwesomeIcon icon={faXmark} /></label>) :
              (<label className="lblworn" style={{ color: "green" }}>Correct Mobile Number!!<FontAwesomeIcon icon={faCheck} /></label>))
          }
        </div>
        {/* Email */}
        <div className="emll">
          <input
            type="email" id="regEmll" className="inp"
            ref={emlRef} placeholder="Write Registered Email Address" value={regEmll}
            onChange={(e) => setRegEmll(e.target.value)} required
          />
          {regEmll === undefined || regEmll === '' || !fmEml ? (<label className="lblworn">Unregistered or invalid email address</label>) :
            (errors.email ? (<label className="lblworn" style={{ color: "red" }}>{errors.email}<FontAwesomeIcon icon={faXmark} /></label>) :
              (<label className="lblworn" style={{ color: "green", display: "flow" }}>Correct Email Address!!<FontAwesomeIcon icon={faCheck} /></label>))
          }
        </div>

        <div className="divpss11">
          {/* <label id="lbl2" className="lbl" htmlFor="pss1" >Write own password:</label>             */}
          <Input.Password id="pss1" placeholder='password' className="inp_1" type="password" maxLength={10} value={pss}
            iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
            onChange={(e) => setPss(e.target.value)} onKeyUp={pswdExst} />
        </div>
        {/* Submit */}


        <div className="sbmtt">
          {isFormValid ? (<button className="enbtn" type="button" tabIndex="9" id="btnSubmit" onClick={chkLogin} >Submit<FontAwesomeIcon icon={faCheckDouble} /></button>) :
            (<button className="disbtn" type="button" tabIndex="9" id="btnSubmit" disabled>Submit</button>)}
        </div>
        {!isFormValid ? (<p></p>) :
          (<div ><strong className="fminfo">Family ID:{fmDtt.famid} - Family Name:{fmDtt.famnm} </strong></div>)}
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

