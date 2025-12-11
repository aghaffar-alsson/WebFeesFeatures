import { Button } from "@mui/material";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import LockIcon from "@mui/icons-material/Lock";

import './CheckoutPage.css'
import alsimgg from '../src/assets/newgiza-logo.jpg'
import { Table } from "antd";
import { useLocation } from "react-router-dom";
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
/>

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
function ApsMerchantPage({ cartItems, email }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    const amount = cartItems.reduce((a, v) => a + v.amount, 0);
    const currency = "EGP";

    try {
      setLoading(true);

      // Call backend to get Payfort payload
      const res = await axios.post(
        "https://my-payfort-backend.onrender.com/createFormPayLoad",
        { email, amount, currency }
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
        input.value = payfortData[key];
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
      <div className="payfortpay">
        <Button
          className="payfort-btn"
          variant="contained"
          onClick={handlePay}
          disabled={loading}
          startIcon={<i className="fas fa-lock"></i>}
        >
          {loading ? "Redirecting..." : "SECURE PAYMENT WITH PAYFORT (APS)"}
        </Button>
        <p className="empty">ChekoutPage</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {

  const { state } = useLocation();
  const { installments, total, curEmailAddress, studentID, studentName } = state || {};
  console.log("Received:", installments, total, curEmailAddress, studentID, studentName);

  // const cartItems = [
  //   { name: "April Installment", amount: 5000, currency: "EGP" },
  //   { name: "September Installment", amount: 15000, currency: "EGP" },
  //   { name: "November Installment", amount: 12500, currency: "EGP" },
  //   { name: "January Installment", amount: 8500, currency: "EGP" },
  // ];

  // const total = cartItems.reduce((a, v) => a + v.amount, 0);

  return (
    <div>
      <h1 className="alsh1">El Alsson British & American International School - Newgiza</h1>
      <div className="alshdrr">
        <h1 className="alsh1">Checkout Page</h1>
        <img className="alsimghdrlft" src={alsimgg} alt="Placeholder" />
        <img></img>
      </div>
      <div className="crtt">
        <Table
          className="chkoutTbb"
          columns={[
            { title: "Installment Name", dataIndex: "instName" },
            {
              title: "Amount",
              dataIndex: "amount",
              render: (value) => formatDec(Number(value)),
            },
          ]}
          dataSource={installments}
          pagination={false}
          rowKey="instCode"
        />
        <br />
        <p className="totcrtt">
          Total Amount: <span className="totamm">EGP {formatDec(total)}</span>
        </p>
      </div>
      <br />
      {/* <Typography>Customer Email: {email}</Typography> */}

      <br />
      {/* <ApsMerchantPage cartItems={cartItems} email={email} /> */}
      <ApsMerchantPage cartItems={installments} email={curEmailAddress} />
    </div>
  );
}
