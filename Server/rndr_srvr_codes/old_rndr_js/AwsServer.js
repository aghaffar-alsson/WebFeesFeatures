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
  requestTimeout: 35000,
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
//function createSignature(params, schoolId) {
//  // Resolve credentials dynamically
//  const { request_phrase } = getMerchantCredentials(schoolId);  
//  const sorted = Object.keys(params).sort();
//  const concatenated = sorted.map((key) => `${key}=${params[key]}`).join("");
//  //const toHash = `${process.env.AM_RequestPhrase}${concatenated}${process.env.AM_RequestPhrase}`;
//  const toHash = `${request_phrase}${concatenated}${request_phrase}`;
//  
//  return crypto.createHash("sha256").update(toHash).digest("hex");
//}
//CREATE PAYFORT SIGNATURE
//CREATE PAYFORT SIGNATURE
function createSignature(params, schoolId) {
  const { request_phrase } = getMerchantCredentials(schoolId);

  const phrase = String(request_phrase || "").trim();
  const sorted = Object.keys(params).sort();

  const concatenated = sorted
    .map((key) => `${key}=${String(params[key]).trim()}`)
    .join("");

  const toHash = `${phrase}${concatenated}${phrase}`;

  console.log("=== SIGNATURE DEBUG ===");
  console.log("Signature base string:", toHash);

  return crypto
    .createHash("sha256")
    .update(toHash, "utf8")
    .digest("hex")
    .toUpperCase();
}
// VERIFY PAYFORT SIGNATURE
function verifySignature(params, schoolId) {
  const { response_phrase } = getMerchantCredentials(schoolId);

  const phrase = String(response_phrase || "").trim();

  const data = { ...params };
  const receivedSignature = String(data.signature || "").trim().toUpperCase();
  delete data.signature;

  const sortedKeys = Object.keys(data).sort();

  const concatenated = sortedKeys
    .map((key) => `${key}=${String(data[key]).trim()}`)
    .join("");

  const stringToHash = `${phrase}${concatenated}${phrase}`;

  const generatedSignature = crypto
    .createHash("sha256")
    .update(stringToHash, "utf8")
    .digest("hex")
    .toUpperCase();

  console.log("=== APS VERIFY DEBUG ===");
  console.log("Sorted Keys:", sortedKeys);
  console.log("Concatenated:", concatenated);
  console.log("String To Hash:", stringToHash);
  console.log("Generated Signature:", generatedSignature);
  console.log("Received Signature:", receivedSignature);

  return generatedSignature === receivedSignature;
}

