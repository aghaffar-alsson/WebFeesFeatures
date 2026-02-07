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
//**********SWITCH PAYFORT CREDENTIALS ACCORDING TO THE SCHOOL ID*******
function getMerchantCredentials(schoolId) {
  switch (schoolId) {
    case 1:
      return {
        merchant_identifier: process.env.AM_Merchant_Identifier,
        access_code: process.env.AM_Access_Code,
        request_phrase: process.env.AM_RequestPhrase,
        response_phrase: process.env.AM_ResponsePhrase,
      };

    case 2:
      return {
        merchant_identifier: process.env.BR_Merchant_Identifier,
        access_code: process.env.BR_Access_Code,
        request_phrase: process.env.BR_RequestPhrase,
        response_phrase: process.env.BR_ResponsePhrase,
      };

    default:
      throw new Error("Invalid schoolId");
  }
}


// ---------- SIGNATURE HELPERS ----------
function createSignature(params, schoolId) {
  // Resolve credentials dynamically
  const { request_phrase } = getMerchantCredentials(schoolId);  
  const sorted = Object.keys(params).sort();
  const concatenated = sorted.map((key) => `${key}=${params[key]}`).join("");
  //const toHash = `${process.env.AM_RequestPhrase}${concatenated}${process.env.AM_RequestPhrase}`;
  const toHash = `${request_phrase}${concatenated}${request_phrase}`;
  
  return crypto.createHash("sha256").update(toHash).digest("hex");
}

