import React, { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, message, Tooltip, Grid } from 'antd';
import { useReactToPrint } from 'react-to-print';

import './TbPrint.css'
const { useBreakpoint } = Grid;


export default function TbPrint() {
  const screens = useBreakpoint();
  const isSmallScreen = !screens.md; const formReff = useRef();
  const navigate = useNavigate();
  const { state } = useLocation();
  const {
    curFamilyNo,
    curFamilyName,
    curStudID,
    curStudName,
    curYgpName,
    scnm,
    stfeesmtrxWithTot
  } = state;
  const [messageApi, contextHolder] = message.useMessage()
  // console.log("Received params:", state);

  const YrNmm = import.meta.env.VITE_CUR_YEAR_NAME
  const feesTbReff = useRef();
  const feesTbPrnt = useReactToPrint({
    // content: () => formReff.current,    
    contentRef: feesTbReff,
    documentTitle: 'Student Fees Report',
    // onAfterPrint: () => message.success('PDF successfully generated!'),
    onAfterPrint: () => messageApi.open({
      type: 'success',
      content: 'PDF successfully generated!',
    }),
  });
  //here to have some config before printing
  const handleBeforePrint = () => {
  const el = document.querySelector(".bnkfrmcont");

  const A4_HEIGHT_PX = 1122; // approx at 96 DPI
  const contentHeight = el.scrollHeight;

  const scale = Math.min(1, A4_HEIGHT_PX / contentHeight);

  el.style.transform = `scale(${scale})`;
};

const handleSafePrint = async () => {
    // 1. Validate data
    if (!curFamilyNo || !curFamilyName || !curStudID || !curStudName || !curYgpName) {
      messageApi.warning("Family info is still loading, please wait...");
      return;
    }

    try {
      handleBeforePrint(); // Apply scaling before print
      // 2. Small delay to ensure React finished rendering
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 3. Force next frame render (VERY IMPORTANT for PDFs)
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // 4. Print
      feesTbPrnt();

    } catch (err) {
      console.error("Print error:", err);
      messageApi.error("Failed to generate PDF");
    }
  };  
  const curDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div>
      <div className="prntArea" ref={feesTbReff}>
          <h1>TEST PRINT</h1>

          <table border="1">
              <thead>
                  <tr>
                      <th>Name</th>
                      <th>Value</th>
                  </tr>
              </thead>

              <tbody>
                  <tr>
                      <td>Ahmed</td>
                      <td>123</td>
                  </tr>

                  <tr>
                      <td>Ali</td>
                      <td>456</td>
                  </tr>
              </tbody>
          </table>
      </div>      
      {/* <Button onClick={feesTbPrnt}>Print</Button> */}
<Button onClick={() => window.print()}>
    Print
</Button>      
    </div>
  )
}