// ---------- MERCHANT REFERENCE GENERATOR ----------
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
const {
  amount,
  currency,
  email,
  schoolId,
  paymentItems = [],
  frontendOrigin,

  // STUDENT DATA
  studentId,
  studentName,
  curYgp,
  familyNo,
  familyName,
  fullName
} = req.body;

    const schoolCode = Number(schoolId);

    if (![1, 2].includes(schoolCode)) {
      return res.status(400).json({ error: "Invalid schoolId" });
    }

    if (!frontendOrigin) {
      return res.status(400).json({ error: "frontendOrigin is required" });
    }

    // 🔐 Optional security whitelist
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://alsson-web-fees-features-2pr9.vercel.app",
      "https://fees.family.alsson.app",
    ];

  app.use(cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // mobile apps / postman
  
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
  
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }));
      
    if (!allowedOrigins.includes(frontendOrigin)) {
      return res.status(400).json({ error: "Invalid frontend origin" });
    }

    // Validate amount
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // APS requires MINOR UNITS as INTEGER STRING
    // Example: 61784.86 EGP => "6178486"
    const apsAmount = String(Math.round(numericAmount * 100));

    // Safe email fallback
    const safeEmail = String(email || "aghaffar@alsson.com").trim();

    const orderID = generateMerchantReference();

    // Resolve credentials dynamically
    const { merchant_identifier, access_code } = getMerchantCredentials(schoolCode);
    const creds = getMerchantCredentials(schoolCode);
    // DEBUG LOGGING FOR CREDENTIALS AND PAYLOAD PARAMS
    console.log("=== APS CREDENTIALS DEBUG ===");
    console.log("schoolCode:", schoolCode);
    console.log("merchant_identifier:", JSON.stringify(String(creds.merchant_identifier || "").trim()));
    console.log("access_code:", JSON.stringify(String(creds.access_code || "").trim()));
    console.log("request_phrase:", JSON.stringify(String(creds.request_phrase || "").trim()));
    console.log("response_phrase:", JSON.stringify(String(creds.response_phrase || "").trim()));
    
    let formPayLoad = {
      command: "PURCHASE",
      language: "en",
      merchant_identifier: String(merchant_identifier).trim(),
      access_code: String(access_code).trim(),
      merchant_reference: orderID,
      amount: apsAmount, // IMPORTANT: string integer
      currency: String(currency).trim(),
      customer_email: safeEmail,
      eci: "ECOMMERCE",
      return_url: `${PUBLIC_URL}/payfort-callback`,
      //return_url: import.meta.env.VITE_CALLBACK_URL,
    };

    console.log("=== CREATE FORM PAYLOAD DEBUG ===");
    console.log("Frontend amount (major units):", amount);
    console.log("Numeric amount:", numericAmount);
    console.log("APS amount (minor units):", apsAmount);
    console.log("schoolCode:", schoolCode);
    console.log("safeEmail:", safeEmail);
    console.log("Payload BEFORE signature:", formPayLoad);

    formPayLoad.signature = createSignature(formPayLoad, schoolCode);

    console.log("Generated signature:", formPayLoad.signature);
    console.log("Payload AFTER signature:", formPayLoad);

    // here insert a record to keep track the merchant reference and the school id
    const pool = await sql.connect(sqlConfig);
  await pool.request()
  .input("merchant_reference", sql.VarChar(50), orderID)
  .input("school_id", sql.Int, schoolCode)
  .input("amount", sql.Int, Number(apsAmount)) // IMPORTANT: minor units
  .input("currency", sql.Char(3), String(currency).trim())
  .input("customer_email", sql.NVarChar(255), safeEmail)
  .input("frontend_origin", sql.NVarChar(255), frontendOrigin)

  // NEW student/family info
  .input("student_id", sql.Int, studentId ? Number(studentId) : null)
  .input("student_name", sql.NVarChar(255), String(studentName || "").trim())
  .input("cur_ygp", sql.NVarChar(100), String(curYgp || "").trim())
  .input("family_no", sql.Int, familyNo ? Number(familyNo) : null)
  .input("family_name", sql.NVarChar(255), String(familyName || "").trim())
  .input("full_name", sql.NVarChar(255), String(fullName || "").trim())
  .query(`
    INSERT INTO PayfortTransactions
    (
      merchant_reference,
      school_id,
      amount,
      currency,
      customer_email,
      status,
      frontend_origin,
      student_id,
      student_name,
      cur_ygp,
      family_no,
      family_name,
      full_name
    )
    VALUES
    (
      @merchant_reference,
      @school_id,
      @amount,
      @currency,
      @customer_email,
      'PENDING',
      @frontend_origin,
      @student_id,
      @student_name,
      @cur_ygp,
      @family_no,
      @family_name,
      @full_name
    )
  `);

    // Save detailed items as JSON ON TEMPORARY TABLE
    await pool.request()
      .input("merchant_reference", sql.VarChar(50), orderID)
      .input("paymentItems", sql.NVarChar(sql.MAX), JSON.stringify(paymentItems))
      .input("created_at", sql.DateTime2, new Date())
      .query(`
        INSERT INTO PayfortTempPaymentItems
        (merchant_reference, paymentItems, created_at)
        VALUES
        (@merchant_reference, @paymentItems, @created_at)
      `);

    res.json(formPayLoad);
  } catch (error) {
    console.error("createFormPayLoad error:", error);
    res.status(500).json({
      error: "Error creating Payfort payload",
      details: error.message
    });
  }
});

