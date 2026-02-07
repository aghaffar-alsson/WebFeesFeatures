import React, { useEffect, useState } from "react";
import { Result, Button, message, Tooltip } from "antd";
import { useLocation } from "react-router-dom";
import axios from "axios";
import recimgg from '../src/assets/newgiza-logo.jpg'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { faHouse } from '@fortawesome/free-solid-svg-icons'
import { faReceipt } from '@fortawesome/free-solid-svg-icons'

import { MdOutlineMailOutline } from "react-icons/md";
import useMessage from "antd/es/message/useMessage";
export default function CheckoutResult() {
  // const REACT_APP_API_BASE = "https://my-payfort-backend.onrender.com"
  const [messageApi, contextHolder] = message.useMessage()
  const REACT_APP_API_BASE = "http://localhost:3000"
  const { search } = useLocation();
  const [status, setStatus] = useState(null);
  const [details, setDetails] = useState(null);  // response details
  const [loading, setLoading] = useState(true);
  const studentId = localStorage.getItem("curstid");
  const studentName = localStorage.getItem("curstname");
  const curYgp = localStorage.getItem("ygp");
  // const shareByEmail = (schoolEmail = "fees@alsson.com") => {
  //   const subject = encodeURIComponent(`Payment Receipt - Order ${details.merchant_reference || ""}`);
  //   const body = encodeURIComponent(
  //     `Dear Fees Team,\n\n` +
  //     `Please find my payment receipt details below:\n\n` +
  //     `Amount: ${formatDec(details.amount / 100)} EGP\n` +
  //     `Transaction ID (Fort ID): ${details.fort_id}\n` +
  //     `Order Reference: ${details.merchant_reference}\n` +
  //     `Response Message: ${details.response_message || "N/A"}\n` +
  //     `Parent Email (sender): ${details.customer_email || "aghaffar@alsson.com"}\n` +
  //     `Date: ${new Date().toLocaleString()}\n\n` +
  //     `Regards,\n`
  //   );

  //   // Set 'to' to the school. The parent's email will be set automatically by their mail client.
  //   window.location.href = `mailto:${schoolEmail}?subject=${subject}&body=${body}`;
  // };

  // const shareByWhatsAppToSchool = (schoolPhoneIntl = "201003928160") => {
  //   // replace with real school number in international format (no +, no dashes)
  //   const msg = encodeURIComponent(
  //     `Payment Receipt Sent by Parent\n\n` +
  //     `Amount: ${formatDec(details.amount / 100)} EGP\n` +
  //     `Fort ID: ${details.fort_id}\n` +
  //     `Order Ref: ${details.merchant_reference}\n` +
  //     `Parent Email: ${details.customer_email || "N/A"}\n` +
  //     `Date: ${new Date().toLocaleString()}`
  //   );

  //   window.open(`https://wa.me/${schoolPhoneIntl}?text=${msg}`, "_blank");
  // };

  function formatDec(vll) {
    if (vll === null || vll === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(vll);
  }
  const handlePrint = () => {
    const receiptWindow = window.open("", "_blank");
    const statusName = details.status === "success" || details.status === "14" ? "Success" : "Failed";

    const bodyText =
    `Dear Team:\n\n` +
    `Please find below details of my Payment Receipt\n\n` +
    `Amount: ${formatDec(details.amount / 100)} EGP\n` +
    `Transaction ID (Fort ID): ${details.fort_id}\n` +
    `Order Reference: ${details.merchant_reference}\n` +
    `Response Message: ${details.response_message || "N/A"}\n` +
    `Parent Email: ${details.customer_email || "N/A"}\n` +
    `Date: ${new Date().toLocaleString()}`;
    const schoolEml = "fees@alsson.com"
    const emailHref =
    `mailto:${schoolEml}` +
    `?subject=${encodeURIComponent(`Payment Receipt - Order ${details.merchant_reference}`)}` +
    `&body=${encodeURIComponent(bodyText)}`;

    const whatsappHref =
      `https://wa.me/201003928160?text=${encodeURIComponent(bodyText)}`;

    const handleEmailClick = () => {
      window.location.href = emailHref;
    };

    const handleWhatsappClick = () => {
      window.open(whatsappHref, "_blank");
    };
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
      .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; }
      .print-btn { display: flex;align-items: center;justify-content: center;gap: 6px;padding: 10px 16px; font-size: 16px; color:white; background-color:dodgerblue; cursor:pointer; border-radius:8px; font-weight:500; }
      .print-btn:hover { background-color:blue; }
      .recimg { width: 250px; height: 80px; object-fit:contain; margin-bottom:10px; }
      .print-btn {background: #1677ff; color: #fff; border: none; padding: 8px 12px; margin: 5px; border-radius: 50%; cursor: pointer;font-size: 18px;}

      .print-btn i {pointer-events: none; }

      .print-btn:hover {opacity: 0.8;}
      @media print { .print-btn { display:none !important; } }
      </style>
      </head>
      <body>
      <div style="text-align:center">
      <h2>Payment Receipt</h2>
      <img class="recimg" src="${recimgg}" />
      </div>

      <table>
      <tr><td class="label">Student ID:</td><td class="value"><span>${studentId}</span></td></tr>
      <tr><td class="label">Student Name:</td><td class="value"><span>${studentName}</span></td></tr>
      <tr><td class="label">Year Group:</td><td class="value"><span>${curYgp}</span></td></tr>
      <tr><td class="label">Payment Status:</td><td class="value"><span>${statusName}</span></td></tr>
      <tr><td class="label">Amount</td><td class="value"><span>${formatDec(details.amount / 100)} EGP</span></td></tr>
      <tr><td class="label">Transaction ID (Fort ID):</td><td class="value"><span>${details.fort_id}</span></td></tr>
      <tr><td class="label">Order Reference:</td><td class="value"><span>${details.merchant_reference}</span></td></tr>
      <tr><td class="label">Response Message:</td><td class="value"><span>${details.response_message}</span></td></tr>
      <tr><td class="label">Parent Email:</td><td class="value"><span>${details.customer_email || "N/A"}</span></td></tr>
      <tr><td class="label">Date</td><td class="value"><span>${new Date().toLocaleString()}</span></td></tr>
      </table>

      <p class="p_eml">Please send the receipt of payment back to fees@alsson.com</p>
      <div class="actions">
      <button class="print-btn" onclick="window.print()">
      <i class="fa fa-print"></i>
      </button>

      <button class="print-btn" onclick="location.href='/fminfo'">
      <i class="fa fa-home"></i>
      </button>
      </div>
      </body>
      <script>
      const handleEmailClick = () => {
      window.location.href = emailHref;
      };

      const handleWhatsappClick = () => {
      window.open(whatsappHref, "_blank");
      };
      </script>    
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
    });

    setLoading(false);
  }, []);

  if (loading) {
    return <div style={{ marginTop: 60, textAlign: "center" }}>Verifying payment...</div>;
  }

  //SEND EMAIL TO THE SCHOOL
  const sendEmailToSchool = async () => {
    try {
      if (!details) return;
      // const studentId = localStorage.getItem("curstid");
      // const studentName = localStorage.getItem("curstname");
      // const curYgp = localStorage.getItem("ygp");

      messageApi.open({
        type: "loading",
        content: "Sending receipt to school...",
        key: "sendEmail",
        duration: 0
      });

      const payload = {
        schoolEmail: import.meta.env.VITE_FromEmailAddress,
        receiptData: {
          parentEmail: details.customer_email,
          amount: Number(details.amount) / 100, // if amount in cents, else keep as needed
          fort_id: details.fort_id,
          merchant_reference: details.merchant_reference,
          response_message: details.response_message,
          status: details.status,
          date: details.date || new Date().toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }),
          items: details.items || [], // optional
          studentId,
          studentName,
          curYgp,
        }
      };
      console.log(payload)
      //const res = await axios.post(`${REACT_APP_API_BASE || "http://localhost:3000"}/api/send-receipt-email`, payload);
      //const res = await axios.post(`${REACT_APP_API_BASE}/api/generate-receipt`,payload, { headers: { "Content-Type": "application/json" } });    

      //await axios.post("http://localhost:3000/api/send-receipt-email", payload); console.log(res.data)
      const res = await axios.post("http://localhost:3000/api/send-receipt-email", payload);
      console.log(res.data);

      //const { data: pdfData } = await axios.post(`${REACT_APP_API_BASE}/api/generate-receipt`, payload);
      message.success({ content: "Email sent to school.", key: "sendEmail", duration: 3 });

      messageApi.open({
        type: "success",
        content: "Payment receipt has been sent to the school.",
        key: "sendEmail",
        duration: 4
      });
      return res.data;

    } catch (err) {
      console.error(err);

      messageApi.open({
        type: "error",
        content: "Failed to send receipt. Please contact the school.",
        key: "sendEmail",
        duration: 4
      });
    }
  };

  const sendWhatsappToSchool = async () => {
    if (!details) return;

    const loadingKey = "uploadingReceipt";

    try {
      // 🔄 SHOW LOADING
      message.loading({
        content: "Generating receipt and uploading PDF…",
        key: loadingKey,
        duration: 0, // stays until manually closed
      });

      const receiptPayload = {
        parentEmail: details.customer_email,
        amount: Number(details.amount) / 100,
        fort_id: details.fort_id,
        merchant_reference: details.merchant_reference,
        response_message: details.response_message,
        status: details.status,
        date: details.date || new Date().toLocaleString("en-GB"),
      };

      // 1️⃣ Generate & upload PDF
      const receiptPdf = await axios.post(
        "https://my-payfort-backend.onrender.com/api/generate-receipt",
        receiptPayload
      );

      const cloudUrl = receiptPdf.data?.publicUrl;
      if (!cloudUrl) {
        message.error({ content: "Failed to generate receipt PDF", key: loadingKey });
        return;
      }

      // 2️⃣ Generate WhatsApp link
      const waResponse = await axios.post(
        "https://my-payfort-backend.onrender.com/api/generate-whatsapp-link",
        {
          schoolNumber: import.meta.env.VITE_WHATSAPP_NO,
          receiptData: receiptPayload,
          publicUrl: cloudUrl,
        }
      );

      const waLink = waResponse.data?.waLink;

      // ✅ SUCCESS
      message.success({
        content: "Receipt uploaded and WhatsApp opened",
        key: loadingKey,
        duration: 3,
      });

      if (waLink) {
        window.open(waLink, "_blank");
      } else {
        window.open(cloudUrl, "_blank");
      }

    } catch (err) {
      console.error(err);
      message.error({
        content: "Failed to upload receipt or send WhatsApp",
        key: loadingKey,
        duration: 4,
      });
    }
  };

  const isSuccess = status === "success";

  return (
    <div style={{ marginTop: 60 }}>
      {contextHolder}
      {isSuccess ? (
        <Result
          status="success"
          title="Payment Successful"
          subTitle={
            <>
              <strong style={{ color: "blue", fontWeight: 500, fontSize: "18px", transform: "scaleY(2)" }}>Payment of {formatDec(details.amount / 100)} EGP was completed!</strong>
            </>
          }
          extra={[
            <p key="msg">Transaction ID: {details.fort_id}</p>,
            <p key="ref">Order Reference: {details.merchant_reference}</p>,
            // <Button type="primary" href="/">
            //   Back to Home
            // </Button>,
            // <Button type="primary" onClick={handlePrint}>
            //   Show Receipt
            // </Button>,
            <Tooltip title="Back to Home">
              <Button
                key="home"
                type="primary"
                shape="circle"
                icon={<FontAwesomeIcon icon={faHouse} />}

                href="/fminfo"
              />
            </Tooltip>,
            <Tooltip title="Show Receipt">
              <Button
                key="rec"
                type="primary"
                shape="circle"
                icon={<FontAwesomeIcon icon={faReceipt} />}
                onClick={handlePrint}
              />
            </Tooltip>,

            <Tooltip title="Share through Email">
              <Button
                key="email"
                type="primary"
                shape="circle"
                icon={<FontAwesomeIcon icon={faEnvelope} />}
                onClick={sendEmailToSchool}
              />
            </Tooltip>,
            // <Tooltip title="Share through WhatsApp">
            //   <Button
            //     key="whatsapp"
            //     type="primary"
            //     shape="circle"
            //     icon={<FontAwesomeIcon icon={faWhatsapp} />}
            //     onClick={sendWhatsappToSchool}
            //   />
            // </Tooltip>,
          ]}
        />
      ) : (
        <Result
          status="error"
          title="Payment Failed"
          subTitle={details?.response_message || "Something went wrong"}
          extra={[
            <p key="msg">Status Code: {details?.status}</p>,
            <Button type="primary" href="/checkoutpage">
              Try Again
            </Button>,
          ]}
        />
      )}
    </div>
  );
}