function verifySignature(params, schoolId) {
  // Resolve credentials dynamically
  const { response_phrase } = getMerchantCredentials(schoolId);  
  
  const { signature, ...data } = params;
  const sortedKeys = Object.keys(data).sort();
  let base = response_phrase;

  sortedKeys.forEach((key) => {
    if (data[key] !== null && data[key] !== "") {
      base += `${key}=${data[key]}`;
    }
  });

  base += response_phrase;
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
    const { amount, currency, email, schoolId,  paymentItems = [] } = req.body;    
    const schoolCode = Number(schoolId);
    if (![1, 2].includes(schoolCode)) {
      return res.status(400).json({ error: "Invalid schoolId" });
    }    
    const orderID = generateMerchantReference();
    // Resolve credentials dynamically
    const { merchant_identifier, access_code } = getMerchantCredentials(schoolCode);    
    let formPayLoad = {
      command: "PURCHASE",
      language: "en",
      merchant_identifier: merchant_identifier,
      access_code: access_code,
      merchant_reference: orderID,
      amount: req.body.amount * 100,
      currency: req.body.currency,
      customer_email: req.body.email,
      eci: "ECOMMERCE",
      return_url: `${PUBLIC_URL}/payfort-callback`,
    };

    formPayLoad.signature = createSignature(formPayLoad, schoolCode);
    console.log(formPayLoad)
    //here insert a record to keeptrack the merchant reference and the school id
    const pool = await sql.connect(sqlConfig);    
    await pool.request()
      .input("merchant_reference", sql.VarChar(50), orderID)
      .input("school_id", sql.Int, schoolCode)
      .input("amount", sql.Int, req.body.amount * 100)
      .input("currency", sql.Char(3), req.body.currency)
      .input("customer_email", sql.NVarChar(255), req.body.email)
      .query(`
        INSERT INTO PayfortTransactions
        (merchant_reference, school_id, amount, currency, customer_email, status)
        VALUES
        (@merchant_reference, @school_id, @amount, @currency, @customer_email, 'PENDING')
      `);

    //Save detailed items as JSON ON TEMPORARY TABLE
    await pool.request()
      .input("merchant_reference", sql.VarChar(50), orderID)
      .input("paymentItems", sql.NVarChar(sql.MAX), JSON.stringify(paymentItems))
      .input("created_at", sql.DateTime2, new Date())      
      .query(`
        INSERT INTO PayfortTempPaymentItems
        (merchant_reference, paymentItems,created_at)
        VALUES
        (@merchant_reference, @paymentItems, @created_at)
      `);      
    //end of keep tracking
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
async function handlePayfortCallback(req, res) {
  try {
    const payload = req.method === "GET" ? req.query : req.body;

    console.log("=== Payfort Callback ===", payload);

    if (!payload.signature) {
      return res.status(400).send("Missing signature");
    }

    // DB lookup
    const pool = await sql.connect(sqlConfig);

    const result = await pool.request()
      .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
      .query(`
        SELECT school_id
        FROM PayfortTransactions
        WHERE merchant_reference = @merchant_reference
      `);

    if (result.recordset.length === 0) {
      return res.status(400).send("Unknown merchant_reference");
    }

    const schoolId = result.recordset[0].school_id;

    // Verify signature with correct response phrase
    if (!verifySignature(payload, schoolId)) {
      return res.status(400).send("Invalid signature");
    }

    const success = payload.status === "14";

    if (success) {
      logPaymentAction(payload);

      await pool.request()
        .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
        .input("status", sql.VarChar(20), "SUCCESS")
        .input("fort_id", sql.VarChar(50), payload.fort_id || null)
        .query(`
          UPDATE PayfortTransactions
          SET
            status = @status,
            fort_id = @fort_id,
            updated_at = SYSDATETIME()
          WHERE merchant_reference = @merchant_reference
        `);

        const merchant_reff = payload.merchant_reference;
        const fortIDD = payload.fort_id;

        const itemsResult = await pool.request()
            .input("merchantreff", sql.VarChar(50), merchant_reff)
            .query(`
            SELECT paymentItems 
            FROM PayfortTempPaymentItems
            WHERE merchant_reference=@merchantreff 
            `);

        if (!itemsResult.recordset.length) {
            throw new Error("Payment items not found");
        }

        const paymentItems = JSON.parse(itemsResult.recordset[0].paymentItems);
        console.log("Payment Items to log:", paymentItems);
                
        for (const item of paymentItems) {
            await keepTrackPaymentAction(item, merchant_reff, fortIDD);
        }
      // Here to Settle all paid transactions 
      await pool.request()
        .input("famid", sql.Int, paymentItems[0].famid)
        .input("stid", sql.Int, paymentItems[0].stid)
        .execute("sp_GetStFeesDetDue_2");
      

  // 🧹 cleanup
  // await pool.request()
  //   .input("merchant_reference", sql.VarChar(50), merchant_reference)
  //   .query(`
  //     DELETE FROM PayfortTempPaymentItems
  //     WHERE merchant_reference=@merchant_reference
  //   `);
}    

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
    return res.status(500).send("Callback error");
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

// ---------- LOG PAYMENT ACTION ----------
async function keepTrackPaymentAction(paymentItem, merchant_reff, fortIDD) {
  const pool = await sql.connect(sqlConfig);
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const request = new sql.Request(transaction);
    // DELETE pending record for same item
    await request
      .input("CURYEAR", sql.VarChar, paymentItem.curyear)
      .input("S_CODE", sql.VarChar, paymentItem.stid)
      .input("FAMID", sql.Int, paymentItem.famid)
      .input("SCHOOLID", sql.Int, paymentItem.schoolId)
      .input("INSTCODE", sql.Int, paymentItem.instCode)
      .input("FACENAME", sql.VarChar, paymentItem.facename)
      .input("MERCHANTREFF_1", sql.VarChar, merchant_reff)
      .input("FORT_IDD_1", sql.VarChar, fortIDD)
      .query(`
        DELETE FROM APSTRANS
        WHERE CURYEAR=@CURYEAR
          AND S_CODE=@S_CODE
          AND FAMID=@FAMID
          AND SCHOOLID=@SCHOOLID
          AND InstCode=@INSTCODE
          AND FACENAME=@FACENAME
          AND SETTLED=0
          AND merchant_reference=@MERCHANTREFF_1
          AND FORT_ID=@FORT_IDD_1
      `);

    // INSERT confirmed payment
    await request
      .input("PAIDAMOUNT", sql.Numeric(18,2), paymentItem.amount)
      .input("TRNSDT", sql.DateTime2, new Date())
      .input("MERCHANT_REFF", sql.VarChar, merchant_reff)
      .input("FORT_IDD", sql.VarChar, fortIDD)
      .query(`
        INSERT INTO APSTRANS
          (
            CURYEAR, S_CODE, FAMID, SCHOOLID,
            InstCode, FACENAME,
            PAIDAMOUNT, TRNSDT, SETTLED,
            merchant_reference, fort_id
          )
        VALUES
          (
            @CURYEAR, @S_CODE, @FAMID, @SCHOOLID,
            @INSTCODE, @FACENAME,
            @PAIDAMOUNT, @TRNSDT, 0,
            @MERCHANT_REFF, @FORT_IDD
          )
      `);

    await transaction.commit();
    console.log("Payment item settled:", paymentItem.facename);
  } catch (err) {
    await transaction.rollback();
    console.error("SQL Error:", err);
    throw err;
  }
}

//API ENDPOINT TO LOG PAYMENT ITEMS
app.post("/api/log-payment", async (req, res) => {
  const { paymentItems } = req.body;

  console.log("Incoming items:", paymentItems);

  if (!Array.isArray(paymentItems) || !paymentItems.length) {
    return res.status(400).json({ message: "paymentItems array is required" });
  }

  try {
    for (const item of paymentItems) {
      await keepTrackPaymentAction(item);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ---------- ENDPOINT: LOG PAYMENT ITEMS ----------

app.get("/payfort-callback", handlePayfortCallback);
app.post("/payfort-callback", handlePayfortCallback);

// ---------- START SERVER ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// ---------- END OF FILE ----------