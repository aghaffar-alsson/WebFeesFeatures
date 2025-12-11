import React, { useEffect, useMemo, useRef, useState } from 'react'
import './StFees.css'
import { Table, Typography, Spin, Alert, Button, message, Tooltip } from 'antd'
import { useReactToPrint } from 'react-to-print'
import { useNavigate } from 'react-router-dom';
import Checkbox from 'antd/es/checkbox/Checkbox';

export default function StFees() {
  //DECLARE GLOBAL VARIABLES
  const { Title } = Typography;
  const [loading, setLoading] = useState(false);
  const curFamilyNo = localStorage.getItem("curFmNo")
  const curFamilyName = localStorage.getItem("curFmNm")
  const curStudID = localStorage.getItem("curstid")
  const curStudName = localStorage.getItem("curstname")
  const curYgpName = localStorage.getItem("ygp")
  const onlyRem = localStorage.getItem("onlyout")
  const curEmailAddress = localStorage.getItem("curEmailAddress")

  const [stfeesmtrx, setStFeesMtrx] = useState([])
  const [selectedBnk, setSelectedBnk] = useState(0);
  const [bnks, setBnks] = useState([]);
  const [checkedRows, setCheckedRows] = useState({});
  const [locked, setLocked] = useState({});
  const [selectedSt, setSelectedSt] = useState("");
  const [famnm, setFamNm] = useState("");
  const [stID, setStID] = useState("");
  const [fullName, setFullName] = useState("");
  const [ygpNm, setYgpNm] = useState("");
  const [instName, setInstName] = useState("");
  const [instAm, setInstAm] = useState(0);
  const [stud, setStud] = useState([])
  const [bnkdet, setBnkDett] = useState([])
  const [scnm, setScNm] = useState('')
  const [scid, setScID] = useState('')
  const navigate = useNavigate();
  const hidd = false
  const [amAccno, setAmAccNo] = useState("");
  const [amAccnm, setAmAccNm] = useState("");
  const [amIban, setAmIban] = useState("");
  const [brAccno, setBrAccNo] = useState("");
  const [brAccnm, setBrAccNm] = useState("");
  const [brIban, setBrIban] = useState("");
  const [swft, setSwft] = useState("");
  const [bnknmm, setBnkNmm] = useState("");
  const [messageApi, contextHolder] = message.useMessage()
  //define global arrays for student & banks
  let globBnkDet = []
  let globStInfo = []

  const feesReff = useRef();
  //Print or Save As PDF for fees table
  const tbPrnt = useReactToPrint({
    // content: () => feesReff.current,
    contentRef: feesReff,
    documentTitle: 'Student Fees Report - ' + import.meta.env.VITE_CUR_YEAR_NAME,
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

  // const handlePrint = useReactToPrint({
  // content: () => feesReff.current,
  // documentTitle: 'Student Fees Report - 2025-2026',
  // onBeforeGetContent: () => console.log("Preparing content for print:", feesReff.current),
  // onAfterPrint: () => message.success('PDF successfully generated!'),
  // });




  //console.log(curFamilyNo, curFamilyName, curStudID, curStudName, curYgpName)

  //Collect fees matrix for the selected student through stored procedure
  const getStFeesMtrx = async () => {
    if (!curFamilyNo || !curStudID || !onlyRem) {
      return
    }
    //console.log(CurFmNo , CurFmNm)
    // console.log(onlyRem)
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/getstfees", {
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
        setScID(data.schoolId)
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

  //console.log(stfeesmtrx)

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

  //Use UseEffect to collect the data for only one time
  useEffect(() => {
    getStFeesMtrx();
  }, []);

  //Enforce payment periorities for the user
  // const handleUserSelection = (index, checked) => {
  //   setCheckedRows((prev) => {
  //     const updated = { ...prev };

  //     if (checked) {
  //       for (let i = 0; i <= index; i++) {
  //         updated[i] = true;
  //       }
  //       const newLocked = {};
  //       for (let i = 0; i <= index - 1; i++) {
  //         newLocked[i] = true;
  //       }
  //       setLocked(newLocked);
  //     } else {
  //       for (let i = index; i < Object.keys(prev).length; i++) {
  //         updated[i] = false;
  //       }
  //       setLocked({});
  //     }

  //     return updated;
  //   });
  // };

const handleUserSelection = (index, checked) => {
  setCheckedRows(prev => {
    const updated = { ...prev };
    if (checked) {
      for (let i = 0; i <= index; i++) updated[i] = true;
      const newLocked = {};
      for (let i = 0; i < index; i++) newLocked[i] = true;
      setLocked(newLocked);
    } else {
      for (let i = index; i < stfeesmtrx.length; i++) {
        updated[i] = false;
      }
      setLocked({});
    }
    return updated;
  });
};  
  // useEffect(() => {
  //   console.log("Checked rows:", checkedRows);
  // }, [checkedRows]);
  useEffect(() => {
    console.log("Checked rows:", locked);
  }, [locked]);

  //Declare COLUMNS OF THE TABLE
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
      title: 'Installment Name',
      dataIndex: 'instName',
      align: "left",
      // render: (text, record) =>
      // record.IsTotal === 1 ? <strong>{text}</strong> : text,      // render: (status) => (
      render: (text, record) =>
        // record.IsTotal === 1 ? (<strong style={{ color: "#1e3a8a" , whiteSpace: 'normal', wordBreak: 'break-word'}}>{text}</strong>) : (text),
        <strong style={{ color: "#1e3a8a" , whiteSpace: 'normal', wordBreak: 'break-word'}}>{text}</strong>,
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
    //TOTAL FEES
    {
      title: 'Total Fees',
      dataIndex: 'TotFees',
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
    //TOTAL DISC.
    {
      title: 'Total Disc.',
      dataIndex: 'TotDisc',
      align: "right",
      //render: (value2) => formatDec(value2),
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
    //TOTAL DUE
    {
      title: 'Total Due',
      dataIndex: 'TotDue',
      align: "right",
      // render: (value3) => formatDec(value3),
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
    //TOTAL PAID
    {
      title: 'Total Paid',
      dataIndex: 'TotPaid',
      align: "right",
      // render: (value4) => formatDec(value4),
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
    //REMAINING
    {
      title: 'Remaining',
      dataIndex: 'TotRem',
      align: "right",
      render: (value, record) => {
        const rmmValue = Number(value);
        const displayRmmValue = rmmValue <= 30 && record.IsTotal !== 1 ? 0 : rmmValue;
        return record.IsTotal === 1 ? (
          <strong style={{ color: "#4f46e5", fontWeight: 600 }}>
            {formatDec(displayRmmValue)}
          </strong>
        ) : (
          formatDec(displayRmmValue)
        );
      },      
      width: 40,
    },
    //ACTION: PRINT BANK FORM
    {
      title: "Action",
      key: "action",
      width: 120,
      className: "action-col",
      render: (value, record, index) => {
        // Don't show button for total row
        if (!!(record.IsTotal === 1) || !!(record.IsGTotal === 1)) { return null; }
        else {
          if ((record.TotRem === 0)) {
            return (<div className="bnkprntdiv"><p className="disprnt">Print Bank Form</p></div>)
          }
          else {
            return (
              <div className="bnkprntdiv">
                {/* <select className="bnkcmb"></select> */}
                {/* {record.TotRem >= 1000 && (<select className="bnkcmb" value={selectedBnk} id="bnkcmbID" onChange={handleBnkChange}  >
                  <option value="">-- Select Bank --</option>
                  {bnks.map((opt) => (
                    <option key={opt.BANKID} value={opt.BANKID}>
                      {opt.BANKNAME}
                    </option>
                  ))}
                </select>)} */}
                {/* {record.TotRem >= 1000 && (<p className="prntform" onClick={() => callBnkForm(record)}>Print Bank Form</p>)} */}
                {/* {record.TotRem >= 1000 && (<Checkbox className='chkInclude' disabled={locked[record.row_num]} checked={checkedRows[record.row_num]} onChange={(e) => handleUserSelection(record.row_num, e.target.checked)}>Add to Bank Form or PayFort Invoice</Checkbox>)} */}
                {record.TotRem >= 1000 && (<Tooltip title="Select this installment to include in payment"><Checkbox className='chkInclude' disabled={locked[index]} checked={checkedRows[index]} onChange={(e) => handleUserSelection(index, e.target.checked)}>Add to Bank Form or PayFort Invoice</Checkbox></Tooltip>)}
              </div>)
          }
        }
      }
    },
    hidd && {
      title: 'School ID',
      dataIndex: 'schoolId',
      align: "left",
      render: (text, record) =>
        record.IsTotal === 1 ? <strong style={{ color: "#1e3a8a", display: "block", fontWeight: 700 }}>Totals:{text}</strong> : text,      // render: (status) => (
      width: 0,
    },
  ].filter(Boolean);

  //END OF TABLE COLUMNS
  //create toyals & grand totals
  function groupWithTotals(feesdtt) {
    const grouped = {};

    // Group by s_code
    feesdtt.forEach((item) => {
      if (!grouped[item.stid]) grouped[item.stid] = [];
      grouped[item.stid].push(item);
    });

    const result = [];
    // let GTotFees = 0
    // let GTotDisc = 0
    // let GTotDue = 0
    // let GTotPaid = 0
    // let GTotRem = 0
    // Loop through each group
    Object.keys(grouped).forEach((stid) => {
      const rows = grouped[stid]; // 

      // ✅ Sum up all totals
      const totalFees = rows.reduce((sum, r) => sum + (r.TotFees || 0), 0);
      const totalDisc = rows.reduce((sum, r) => sum + (r.TotDisc || 0), 0);
      const totalDue = rows.reduce((sum, r) => sum + (r.TotDue || 0), 0);
      const totalPaid = rows.reduce((sum, r) => sum + (r.TotPaid || 0), 0);
      //const totalRem = rows.reduce((sum, r) => sum + (r.TotRem || 0), 0);
      const totalRem = rows.reduce((sum, r) => {const v = Number(r.TotRem) || 0; return v >= 10 ? sum + v : sum; }, 0);
      // ✅ Add all rows + total row
      result.push(...rows);
      result.push({
        key: `total-${stid}`,
        stid,//: `Total For St.: ${s_code}` ,
        instName: "Totals:",
        TotFees: totalFees,
        TotDisc: totalDisc,
        TotDue: totalDue,
        TotPaid: totalPaid,
        TotRem: totalRem,
        IsTotal: 1,
        IsGTotal: 0,
      });
      // //CALCULATE GRAND TOTALS
      // GTotFees+= totalFees
      // GTotDisc+= totalDisc
      // GTotDue+= totalDue
      // GTotPaid+= totalPaid
      // GTotRem+= totalRem

    });

    // result.push({
    //     key: 'GTot',
    //     //s_code,//: 'Grand Total',
    //     subject: "Grand Total:",
    //     TotFees: GTotFees,
    //     TotDisc: GTotDisc,
    //     TotDue: GTotDue,
    //     TotPaid: GTotPaid,
    //     TotRem: GTotRem,
    //     IsTotal: 0,
    //     IsGTotal:1,

    // })
    return result;
  }

  const stfeesmtrxWithTot = groupWithTotals(stfeesmtrx);

  //Get all banks
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/banks");
        const bnkdata = await res.json();
        setBnks(bnkdata);
      } catch (err) {
        console.error("Error fetching banks:", err);
      }
    };

    fetchBanks();
  }, []);

  //console.log(feesReff.current)
  //Handle change of the selected bank
  const handleBnkChange = (e) => {
    const bnkCode = e.target.value;
    const bnk_Name = e.target.options[e.target.selectedIndex].text;
    //console.log(bnk_Name)
    setSelectedBnk(bnkCode);
    setBnkNmm(bnk_Name);
    if (bnkCode) getBnkDet(bnkCode);
  };
  //Get details of the selected bank
  async function getBnkDet(bnkId) {
    if (!bnkId) {
      message.warning("Please select bank from the list");
      document.getElementById('bnkcmbID').focus()
      return;
    }
    try {
      const res = await fetch(`http://localhost:3000/api/bankdet/${bnkId}`);
      const bnkDetData = await res.json();
      //console.log(bnkDetData[0])
      if (bnkDetData && bnkDetData[0].BANKID && bnkDetData[0].BANKNAME && bnkDetData[0].AMACCNO && bnkDetData[0].AMACCNM
        && bnkDetData[0].IBANAM && bnkDetData[0].BRACCNO && bnkDetData[0].BRACCNM && bnkDetData[0].IBANBR && bnkDetData[0].SWIFTCODE) {
        setAmAccNo(bnkDetData[0].AMACCNO)
        //localStorage.setItem("amaccno",amAccno)
        setAmAccNm(bnkDetData[0].AMACCNM)
        setAmIban(bnkDetData[0].IBANAM)
        setBrAccNo(bnkDetData[0].BRACCNO)
        setBrAccNm(bnkDetData[0].BRACCNM)
        setBrIban(bnkDetData[0].IBANBR)
        setSwft(bnkDetData[0].SWIFTCODE)
      } else {
        setAmAccNo("")
        setAmAccNm("")
        setAmIban("")
        setBrAccNo("")
        setBrAccNm("")
        setBrIban("")
        setSwft("")
      }
      //console.log (bnkDetData[0].BRACCNO)
      //console.log (brAccno)
      //globBnkDet = bnkDetData
      //console.log(globBnkDet)
      //console.log(globBnkDet)
      //setBnkDett(globBnkDet)

    } catch (err) {
      console.error("Error fetching bank data:", err);
    }

  }

  const callBnkForm = () => {
    //console.log("heree")
    if(selectedTotal === 0){
      messageApi.open({
        type: 'success',
        content: 'Please select installment(s) from the fees grid',
      })
      return;      
    }
    if (!selectedBnk) {
      //message.warning("Please select bank from the list");
      //message.warning("Please select bank from the list");
      messageApi.open({
        type: 'success',
        content: 'Please select bank from the list',
      })

      document.getElementById('bnkcmbID').focus()
      return;
    }
    navigate("/bnkform", {
      state: {
        amAccno, amAccnm, amIban,
        brAccno, brAccnm, brIban,
        swft,
        curFamilyNo,
        curFamilyName,
        curStudID,
        curStudName,
        curYgpName,
        // instAm: record.TotRem,
        instAm: selectedTotal,
        instName: selectedInstallmentsString,
        selectedBnk: selectedBnk,
        bnkName: bnknmm,
        schoolId: scid
      },
    });
  };

  //handle print of the bank form
  // const handleBankForm = (famid, stid, stFullName, stFamName, stYgpName, instNm, instAm, schoolName) =>{

  //   //console.log('hereee')
  //   //console.log(selectedBnk)
  //   if (selectedBnk == undefined || selectedBnk === 0 || selectedBnk.trim() === "") {
  //     message.warning("Please select valid bank");
  //     //alert("Please select bank");
  //     document.getElementById('bnkcmbID').focus()
  //     return;
  //   }
  //   getBnkDet (selectedBnk)
  //   //getStInfo (selectedFamid, stid, instNm, instAm  )
  //   // else{
  //   //   alert('err')
  //   // }  
  //   // if (!famid || !stid || !instName || !instAm) {
  //   //   message.warning("Please select valid student and family");
  //   //   return;
  //   // }

  //   const bankLogo = `/${selectedBnk}.png`
  //   const schoolLogo = `/logo.png`
  //   // console.log(`${bankLogo}`)
  //   // console.log(`${schoolLogo}`)


  //   // console.log(stud)
  //   let trgtAccNo = ""
  //   let trgtAccNm = ""
  //   let trgtAccIBAN = ""
  //   let trgtAccSwft = ""
  //   //console.log(schoolName)
  //   //console.log(bnkdet)
  //   if (schoolName === 'BRITISH'){
  //     trgtAccNo = brAccno
  //     trgtAccNm = brAccnm
  //     trgtAccIBAN = brIban
  //   }else{
  //     trgtAccNo = amAccno
  //     trgtAccNm = amAccnm
  //     trgtAccIBAN = amIban
  //   }
  //   // console.log(brAccno)
  //   trgtAccSwft = swft
  //   // if (globBnkDet) {
  //   //   setBnkDett(globBnkDet)
  //   //   console.log(bnkdet)
  //   // }else{
  //   //   alert('empty bank det')
  //   // }

  //   // console.log(BANKNAME)
  //   // const printContents = TbReff.current.innerHTML;
  // //  getStInfo (selectedFamid, stid, instNm, instAm  )

  //   //console.log(stud)
  //   const printWindow = window.open("", "", "height=600,width=1000");
  //   printWindow.document.write(`
  //     <html>
  //       <head>
  //         <title>Fees Form for 2025-2026 - ${schoolName}</title>
  //         <style>
  //           @page {
  //             size: A4 portrait;
  //             margin: 15mm;
  //           }
  //           body {
  //             font-family: Tahoma, sans-serif;
  //             margin: 0;
  //             padding: 20px;
  //           }
  //           .logo {
  //             display: flex;
  //             justify-content: space-between;
  //             align-items: center;
  //             margin-bottom: 15px;
  //           }
  //           .logos img {
  //             height: 30px;
  //             width: 15px
  //             object-fit: contain;
  //           }
  //           .print-title {
  //             text-align: center;
  //             font-size: 16px;
  //             font-weight: bold;
  //             text-decoration: underline;
  //             margin-bottom: 30px;
  //           }
  //           h5 {margin-top: 15px; margin-bottom: 15px}
  //           .bnkdetclass {border: 1px solid black;}
  //           .bnkdetclass h5 {padding-left: 15px;}
  //           .graytxt {color: lightgrey}
  //           .evdd {color: red}
  //           </style>
  //       </head>
  //       <body>
  //         <div class="logo">
  //           <img id="schoolLogo" src="${schoolLogo}" alt="School Logo" />
  //           <img id="bankLogo" src="${bankLogo}" alt="Bank Logo" />
  //         </div>
  //         <div class="print-title">Bank Form - Academic Year: 2025-2026</div>
  //         <div class="print-title">${schoolName} SCHOOL</div>
  //         <div class="hdr">
  //           <h5 class="graytxt">|*************************Student Info.*********************************|</h5>
  //           <h5>Family Name: ${stFamName}</h5>
  //           <h5>Student ID: ${stid}</h5>
  //           <h5>Student Name: ${stFullName}</h5>
  //           <h5>Year Group: ${stYgpName}</h5>
  //           <h5>Installment Name: ${instNm}</h5>
  //           <h5 class="evdd"><u>Amount: LE ${instAm.toLocaleString("en-us")}</u></h5>
  //           <h5 class="graytxt">ONLY ${(numberToWords.toWords(instAm)).toUpperCase()} LE</h5>
  //           <hr>
  //           <h5 class="graytxt">|*************************Bank Details**********************************|</h5>
  //           <div class="bnkdetclass">
  //           <h5>Bank Name: ${bnknmm}</h5>
  //           <hr>
  //           <h5>Acc. No.: ${trgtAccNo}</h5>
  //           <hr>
  //           <h5>Acc. Name: ${trgtAccNm}</h5>
  //           <hr>
  //           <h5>IBAN: ${trgtAccIBAN}</h5>
  //           <hr>
  //           <h5>Swift: ${trgtAccSwft}</h5>
  //           </div>
  //           <div class="graytxt">
  //           <h5>|*************************END OF FORM**********************************|</h5>
  //           <h5 class="evdd">Please send the payment evidance to <strong><u>fees@alsson.com</u></strong></h5>
  //           </div>

  //         </div>
  //       </body>
  //     </html>
  //   `);

  //   printWindow.document.close();

  //   // ✅ Wait for DOM to be ready and both images to load
  //   printWindow.onload = () => {
  //     const bankImg = printWindow.document.getElementById("bankLogo");
  //     const schoolImg = printWindow.document.getElementById("schoolLogo");

  //     let loaded = 0;
  //     const total = 2;

  //     const checkLoaded = () => {
  //       loaded++;
  //       if (loaded === total) {
  //         // Both logos are ready
  //         printWindow.focus();
  //         printWindow.print();
  //       }
  //     };

  //     // Wait for both images
  //     bankImg.onload = checkLoaded;
  //     schoolImg.onload = checkLoaded;

  //     // Fallback: if images fail to load after 2 seconds, print anyway
  //     setTimeout(() => {
  //       printWindow.focus();
  //       printWindow.print();
  //     }, 2000);
  //   };
  // };

  const curDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // const selectedTotal = useMemo(() => {
  //   return stfeesmtrxWithTot.reduce((sum, row) => {
  //     // skip subtotal / total rows
  //     if (row.IsTotal === 1 || row.IsGTotal === 1) return sum;

  //     // prefer a stable unique id for lookup - your rows appear to have row_num
  //     const key = row.row_num !== undefined ? row.row_num : (row.key ?? row.stid);

  //     if (checkedRows[key]) {
  //       return sum + (Number(row.TotRem) || 0);
  //     }
  //     return sum;
  //   }, 0);
  // }, [checkedRows, stfeesmtrxWithTot]);

  // const selectedInstallments = useMemo(() => {
  // return stfeesmtrx
  //   .filter((row) => Number(row.TotRem)>0 && checkedRows[row.row_num] && !row.IsTotal && !row.IsGTotal)
  //   .map((row) => row.instName);
  // }, [checkedRows, stfeesmtrx]);

  const selectedTotal = useMemo(() => {
    return stfeesmtrxWithTot.reduce((sum, row, index) => {
      if (row.IsTotal || row.IsGTotal) return sum;
      if (checkedRows[index] && row.TotRem > 30) sum += Number(row.TotRem || 0);
      return sum;
    }, 0);
  }, [checkedRows, stfeesmtrxWithTot]);


  const selectedInstallments = useMemo(() => {
    return stfeesmtrxWithTot
      .filter((row, index) => !row.IsTotal && !row.IsGTotal && Number(row.TotRem) > 30 && checkedRows[index])
      .map(row => row.instName);
  }, [checkedRows, stfeesmtrxWithTot]);  

  const selectedInstallmentsString = selectedInstallments.join(",");

  //PREPARE THE SELECTED INSTALLMENTS TO BE PASSED TO THE CheckoutPage.jsx
//   const getSelectedInstallments = () => {
//     return stfeesmtrxWithTot
//       .filter((row, index) => checkedRows[index] && !row.IsTotal && !row.IsGTotal && Number(row.TotRem) > 30)
//       .map(row => ({
//         instCode: row.instCode,
//         instName: row.instName,
//         amount: formatDec(row.TotRem )|| 0,
//       }));
//   };

//   //PREPARE THE TOTAL FOR SELECTED INSTALLMENTS TO BE PASSED TO THE CheckoutPage.jsx  
// const getSelectedTotal = () => {
//   const total = getSelectedInstallments().reduce(
//     (sum, i) => sum + Number(i.amount || 0),
//     0
//   );
//   return total
//   //return formatDec(total);
// };

const getSelectedInstallments = () => {
  return stfeesmtrxWithTot
    .filter((row, index) => checkedRows[index] && !row.IsTotal && !row.IsGTotal && Number(row.TotRem) > 30)
    .map(row => ({
      instCode: row.instCode,
      instName: row.instName,
      amount: (row.TotRem) || 0, // keep it numeric ⚠️ no formatting here
    }));
};

const getSelectedTotal = () => {
  const total = getSelectedInstallments().reduce(
    (sum, i) => sum + (i.amount),0
    // console.log(Number(i.amount))
  );

  //return formatDec(total); // format only final result
  console.log(total)
  return total; // format only final result
};
  
  // useEffect(() => {
  //   console.log("feesReff mounted:", feesReff.current);
  // }, [stfeesmtrx]);
  return (
    <div className='cont' ref={feesReff} >
      {contextHolder}
      <p className='curdt'>Date: {curDate}</p>
      <h3 className="frmhdr" style={{ textAlign: "center" }}><u><b>{scnm}</b></u></h3>
      <h3 className="frmhdr" style={{ textAlign: "center" }}><u><b>Student Fees Report - {import.meta.env.VITE_CUR_YEAR_NAME}</b></u></h3>
      <br></br>
      <div className="yrr">
        <p>Academic Year: {import.meta.env.VITE_CUR_YEAR_NAME}</p>
      </div>
      <div className="fmhdr">
        <p>Family ID: {curFamilyNo} </p>
        <p>Family Name: {curFamilyName}</p>
      </div>
      <div className="sthdr">
        <p>Student ID: {curStudID}</p>
        <p>Student Name: {curStudName}</p>
        <p>Year Group: {curYgpName}</p>
      </div>
      {loading ? (<Spin tip="Loading student fees..." size="large" />)
        : stfeesmtrx.length > 0 ? (
          <Table
            className='tbb'
            key={(record, row_num) => row_num}
            columns={columns}
            dataSource={stfeesmtrxWithTot}
            //rowKey={record => record.row_num}
            rowKey={(record, index) => index}
            // rowKey={(record, idx) => idx}
            bordered
            pagination={false}
            size="small"
            scroll={{ x: 500 }}
            rowClassName={(record, index) => { if (record.IsTotal === 1) return 'total-row'; return index % 2 === 0 ? 'even-row' : 'odd-row'; }}
          // scroll={{ y: 500 }}         
          />)
          : (<Alert message="No fee records found" type="info" showIcon />)
      }
      <div>{loading ? (<></>) : (stfeesmtrx.length > 0 ? (<Button className="prntTb" onClick={tbPrnt}>Print / Save As PDF</Button>) : (<></>))}</div>
      {loading ? (<></>) :  (stfeesmtrx.length > 0 ? <div className='bnkdiv'><select className="bnkcmb" value={selectedBnk} id="bnkcmbID" onChange={handleBnkChange}>
        <option value="">-- Select Bank --</option>
        {bnks.map((opt) => (
          <option key={opt.BANKID} value={opt.BANKID}>
            {opt.BANKNAME}
          </option>
        ))}
      </select>
      <Button className="prntBnkk" disabled={selectedTotal === 0} onClick={() => callBnkForm()}>Print Bank Form</Button>
      </div> : (<></>))}
      
      {loading ? <></> :       
      <div className='awspay'>
      {/* <Button className="prntBnkk">Pay Through PayFort (AWS)</Button>      */}
      <Button
        className="prntBnkk"
        type="primary"
        disabled={selectedTotal === 0}
        onClick={() => {
          const installments = getSelectedInstallments();
          const total = getSelectedTotal();

          navigate("/checkoutpage", {
            state: {
              installments,
              total,
              curEmailAddress,
              stud,
              fullName,
            }
          });
        }}
      >
        Redirect to PayFort (APS)
      </Button>

      {loading ? <></> :
      (selectedTotal > 0 && (
        <div className="selected-total">
          <strong>Total Selected Amount:</strong> {formatDec(selectedTotal)} LE
        </div>
      ))}
      </div> }
      {/* {loading ? <></> :
      (selectedTotal > 0 && (
        <div className="selected-total">
          <strong>Total Selected Amount:</strong> {formatDec(selectedTotal)} LE
        </div>
      ))} */}

      {/* <div>{loading ? (<></>) : (stfeesmtrx.length > 0 ? () : (<></>))}</div> */}

      {/* <div>
      {!loading && (
      <Button
      className="prntTb"
      onClick={() => {
      // Make sure ref is ready
      if (!feesReff.current) {
      message.error("Nothing to print — content not ready.");
      console.log("feesReff.current:", feesReff.current);
      return;
      }
      tbPrnt();
      }}
      >
      Print / Save As PDF
      </Button>
      )}
      </div>       */}
    </div>
  )
}
