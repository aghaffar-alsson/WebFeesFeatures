import React from 'react'
import React, { useEffect, useRef, useState } from 'react'
import './FeesHist.css'
import { useLocation, useNavigate } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import { Table, Typography, Spin, Alert, Button, message } from 'antd'


export default function FeesHist() {
  const [loading, setLoading] = useState(false);
  const curFamilyNo = localStorage.getItem("curFmNo")
  const curFamilyName = localStorage.getItem("curFmNm")
  const curStudID = localStorage.getItem("curstid")
  const curStudName = localStorage.getItem("curstname")
  const curYgpName = localStorage.getItem("ygp")
  const [payhistData, setPayHistData] = useState([]);
  const REACT_PORT = import.meta.env.VITE_PORT || 3000;
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const API_BASE = `${import.meta.env.VITE_API_URL}`;
  const getStFeesHistory = async () => {
    if (!curFamilyNo || !curStudID) {
      return
    }
    //console.log(CurFmNo , CurFmNm)
    setLoading(true);
    try {
      // const res = await fetch("http://localhost:3000/api/getstfees", {
      const res = await fetch(`${API_BASE}/getstfees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          famid: curFamilyNo,
          curstid: curStudID,
          onlyRem: onlyRem,
        }),
      });
      const data = await res.json();
      //console.log(Array.isArray(data))
      if (Array.isArray(data)) {
        //console.log(1)
        setStFeesMtrx(data);
        setScNm(data.schoolId === 1 ? 'American School' : 'British School')
      } else if (data && data.stid) {
        //console.log(2)
        setStFeesMtrx([data]);
      } else {
        setStFeesMtrx([]);
      }
    } catch (err) {
      console.error("Error fetching family data:", err);
    } finally {
      setLoading(false);
    }

  }
  return (
    <div>

    </div>
  )
}
