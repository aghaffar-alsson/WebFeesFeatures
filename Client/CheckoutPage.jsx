import React, { useMemo, useState } from "react";
import { Button } from "@mui/material";
import axios from "axios";
import "./CheckoutPage.css";

import { Table, Spin, Tooltip } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse } from "@fortawesome/free-solid-svg-icons";

function formatDec(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function ApsMerchantSection({ email, paymentItems, finalTotal, whiteSpinner }) {
  const [loading, setLoading] = useState(false);

  // const handlePay = async () => {
  //   try {
  //     setLoading(true);

  //     // Send EXACT displayed total (2 decimals max) to backend
  //     const amount = Number(finalTotal.toFixed(2));
  //     const currency = "EGP";
  //     const schoolId = localStorage.getItem("schoolNoo") || "1";

  //     console.log("=== FRONTEND APS DEBUG ===");
  //     console.log("email:", email);
  //     console.log("schoolId:", schoolId);
  //     console.log("Displayed finalTotal (major units):", finalTotal);
  //     console.log("Amount sent to backend (major units):", amount);
  //     console.log("Amount sent to backend (minor units):", Math.round(amount * 100));
  //     console.log("paymentItems:", paymentItems);

  //     const res = await axios.post(
  //       "https://my-payfort-backend.onrender.com/createFormPayLoad",
  //       {
  //         email,
  //         amount,
  //         currency,
  //         schoolId,
  //         paymentItems,
  //         frontendOrigin: window.location.origin,
  //       }
  //     );

  //     const payfortData = res.data;

  //     console.log("=== PAYFORT PAYLOAD FROM BACKEND ===");
  //     console.log(payfortData);

  //     // Build form and submit to APS
  //     const form = document.createElement("form");
  //     form.method = "POST";
  //     form.action = "https://sbcheckout.payfort.com/FortAPI/paymentPage";

  //     Object.keys(payfortData).forEach((key) => {
  //       const input = document.createElement("input");
  //       input.type = "hidden";
  //       input.name = key;
  //       input.value = String(payfortData[key] ?? "");
  //       form.appendChild(input);
  //     });

  //     document.body.appendChild(form);
  //     form.submit();
  //   } catch (err) {
  //     console.error("=== PAYMENT INIT ERROR ===");
  //     console.error("Error object:", err);
  //     console.error("Error response data:", err?.response?.data);
  //     console.error("Error status:", err?.response?.status);
  //     alert("Failed to initiate payment. Please try again.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handlePay = async () => {
    try {
      setLoading(true);

      const totalAmount = paymentItems.reduce((a, v) => a + Number(v.amount), 0);
      const amount = Number(totalAmount.toFixed(2)); // KEEP DECIMALS

      const currency = "EGP";
      const schoolId = localStorage.getItem("schoolNoo") || "1";
      const safeEmail = email || "noemail@example.com";

      console.log("=== FRONTEND PAY DEBUG ===");
      console.log("Total Amount for APS (major units):", amount);
      console.log("Email:", safeEmail);
      console.log("School ID:", schoolId);
      console.log("paymentItems:", paymentItems);

      const res = await axios.post(
        "https://my-payfort-backend.onrender.com/createFormPayLoad",
        {
          email: safeEmail,
          amount,
          currency,
          schoolId,
          paymentItems,
          frontendOrigin: window.location.origin
        }
      );

      const payfortData = res.data;
      console.log("Payfort payload:", payfortData);

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://sbcheckout.payfort.com/FortAPI/paymentPage";

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

      <Tooltip title="Back to Home">
        <Button
          className="payfort-btn"
          href="/fminfo"
          startIcon={<FontAwesomeIcon icon={faHouse} />}
          sx={{
            width: "50%",
            height: "8vh",
            color: "#fff",
            mt: 1,
          }}
        >
          Back To Home
        </Button>
      </Tooltip>

      <p className="empty">Checkout Page</p>
    </div>
  );
}

export default function CheckoutPage() {
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
    curEmailAddress = "",
    curStudID = "",
    curStudName = "",
    curYgpName = "",
    // kept available if you need later:
    // curFamilyNo,
    // curFamilyName,
    // schoolNoo,
    // schoolNmm,
    // fullName,
  } = checkoutData;

  const [paymentItems] = useState(initialPaymentItems);

  const whiteSpinner = (
    <LoadingOutlined
      style={{ fontSize: 18, color: "#ffffff" }}
      spin
    />
  );

  // ===== FEES CALCULATION (deterministic & stable) =====
  const BASE_INTEREST_RATE = 0.0075; // 0.75%
  const EXTRA_FEE = 1.51;

  // This reproduces your original logic:
  // 1) interest = total * 0.75%
  // 2) add 0.75% on the interest itself
  // 3) add fixed 1.51
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
        instName: "INTEREST & HANDLING FEES (0.75%) + (CBE COMMISSION - EGP 1.51)",
        amount: feesAmount,
      },
    ];
  }, [installments, feesAmount]);

  // Debug logs for render-time issues
  console.log("=== CHECKOUT PAGE DEBUG ===");
  console.log("checkoutData:", checkoutData);
  console.log("installments:", installments);
  console.log("total:", total);
  console.log("feesAmount:", feesAmount);
  console.log("finalTotal:", finalTotal);
  console.log("installmentsWithInterest:", installmentsWithInterest);
  console.log("paymentItems:", paymentItems);

  return (
    <div>
      <h3 className="alsh1">El Alsson British & American International School - Newgiza</h3>
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
      />
    </div>
  );
}