// ---------- DECLARING CONSTANTS
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const sql = require("mssql");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs-extra");
const PDFDocument = require("pdfkit");
const app = express();

dotenv.config();

// BASE URL — DO NOT TOUCH
const PUBLIC_URL = process.env.PUBLIC_URL || "https://my-payfort-backend.onrender.com";

// RECEIPTS DIR (correct place)
const RECEIPTS_DIR = path.join(__dirname, "receipts");
fs.ensureDirSync(RECEIPTS_DIR);

// ---------- STATIC FILES (IMPORTANT) ----------
app.use("/receipts", express.static(RECEIPTS_DIR));
app.use("/public", express.static(path.join(__dirname, "public")));

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());


// ---------- SQL CONFIG ----------
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

// ---------- NODEMAILER ----------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ---------- SIGNATURE HELPERS ----------
function createSignature(params) {
  const sorted = Object.keys(params).sort();
  const concatenated = sorted.map((key) => `${key}=${params[key]}`).join("");
  const toHash = `${process.env.AM_RequestPhrase}${concatenated}${process.env.AM_RequestPhrase}`;
  return crypto.createHash("sha256").update(toHash).digest("hex");
}

function verifySignature(params) {
  const { signature, ...data } = params;
  const sortedKeys = Object.keys(data).sort();
  let base = process.env.AM_ResponsePhrase;

  sortedKeys.forEach((key) => {
    if (data[key] !== null && data[key] !== "") {
      base += `${key}=${data[key]}`;
    }
  });

  base += process.env.AM_ResponsePhrase;
  const hash = crypto.createHash("sha256").update(base).digest("hex");
  return hash === signature;
}

function generateMerchantReference(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TXN-${result}`;
}

// ---------- CREATE FORM PAYLOAD ----------
app.post("/createFormPayLoad", async (req, res) => {
  try {
    const orderID = generateMerchantReference();
    let formPayLoad = {
      command: "PURCHASE",
      language: "en",
      merchant_identifier: process.env.AM_Merchant_Identifier,
      access_code: process.env.AM_Access_Code,
      merchant_reference: orderID,
      amount: req.body.amount * 100,
      currency: req.body.currency,
      customer_email: req.body.email,
      return_url: `${PUBLIC_URL}/payfort-callback`,
    };

    formPayLoad.signature = createSignature(formPayLoad);

    res.json(formPayLoad);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating Payfort payload" });
  }
});

// ---------- LOG PAYMENT ACTION ----------
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
      .input("actiondate", sql.Date, new Date())
      .input("emlsnt", sql.Int, 0)
      .query(`
        INSERT INTO OnlinePayfortLog (
          fort_id, merchant_reference, amount, customer_email,
          payment_option, response_message, actiondate, emlsnt
        )
        VALUES (
          @fort_id, @merchant_reference, @amount, @customer_email,
          @payment_option, @response_message, @actiondate, @emlsnt
        )
      `);

    console.log("Payment logged to SQL Server");
  } catch (err) {
    console.error("SQL Error:", err);
  }
}

// ---------- CALLBACK HANDLER ----------
function handlePayfortCallback(req, res) {
  try {
    const payload = req.method === "GET" ? req.query : req.body;

    console.log("=== Payfort Callback ===", payload);

    if (!payload.signature) return res.status(400).send("Missing signature");

    if (!verifySignature(payload)) {
      return res.status(400).send("Invalid signature");
    }

    const success = payload.status === "14";
    if (success) logPaymentAction(payload);

    const redirectUrl =
      `http://localhost:5173/checkout-result?status=${success ? "success" : "failed"}` +
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

app.get("/payfort-callback", handlePayfortCallback);
app.post("/payfort-callback", handlePayfortCallback);

// ---------- GENERATE RECEIPT ----------
async function generateReceiptPDF(data) {
  const tx = data.merchant_reference || data.fort_id || Date.now();
  const fileName = `receipt_${tx}.pdf`;
  const filePath = path.join(RECEIPTS_DIR, fileName);
  const publicUrl = `${PUBLIC_URL}/receipts/${fileName}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    if (data.logoPath) {
      try { doc.image(data.logoPath, { fit: [160, 60], align: "center" }); } catch {}
    }

    doc.fontSize(20).text("Payment Receipt", { align: "center" }).moveDown(0.5);

    doc.fontSize(12);
    doc.text(`Transaction ID: ${data.fort_id}`);
    doc.text(`Order Ref: ${data.merchant_reference}`);
    doc.text(`Amount: ${data.amount} EGP`);
    doc.text(`Payment Status: ${data.status}`);
    doc.text(`Parent Email: ${data.parentEmail}`);
    doc.text(`Date: ${data.date}`);

    doc.end();

    stream.on("finish", () => resolve({ fileName, filePath, publicUrl }));
    stream.on("error", reject);
  });
}

// ---------- ENDPOINT: GENERATE RECEIPT ----------
app.post("/api/generate-receipt", async (req, res) => {
  try {
    const data = req.body;

    const logoPath = path.join(__dirname, "assets", "newgiza-logo.jpg");

    const pdfInfo = await generateReceiptPDF({
      ...data,
      logoPath: fs.existsSync(logoPath) ? logoPath : undefined,
      date: data.date || new Date().toLocaleString(),
    });

    return res.json({ success: true, ...pdfInfo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate receipt" });
  }
});

// ---------- ENDPOINT: GENERATE WHATSAPP LINK ----------
app.post("/api/generate-whatsapp-link", (req, res) => {
  try {
    const { schoolNumber = "201003928160", receiptData } = req.body;
    if (!receiptData) return res.status(400).json({ error: "receiptData required" });

    const publicUrl = `${PUBLIC_URL}/receipts/receipt_${receiptData.merchant_reference}.pdf`;

    const msg = `Payment Receipt Sent by Parent
Amount: ${receiptData.amount} EGP
Fort ID: ${receiptData.fort_id}
Order Ref: ${receiptData.merchant_reference}
Parent Email: ${receiptData.parentEmail}
Download receipt: ${publicUrl}`;

    const waLink = `https://wa.me/${schoolNumber}?text=${encodeURIComponent(msg)}`;
    return res.json({ success: true, waLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate WhatsApp link" });
  }
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
