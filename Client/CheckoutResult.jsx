import React, { useEffect, useState } from 'react';
import { Result, Button, message, Tooltip } from "antd";
import { useLocation } from "react-router-dom";
import axios from "axios";
// import recimgg from "../src/assets/newgiza-logo.jpg";
import recimgg from "./src/assets/newgiza-logo.jpg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faHouse, faReceipt } from "@fortawesome/free-solid-svg-icons";

export default function CheckoutResult() {
  const [messageApi, contextHolder] = message.useMessage();
  const { search } = useLocation();

  const [status, setStatus] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailSent, setEmailSent] = useState(false);

  const API_BASE = `${import.meta.env.VITE_API_URL}`;
  if (!API_BASE) {
    throw new Error("VITE_API_URL is not defined");
  }

  function formatDec(vll) {
    if (vll === null || vll === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(vll));
  }

  const handlePrint = () => {
    if (!details) return;

    const receiptWindow = window.open("", "_blank");
    const statusName = details.status === "success" || details.status === "14" ? "Success" : "Failed";

    const bodyText =
      `Dear Team:\n\n` +
      `Please find below details of my Payment Receipt\n\n` +
      `Student ID: ${details.studentId || "N/A"}\n` +
      `Student Name: ${details.studentName || "N/A"}\n` +
      `Year Group: ${details.curYgp || "N/A"}\n` +
      `Amount: ${formatDec(Number(details.amount) / 100)} EGP\n` +
      `Transaction ID (Fort ID): ${details.fort_id}\n` +
      `Order Reference: ${details.merchant_reference}\n` +
      `Response Message: ${details.response_message || "N/A"}\n` +
      `Parent Email: ${details.customer_email || "N/A"}\n` +
      `Date: ${new Date().toLocaleString()}`;

    const schoolEml = "fees@alsson.com";
    const emailHref =
      `mailto:${schoolEml}` +
      `?subject=${encodeURIComponent(`Payment Receipt - Order ${details.merchant_reference}`)}` +
      `&body=${encodeURIComponent(bodyText)}`;

    const whatsappHref =`https://wa.me/201003928160?text=${encodeURIComponent(bodyText)}`;

    receiptWindow.document.write(`
      <html>
      <head>
        <title>Payment Receipt</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"/>
        <style>
          body { font-family: Tahoma, sans-serif; padding: 20px; }
          h2 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 8px 5px; border: 1px solid #ddd; }
          .label { font-weight: 500; width: 40%; }
          .value span { font-weight: 600; }
          .p_eml { font-weight: 500; color:dodgerblue; font-size:18px }
          .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; justify-content:center; }
          .print-btn {
            background: #1677ff;
            color: #fff;
            border: none;
            padding: 10px 14px;
            margin: 5px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
          }
          .print-btn i { pointer-events: none; }
          .print-btn:hover { opacity: 0.8; }
          .recimg { width: 250px; height: 80px; object-fit:contain; margin-bottom:10px; }
          @media print { .print-btn { display:none !important; } }
        </style>
      </head>
      <body>
        <div style="text-align:center">
          <h2>Payment Receipt</h2>
          <img class="recimg" src="${recimgg}" />
        </div>

        <table>
          <tr><td class="label">Student ID:</td><td class="value"><span>${details.studentId || "N/A"}</span></td></tr>
          <tr><td class="label">Student Name:</td><td class="value"><span>${details.studentName || "N/A"}</span></td></tr>
          <tr><td class="label">Year Group:</td><td class="value"><span>${details.curYgp || "N/A"}</span></td></tr>
          <tr><td class="label">Payment Status:</td><td class="value"><span>${statusName}</span></td></tr>
          <tr><td class="label">Amount:</td><td class="value"><span>${formatDec(Number(details.amount) / 100)} EGP</span></td></tr>
          <tr><td class="label">Transaction ID (Fort ID):</td><td class="value"><span>${details.fort_id}</span></td></tr>
          <tr><td class="label">Order Reference:</td><td class="value"><span>${details.merchant_reference}</span></td></tr>
          <tr><td class="label">Response Message:</td><td class="value"><span>${details.response_message || "N/A"}</span></td></tr>
          <tr><td class="label">Parent Email:</td><td class="value"><span>${details.customer_email || "N/A"}</span></td></tr>
          <tr><td class="label">Date:</td><td class="value"><span>${new Date().toLocaleString()}</span></td></tr>
        </table>

        <p class="p_eml">Please send the receipt of payment back to fees@alsson.com</p>

        <div class="actions">
          <button class="print-btn" onclick="window.print()">
            <i class="fa fa-print"></i>
          </button>

          <button class="print-btn" onclick="window.location.href='/fminfo'">
            <i class="fa fa-home"></i>
          </button>

          <button class="print-btn" onclick="window.location.href='${emailHref}'">
            <i class="fa fa-envelope"></i>
          </button>


        </div>
      </body>
      </html>
    `);

    receiptWindow.document.close();
  };

  useEffect(() => {
    const params = new URLSearchParams(search);
    const qsStatus = params.get("status");
    const amount = params.get("amount");
    const fort_id = params.get("fort_id");
    const merchant_reference = params.get("merchant_reference");
    const response_message = params.get("response_message");
    const customer_email = params.get("customer_email");

    // Read student data from query params instead of localStorage
    const studentId = params.get("student_id");
    const studentName = params.get("student_name");
    const curYgp = params.get("cur_ygp");

    setStatus(qsStatus);

    setDetails({
      amount,
      fort_id,
      merchant_reference,
      response_message,
      customer_email,
      status: qsStatus === "success" ? "14" : "0",
      studentId,
      studentName,
      curYgp,
      date: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    setLoading(false);
  }, [search]);

  // useEffect(() => {
  //   if (!loading && details && status === "success" && !emailSent) {
  //     sendEmailToSchool();
  //     setEmailSent(true);
  //   }
  // }, [loading, details, status, emailSent]);
    const sendEmailToSchool = async () => {
    try {
      if (!details) return;

      messageApi.open({
        type: "loading",
        content: "Sending receipt to school...",
        key: "sendEmail",
        duration: 0,
      });

      const payload = {
        schoolEmail: import.meta.env.VITE_FromEmailAddress,
        receiptData: {
          parentEmail: details.customer_email,
          amount: Number(details.amount) / 100,
          fort_id: details.fort_id,
          merchant_reference: details.merchant_reference,
          response_message: details.response_message,
          status: details.status,
          date:
            details.date ||
            new Date().toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          items: details.items || [],
          studentId: details.studentId,
          studentName: details.studentName,
          curYgp: details.curYgp,
        },
      };

      console.log("sendEmail payload:", payload);

      const res = await axios.post(`${API_BASE}/send-receipt-email`, payload);
      console.log(res.data);

      messageApi.open({
        type: "success",
        content: "Payment receipt has been sent to the school.",
        key: "sendEmail",
        duration: 4,
      });

      return res.data;
    } catch (err) {
      console.error(err);

      messageApi.open({
        type: "error",
        content: "Failed to send receipt. Please contact the school.",
        key: "sendEmail",
        duration: 4,
      });
    }
  };
  useEffect(() => {
    const sendEmailIfNeeded = async () => {
      if (!loading && details && status === "success" && !emailSent) {
        await sendEmailToSchool();
        setEmailSent(true);
      }
    };
    sendEmailIfNeeded();
  }, [loading, details, status, emailSent, sendEmailToSchool]);



  const isSuccess = status === "success";

  if (loading) {
    return <div style={{ marginTop: 60, textAlign: "center" }}>Verifying payment...</div>;
  }

  return (
    <div style={{ marginTop: 60 }}>
      {contextHolder}

      {isSuccess ? (
        <Result
          status="success"
          title="Payment Successful"
          subTitle={
            <strong
              style={{
                color: "blue",
                fontWeight: 500,
                fontSize: "18px",
              }}
            >
              Payment of {formatDec(Number(details.amount) / 100)} EGP was completed!
            </strong>
          }
          extra={[
            <p key="msg">Transaction ID: {details.fort_id}</p>,
            <p key="ref">Order Reference: {details.merchant_reference}</p>,

            <Tooltip title="Back to Home" key="homeTip">
              <Button
                key="home"
                type="primary"
                shape="circle"
                style={{ width: "40px", height: "40px", paddingTop: "0px !important" }}
                icon={<FontAwesomeIcon icon={faHouse} />}
                href="/fminfo"
              />
            </Tooltip>,

            <Tooltip title="Show Receipt" key="recTip" >
              <Button
                key="rec"
                type="primary"
                shape="circle"
                style={{ width: "40px", height: "40px", paddingTop: "0px !important" }}
                icon={<FontAwesomeIcon icon={faReceipt} />}
                onClick={handlePrint}
              />
            </Tooltip>,

            <Tooltip title="Share through Email" key="emailTip">
              <Button
                key="email"
                type="primary"
                shape="circle"
                style={{ width: "40px", height: "40px", paddingTop: "0px !important" }}
                icon={<FontAwesomeIcon icon={faEnvelope} />}
                onClick={sendEmailToSchool}
              />
            </Tooltip>,
          ]}
        />
      ) : (
        <Result
          status="error"
          title="Payment Failed"
          subTitle={details?.response_message || "Something went wrong"}
          extra={[
            <p key="msg">Status Code: {details?.status}</p>,
            <Button key="retry" type="primary" href="/checkoutpage">
              Try Again
            </Button>,
            <Tooltip title="Back to Home" key="homeTip">
              <Button
                key="home"
                type="primary"
                shape="circle"
                style={{ width: "40px", height: "40px", paddingTop: "0px !important" }}
                icon={<FontAwesomeIcon icon={faHouse} />}
                href="/fminfo"
              />
            </Tooltip>,

          ]}
        />
      )}
    </div>
  );
}