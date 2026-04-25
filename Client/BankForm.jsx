import React, { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import './BankForm.css'
import numberToWords from "number-to-words";
import { useReactToPrint } from 'react-to-print';
import { Button, message, Tooltip, Grid } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { faHouse } from '@fortawesome/free-solid-svg-icons'
import { faReceipt } from '@fortawesome/free-solid-svg-icons'
const { useBreakpoint } = Grid;

export default function BankForm() {
  const screens = useBreakpoint();
  const isSmallScreen = !screens.md; const formReff = useRef();
  const navigate = useNavigate();
  const { state } = useLocation();
  const {
    amAccno, amAccnm, amIban,
    brAccno, brAccnm, brIban,
    swft,
    curFamilyNo,
    curFamilyName,
    curStudID,
    curStudName,
    curYgpName,
    instAm,
    instName,
    selectedBnk,
    bnkName,
    schoolId
  } = state || {};
  const [messageApi, contextHolder] = message.useMessage()
  // console.log("Received params:", state);

  const YrNmm = import.meta.env.VITE_CUR_YEAR_NAME
  // const bankLogo = `./assets/${selectedBnk}.png`
  const bankLogo = './src/assets/' + selectedBnk + '.png'
  const schoolLogo = './src/assets/logo.png'
  const frmPrnt = useReactToPrint({
    // content: () => formReff.current,    
    contentRef: formReff,
    documentTitle: 'Fees Form - ' + YrNmm,
    // onAfterPrint: () => message.success('PDF successfully generated!'),
    onAfterPrint: () => messageApi.open({
      type: 'success',
      content: 'PDF successfully generated!',
    }),
  });
  // console.log(stud)
  let trgtAccNo = ""
  let trgtAccNm = ""
  let trgtAccIBAN = ""
  let trgtAccSwft = ""
  let schoolName = ""
  //console.log(schoolName)
  //console.log(bnkdet)
  if (schoolId === 2) {
    trgtAccNo = brAccno
    trgtAccNm = brAccnm
    trgtAccIBAN = brIban
    schoolName = "British School"
  } else {
    trgtAccNo = amAccno
    trgtAccNm = amAccnm
    trgtAccIBAN = amIban
    schoolName = "American School"
  }
  // console.log(brAccno)
  trgtAccSwft = swft
  //console.log(trgtAccIBAN, trgtAccNm, trgtAccNo, trgtAccSwft)
  const curDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  // const handlePrint = async () => {
  //   try {
  //     if (!bnkName || !trgtAccNo || !trgtAccNm || !trgtAccIBAN || !trgtAccSwft) {
  //       return messageApi.warning("Bank info is still loading, please wait.");
  //     }

  //     const payload = {
  //       familyId: curFamilyNo,
  //       familyName: curFamilyName,
  //       studentId: curStudID,
  //       studentName: curStudName,
  //       yearGroup: curYgpName,
  //       academicYear: YrNmm,
  //       installmentName: instName,
  //       amount: instAm,
  //       bankName: bnkName
  //     };

  //     console.log("Logging bank form print:", payload);

  //     await axios.post(`${API_BASE}/log-bankform-print`, payload);

  //     frmPrnt();

  //   } catch (err) {
  //     console.error(err);
  //     messageApi.error("Failed to log print action");
  //     frmPrnt(); // still allow print
  //   }
  // };  
  // if (!AmAccNo ) {
  //   return;
  // }
  //console.log(AmAccNo , AmAccNm , AmIban, BrAccNo , BrAccNm, BrIban, Swft, curStudID, curStudName, curFamilyNo , curFamilyName, instAm, instName)
  return (
    <div style={{ height: "1200px" }}>
      {contextHolder}
      <div className='bnkfrmcont' ref={formReff}>
        <div className="logo">
          <img id="schoolLogo" src={schoolLogo} alt="School Logo" />
          <img id="bankLogo" src={bankLogo} alt="Bank Logo" />
        </div>
        {isSmallScreen ? (
          <Tooltip title="Back to Home">
            <Button
              className="prntTb"
              style={{ width: "40px", height: "40px", paddingTop: "8px" }}
              key="home"
              type="primary"
              shape="circle"
              icon={<FontAwesomeIcon icon={faHouse} />}
              href="/fminfo"
            />
          </Tooltip>
        ) : (
          <Button
            className="prntTb"
            style={{ width: "15%", height: "5vh" }}
            key="home"
            type="primary"
            shape="default"
            icon={<FontAwesomeIcon icon={faHouse} />}
            href="/fminfo"
          >
            Back to Home
          </Button>
        )}

        <p className='curdt'>Date: {curDate}</p>
        {/* <p>BankFORM</p> */}
        {/* <p className='frmtitle'>Fees Form for 2025-2026 - {schoolName}</p> */}
        <div className="divtitle">
          <p className="frmtitle">{schoolName}</p>
          <p className="frmtitle">Bank Form - Academic Year: {YrNmm}</p>
        </div>
        <div className="hdr">
          <h5 id='stinfotxt' className="graytxt"></h5>
          <h5 >Family Name: {curFamilyName}</h5>
          <h5 >Student ID: {curStudID}</h5>
          <h5 >Student Name: {curStudName}</h5>
          <h5 >Year Group: {curYgpName}</h5>
          <h5 >Installment Name: {instName}</h5>
          <h5 id='amt' className="evdd"><u>Amount: EGP {instAm.toLocaleString("en-us")}</u></h5>
          <h5 >ONLY {(numberToWords.toWords(instAm)).toUpperCase()} EGP</h5>
          <hr></hr>
          <h5 id='bnkinfotxt' className="graytxt"></h5>
          <div className="bnkdetclass">
            <h5>Bank Name: {bnkName}</h5>
            <hr></hr>
            <h5>Acc. No.: {trgtAccNo}</h5>
            <hr></hr>
            <h5>Acc. Name: {trgtAccNm}</h5>
            <hr></hr>
            <h5>IBAN: {trgtAccIBAN}</h5>
            <hr></hr>
            <h5>Swift: {trgtAccSwft}</h5>
          </div>
          <div className="graytxt">
            <hr></hr>
            <h5 id='evdd1' className="evdd">Please send the payment receipt to <strong><u>fees@alsson.com</u></strong></h5>
            <h5 id='endforminfo'></h5>
          </div>
        </div>
        <div className="bnkfunc">
          <Button className="frmPrnt" onClick={() => { if (bnkName && trgtAccNo && trgtAccNm && trgtAccIBAN && trgtAccSwft) { frmPrnt(); } else { messageApi.warning("Bank info is still loading, please wait a moment."); } }}>Print/Save As PDF <i className="fa fa-print"></i></Button>
          {/* <Button className="frmPrnt" onClick={handlePrint}>Print/Save As PDF <i className="fa fa-print"></i></Button> */}
        {isSmallScreen ? (
          <Tooltip title="Back to Home">
            <Button
              className="prntTb"
              style={{ width: "40px", height: "40px", paddingTop: "8px" }}
              key="home"
              type="primary"
              shape="circle"
              icon={<FontAwesomeIcon icon={faHouse} />}
              href="/fminfo"
            />
          </Tooltip>
        ) : (
          <Button
            className="prntTb"
            style={{ width: "15%", height: "5vh" }}
            key="home"
            type="primary"
            shape="default"
            icon={<FontAwesomeIcon icon={faHouse} />}
            href="/fminfo"
          >
            Back to Home
          </Button>
        )}
        </div>
        {/* <Button className="frmPrnt" onClick={frmPrnt}>Print/Save As PDF<i className="prntico" class="fa fa-print"></i></Button> */}
      </div>
      <div>
      </div>
    </div>
  )
}