// ---------- LOG PAYMENT ACTION ----------
// ---------- LOG PAYMENT ACTION ----------
async function logPaymentAction(payload) {
  try {

    const pool = await sql.connect(sqlConfig);

    // Read original email + student/family data from master transaction row
    const trxResult = await pool.request()
      .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
      .query(`
        SELECT
          customer_email,
          student_id,
          student_name,
          cur_ygp,
          family_no,
          family_name,
          full_name
        FROM PayfortTransactions
        WHERE merchant_reference = @merchant_reference
      `);

    if (!trxResult.recordset.length) {
      throw new Error(`No PayfortTransactions row found for merchant_reference=${payload.merchant_reference}`);
    }

    const trx = trxResult.recordset[0];
    // Check for existing log to prevent duplicates Idempotency protection for log table
    const existingLog = await pool.request()
      .input("merchant_reference", sql.VarChar(50), payload.merchant_reference || null)
      .input("fort_id", sql.VarChar(50), payload.fort_id || null)
      .query(`
        SELECT 1
        FROM OnlinePayfortLog
        WHERE merchant_reference = @merchant_reference
          AND fort_id = @fort_id
      `);

    if (existingLog.recordset.length) {
      console.log("OnlinePayfortLog already exists, skipping duplicate insert");
      return;
    }

    await pool.request()
      .input("fort_id", sql.VarChar(50), payload.fort_id || null)
      .input("merchant_reference", sql.VarChar(50), payload.merchant_reference || null)
      .input("amount", sql.Int, payload.amount ? Number(payload.amount) : null) // minor units from APS

      // USE ORIGINAL EMAIL FROM YOUR DB, NOT APS CALLBACK
      .input("customer_email", sql.NVarChar(255), trx.customer_email || null)

      .input("payment_option", sql.VarChar(50), payload.payment_option || null)
      .input("response_message", sql.NVarChar(500), payload.response_message || null)
      .input("actiondate", sql.Date, new Date())
      .input("emlsnt", sql.Int, 0)

      // Student/family fields from DB, NOT from APS callback (for security and data integrity)
      .input("student_id", sql.Int, trx.student_id || null)
      .input("student_name", sql.NVarChar(255), trx.student_name || null)
      .input("cur_ygp", sql.NVarChar(100), trx.cur_ygp || null)
      .input("family_no", sql.Int, trx.family_no || null)
      .input("family_name", sql.NVarChar(255), trx.family_name || null)
      .input("full_name", sql.NVarChar(255), trx.full_name || null)

      .query(`
        INSERT INTO OnlinePayfortLog (
          fort_id,
          merchant_reference,
          amount,
          customer_email,
          payment_option,
          response_message,
          actiondate,
          emlsnt,
          student_id,
          student_name,
          cur_ygp,
          family_no,
          family_name,
          full_name
        )
        VALUES (
          @fort_id,
          @merchant_reference,
          @amount,
          @customer_email,
          @payment_option,
          @response_message,
          @actiondate,
          @emlsnt,
          @student_id,
          @student_name,
          @cur_ygp,
          @family_no,
          @family_name,
          @full_name
        )
      `);

    console.log("Payment logged to OnlinePayfortLog with ORIGINAL email + student/family info");
  } catch (err) {
    console.error("SQL Error in logPaymentAction:", err);
    throw err;
  }
}
// ---------- LOG PAYMENT ACTION ----------
async function keepTrackPaymentAction(paymentItem, merchant_reff, fortIDD) {
  const pool = await sql.connect(sqlConfig);
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const request = new sql.Request(transaction);
    // DELETE pending record for same item
    await request
      .input("CURYEAR", sql.Int, paymentItem.curyear)
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

    // Check if a record already exists for this item with the same merchant reference and fort_id
    // If the exact confirmed APS row already exists, skip insert
    const existsResult = await request
      .input("CURYEAR_CHECK", sql.Int, paymentItem.curyear)
      .input("S_CODE_CHECK", sql.VarChar, paymentItem.stid)
      .input("FAMID_CHECK", sql.Int, paymentItem.famid)
      .input("SCHOOLID_CHECK", sql.Int, paymentItem.schoolId)
      .input("INSTCODE_CHECK", sql.Int, paymentItem.instCode)
      .input("FACENAME_CHECK", sql.VarChar, paymentItem.facename)
      .input("MERCHANT_REFF_CHECK", sql.VarChar, merchant_reff)
      .input("FORT_IDD_CHECK", sql.VarChar, fortIDD)
      .query(`
        SELECT 1
        FROM APSTRANS
        WHERE CURYEAR = @CURYEAR_CHECK
          AND S_CODE = @S_CODE_CHECK
          AND FAMID = @FAMID_CHECK
          AND SCHOOLID = @SCHOOLID_CHECK
          AND InstCode = @INSTCODE_CHECK
          AND FACENAME = @FACENAME_CHECK
          AND merchant_reference = @MERCHANT_REFF_CHECK
          AND fort_id = @FORT_IDD_CHECK
      `);

    if (existsResult.recordset.length) {
      console.log("APSTRANS row already exists, skipping duplicate insert:", paymentItem.facename);
      await transaction.commit();
      return;
    }
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
            merchant_reference, fort_id,confrmd, emll
          )
        VALUES
          (
            @CURYEAR, @S_CODE, @FAMID, @SCHOOLID,
            @INSTCODE, @FACENAME,
            @PAIDAMOUNT, @TRNSDT, 0,
            @MERCHANT_REFF, @FORT_IDD, 0, 'aghaffar@alsson.com'
          )
      `);

    await transaction.commit();
    console.log("Payment item settled:", paymentItem.facename);
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (rbErr) {
      console.error("Rollback error in keepTrackPaymentAction:", rbErr);
    }
    console.error("SQL Error in keepTrackPaymentAction:", err);
    throw err;
  }
}
// ---------- CALLBACK HANDLER ----------
// async function handlePayfortCallback(req, res) {
//   try {
//     const payload = req.method === "GET" ? req.query : req.body;

//     console.log("=== Payfort Callback ===", payload);

//     if (!payload.signature) {
//       return res.status(400).send("Missing signature");
//     }

//     // DB lookup to get school_id and original email + student/family data for this merchant_reference
//     const pool = await sql.connect(sqlConfig);
//     const result = await pool.request()
//       .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
//       .query(`
//         SELECT
//           school_id,
//           frontend_origin,
//           customer_email,
//           student_id,
//           student_name,
//           cur_ygp,
//           family_no,
//           family_name,
//           full_name
//         FROM PayfortTransactions
//         WHERE merchant_reference = @merchant_reference
//       `);

//     if (result.recordset.length === 0) {
//       return res.status(400).send("Unknown merchant_reference");
//     }

//     const trxRow = result.recordset[0];

//     const schoolId = trxRow.school_id;
//     const FRONTEND_URL = trxRow.frontend_origin;

