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
const { fileURLToPath } = require("url");
const cloudinary = require("cloudinary").v2;

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

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// SERVE receipts folder
// app.use("/receipts", express.static(path.join(__dirname, "receipts")));
app.use("/receipts", express.static(RECEIPTS_DIR));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
  secure: true
});


// ---------- GENERATE RECEIPT ----------
async function generateReceiptAndUploadToCloudinary(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks = [];

    doc.on("data", (c) => chunks.push(c));

    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "raw",
            folder: "receipts",
            public_id: `receipt_${data.merchant_reference || data.fort_id}`
          },
          (err, result) => {
            if (err) return reject(err);

            resolve({
              success: true,
              publicUrl: result.secure_url,
              cloudinaryId: result.public_id,
              bytes: result.bytes
            });
          }
        );

        uploadStream.end(pdfBuffer);
      } catch (error) {
        reject(error);
      }
    });

    // Build PDF
    if (data.logoPath && fs.existsSync(data.logoPath)) {
      try {
        doc.image(data.logoPath, { fit: [160, 60] });
      } catch (e) {}
    }

    doc.fontSize(20).text("Payment Receipt", { align: "center" }).moveDown();
    doc.fontSize(12)
      .text(`Transaction ID: ${data.fort_id}`)
      .text(`Order Ref: ${data.merchant_reference}`)
      .text(`Amount: ${data.amount} EGP`)
      .text(`Parent Email: ${data.parentEmail}`)
      .text(`Date: ${data.date}`);

    doc.end();
  });
}

// if (!fs.existsSync(path.join(__dirname, "receipts"))) {
//  fs.mkdirSync(path.join(__dirname, "receipts"));
//}

// ---------- ENDPOINT: GENERATE RECEIPT ----------
app.post("/api/generate-receipt", async (req, res) => {
  try {
    const data = req.body;

    if (!data.parentEmail || !data.amount) {
      return res.status(400).json({ error: "parentEmail and amount are required" });
    }

    // Logo (optional)
    const logoPath = path.join(process.cwd(), "assets", "newgiza-logo.jpg");
    if (fs.existsSync(logoPath)) {
      data.logoPath = logoPath;
    }

    data.date = data.date || new Date().toLocaleString();

    const uploadResult = await generateReceiptAndUploadToCloudinary(data);

    return res.json({
      success: true,
      publicUrl: uploadResult.publicUrl,
      cloudinaryId: uploadResult.cloudinaryId,
      bytes: uploadResult.bytes,
      merchant_reference: data.merchant_reference,
      fort_id: data.fort_id
    });
  } catch (error) {
    console.error("Receipt generation error:", error);
    return res.status(500).json({
      error: "Failed to generate receipt",
      details: error.message
    });
  }
});
// ---------- ENDPOINT: GENERATE WHATSAPP LINK ----------
app.post("/api/generate-whatsapp-link", (req, res) => {
  try {
    const { schoolNumber = "201003928160", receiptData, publicUrl } = req.body;
    if (!receiptData || !publicUrl) 
      return res.status(400).json({ error: "receiptData and publicUrl required" });

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



app.get("/payfort-callback", handlePayfortCallback);
app.post("/payfort-callback", handlePayfortCallback);

// ---------- START SERVER ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));












