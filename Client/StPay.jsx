import React, { useEffect, useRef, useState } from 'react'
import './StPay.css'
import { Table, Typography, Spin, Alert, Button, message } from 'antd'
import { useReactToPrint } from 'react-to-print'
import { useNavigate } from 'react-router-dom';

export default function StPay() {
  const { Title } = Typography;
  const [loading, setLoading] = useState(false);
  const curFamilyNo = localStorage.getItem("curFmNo")
  const curFamilyName = localStorage.getItem("curFmNm")
  const curStudID = localStorage.getItem("curstid")
  const curStudName = localStorage.getItem("curstname")
  const curYgpName = localStorage.getItem("ygp")
  const curYgpNo = localStorage.getItem("ygpno")

  const [stpaymtrx, setstpaymtrx] = useState([])

  const payReff = useRef();
  const payTbPrnt = useReactToPrint({
    // content: () => payReff.current,
    contentRef: payReff,
    documentTitle: 'Student Payment History Report - ' + import.meta.env.VITE_CUR_YEAR_NAME,
    onBeforeGetContent: () =>
      new Promise((resolve) => {
        setTimeout(resolve, 500);
      }),
    //onAfterPrint: () => message.success('PDF successfully generated!'),
    onAfterPrint: () => messageApi.open({
      type: 'success',
      content: 'PDF successfully generated!',
    }),
  });


  // const [selectedSt, setSelectedSt] = useState("");
  const [famno, setFamNo] = useState("");
  const [famnm, setFamNm] = useState("");
  const [stID, setStID] = useState("");
  const [fullName, setFullName] = useState("");
  const [ygpNm, setYgpNm] = useState("");
  const [stud, setStud] = useState([])
  const [scnm, setScNm] = useState('')
  const navigate = useNavigate();
  const hidd = false
  const REACT_PORT = import.meta.env.VITE_PORT || 3000;
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const API_BASE = `${import.meta.env.VITE_API_URL}`;


  const [messageApi, contextHolder] = message.useMessage()
  //console.log(curFamilyNo, curFamilyName, curStudID, curStudName, curYgpName)


  const getstpaymtrx = async () => {
    if (!curFamilyNo || !curStudID || !curYgpNo) {
      return
    }
    console.log(curFamilyNo, curStudID, curYgpNo)
    // console.log(onlyRem)
    setLoading(true);
    try {
      // const res = await fetch("http://localhost:3000/api/getstpayhist", {
      const res = await fetch(`${API_BASE}/getstpayhist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          famid: curFamilyNo,
          curstid: curStudID,
          ygpno: curYgpNo,
        }),
      });
      const data = await res.json();
      //console.log(Array.isArray(data))
      if (Array.isArray(data)) {
        //console.log(1)
        setstpaymtrx(data);
        setScNm(data[0].schoolname)
        console.log(scnm)
      } else if (data && data.stid) {
        //console.log(2)
        setstpaymtrx([data]);
      } else {
        setstpaymtrx([]);
      }
    } catch (err) {
      console.error("Error fetching family data:", err);
    } finally {
      setLoading(false);
    }

  }

  //console.log(stpaymtrx)

  //format dates dd/mm/yyyy
  function formatDtt(dtt) {
    if (!dtt) return "-";
    const dt = new Date(dtt);
    const dy = String(dt.getDate()).padStart(2, "0");
    const mnth = String(dt.getMonth() + 1).padStart(2, "0");
    const yrr = dt.getFullYear();
    return `${dy}/${mnth}/${yrr}`;
  }

  //format decimals with 2 places
  function formatDec(vll) {
    if (vll === null || vll === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(vll);
  }

  useEffect(() => {
    getstpaymtrx();
  }, []);
  //COLUMNS OF THE TABLE
  const columns = [
    //ROW NUMBER
    {
      title: '#',
      dataIndex: 'row_num',
      align: "left",
      render: (text, record) =>
        record.IsTotal === 1 ? <strong>{text}</strong> : text,      // render: (status) => (
      width: 10,
    },
    //INSTALLMENT
    {
      title: 'St Name',
      dataIndex: 'instName',
      align: "left",
      // render: (text, record) =>
      // record.IsTotal === 1 ? <strong>{text}</strong> : text,      // render: (status) => (
      render: (text, record) =>
        record.IsTotal === 1 ? (<strong style={{ color: "#1e3a8a" }}>{text}</strong>) : (text),
      width: 45,
    },
    //DUE DATE
    {
      title: 'Due Date',
      dataIndex: 'duedt',
      align: "left",
      width: 25,
      render: (date) => formatDtt(date),
    },
    //DEADLINE DATE
    {
      title: 'Deadline Date',
      dataIndex: 'deadlinedt',
      align: "left",
      width: 45,
      render: (date) => formatDtt(date),
    },
    //PAYMENT ID
    {
      title: 'Serial',
      dataIndex: 'paymentid',
      align: "left",
      render: (text, record) =>
        record.IsTotal === 1 ? <strong>{text}</strong> : text,      // render: (status) => (
      width: 10,
    },
    //PAYMENT DATE
    {
      title: 'Pay. Date',
      dataIndex: 'paydate',
      align: "left",
      width: 45,
      render: (date) => formatDtt(date),
    },
    //TOTAL PAID
    {
      title: 'Total Paid',
      dataIndex: 'totpaid',
      align: "right",
      //render: (value1) => formatDec(value1),
      render: (value, record) =>
        record.IsTotal === 1 ? (
          <strong style={{ color: "#4f46e5", fontWeight: 600 }}>
            {formatDec(value)}
          </strong>
        ) : (
          formatDec(value)
        ),
      width: 40,
    },
    //PAYMENT METHOD
    {
      title: 'Pay. Method',
      dataIndex: 'paymethod',
      align: "left",
      render: (text, record) =>
        record.IsTotal === 1 ? <strong>{text}</strong> : text,      // render: (status) => (
      width: 10,
    },
    //BANK NAME
    hidd && {
      title: 'Bank Name',
      dataIndex: 'bankname',
      align: "left",
      render: (text, record) =>
        record.IsTotal === 1 ? <strong>{text}</strong> : text,      // render: (status) => (
      width: 10,
    },
    //NOTES
    hidd && {
      title: 'Notes',
      dataIndex: 'notes',
      align: "left",
      render: (text, record) =>
        record.IsTotal === 1 ? <strong>{text}</strong> : text,      // render: (status) => (
      width: 10,
    },
    //PERSON WHO PAID
    hidd && {
      title: 'Paid By',
      dataIndex: 'payername',
      className: 'wrapp',
      align: "left",
      render: (text, record) =>
        record.IsTotal === 1 ? <strong>{text}</strong> : text,      // render: (status) => (
      width: 10,
    },
  ].filter(Boolean);

  //END OF TABLE COLUMNS
  //create toyals & grand totals
  function groupWithTotals(payhistdtt) {
    const grouped = {};

    // Group by s_code
    payhistdtt.forEach((item) => {
      if (!grouped[item.stid]) grouped[item.stid] = [];
      grouped[item.stid].push(item);
    });

    const result = [];

    // Loop through each group
    Object.keys(grouped).forEach((stid) => {
      const rows = grouped[stid]; // 

      // ✅ Sum up all totals
      const totalPaid = rows.reduce((sum, r) => sum + (r.totpaid || 0), 0);

      // ✅ Add all rows + total row
      result.push(...rows);
      result.push({
        key: `total-${stid}`,
        stid,//: `Total For St.: ${s_code}` ,
        instName: "Totals:",
        totpaid: totalPaid,
        IsTotal: 1,
        IsGTotal: 0,
      });

    });
    return result;
  }

  const stpaymtrxWithTot = groupWithTotals(stpaymtrx);
  const curDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className='paycont' ref={payReff} >
      {contextHolder}
      <p className='paycurdt'>Date: {curDate}</p>
      <h3 className='hdrr' style={{ textAlign: "center" }}><u><b>{scnm} School</b></u></h3>
      <h3 className='hdrr' style={{ textAlign: "center" }}><u><b>Student Payment History Report - {import.meta.env.VITE_CUR_YEAR_NAME}</b></u></h3>
      <br></br>
      <div className="payyrr">
        <p>Academic Year: {import.meta.env.VITE_CUR_YEAR_NAME}</p>
      </div>
      <div className="payfmhdr">
        <p>Family ID: {curFamilyNo} </p>
        <p>Family Name: {curFamilyName}</p>
      </div>
      <div className="paysthdr">
        <p>Student ID: {curStudID}</p>
        <p>Student Name: {curStudName}</p>
        <p>Year Group: {curYgpName}</p>
      </div>
      {loading ? (<Spin tip="Loading history..." size="large" />)
        : stpaymtrx.length > 0 ? (
          <Table
            className='paytbb'
            key={(record, row_num) => row_num}
            columns={columns}
            dataSource={stpaymtrxWithTot}
            rowKey={record => record.row_num}
            // rowKey={(record, idx) => idx}
            bordered
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}

            rowClassName={(record, index) => { if (record.IsTotal === 1) return 'paytotal-row'; return index % 2 === 0 ? 'payeven-row' : 'payodd-row'; }}
          // scroll={{ y: 500 }}         
          />)
          : (<Alert message="No fee records found" type="info" showIcon />)
      }
      <div>{loading ? (<p></p>) : (stpaymtrx.length > 0 ? (<Button id='btnn' className="payprntTb" onClick={payTbPrnt}>Print / Save As PDF <i class="fa fa-print"></i></Button>) : (<></>))}</div>
    </div>
  )
}
