import React, { useMemo, useState } from 'react';
import { Button } from "@mui/material";
import axios from "axios";
import "./CheckoutPage.css";

import { Table, Spin, Tooltip, Grid } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse , faLock } from "@fortawesome/free-solid-svg-icons";
const { useBreakpoint } = Grid;

function formatDec(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function ApsMerchantSection({
  email,
  paymentItems,
  finalTotal,
  whiteSpinner,
  schoolNoo,
  curStudID,
  curStudName,
  curYgpName,
  curFamilyNo,
  curFamilyName,
  fullName,
}) {

  const screens = useBreakpoint();
  const isSmallScreen = !screens.md;

  const [loading, setLoading] = useState(false);
  console.log("ApsMerchantSection props:", { email, paymentItems, finalTotal, schoolNoo, curStudID, curStudName, curYgpName, curFamilyNo, curFamilyName, fullName });
  const handlePay = async () => {
    try {
      setLoading(true);

      // Use finalTotal because this is what user sees and should pay
      const amount = Number(finalTotal.toFixed(2));
      const currency = "EGP";

      // Use state value instead of localStorage
      const schoolId = schoolNoo || "1";
      const safeEmail = email || "noemail@example.com";

      console.log("=== FRONTEND PAY DEBUG ===");
      console.log("Final Amount for APS (major units):", amount);
      console.log("Final Amount for APS (minor units):", Math.round(amount * 100));
      console.log("Email:", safeEmail);
      console.log("School ID:", schoolId);
      console.log("paymentItems:", paymentItems);
      console.log("Student ID:", curStudID);
      console.log("Student Name:", curStudName);
      console.log("Year Group:", curYgpName);

      // const res = await axios.post(
      //   "https://my-payfort-backend.onrender.com/createFormPayLoad",
      //   {
      //     email: safeEmail,
      //     amount,
      //     currency,
      //     schoolId,
      //     paymentItems,
      //     frontendOrigin: window.location.origin,

      //     // NEW: student / family data for backend logging
      //     studentId: curStudID || null,
      //     studentName: curStudName || "",
      //     curYgp: curYgpName || "",
      //     familyNo: curFamilyNo || null,
      //     familyName: curFamilyName || "",
      //     fullName: fullName || "",
      //   }
      // );
      const backendUrl = import.meta.env.VITE_PAYFORT_BACKEND;

      if (!backendUrl) {
        throw new Error("VITE_PAYFORT_BACKEND is not defined");
      }
      console.log("Using backend URL:", backendUrl);
      const res = await axios.post(
        `${backendUrl}/createFormPayLoad`,
        {
          email: safeEmail,
          amount,
          currency,
          schoolId,
          paymentItems,
          frontendOrigin: window.location.origin,

          // NEW: student / family data for backend logging
          studentId: curStudID || null,
          studentName: curStudName || "",
          curYgp: curYgpName || "",
          familyNo: curFamilyNo || null,
          familyName: curFamilyName || "",
          fullName: fullName || "",
        }
      );
      const payfortData = res.data;
      console.log("Payfort payload:", payfortData);

      const form = document.createElement("form");
      form.method = "POST";
      // form.action = "https://sbcheckout.payfort.com/FortAPI/paymentPage"; // SANDBOX URL
      // form.action = "https://checkout.payfort.com/FortAPI/paymentPage"; // LIVE URL
      const CALLBACK_URL = import.meta.env.VITE_CALLBACK_URL;
      form.action = CALLBACK_URL; // LIVE URL IN CASE OF PRODUCTION, ELSE SANDBOX IN CASE OF DEVELOPMENT (TESTING)

      Object.keys(payfortData).forEach((key) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(payfortData[key] ?? "");
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Payment Error:", err);
      console.error("Error response:", err?.response?.data);
      alert("Failed to initiate payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payfortpay">
      <Button
        className="payfort-btn"
        variant="contained"
        onClick={handlePay}
        disabled={loading}
        startIcon={!loading ? <i className="fas fa-lock"></i> : null}
        sx={{
          backgroundColor: "red",
          "&:hover": { backgroundColor: "#cc0000" },
        }}
      >
        {loading && <Spin indicator={whiteSpinner} style={{ marginRight: 8 }} />}
        {loading
          ? "Redirecting... Please wait (first time may take 2–3 minutes)"
          : "SECURE PAYMENT WITH PAYFORT (APS)"}
      </Button>

      <Tooltip title="Back to Home" placement="top">
        <Button
          className="home-btn"
          style={{fontSize:"9px"}}
          href="/fminfo"
          startIcon={<FontAwesomeIcon icon={faHouse} />}
          sx={{
            width: "50%",
            height: "5vh",
            color: "#fff",
            sahape: "rounded",
            fontSize: "12px",
            mt: 0,
            backgroundColor: "#0177b9 !important",
              "&:hover": { backgroundColor: "#015f86 !important" },
            rounded: "10px",
            borderRadius: "10px",
          }}
        >
          Back To Home
        </Button>
      </Tooltip>
      {/* {isSmallScreen ? (
        <Tooltip title="Back to Home">
          <Button
            className="payfort-btn"
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
          className="payfort-btn"
          style={{ width: "15%", height: "5vh" }}
          key="home"
          type="primary"
          shape="default"
          icon={<FontAwesomeIcon icon={faHouse} />}
          href="/fminfo"
        >
          Back to Home
        </Button>
      )} */}
      <p className="empty">Checkout Page</p>
    </div>
  );
}

export default function CheckoutPage(userData = { userData }) {
  const { state } = useLocation();
  const navigate = useNavigate();
  console.log("CheckoutPage received state:", state);
  // IMPORTANT: state only (no sessionStorage fallback)
  const checkoutData = state;
  if (!checkoutData) {
    return (
      <div style={{ padding: "20px" }}>
        <p>No checkout data available.</p>
        <Button variant="contained" onClick={() => navigate("/fminfo")}>
          Back
        </Button>
      </div>
    );
  }
  console.log("Received checkoutData:", checkoutData);
  const {
    paymentItems: initialPaymentItems = [],
    installments = [],
    total = 0,
    curEmailAddress = "",
    curStudID = "",
    curStudName = "",
    curYgpName = "",
    curFamilyNo = "",
    curFamilyName = "",
    schoolNoo = "",
    schoolNmm = "",
    fullName = "",
  } = checkoutData;

  const [paymentItems] = useState(initialPaymentItems);

  const whiteSpinner = (
    <LoadingOutlined
      style={{ fontSize: 18, color: "#ffffff" }}
      spin
    />
  );

  // ===== FEES CALCULATION =====
  const BASE_INTEREST_RATE = 0.0075; // 0.75%
  const EXTRA_FEE = 1.51;

  const baseInterest = Number(total) * BASE_INTEREST_RATE;
  const interestWithHandling = baseInterest + baseInterest * BASE_INTEREST_RATE;
  const feesAmount = Number((interestWithHandling + EXTRA_FEE).toFixed(2));

  // final amount user sees and backend receives
  const finalTotal = Number((Number(total) + feesAmount).toFixed(2));

  const installmentsWithInterest = useMemo(() => {
    if (!Array.isArray(installments) || installments.length === 0) return [];

    return [
      ...installments,
      {
        instCode: "INTEREST_FEE",
        instName: "INTEREST & HANDLING FEES (0.75%) + CBE COMMISSION (EGP 1.51)",
        amount: feesAmount,
      },
    ];
  }, [installments, feesAmount]);

  // Debug logs
  console.log("=== CHECKOUT PAGE DEBUG ===");
  console.log("checkoutData:", checkoutData);
  console.log("installments:", installments);
  console.log("total:", total);
  console.log("feesAmount:", feesAmount);
  console.log("finalTotal:", finalTotal);
  console.log("installmentsWithInterest:", installmentsWithInterest);
  console.log("paymentItems:", paymentItems);
  console.log("schoolNoo:", schoolNoo);

  return (
    <div>
      <h3 className="alsh1">{schoolNmm || "El Alsson British & American International School - Newgiza"}</h3>
      <h3 className="alsh1">Checkout Page</h3>

      <div className="crtt">
        <h3 className="crttt">
          Student ID: <strong>{curStudID}</strong>
        </h3>

        <h3 className="crttt">
          Student Name: <strong>{curStudName}</strong>
        </h3>

        <h3 className="crttt">
          Year Group: <strong>{curYgpName}</strong>
        </h3>

        <Table
          className="chkoutTbb"
          columns={[
            { title: "Installment Name", dataIndex: "instName" },
            {
              title: "Amount",
              dataIndex: "amount",
              align: "right",
              render: (value) => formatDec(value),
            },
          ]}
          dataSource={installmentsWithInterest}
          pagination={false}
          rowKey="instCode"
        />

        <br />

        <p className="totcrtt">
          Total Amount: <span className="totamm">EGP {formatDec(finalTotal)}</span>
        </p>
      </div>

      <br />

      <ApsMerchantSection
        email={curEmailAddress}
        paymentItems={paymentItems}
        finalTotal={finalTotal}
        whiteSpinner={whiteSpinner}
        schoolNoo={schoolNoo}
        curStudID={curStudID}
        curStudName={curStudName}
        curYgpName={curYgpName}
        curFamilyNo={curFamilyNo}
        curFamilyName={curFamilyName}
        fullName={fullName}
      />
    </div>
  );
}