// ---------- DECLARING CONSTANTS
// const express = require("express");
// const cors = require("cors");
// const crypto = require("crypto");
// const bodyParser = require('body-parser')
// const nodemailer = require("nodemailer");
// const sql = require("mssql");
// const dotenv = require("dotenv")
// const path = require("path")
// const fs = require ("fs")

import express from "express";
import cors  from "cors";
import crypto from "crypto"
import bodyParser from 'body-parser'
import nodemailer from "nodemailer"
import sql from "mssql";
import dotenv from "dotenv"
import path from "path"
import fs from  "fs-extra"
import PDFDocument from "pdfkit";

const app = express();
dotenv.config();
// Initiate BODY-PARSER 
app.use(bodyParser.urlencoded({ extended: true })); // APS sends POST as form
app.use(bodyParser.json());

// Initiate EXPRESS 
app.use(express.json());

// Initiate CORS 
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "https://my-payfort-api.onrender.com"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

//Handle OPTIONS preflight
// app.options("*", cors());
app.options(/.*/, cors());


//SQL SERVER CONNECTION STRING
const sqlConfig = {
  server: process.env.VITE_SERVER_NAME,
  database: process.env.VITE_DB_NAME,
  user: process.env.VITE_USER_ID,
  password: process.env.VITE_PSWD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  requestTimeout: 15000,
};

const PDF_PORT = process.env.PORT || 4000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PDF_PORT}`;
const RECEIPTS_DIR = process.env.RECEIPTS_DIR || path.join("public", "receipts");
await fs.ensureDir(RECEIPTS_DIR);

app.use("/public", express.static(path.join(process.cwd(), "public"))); // serve files
//Configure NODEMAILER
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,   // secure SSL port
  secure: true,
  auth: {
    user: process.env.SMTP_USER, // example: fees@alsson.com
    pass: process.env.SMTP_PASS, // app password
  },
});

// ---------- CREATE SIGNATURE ----------
function createSignature(params) {
  const sorted = Object.keys(params).sort();
  const concatenated = sorted.map((key) => `${key}=${params[key]}`).join("");
  const toHash = `${process.env.AM_RequestPhrase}${concatenated}${process.env.AM_RequestPhrase}`;
  return crypto.createHash("sha256").update(toHash).digest("hex");
}

// ---------- VERIFY SIGNATURE ----------
function verifySignature(params) {
  const { signature, ...data } = params;

  const sortedKeys = Object.keys(data).sort();
  let baseString = process.env.AM_ResponsePhrase;
  sortedKeys.forEach(key => {
    if (data[key] !== null && data[key] !== "") {
      baseString += `${key}=${data[key]}`;
    }
  });
  baseString += process.env.AM_ResponsePhrase;

  const hash = crypto.createHash('sha256').update(baseString).digest('hex');
  return hash === signature;
}

// ---------- ENCRYPT ORDER DETAILS ----------
function encryptOrderDetails(text, secretKey) {
  const toHash = `${secretKey}${text}${secretKey}`;
  return crypto.createHash("sha256").update(toHash).digest("hex");
}

// ---------- GENERATE TRANSACTION REFERENCE ----------
function generateMerchantReference(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TXN-${result}`;
}

// ---------- CREATE TRANSACTION PAYLOAD ----------
app.post("/createFormPayLoad", async (req, res) => {
  try {
    const orderID = generateMerchantReference(12);
    // Build Payfort payload
    let formPayLoad = {
      command: "PURCHASE",
      language: "en",
      merchant_identifier: process.env.AM_Merchant_Identifier,
      access_code: process.env.AM_Access_Code,
      merchant_reference: orderID,
      amount: req.body.amount * 100, // smallest currency
      currency: req.body.currency,
      customer_email: req.body.email,
      // ⚠ Backend callback instead of frontend
      return_url: "https://my-payfort-backend.onrender.com/payfort-callback",
      // return_method: "POST", // important
    };

    // Generate signature for Payfort request
    formPayLoad.signature = createSignature(formPayLoad);

    // Send response to frontend
    res.json(formPayLoad);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating Payfort payload" });
  }
});

// ---------- LOG PARENT ACTION ON THE DATABASE ----------
async function logPaymentAction(payload) {
  try {
    const pool = await sql.connect(sqlConfig);

    await pool.request()
      .input("fort_id", sql.VarChar, payload.fort_id)
      .input("merchant_reference", sql.VarChar, payload.merchant_reference)
      .input("amount", sql.Int, payload.amount)
      .input("customer_email", sql.VarChar, payload.customer_email)
      .input("payment_option", sql.VarChar, payload.payment_option)
      .input("response_message", sql.VarChar, payload.response_message)
      .input("actiondate", sql.Date, new Date().toLocaleString())
      .input("emlsnt", sql.Int, 0)
      //{new Date().toLocaleString()}
      .query(`
        INSERT INTO OnlinePayfortLog (
          fort_id,
          merchant_reference,
          amount,
          customer_email,
          payment_option,
          response_message,
          actiondate,
          emlsnt
        ) VALUES (
          @fort_id,
          @merchant_reference,
          @amount,
          @customer_email,
          @payment_option,
          @response_message,
          @actiondate,
          @emlsnt
        )
      `);
    console.log("Payment logged to SQL Server");
  } catch (err) {
    console.error("SQL Error:", err);
  }
}

