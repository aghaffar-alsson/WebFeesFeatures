import React, { createContext, useContext, useEffect, useState } from 'react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCheckDouble, faGreaterThan } from "@fortawesome/free-solid-svg-icons";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import 'antd/dist/reset.css';
import { Button, Alert, Spin, Table, Tag, Input, message, Avatar, Card, Row, Col, Checkbox, Tooltip } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { Typography } from 'antd';
import { useNavigate } from "react-router-dom";
import { UserOutlined } from "@ant-design/icons";
import './FmInfo.css'
import { openExternal } from "./openExternal.js";
import { useExternalLink } from "./useExternalLink.js";
import { useAuth } from "./src/AuthContext.jsx";

export default function FmInfo() {
  const [selectedFamid, setSelectedFamid] = useState("");
  const [selectedFamNm, setSelectedFamNM] = useState("");
  const [onlyout, setOnlyOut] = useState(false);
  // const [studInfo, setstudInfo] = useState([]);
  const [studInfo, setstudInfo] = useState(() => {
    return JSON.parse(localStorage.getItem("studInfo") || "[]");
  });
  const [fmDtt, setFmDtt] = useState({});
  const { logout } = useAuth();
  // const CurFmNo = localStorage.getItem("loggedFamid")
  // const CurFmNm = localStorage.getItem("loggedFamNm")
  const { isAuthenticated, userData } = useAuth();
  
  const CurFmNo = userData?.famid //|| localStorage.getItem("loggedFamid");
  const CurFmNm = userData?.famnm //|| localStorage.getItem("loggedFamNm");
  const emll = userData?.emll || "" //to get the email from userData & pass it to the API for fetching family info, if not available then pass empty string
  // const yrNo = '2025'
  const yrNo = import.meta.env.VITE_CUR_YEAR
  const { Meta } = Card;
  const navigate = useNavigate()
  const REACT_PORT = import.meta.env.VITE_PORT || 3000;
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  //API base URL from environment variable
  const API_BASE = `${import.meta.env.VITE_API_URL}`;
  if (!API_BASE) {
    throw new Error("VITE_API_URL is not defined");
  }
  
  //here we use the custom hook to get the openExternal function
  const openExternal = useExternalLink();
  const sessionId = sessionStorage.getItem("sessionId");
  console.log("Session ID in FmInfo:", sessionId);
  //console.log(yrNo)
  
  //To get the family info and students info based on the family number and name stored in localStorage when the component mounts or when CurFmNo or CurFmNm changes
  const getFmInfo = async () => {
    if (!CurFmNm || !CurFmNo || !emll || CurFmNo === "undefined" || CurFmNm === "undefined" || emll === "undefined") {
      console.log(CurFmNm, CurFmNo, emll)
      console.log("Missing family info or email, cannot fetch data");
      return;
    }
    console.log(CurFmNo , CurFmNm, emll)
    try {
      // const res = await fetch("http://localhost:3000/api/sp_GetFmInfo", {
      const res = await fetch(`${API_BASE}/sp_GetFmInfo`, {
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId // Include session ID in headers for authentication
        },        
        method: "POST",
        body: JSON.stringify({
          yrNo: yrNo,
          CurFmNo: CurFmNo,
          eml: emll || "" // Include email from userData if available
        }),
      });
      const data = await res.json();
      //console.log(Array.isArray(data))
      if (Array.isArray(data)) {
        //console.log(1)
        setstudInfo(data);
      } else if (data && data.stid) {
        //console.log(2)
        setstudInfo([data]);
      } else {
        //setstudInfo([]);
        if (!data) return;        
      }
      // console.log(data)
      // console.log(studInfo)
      // if (data && data.famid && data.famnm) {
      //   setFmDtt(data)
      //   setSelectedFamid(data.famid);
      //   setSelectedFamNM(data.famnm);
      //   console.log(fmDtt)
      // } else {
      //   setSelectedFamid("");
      //   setSelectedFamNM("");
      //   setFmDtt({});
      // }
    } catch (err) {
      console.error("Error fetching family data:", err);
    }

  }
  
  // Persist studInfo to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("studInfo", JSON.stringify(studInfo));
  }, [studInfo]);
  
  //effect to fetch family and students info when CurFmNo or CurFmNm changes
  useEffect(() => {
    if (!CurFmNo || !CurFmNm) return;
    getFmInfo();
  }, [CurFmNo, CurFmNm]);

