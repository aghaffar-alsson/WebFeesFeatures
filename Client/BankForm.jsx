import React, { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import './BankForm.css'
import numberToWords from "number-to-words";
import { useReactToPrint } from 'react-to-print';
import { Button, message } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { faHouse } from '@fortawesome/free-solid-svg-icons'
import { faReceipt } from '@fortawesome/free-solid-svg-icons'


export default function BankForm() {
  const formReff = useRef();
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
  const bankLogo = `/${selectedBnk}.png`
  const schoolLogo = `/logo.png`
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
        {/* <p>BankFORM</p> */}
        {/* <p className='frmtitle'>Fees Form for 2025-2026 - {schoolName}</p> */}
        <div className="divtitle">
          <p className="frmtitle">{schoolName}</p>
          <p className="frmtitle">Bank Form - Academic Year: {YrNmm}</p>
        </div>
        <div className="hdr">
          <p className='curdt'>Date: {curDate}</p>
          <h5 id='stinfotxt' className="graytxt"></h5>
          <h5 >Family Name: {curFamilyName}</h5>
          <h5 >Student ID: {curStudID}</h5>
          <h5 >Student Name: {curStudName}</h5>
          <h5 >Year Group: {curYgpName}</h5>
          <h5 >Installment Name: {instName}</h5>
          <h5 id='amt' className="evdd"><u>Amount: LE {instAm.toLocaleString("en-us")}</u></h5>
          <h5 >ONLY {(numberToWords.toWords(instAm)).toUpperCase()} LE</h5>
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
            <h5 id='evdd1' className="evdd">Please send the payment evidance to <strong><u>fees@alsson.com</u></strong></h5>
            <h5 id='endforminfo'></h5>
          </div>
        </div>
        <Button className="frmPrnt" onClick={frmPrnt}>Print/Save As PDF<i className="prntico" class="fa fa-print"></i></Button>
      </div>
      <div>
      </div>
    </div>
  )
}

