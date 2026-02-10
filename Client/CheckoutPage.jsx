import { Button } from "@mui/material";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import LockIcon from "@mui/icons-material/Lock";

import './CheckoutPage.css'
import alsimgg from '../src/assets/newgiza-logo.jpg'
import { Table } from "antd";
import { useLocation } from "react-router-dom";


 
export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  // const { state } = useLocation();
  // console.log("CheckoutPage state:", state);  
  // if (!state) {
  //   return <p>No checkout data available.</p>;
  // }  
  // const {
  // paymentItems : initialPaymentItems  = [],
  // installments = [],
  // total = 0,
  // curEmailAddress,
  // curStudID,
  // curStudName,
  // curYgpName,
  // curFamilyNo,
  // curFamilyName,
  // schoolNoo,
  // schoolNmm,
  // fullName
  // } = state;
  const { state } = useLocation();
  const stored = sessionStorage.getItem("checkoutData");
  const checkoutData = state || (stored ? JSON.parse(stored) : null);
  if (!checkoutData) {
    return <p>No checkout data available.</p>;
  }
  const {
    paymentItems: initialPaymentItems = [],
    installments = [],
    total = 0,
    curEmailAddress,
    curStudID,
    curStudName,
    curYgpName,
    curFamilyNo,
    curFamilyName,
    schoolNoo,
    schoolNmm,
    fullName
  } = checkoutData;

  const [paymentItems, setPaymentItems] = useState(initialPaymentItems);
  console.log("Received:", paymentItems, installments, total, curEmailAddress, curStudID, curStudName, curYgpName, curFamilyNo, curFamilyName, schoolNoo, schoolNmm, fullName);
  console.log("Received:", initialPaymentItems);
  const INTEREST_RATE = 0.0075; // 0.75%
  // Calculate interest value
  var interestAmount = Number(total) * INTEREST_RATE;
// const email = "aghaffar@alsson.com";

const columns = [
  {
    title: "Item",
    align: "right",
    dataIndex: "name",
  },
  {
    title: "Amount (EGP)",
    dataIndex: "amount",
    align: "right",
    render: (val) => formatDec(val),
  },
];


//format decimals with 2 places

function formatDec(vll) {
  if (vll === null || vll === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(vll);
}

function ApsMerchantPage({ cartItems, email, paymentItems }) {
  const [loading, setLoading] = useState(false);
  const handlePay = async () => {
  try {
      setLoading(true);
      const totalAmount = cartItems.reduce((a, v) => a + Number(v.amount),0);    
      const roundedTotal = Math.floor(totalAmount);    
      const amount = roundedTotal ;
      console.log("Total Amount for Payfort:", amount);
      const currency = "EGP";
      const schoolId = localStorage.getItem("schoolNoo") || "1";
      console.log(schoolId);
      console.log(paymentItems);
      // Call backend to get Payfort payload
      const res = await axios.post(
        "https://my-payfort-backend.onrender.com/createFormPayLoad",
        { email, amount, currency, schoolId , paymentItems }
      );

      const payfortData = res.data; // <-- directly
      // Debug log
      console.log("Payfort payload:", payfortData);
      // Create temporary form
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://sbcheckout.payfort.com/FortAPI/paymentPage";

      // Add hidden inputs
      Object.keys(payfortData).forEach((key) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(payfortData[key] || "");
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Payment Error:", err);
      alert("Failed to initiate payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payfortpay">
      {/* <Button
        // style={{ marginTop: "10px", marginBottom: "15px" }}
        variant="contained"
        color="primary"
        onClick={handlePay}
        disabled={loading}
      >
        {loading ? "Redirecting..." : "Pay through PayFort (APS)"}
      </Button> */}
      <Button
        className="payfort-btn"
        variant="contained"
        onClick={handlePay}
        disabled={loading}
        startIcon={<i className="fas fa-lock"></i>}
      >
        {loading ? "Redirecting..." : "SECURE PAYMENT WITH PAYFORT (APS)"}
      </Button>
      <p className="empty">Chekout Page</p>
    </div>
  );
}

// const handleCheckoutClick = async () => {
//   console.log("Checkout button clicked");
//   try {
//     setLoading(true);

//     await handleLogPayment();   // 1️⃣ log first
//     //await handlePay();          // 2️⃣ then redirect to PayFort

//   } catch (err) {
//     console.error(err);
//     alert("Checkout failed");
//   } finally {
//     setLoading(false);
//   }
// };

// const cartItems = [
//   { name: "April Installment", amount: 5000, currency: "EGP" },
//   { name: "September Installment", amount: 15000, currency: "EGP" },
//   { name: "November Installment", amount: 12500, currency: "EGP" },
//   { name: "January Installment", amount: 8500, currency: "EGP" },
// ];

// const total = cartItems.reduce((a, v) => a + v.amount, 0);
// Build final installments list

const installmentsWithInterest = React.useMemo(() => {
    if (!installments.length) return [];

    return [
      ...installments,
      {
        instCode: "INTEREST_FEE",
        instName: "INTEREST & HANDLING FEES (0.75%) + EGP 1.51",
        amount: interestAmount + (Number(interestAmount) * INTEREST_RATE) + 1.51,
      },
    ];
  }, [installments, interestAmount]);
  interestAmount = interestAmount + (Number(interestAmount) * INTEREST_RATE);
  interestAmount = interestAmount +  1.51
  const finalTotal = total + interestAmount ;
  const finalFinalTotal = Math.floor(finalTotal);
  return (
    <div>
      <h1 className="alsh1">El Alsson British & American International School - Newgiza</h1>
      <div className="alshdrr">
        <h1 className="alsh1">Checkout Page</h1>
        <img className="alsimghdrlft" src={alsimgg} alt="Placeholder" />
      </div>
      <div className="crtt">
        {/* <h3 className="crttt">Cart Details for: <strong>{curStudName}</strong>   ID: <strong>{curStudID}</strong> Year Group: <strong>{curYgpName}</strong></h3> */}
        <h3 className="crttt">Student ID: <strong>{curStudID}</strong> </h3>
        <h3 className="crttt">Student Name: <strong>{curStudName}</strong>  </h3>
        <h3 className="crttt">Year Group: <strong>{curYgpName}</strong></h3>
        <Table
          className="chkoutTbb"
          columns={[
            { title: "Installment Name", dataIndex: "instName" },
            { title: "Amount",dataIndex: "amount", render: (value) => formatDec(Number(value)), align: "right" },
          ]}
          dataSource={installmentsWithInterest}
          pagination={false}
          rowKey="instCode"
        />
        <br />
        <p className="totcrtt">
          Total Amount: <span className="totamm">EGP {formatDec(((finalFinalTotal)))}</span>
        </p>
      </div>
      <br />
      <ApsMerchantPage cartItems={installmentsWithInterest} email={curEmailAddress} paymentItems={paymentItems} />
    </div>
  );
}