//     // ORIGINAL values from your DB (NOT APS callback masked values)
//     const originalEmail = trxRow.customer_email || "";
//     const student_id = trxRow.student_id || "";
//     const student_name = trxRow.student_name || "";
//     const cur_ygp = trxRow.cur_ygp || "";
//     const family_name = trxRow.family_name || "";
//     const family_no = trxRow.family_no || 0;
//     const full_name = trxRow.full_name || "";
    
//     // Verify signature with correct response phrase
//     if (!verifySignature(payload, schoolId)) {
//       return res.status(400).send("Invalid signature");
//     }

// // const success = payload.status === "14";
// // const finalStatus = success ? "SUCCESS" : "FAILED";
//     const success = payload.status === "14";

//     // Helper to build redirect URL
//     const buildRedirectUrl = (statusText, fortIdOverride = null) => {
//       return (
//         `${FRONTEND_URL}/checkout-result?status=${statusText}` +
//         `&amount=${payload.amount || ""}` +
//         `&fort_id=${fortIdOverride || payload.fort_id || ""}` +
//         `&merchant_reference=${payload.merchant_reference || ""}` +
//         `&response_message=${encodeURIComponent(payload.response_message || "")}` +
//         `&customer_email=${encodeURIComponent(originalEmail)}` +
//         `&student_id=${encodeURIComponent(student_id)}` +
//         `&student_name=${encodeURIComponent(student_name)}` +
//         `&cur_ygp=${encodeURIComponent(cur_ygp)}`
//       );
//     };

//     // // Always update transaction final status and fort_id (for tracking), even if signature is valid
//     // await pool.request()
//     // .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
//     // .input("status", sql.VarChar(20), finalStatus)
//     // .input("fort_id", sql.VarChar(50), payload.fort_id || null)
//     // .query(`
//     //   UPDATE PayfortTransactions
//     //   SET
//     //     status = @status,
//     //     fort_id = @fort_id,
//     //     updated_at = SYSDATETIME()
//     //   WHERE merchant_reference = @merchant_reference
//     // `);

// //In case of success, Log payment action with original email and student/family info from DB
// // if (success) {
// //   // ---------- CREATE SAFE PAYLOAD ----------
// //   // const trxRow = result.recordset[0];

// //   // const safePayload = {
// //   //   ...payload,
// //   //   customer_email: trxRow.customer_email || payload.customer_email || "",
// //   //   student_id: trxRow.student_id || null,
// //   //   student_name: trxRow.student_name || "",
// //   //   cur_ygp: trxRow.cur_ygp || "",
// //   //   family_no: trxRow.family_no || null,
// //   //   family_name: trxRow.family_name || "",
// //   //   full_name: trxRow.full_name || "",
// //   // }; 
// //   await logPaymentAction(payload);
// //   // await logPaymentAction(safePayload);

// //   const merchant_reff = payload.merchant_reference;
// //   const fortIDD = payload.fort_id;

// //   const itemsResult = await pool.request()
// //     .input("merchantreff", sql.VarChar(50), merchant_reff)
// //     .query(`
// //       SELECT paymentItems 
// //       FROM PayfortTempPaymentItems
// //       WHERE merchant_reference = @merchantreff
// //     `);

// //   console.log("Payment items fetched from DB:", itemsResult.recordset);

// //   if (!itemsResult.recordset.length) {
// //     throw new Error("Payment items not found");
// //   }

// //   const paymentItems = JSON.parse(itemsResult.recordset[0].paymentItems);
// //   console.log("Parsed paymentItems:", JSON.stringify(paymentItems, null, 2));
// //   console.log("Merchant Reference:", merchant_reff);

// //   // 1) Process each payment item individually
// //   for (let i = 0; i < paymentItems.length; i++) {
// //     const item = paymentItems[i];
// //     console.log(`keepTrackPaymentAction START [${i}]`, item);

// //     await keepTrackPaymentAction(item, merchant_reff, fortIDD);

// //     console.log(`keepTrackPaymentAction DONE [${i}]`, item);
// //   }

// //   console.log("All payment items processed for merchant reference:", merchant_reff);

// //   // 2) Build unique settlement groups
// //   const uniqueSettlements = new Map();

// //   for (let i = 0; i < paymentItems.length; i++) {
// //     const item = paymentItems[i];

// //     const famId = Number(item.famid);
// //     const stId = Number(item.stid);
// //     const year = Number(item.curyear);

// //     console.log(`Settlement candidate [${i}]`, {
// //       raw: item,
// //       famId,
// //       stId,
// //       year,
// //       isFamInt: Number.isInteger(famId),
// //       isStInt: Number.isInteger(stId),
// //       isYearInt: Number.isInteger(year),
// //     });

// //     if (!Number.isInteger(famId)) {
// //       throw new Error(`Invalid FAMID: ${item.famid}`);
// //     }

// //     if (!Number.isInteger(stId)) {
// //       throw new Error(`Invalid STID: ${item.stid}`);
// //     }

