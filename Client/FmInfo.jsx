import React, { createContext, useContext, useEffect, useState } from 'react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCheckDouble, faGreaterThan } from "@fortawesome/free-solid-svg-icons";
import { faXmark } from "@fortawesome/free-solid-svg-icons";  
import 'antd/dist/reset.css';
import { Button, Alert, Spin , Table , Tag , Input, message, Avatar , Card, Row, Col , Checkbox } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { Typography } from 'antd';
import { useNavigate } from "react-router-dom";
import { UserOutlined } from "@ant-design/icons";
import './FmInfo.css'

export default function FmInfo() {
  const [selectedFamid, setSelectedFamid] = useState("");
  const [selectedFamNm, setSelectedFamNM] = useState("");
  const [onlyout, setOnlyOut] = useState(false);
  const [studInfo, setstudInfo] = useState([]);    
  const [fmDtt, setFmDtt] = useState({});    
  const CurFmNo = localStorage.getItem("curFmNo" )
  const CurFmNm = localStorage.getItem("curFmNm" )
  // const yrNo = '2025'
  const yrNo = import.meta.env.VITE_CUR_YEAR
  const { Meta } = Card;
  const Navigate = useNavigate()
  //console.log(yrNo)
  const  getFmInfo = async () =>{
    if (!CurFmNm || !CurFmNo){
      return
    }
    //console.log(CurFmNo , CurFmNm)
    try {
      const res = await fetch("http://localhost:3000/api/sp_GetFmInfo", {
      method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yrNo: yrNo,
          CurFmNo: CurFmNo,
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
        setstudInfo([]);
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
  useEffect(() => {
      getFmInfo(); 
  }, []); 

  const gotoStPayHist =(curStID, curStNmm, ygpp, ygpp_no)=>{
    console.log(curStID , curStNmm , ygpp, ygpp_no)
    localStorage.removeItem("curstid")
    localStorage.setItem("curstid", curStID)
    localStorage.removeItem("curstname")
    localStorage.setItem("curstname", curStNmm)
    localStorage.removeItem("ygp")
    localStorage.setItem("ygp", ygpp)
    localStorage.removeItem("ygpno")
    localStorage.setItem("ygpno", ygpp_no)
    
    Navigate('/stpayhist')
  }


  const gotoStFees =(curStID, curStNmm, ygpp, onlyout)=>{
    localStorage.removeItem("curstid")
    localStorage.setItem("curstid", curStID)
    localStorage.removeItem("curstname")
    localStorage.setItem("curstname", curStNmm)
    localStorage.removeItem("ygp")
    localStorage.setItem("ygp", ygpp)
    //console.log(onlyout)
    localStorage.removeItem("onlyout")
    localStorage.setItem("onlyout", onlyout ? 1 : 0); 
    
    Navigate('/stfees')
  }
  return (
    <div className="crds">
      <div className="fmm">
      <strong>Family ID: {CurFmNo} </strong>
      <strong>Family Name:  {CurFmNm}</strong>
      </div >
      <div className="crdbdy33">
      <Row gutter={[8, 8]}>
        {
          studInfo.map((stRec , index) =>(
            <Col xs={24} sm={12} md={8} lg={6} key={index}>
              <Card
                className='crdbdy'
                title={<span className='crdtitle'>{stRec.fullname}</span>}
                hoverable
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}                  //bordered
              >
              <Meta
                avatar={<Avatar size={60} icon={<UserOutlined />} />}
                title={<span className='crdtitle'>{stRec.fullname}</span>}
                description={
                  <>
                    <div className='crdinfo'>Student ID: {stRec.stid}</div>
                    <div className='crdinfo'>{stRec.schoolNm}</div>
                    <div className='crdinfo'>{stRec.ygpnm}</div>
                    <Checkbox className='chkk' checked={onlyout}  onClick ={()=>(setOnlyOut(true))}>Outstanding Only</Checkbox>
                    <Button className='crdbtn' onClick={() => gotoStFees(stRec.stid, stRec.fullname, stRec.ygpnm, onlyout ? 1 : 0)}>Show Fees</Button>
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