// const gotoStPayHist = (curStID, curStNmm, ygpp, ygpp_no) => {
//   console.log(curStID, curStNmm, ygpp, ygpp_no)
//   localStorage.removeItem("curstid")
//   localStorage.setItem("curstid", curStID)
//   localStorage.removeItem("curstname")
//   localStorage.setItem("curstname", curStNmm)
//   localStorage.removeItem("ygp")
//   localStorage.setItem("ygp", ygpp)
//   localStorage.removeItem("ygpno")
//   localStorage.setItem("ygpno", ygpp_no)

//   Navigate('/stpayhist')
// }
//navigate to payment history page with the current student info as state
const gotoStPayHist = (curStID, curStNmm, ygpp, ygpp_no) => {
  navigate('/stpayhist', {
    state: {
      curStID,
      curStNmm,
      ygp: ygpp,
      ygpno: ygpp_no
    }
  });
}

const handleLogout = () => {
  sessionStorage.removeItem("isAuthenticated");
  sessionStorage.removeItem("userData");

  setIsAuthenticated(false);
  setUserData(null);

  navigate("/signin");
};
// const gotoStFees = (curStID, curStNmm, ygpp, onlyout) => {
//   localStorage.removeItem("curstid")
//   localStorage.setItem("curstid", curStID)
//   localStorage.removeItem("curstname")
//   localStorage.setItem("curstname", curStNmm)
//   localStorage.removeItem("ygp")
//   localStorage.setItem("ygp", ygpp)
//   //console.log(onlyout)
//   localStorage.removeItem("onlyout")
//   localStorage.setItem("onlyout", onlyout ? 1 : 0);

//   Navigate('/stfees')
// }
const gotoStFees = (curStID, curStNmm, ygpp, onlyout, curEmailAddress) => {
  //console.log(curStID, curStNmm, ygpp, onlyout)
  console.log(userData)
  console.log("onlyout value:", onlyout);
  console.log("Navigating to StFees with:", { curStID, curStNmm, ygpp, onlyout, curEmailAddress });
  navigate("/stfees", {
    state: {
      curStID,
      curStNmm,
      ygp: ygpp,
      onlyout: onlyout ? 1 : 0,
      curEmailAddress: userData?.emll || curEmailAddress
    }
  });
};
  return (
    <div className="crds">
      <div className="fmm">
      <div className="logout" style={{display: "flex", alignItems: "flex-end", marginLeft: "auto", justifyContent: "flex-end"}}>
        <Tooltip title="Logout">
          {/* <Button type="primary"  onClick={() => {handleLogout()}}><i className="fa-solid fa-right-from-bracket"></i>Logout</Button> */}
          <Button type="primary"  onClick={() => {logout()}}><i className="fa-solid fa-right-from-bracket"></i>Logout</Button>
        </Tooltip>
      </div>
        <strong>Family ID: {CurFmNo} </strong>
        <strong>Family Name:  {CurFmNm}</strong>
      </div >
      <div className="crdbdy33">
        <Row gutter={[8, 8]}>
          {
            studInfo.map((stRec, index) => (
              <Col xs={24} sm={12} md={8} lg={6} key={index}>
                <Card
                  className='crdbdy'
                  title={<span className='crdtitle'>{stRec.fullname}</span>}
                  hoverable
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03) ease-in ease-out")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) ease-in ease-out")}
                //bordered
                >
                  <Meta
                    avatar={<Avatar size={60} icon={<UserOutlined />} />}
                    title={<span className='crdtitle'>{stRec.fullname}</span>}
                    description={
                      <>
                        <div className='crdinfo'>Student App. ID: {stRec.APPID}</div>
                        <div className='crdinfo'>Student Fees ID: {stRec.stid}</div>
                        <div className='crdinfo'>{stRec.schoolNm}</div>
                        <div className='crdinfo'>{stRec.ygpnm}</div>
                        <Checkbox className='chkk' checked={onlyout} onChange={(e) => setOnlyOut(e.target.checked)}>Outstanding Only</Checkbox>
                        <Button className='crdbtn' onClick={() => gotoStFees(stRec.stid, stRec.fullname, stRec.ygpnm, onlyout ? 1 : 0, userData?.eml || "")}>Show Fees</Button>
                        {/* <Button className='crdbtn'>Print Bank Form</Button> */}
                        <Button className='crdbtn' onClick={() => gotoStPayHist(stRec.stid, stRec.fullname, stRec.ygpnm, stRec.ygpno)}>Payments History</Button>
                      </>
                    }
                  />
                  {/* <p><b>School: </b> {stRec.schoolNm}</p>
              <p><b>Student ID: </b> {stRec.stid}</p>
              <p><b>Year Group: </b> {stRec.ygpnm}</p> */}
                </Card>
              </Col>
            )

            )
          }

        </Row>
      </div>
    </div>
  )
}