// //     if (!Number.isInteger(year)) {
// //       throw new Error(`Invalid CURYEAR: ${item.curyear}`);
// //     }

// //     const key = `${famId}_${stId}_${year}`;

// //     if (!uniqueSettlements.has(key)) {
// //       uniqueSettlements.set(key, { famId, stId, year });
// //       console.log("Added unique settlement:", key);
// //     } else {
// //       console.log("Skipped duplicate settlement:", key);
// //     }
// //   }

// //   const settlements = [...uniqueSettlements.values()];
// //   console.log("Unique settlement groups FINAL:", settlements);

// //   // 3) Execute settlement for each unique group
// //   for (let i = 0; i < settlements.length; i++) {
// //     const settlement = settlements[i];

// //     console.log(`sp_GetStFeesDetDue_2 START [${i}]`, settlement);

// //     try {
// //       const spResult = await pool.request()
// //         .input("famid", sql.Int, settlement.famId)
// //         .input("stid", sql.Int, settlement.stId)
// //         .input("trgtYr", sql.Int, settlement.year)
// //         .execute("sp_GetStFeesDetDue_2");

// //       console.log(`sp_GetStFeesDetDue_2 DONE [${i}]`, {
// //         settlement,
// //         recordsetsCount: spResult?.recordsets?.length,
// //         rowsAffected: spResult?.rowsAffected,
// //         returnValue: spResult?.returnValue,
// //       });
// //     } catch (spErr) {
// //       console.error(`sp_GetStFeesDetDue_2 FAILED [${i}]`, settlement, spErr);
// //       throw spErr;
// //     }
// //   }

// //   console.log("All settlements completed successfully");
// // }

// if (success) {
//   // =========================================================
//   // STEP 1: ATOMICALLY CLAIM THIS CALLBACK (PENDING -> PROCESSING)
//   // Only ONE callback can win this update
//   // =========================================================
//   const claimResult = await pool.request()
//     .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
//     .input("fort_id", sql.VarChar(50), payload.fort_id || null)
//     .query(`
//       UPDATE PayfortTransactions
//       SET
//         status = 'PROCESSING',
//         fort_id = ISNULL(@fort_id, fort_id),
//         updated_at = SYSDATETIME()
//       WHERE merchant_reference = @merchant_reference
//         AND status = 'PENDING'
//     `);

//   const claimed = (claimResult.rowsAffected?.[0] || 0) > 0;

//   // =========================================================
//   // If not claimed, this callback is duplicate or already processed
//   // =========================================================
//   if (!claimed) {
//     const existingResult = await pool.request()
//       .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
//       .query(`
//         SELECT status, fort_id
//         FROM PayfortTransactions
//         WHERE merchant_reference = @merchant_reference
//       `);

//     const current = existingResult.recordset[0];

//     console.log("Duplicate/already handled success callback skipped", {
//       merchant_reference: payload.merchant_reference,
//       currentStatus: current?.status,
//       fort_id: current?.fort_id,
//     });

//     // If already success, return success redirect
//     if (current?.status === "SUCCESS") {
//       return res.redirect(302, buildRedirectUrl("success", current?.fort_id));
//     }

//     // If still processing, also redirect as success page (or you can make a special processing page later)
//     if (current?.status === "PROCESSING") {
//       return res.redirect(302, buildRedirectUrl("success", current?.fort_id));
//     }

//     // If posting failed previously, keep success visible to user but backend still needs admin retry
//     if (current?.status === "POSTING_FAILED") {
//       return res.redirect(302, buildRedirectUrl("success", current?.fort_id));
//     }

//     // Fallback
//     return res.redirect(302, buildRedirectUrl("success", current?.fort_id));
//   }

//   // =========================================================
//   // STEP 2: ONLY THE WINNER CONTINUES
//   // =========================================================
//   try {
//     await logPaymentAction(payload);

//     const merchant_reff = payload.merchant_reference;
//     const fortIDD = payload.fort_id;

//     const itemsResult = await pool.request()
//       .input("merchantreff", sql.VarChar(50), merchant_reff)
//       .query(`
//         SELECT paymentItems 
//         FROM PayfortTempPaymentItems
//         WHERE merchant_reference = @merchantreff
//       `);

//     console.log("Payment items fetched from DB:", itemsResult.recordset);

//     if (!itemsResult.recordset.length) {
//       throw new Error("Payment items not found");
//     }

//     const paymentItems = JSON.parse(itemsResult.recordset[0].paymentItems);
//     console.log("Parsed paymentItems:", JSON.stringify(paymentItems, null, 2));
//     console.log("Merchant Reference:", merchant_reff);

//     // 1) Process each payment item individually
//     for (let i = 0; i < paymentItems.length; i++) {
//       const item = paymentItems[i];
//       console.log(`keepTrackPaymentAction START [${i}]`, item);

//       await keepTrackPaymentAction(item, merchant_reff, fortIDD);

//       console.log(`keepTrackPaymentAction DONE [${i}]`, item);
//     }

//     console.log("All payment items processed for merchant reference:", merchant_reff);