// ---------- LOG THE CALL BACK RECEIVED FROM PAYFORT ----------
app.all("/payfort-callback", (req, res, next) => {
  console.log("========== PAYFORT CALLBACK RECEIVED ==========");
  console.log("Method:", req.method);
  console.log("Query params:", req.query);
  console.log("Body:", req.body);
  console.log("===============================================");
  next();
});

//---------Verify the payment process to detect its status
app.post("/payment/verify", (req, res) => {
  const encodedData = req.body.data;
  const decoded = JSON.parse(Buffer.from(encodedData, "base64").toString("utf8"));
  const expectedSignature = createSignature(decoded);
  if (decoded.signature !== expectedSignature) {
    return res.json({ status: "failed" });
  }
  if (decoded.status === "14") {
    return res.json({ status: "success" });
  }
  return res.json({ status: "failed" });
});

// ---------- HANDLE THE CALL BACK RECEIVED FROM PAYFORT 
// TO REDIRECT IT TO OUR CheckoutResult.jsx component ----------
function handlePayfortCallback(req, res) {
  try {
    //const AM_ResponsePhrase = "$2y$10$aotEpWOtP";

    console.log("=== Payfort callback received ===");
    const payload = req.method === "GET" ? req.query : req.body;
    console.log("Callback Payload:", payload);

    if (!payload.signature) {
      return res.status(400).send("Missing signature");
    }

    // Validate signature correctly
    const isValid = verifySignature(payload);
    if (!isValid) {
      console.log("Invalid signature");
      return res.status(400).send("Invalid signature");
    }

    const isSuccess = payload.status === "14";
    if (isSuccess){
      console.log("=== Log Payment Action ===");
      logPaymentAction(payload)
    }
    const redirectUrl =
    `http://localhost:5173/checkout-result?status=${isSuccess ? "success" : "failed"}` +
    `&amount=${payload.amount}` +
    `&fort_id=${payload.fort_id}` +
    `&merchant_reference=${payload.merchant_reference}` +
    `&response_message=${encodeURIComponent(payload.response_message || "")}` +
    `&customer_email=${encodeURIComponent(payload.customer_email || "")}`;

    return res.redirect(302, redirectUrl);

  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).send("Callback error");
  }
}

//CREATE PDF FOR THE RECEIPT