//     // 2) Build unique settlement groups
//     const uniqueSettlements = new Map();

//     for (let i = 0; i < paymentItems.length; i++) {
//       const item = paymentItems[i];

//       const famId = Number(item.famid);
//       const stId = Number(item.stid);
//       const year = Number(item.curyear);

//       console.log(`Settlement candidate [${i}]`, {
//         raw: item,
//         famId,
//         stId,
//         year,
//         isFamInt: Number.isInteger(famId),
//         isStInt: Number.isInteger(stId),
//         isYearInt: Number.isInteger(year),
//       });

//       if (!Number.isInteger(famId)) {
//         throw new Error(`Invalid FAMID: ${item.famid}`);
//       }

//       if (!Number.isInteger(stId)) {
//         throw new Error(`Invalid STID: ${item.stid}`);
//       }

//       if (!Number.isInteger(year)) {
//         throw new Error(`Invalid CURYEAR: ${item.curyear}`);
//       }

//       const key = `${famId}_${stId}_${year}`;

//       if (!uniqueSettlements.has(key)) {
//         uniqueSettlements.set(key, { famId, stId, year });
//         console.log("Added unique settlement:", key);
//       } else {
//         console.log("Skipped duplicate settlement:", key);
//       }
//     }

//     const settlements = [...uniqueSettlements.values()];
//     console.log("Unique settlement groups FINAL:", settlements);

//     // 3) Execute settlement for each unique group
//     for (let i = 0; i < settlements.length; i++) {
//       const settlement = settlements[i];

//       console.log(`sp_GetStFeesDetDue_2 START [${i}]`, settlement);

//       try {
//         const spResult = await pool.request()
//           .input("famid", sql.Int, settlement.famId)
//           .input("stid", sql.Int, settlement.stId)
//           .input("trgtYr", sql.Int, settlement.year)
//           .execute("sp_GetStFeesDetDue_2");

//         console.log(`sp_GetStFeesDetDue_2 DONE [${i}]`, {
//           settlement,
//           recordsetsCount: spResult?.recordsets?.length,
//           rowsAffected: spResult?.rowsAffected,
//           returnValue: spResult?.returnValue,
//         });
//       } catch (spErr) {
//         console.error(`sp_GetStFeesDetDue_2 FAILED [${i}]`, settlement, spErr);
//         throw spErr;
//       }
//     }

//     console.log("All settlements completed successfully");

//     // =========================================================
//     // STEP 3: MARK FINAL SUCCESS
//     // =========================================================
//     await pool.request()
//       .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
//       .input("fort_id", sql.VarChar(50), payload.fort_id || null)
//       .query(`
//         UPDATE PayfortTransactions
//         SET
//           status = 'SUCCESS',
//           fort_id = ISNULL(@fort_id, fort_id),
//           updated_at = SYSDATETIME()
//         WHERE merchant_reference = @merchant_reference
//       `);

//   } catch (processingErr) {
//     // =========================================================
//     // IMPORTANT: If processing fails AFTER callback was valid,
//     // move back to PENDING so you can safely retry manually or
//     // let APS retry if needed.
//     // =========================================================
//     await pool.request()
//       .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
//       .input("fort_id", sql.VarChar(50), payload.fort_id || null)
//       .query(`
//         UPDATE PayfortTransactions
//         SET
//           status = 'PENDING',
//           fort_id = ISNULL(@fort_id, fort_id),
//           updated_at = SYSDATETIME()
//         WHERE merchant_reference = @merchant_reference
//           AND status = 'PROCESSING'
//       `);

//     throw processingErr;
//   }

// } else {
//   // Failed APS payment -> safe to mark FAILED
//   await pool.request()
//     .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
//     .input("fort_id", sql.VarChar(50), payload.fort_id || null)
//     .query(`
//       UPDATE PayfortTransactions
//       SET
//         status = 'FAILED',
//         fort_id = ISNULL(@fort_id, fort_id),
//         updated_at = SYSDATETIME()
//       WHERE merchant_reference = @merchant_reference
//         AND status IN ('PENDING', 'PROCESSING')
//     `);
// }
//     //const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

//     // const redirectUrl =
//     //   `${FRONTEND_URL}/checkout-result?status=${success ? "success" : "failed"}` +
//     //   `&amount=${payload.amount}` +
//     //   `&fort_id=${payload.fort_id}` +
//     //   `&merchant_reference=${payload.merchant_reference}` +
//     //   `&response_message=${encodeURIComponent(payload.response_message || "")}` +
//     //   `&customer_email=${encodeURIComponent(payload.customer_email || "")}`;   

// const redirectUrl =
//   `${FRONTEND_URL}/checkout-result?status=${success ? "success" : "failed"}` +
//   `&amount=${payload.amount || ""}` +
//   `&fort_id=${payload.fort_id || ""}` +
//   `&merchant_reference=${payload.merchant_reference || ""}` +
//   `&response_message=${encodeURIComponent(payload.response_message || "")}` +
//   // `&customer_email=${encodeURIComponent(payload.customer_email || "")}` +
//   `&customer_email=${encodeURIComponent(originalEmail || "")}` +
//   `&student_id=${encodeURIComponent(student_id)}` +
//   `&student_name=${encodeURIComponent(student_name)}` +
//   `&cur_ygp=${encodeURIComponent(cur_ygp)}`;
    
//   return res.redirect(302, redirectUrl);

//   } catch (err) {
//     console.error("Callback error:", err);
//     return res.status(500).send("Callback error");
//   }
// }
// ---------- CALLBACK HANDLER ----------
async function handlePayfortCallback(req, res) {
  try {
    const payload = req.method === "GET" ? req.query : req.body;

    console.log("=== Payfort Callback ===", payload);

    if (!payload.signature) {
      return res.status(400).send("Missing signature");
    }

    // DB lookup for transaction
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request()
      .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
      .query(`
        SELECT
          school_id,
          frontend_origin,
          customer_email,
          student_id,
          student_name,
          cur_ygp,
          family_no,
          family_name,
          full_name,
          status,
          fort_id
        FROM PayfortTransactions
        WHERE merchant_reference = @merchant_reference
      `);

    if (result.recordset.length === 0) {
      return res.status(400).send("Unknown merchant_reference");
    }

    const trxRow = result.recordset[0];

    const schoolId = trxRow.school_id;
    const FRONTEND_URL = trxRow.frontend_origin;

    // ORIGINAL values from your DB (NOT APS callback masked values)
    const originalEmail = trxRow.customer_email || "";
    const student_id = trxRow.student_id || "";
    const student_name = trxRow.student_name || "";
    const cur_ygp = trxRow.cur_ygp || "";
    const family_name = trxRow.family_name || "";
    const family_no = trxRow.family_no || 0;
    const full_name = trxRow.full_name || "";

    // Verify signature using correct school credentials
    if (!verifySignature(payload, schoolId)) {
      return res.status(400).send("Invalid signature");
    }

    const success = payload.status === "14";

    // Helper to build redirect URL
    const buildRedirectUrl = (statusText, fortIdOverride = null) => {
      return (
        `${FRONTEND_URL}/checkout-result?status=${statusText}` +
        `&amount=${payload.amount || ""}` +
        `&fort_id=${fortIdOverride || payload.fort_id || ""}` +
        `&merchant_reference=${payload.merchant_reference || ""}` +
        `&response_message=${encodeURIComponent(payload.response_message || "")}` +
        `&customer_email=${encodeURIComponent(originalEmail)}` +
        `&student_id=${encodeURIComponent(student_id)}` +
        `&student_name=${encodeURIComponent(student_name)}` +
        `&cur_ygp=${encodeURIComponent(cur_ygp)}`
      );
    };

    if (success) {
      // =========================================================
      // STEP 1: ATOMICALLY CLAIM CALLBACK (PENDING -> PROCESSING)
      // Only ONE callback can win this
      // =========================================================
      const claimResult = await pool.request()
        .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
        .input("fort_id", sql.VarChar(50), payload.fort_id || null)
        .query(`
          UPDATE PayfortTransactions
          SET
            status = 'PROCESSING',
            fort_id = ISNULL(@fort_id, fort_id),
            updated_at = SYSDATETIME()
          WHERE merchant_reference = @merchant_reference
            AND status = 'PENDING'
        `);

      const claimed = (claimResult.rowsAffected?.[0] || 0) > 0;

      // =========================================================
      // DUPLICATE / ALREADY HANDLED CALLBACK
      // =========================================================
      if (!claimed) {
        const existingResult = await pool.request()
          .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
          .query(`
            SELECT status, fort_id
            FROM PayfortTransactions
            WHERE merchant_reference = @merchant_reference
          `);

        const current = existingResult.recordset[0];

        console.log("Duplicate/already handled success callback skipped", {
          merchant_reference: payload.merchant_reference,
          currentStatus: current?.status,
          fort_id: current?.fort_id,
        });

        // If already success, return success redirect
        if (current?.status === "SUCCESS") {
          return res.redirect(302, buildRedirectUrl("success", current?.fort_id));
        }

        // If still processing, also redirect as success page (or you can make a special processing page later)
        if (current?.status === "PROCESSING") {
          return res.redirect(302, buildRedirectUrl("success", current?.fort_id));
        }

        // If posting failed previously, keep success visible to user but backend still needs admin retry
        if (current?.status === "POSTING_FAILED") {
          return res.redirect(302, buildRedirectUrl("success", current?.fort_id));
        }

        // Fallback
        return res.redirect(302, buildRedirectUrl("success", current?.fort_id));
      }

      // =========================================================
      // ONLY THE WINNER CONTINUES PROCESSING
      // =========================================================
      try {
        // 1) Log payment (duplicate-safe)
        await logPaymentAction(payload);

        const merchant_reff = payload.merchant_reference;
        const fortIDD = payload.fort_id;

        // 2) Fetch saved payment items
        const itemsResult = await pool.request()
          .input("merchantreff", sql.VarChar(50), merchant_reff)
          .query(`
            SELECT paymentItems 
            FROM PayfortTempPaymentItems
            WHERE merchant_reference = @merchantreff
          `);

        console.log("Payment items fetched from DB:", itemsResult.recordset);

        if (!itemsResult.recordset.length) {
          throw new Error("Payment items not found");
        }

        const paymentItems = JSON.parse(itemsResult.recordset[0].paymentItems);
        console.log("Parsed paymentItems:", JSON.stringify(paymentItems, null, 2));
        console.log("Merchant Reference:", merchant_reff);

        // 3) Process each payment item individually
        for (let i = 0; i < paymentItems.length; i++) {
          const item = paymentItems[i];
          console.log(`keepTrackPaymentAction START [${i}]`, item);

          await keepTrackPaymentAction(item, merchant_reff, fortIDD);

          console.log(`keepTrackPaymentAction DONE [${i}]`, item);
        }

        console.log("All payment items processed for merchant reference:", merchant_reff);

        // 4) Build unique settlement groups
        const uniqueSettlements = new Map();

        for (let i = 0; i < paymentItems.length; i++) {
          const item = paymentItems[i];

          const famId = Number(item.famid);
          const stId = Number(item.stid);
          const year = Number(item.curyear);

          console.log(`Settlement candidate [${i}]`, {
            raw: item,
            famId,
            stId,
            year,
            isFamInt: Number.isInteger(famId),
            isStInt: Number.isInteger(stId),
            isYearInt: Number.isInteger(year),
          });

          if (!Number.isInteger(famId)) {
            throw new Error(`Invalid FAMID: ${item.famid}`);
          }

          if (!Number.isInteger(stId)) {
            throw new Error(`Invalid STID: ${item.stid}`);
          }

          if (!Number.isInteger(year)) {
            throw new Error(`Invalid CURYEAR: ${item.curyear}`);
          }

          const key = `${famId}_${stId}_${year}`;

          if (!uniqueSettlements.has(key)) {
            uniqueSettlements.set(key, { famId, stId, year });
            console.log("Added unique settlement:", key);
          } else {
            console.log("Skipped duplicate settlement:", key);
          }
        }

        const settlements = [...uniqueSettlements.values()];
        console.log("Unique settlement groups FINAL:", settlements);

        // 5) Execute settlement SP for each unique group
        for (let i = 0; i < settlements.length; i++) {
          const settlement = settlements[i];

          console.log(`sp_GetStFeesDetDue_2 START [${i}]`, settlement);

          try {
            const spResult = await pool.request()
              .input("famid", sql.Int, settlement.famId)
              .input("stid", sql.Int, settlement.stId)
              .input("trgtYr", sql.Int, settlement.year)
              .execute("sp_GetStFeesDetDue_2");

            console.log(`sp_GetStFeesDetDue_2 DONE [${i}]`, {
              settlement,
              recordsetsCount: spResult?.recordsets?.length,
              rowsAffected: spResult?.rowsAffected,
              returnValue: spResult?.returnValue,
            });
          } catch (spErr) {
            console.error(`sp_GetStFeesDetDue_2 FAILED [${i}]`, settlement, spErr);
            throw spErr;
          }
        }

        console.log("All settlements completed successfully");

        // 6) Final success
        await pool.request()
          .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
          .input("fort_id", sql.VarChar(50), payload.fort_id || null)
          .query(`
            UPDATE PayfortTransactions
            SET
              status = 'SUCCESS',
              fort_id = ISNULL(@fort_id, fort_id),
              updated_at = SYSDATETIME()
            WHERE merchant_reference = @merchant_reference
          `);

      } catch (processingErr) {
        console.error("Processing failed AFTER successful APS payment:", processingErr);

        // APS succeeded, but internal posting failed => mark POSTING_FAILED
        await pool.request()
          .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
          .input("fort_id", sql.VarChar(50), payload.fort_id || null)
          .query(`
            UPDATE PayfortTransactions
            SET
              status = 'POSTING_FAILED',
              fort_id = ISNULL(@fort_id, fort_id),
              updated_at = SYSDATETIME()
            WHERE merchant_reference = @merchant_reference
              AND status = 'PROCESSING'
          `);

        throw processingErr;
      }

      return res.redirect(302, buildRedirectUrl("success"));
    }

    // =========================================================
    // APS PAYMENT FAILED
    // =========================================================
    await pool.request()
      .input("merchant_reference", sql.VarChar(50), payload.merchant_reference)
      .input("fort_id", sql.VarChar(50), payload.fort_id || null)
      .query(`
        UPDATE PayfortTransactions
        SET
          status = 'FAILED',
          fort_id = ISNULL(@fort_id, fort_id),
          updated_at = SYSDATETIME()
        WHERE merchant_reference = @merchant_reference
          AND status IN ('PENDING', 'PROCESSING')
      `);

    return res.redirect(302, buildRedirectUrl("failed"));

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