// Helper: create PDF and return local path + public url
async function generateReceiptPDF(data) {
  // data: { transactionId, amount, studentName, parentEmail, fort_id, merchant_reference, response_message, date, logoBase64? }
  const tx = data.merchant_reference || data.fort_id || Date.now();
  const fileName = `receipt_${tx}.pdf`;
  const filePath = path.join(RECEIPTS_DIR, fileName);
  const publicUrl = `${PUBLIC_URL}/public/receipts/${fileName}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Optional header with logo if data.logoPath or data.logoBase64 provided
    if (data.logoPath) {
      try {
        doc.image(data.logoPath, { fit: [160, 60], align: "center" });
      } catch (e) {
        /* ignore if image missing */
      }
    }

    doc.fontSize(20).text("Payment Receipt", { align: "center" });
    doc.moveDown(0.5);

    doc.fontSize(12);
    doc.text(`Transaction ID (Fort ID): ${data.fort_id || "-"}`);
    doc.text(`Order Reference: ${data.merchant_reference || "-"}`);
    doc.text(`Amount: ${data.amount} EGP`);
    doc.text(`Payment Status: ${data.status || "-"}`);
    doc.text(`Response Message: ${data.response_message || "-"}`);
    doc.text(`Parent Email: ${data.parentEmail || "-"}`);
    doc.text(`Date: ${data.date || new Date().toLocaleString()}`);
    doc.moveDown();

    // If you want a table of installments, push them here (data.items array)
    if (Array.isArray(data.items)) {
      doc.text("Items:", { underline: true });
      data.items.forEach((it) => {
        doc.text(`${it.name} — ${it.amount} EGP`);
      });
      doc.moveDown();
    }

    doc.text("Regards,", { continued: false });
    doc.text("El Alsson School", { align: "left" });
    doc.text("Finance Department", { align: "left" });

    doc.end();

    stream.on("finish", () => resolve({ filePath, publicUrl }));
    stream.on("error", (err) => reject(err));
  });
}

/**
 * POST /api/generate-receipt
 * Body: JSON with receipt data (parentEmail from Payfort, amount, fort_id, merchant_reference, etc.)
 * Returns: { filePath, publicUrl }
*/
app.post("/api/generate-receipt", async (req, res) => {
  try {
    const data = req.body;
    // minimal validation
    if (!data || !data.parentEmail || !data.amount) {
      return res.status(400).json({ error: "parentEmail and amount are required" });
    }

    // optional: provide path to logo image
    const logoPath = path.join(process.cwd(), "assets", "newgiza-logo.jpg");
    const pdfInfo = await generateReceiptPDF({
      ...data,
      logoPath: fs.existsSync(logoPath) ? logoPath : undefined,
      date: data.date || new Date().toLocaleString(),
    });

    return res.json({ success: true, ...pdfInfo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate receipt", details: err.message });
  }
});

/**
 * POST /api/send-receipt-email
 * Body: { schoolEmail, receiptData }
 * receiptData must include parentEmail, amount, etc.
 */
app.post("/api/send-receipt-email", async (req, res) => {
  try {
    const { schoolEmail = process.env.SMTP_USER, receiptData } = req.body;
    if (!receiptData || !receiptData.parentEmail || !receiptData.amount) {
      return res.status(400).json({ error: "receiptData with parentEmail and amount required" });
    }

    // 1) generate PDF
    const { filePath, publicUrl } = await generateReceiptPDF({
      ...receiptData,
      date: receiptData.date || new Date().toLocaleString(),
    });

    // 2) Compose email
    // Recommended: use SMTP_USER as 'from' and set replyTo to parentEmail.
    // If your SMTP allows arbitrary FROM, you can set from to parentEmail (less common).
    const useParentAsFrom = false; // set to true only if your SMTP allows it

    const mailOptions = {
      from: useParentAsFrom ? `${receiptData.parentEmail}` : `"Fees System" <${process.env.SMTP_USER}>`,
      to: schoolEmail,
      subject: `Payment Receipt - ${receiptData.merchant_reference || receiptData.fort_id || ""}`,
      text:
        `Dear Fees Team,\n\nPlease find the attached payment receipt.\n\n` +
        `Amount: ${receiptData.amount} EGP\n` +
        `Transaction ID: ${receiptData.fort_id}\n` +
        `Order Reference: ${receiptData.merchant_reference}\n\n` +
        `Parent Email: ${receiptData.parentEmail}\n\nRegards,\n`,

      // ensure replies go to parent
      replyTo: receiptData.parentEmail,

      attachments: [
        {
          filename: path.basename(filePath),
          path: filePath,
          contentType: "application/pdf",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      messageId: info.messageId,
      publicUrl,
    });
  } catch (err) {
    console.error("send-receipt-email error:", err);
    return res.status(500).json({ error: "Failed to send email", details: err.message });
  }
});

/**
 * POST /api/send-receipt-whatsapp
 * Body: { schoolNumber, receiptData }
 * Generates the PDF and returns a wa.me link containing the public URL
 *
 * NOTE: If you want to send the media directly into WhatsApp (no link), use Twilio's API
 */
app.post("/api/send-receipt-whatsapp", async (req, res) => {
  try {
    const { schoolNumber = process.env.WhatsAppNo, receiptData } = req.body;
    if (!receiptData || !receiptData.parentEmail || !receiptData.amount) {
      return res.status(400).json({ error: "receiptData with parentEmail and amount required" });
    }

    // generate pdf
    const { filePath, publicUrl } = await generateReceiptPDF({
      ...receiptData,
      date: receiptData.date || new Date().toLocaleString(),
    });

    // create a wa.me link with message + url
    const msg = encodeURIComponent(
      `Payment Receipt Sent by Parent\n\nAmount: ${receiptData.amount} EGP\nFort ID: ${receiptData.fort_id}\nOrder Ref: ${receiptData.merchant_reference}\nParent Email: ${receiptData.parentEmail}\n\nDownload receipt: ${publicUrl}`
    );

    const waLink = `https://wa.me/${schoolNumber}?text=${msg}`;

    // Optionally: if you have Twilio and want server-to-server direct WhatsApp (media), implement below (commented)
    /*
    if (process.env.TWILIO_ACCOUNT_SID) {
      const client = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const twRes = await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM, // whatsapp:+14155238886
        to: `whatsapp:+${schoolNumber}`, // ensure leading +
        body: `Payment Receipt from parent - ${receiptData.merchant_reference || ""}`,
        mediaUrl: [publicUrl],
      });
      return res.json({ success: true, twilio: twRes });
    }
    */

    return res.json({ success: true, waLink, publicUrl });
  } catch (err) {
    console.error("send-receipt-whatsapp error:", err);
    return res.status(500).json({ error: "Failed to generate receipt for WhatsApp", details: err.message });
  }
});

// ---------- Call the callback handle on both cases GET & POST
app.get("/payfort-callback", handlePayfortCallback);
app.post("/payfort-callback", handlePayfortCallback);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
