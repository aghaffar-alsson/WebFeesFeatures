import express from "express";
import sql from "mssql";
import cron from "node-cron"
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
import { log } from "console";
import { google } from "googleapis";

dotenv.config();
const logoPath = path.join(process.cwd(), "assets", "newgiza-logo.jpg");
let logoBase64 = "";

if (fs.existsSync(logoPath)) {
  const logoBuffer = fs.readFileSync(logoPath);
  logoBase64 = logoBuffer.toString("base64");
  console.log("Logo converted to base64 successfully");
} else {
  console.error("Logo file not found at:", logoPath);
}
console.log(logoPath);
console.log("Logo exists?", fs.existsSync(logoPath));
const app = express();

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
  requestTimeout: 180000, // 3 minute for safety
  connectionTimeout: 30000 // 30 seconds for initial connection
};



process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

let poolPromise;

async function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(sqlConfig)
      .connect()
      .then(pool => {
        console.log("SQL connected successfully");
        return pool;
      })
      .catch(err => {
        poolPromise = null;
        console.error("SQL connection failed:", err);
        throw err;
      });
  }
  return poolPromise;
}

// Create a function to get the SQL connection pool
(async () => {
  try {
    const pool = await getPool();
    console.log("SQL connected successfully");
  } catch (err) {
    console.error("SQL connection failed on startup:", err);
  }
})();


const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.SECRET_TOKEN,
  "https://developers.google.com/oauthplayground"
);

oAuth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

const gmail = google.gmail({
  version: "v1",
  auth: oAuth2Client,
});

function encodeMimeWord(str) {
  return `=?UTF-8?B?${Buffer.from(str, "utf8").toString("base64")}?=`;
}
// async function sendWithRetry(to, bcc, subject, html, retries = 2) {
//   try {
//     await sendEmail({ to, bcc, subject, html });
//   } catch (err) {
//     if (retries > 0) {
//       console.warn("Retrying email...", retries);
//       await new Promise(r => setTimeout(r, 2000));
//       return sendWithRetry({ to, bcc, subject, html }, retries - 1);
//     }
//     throw err;
//   }
// }
async function sendEmail({ to, bcc, subject, html }) {
  const mixedBoundary = "mixed_" + Date.now();
  const relatedBoundary = "related_" + Date.now();
  const altBoundary = "alt_" + Date.now();

  const cleanLogoBase64 = (logoBase64 || "").replace(/^data:image\/\w+;base64,/, "");

  // Plain text fallback
  const plainText = `
Payment Receipt

Dear Parent,

Your online payment through Amazon Payment Services (AWS - PayFort) has been successfully processed.

Thank you for your payment.

Finance Department
El Alsson British & American International School - Newgiza
www.alsson.com
  `.trim();

  const messageParts = [
    `From: El Alsson School <${process.env.FromEmailAddress}>`,
    `To: ${to}`,
    bcc ? `Bcc: ${bcc}` : "",
    `Subject: ${encodeMimeWord(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@elalsson.local>`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",

    // ===== mixed starts =====
    `--${mixedBoundary}`,
    `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
    "",

    // ===== related starts =====
    `--${relatedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    "",

    // ===== plain text part =====
    `--${altBoundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    "",
    plainText,
    "",

    // ===== html part =====
    `--${altBoundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    "",
    html,
    "",

    // ===== end alternative =====
    `--${altBoundary}--`,
    "",

    // ===== inline image part =====
    cleanLogoBase64
      ? `--${relatedBoundary}`
      : "",
    cleanLogoBase64
      ? `Content-Type: image/jpeg; name="newgiza-logo.jpg"`
      : "",
    cleanLogoBase64
      ? `Content-Transfer-Encoding: base64`
      : "",
    cleanLogoBase64
      ? `Content-ID: <schoollogo>`
      : "",
    cleanLogoBase64
      ? `Content-Disposition: inline; filename="newgiza-logo.jpg"`
      : "",
    cleanLogoBase64 ? "" : "",
    cleanLogoBase64 || "",
    cleanLogoBase64 ? "" : "",

    // ===== end related =====
    `--${relatedBoundary}--`,
    "",

    // ===== end mixed =====
    `--${mixedBoundary}--`,
    ""
  ];

  const rawMessage = messageParts.join("\r\n");

  // Debug (very useful)
  console.log("===== RAW EMAIL PREVIEW START =====");
  console.log(rawMessage.slice(0, 3000));
  console.log("===== RAW EMAIL PREVIEW END =====");

  const encodedMessage = Buffer.from(rawMessage, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });
}

console.log("Email:", process.env.FromEmailAddress);
console.log("App Password exists?", process.env.AppPswd);

let isRunningEmailJob = false;
//Send APS receipt for the parent just to confirm the success of the payment process, this should run every 1 minute
app.get("/run-email-receipts", async (req, res) => {
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(403).send("Forbidden");
  }

  if (isRunningEmailJob) {
    return res.status(429).json({ ok: false, message: "Already running" });
  }

  isRunningEmailJob = true;

  try {
    const pool = await getPool();

    const result = await pool.request()
      .query(`SELECT TOP 20 * FROM OnlinePayfortLog WHERE emlsnt = 0 ORDER BY iden`);

    for (const row of result.recordset) {
      try {
          const html = `
          <div style="font-family: Tahoma, Helvetica, sans-serif; font-size: 14px; color: #333;">
          <h2>Payment Receipt</h2>
          <p>Dear Parent,</p>
          <p>Your online payment through Amazon Payment Services (AWS - PayFort) has been successfully processed.</p>
          <p><strong>Amounting:</strong> ${(row.amount / 100).toFixed(2)} EGP</p>
          <p><strong>Date:</strong> ${new Date(row.actiondate).toLocaleString()}</p>
          <p><strong>Your FORT ID:</strong> ${row.fort_id}</p>
          <p><strong>Transaction Reference:</strong> ${row.merchant_reference}</p>
          <p><strong>Transaction Status:</strong> ${row.response_message}</p>
          <br/>
          <p>Thank you for your purchase.</p>
          <p></p>
          <p>Finance Department</p>
          <p>El Alsson British & American International School - Newgiza</p>
          <p>Kilo 22 Misr Alexandria Desert Road - Compound Newgiza</p>
          <p>Tel: 002-02-38270800</p>
          <p>www.alsson.com</p>
          </div>
          <div style="margin-top:20px; border-top:1px solid #ccc; padding-top:10px;">
          <img src="cid:schoollogo" style="height:80px; display:block; margin:auto;">
          </div>
        `;
        console.log(html)        
        await sendEmail({
          to: row.customer_email,
          bcc: process.env.BccEmailAddress,
          subject: "Payment Receipt",
          html: html,
        });

        await pool.request()
          .input("iden", sql.Int, row.iden)
          .query(`UPDATE OnlinePayfortLog SET emlsnt = 1 WHERE iden = @iden`);

        console.log("Receipt sent:", row.customer_email);

      } catch (err) {
        // console.error("Row error:", err);
        // console.error(`ERROR_SEND_RECEIPT_EMAIL for ${row.customer_email}`, err);
        console.error('ERROR_SEND_RECEIPT_EMAIL', err);

        return res.status(500).json({
          ok: false,
          error: err.message
        });    

      }
    }
    res.json({
      ok: true,
      processed: result.recordset.length
    });
  } catch (err) {
    console.error('ERROR_SEND_RECEIPT_EMAIL', err);

    return res.status(500).json({
      ok: false,
      error: err.message
    });    

  } finally {
    isRunningEmailJob = false;
  }
});

let isRunningConfirmationJob = false;
// Send confirmation email for the parent to confirm that his transaction was received by the school and inform him that the receipts are being processed and will be issued within 3 working days
// Run every 2 minutes
app.get("/run-email-confirmation", async (req, res) => {
  // 🔐 Security
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(403).send("Forbidden");
  }

  // 🔁 Prevent overlap
  if (isRunningConfirmationJob) {
    return res.status(429).json({ ok: false, message: "Already running" });
  }

  isRunningConfirmationJob = true;

  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT TOP 20
        ap.iden, ap.facename, ap.InstCode, ap.fort_id, ap.merchant_reference,
        ap.SCHOOLID as schholno, ap.paidamount, ap.trnsdt, ap.s_code,
        o.customer_email,
        s.fname+' '+s.mname+' '+s.lname AS student_name 
      FROM APSTRANS AP 
      INNER JOIN OnlinePayfortLog o 
        ON AP.FORT_ID = O.FORT_ID 
       AND AP.MERCHANT_REFERENCE = O.MERCHANT_REFERENCE  
      INNER JOIN students_info s 
        ON s.curyear = LEFT(ap.curyear,4) 
       AND AP.s_code = s.s_code 
       AND AP.schoolid = s.typecode  
      WHERE AP.SETTLED = 1 
        AND AP.confrmd = 0 
      ORDER BY ap.iden
    `);

    console.log("Records to process:", result.recordset.length);

    for (const row of result.recordset) {
      let topic = "";
      let absface = "";
      let trmmno = 0;
      let faceYear = "";

      const parts = (row.facename || "").split("_");
      absface = (parts[0] || "").trim();
      trmmno = Number(parts[1] || 0);
      faceYear = (parts[2] || "").trim();

      console.log("facename:", row.facename);
      console.log("parts:", parts);
      console.log("absface:", absface);
      console.log("trmmno:", trmmno);
      console.log("faceYear:", faceYear);

      try {

      switch (absface) {
        case "SCHOOLFEES":
          switch (trmmno.toString()) {
            case '1': topic = "School Fees : April Installment" + (faceYear ? ` (${faceYear})` : ""); console.log(topic); break;
            case '2': topic = "School Fees : September Installment" + (faceYear ? ` (${faceYear})` : ""); console.log(topic); break;
            case '3': topic = "School Fees : November Installment" + (faceYear ? ` (${faceYear})` : ""); console.log(topic); break;
            case '4': topic = "School Fees : January Installment" + (faceYear ? ` (${faceYear})` : ""); console.log(topic); break;
            default: topic = `School Fees : Installment ${trmmno}` + (faceYear ? ` (${faceYear})` : ""); console.log(topic); break;
          }
          break;

        case "EDXL":
          switch (row.schholno) {
            case 1: topic = "DP2 Exams Fees"+ (faceYear ? ` (${faceYear})` : ""); break;
            case 2: topic = "Cambridge & Edexcel Exams Fees" + (faceYear ? ` (${faceYear})` : ""); break;
            default: topic = "Exam Fees" + (faceYear ? ` (${faceYear})` : ""); break;
          }
          break;

        case "MINISTRY": {
          topic = "Ministry Fees - ";
          const getres = await pool.request().query(`
            SELECT facename 
            FROM ministry_faces 
            WHERE faceid = ${trmmno}
          `);

          if (getres.recordset.length > 0) {
            topic += getres.recordset[0].facename;
          } else {
            topic += `Face ID ${trmmno}`;
          }
          break;
        }

        case "TRIP": {
          topic = "Trips Fees - ";
          const tbnmm = row.schholno === 1 ? "AM_TRIPS" : "BR_TRIPS";

          console.log("tbnmm:", tbnmm);
          console.log("schoolid:", row.schholno);

          const getres_1 = await pool.request().query(`
            SELECT tripname 
            FROM ${tbnmm} 
            WHERE tripid = ${trmmno}
          `);

          if (getres_1.recordset.length > 0) {
            topic += getres_1.recordset[0].tripname;
            console.log(getres_1.recordset[0].tripname);
          } else {
            topic += `Trip ID ${trmmno}`;
          }

          console.log("topic after TRIP:", topic);
          break;
        }

        default:
          topic = row.facename || "Payment";
          break;
      }
        const html = `
        <div style="font-family: Tahoma, Helvetica, sans-serif; font-size: 14px; color: #333;">
          <h2>Payment Confirmation</h2>
          <p>Dear Parent,</p>
          <p>We confirm receiving of your online payment through Amazon Payment Services (AWS - PayFort).</p>
          <p><strong>Amounting: ${(row.paidamount).toFixed(2)} EGP</strong></p>
          <p>For: ${topic}</p>
          <p>On date: ${row.trnsdt}</p>
          <p>For student (ID: ${row.s_code} Name: ${row.student_name})</p>
          <p>Your FORT ID: ${row.fort_id}</p>
          <p>Transaction Reference: ${row.merchant_reference}</p>
          <p>Receipts will be issued on cashiers office within 3 working days.</p>
          <br/>
          <p>Thank you for your payment.</p>
          <p>Finance Department</p>
          <p>El Alsson British & American International School - Newgiza</p>
          <p>Kilo 22 Misr Alexandria Desert Road - Compound Newgiza</p>
          <p>Tel: 002-02-38270800</p>
          <p>www.alsson.com</p>
        </div>
        <div style="margin-top:20px; border-top:1px solid #ccc; padding-top:10px;">
          <img src="cid:schoollogo" style="height:80px; display:block; margin:auto;">
        </div>
        `;
        console.log("📧 loop APS ended");
        await sendEmail({
          to: row.customer_email,
          bcc: process.env.BccEmailAddress,
          subject: `Payment Confirmation for ${row.s_code} ${row.student_name} - ${topic}`,
          html: html,
        });

        await pool.request()
          .input("iden", sql.Int, row.iden)
          .query(`UPDATE apstrans SET confrmd = 1 WHERE iden = @iden`);

        console.log("Confirmation email sent:", row.customer_email);

      } catch (err) {
        // console.error("Row error:", err);
        console.error( 'ERROR_SEND_CONF_EMAIL', err);

        return res.status(500).json({
          ok: false,
          error: err.message
        });    
      }
    }

    res.json({
      ok: true,
      processed: result.recordset.length
    });

  } catch (err) {
    console.error( 'ERROR_SEND_CONF_EMAIL', err);

    return res.status(500).json({
      ok: false,
      error: err.message
    });    

  } finally {
    isRunningConfirmationJob = false;
  }
});
// Run every 1 hour at minute 0
//HERE TO EXECUTE THE STORED PROCEDURE TO FILL THE WHOLE REQUIRED DATA SET FOR THE TWO ACADEMIC YEARS
// cron.schedule("0 * * * *", async () => {
//   const VITE_YEAR_NO = process.env.VITE_YEAR_NO 
//   if (!VITE_YEAR_NO){
//     console.error("VITE_YEAR_NO is not set in environment variables");
//     return;
//   }
//   const pool = await sql.connect(sqlConfig);

//   try {
//     const pool = await sql.connect(sqlConfig);
//     const result = await pool
//       .request()
//       .input('cyy', sql.Int, VITE_YEAR_NO)
//       .execute('FillMtrx');
//       console.log("Stored procedure executed successfully for year:", VITE_YEAR_NO);
//       // const records = result.recordset;
//       // console.log("records:", records);
//       // if (records && records.length > 0) {
//       //   res.json(records); // ✅ sends array
//       // } else {
//       //   res.json([]);
//       // }
//   } catch (err) {
//     console.error('Database Error:', err);
//     // res.status(500).json({ message: 'Database Error', error: err.message });
//   }});


// let isRunning = false;
let running = {
  students: false,
  additional: false,
  payments: false,
  matrix: false,
  discounts: false
};

//fill students info Run every 30 minutes
app.get("/sync-students-info", async (req, res) => {
  const runId = Date.now();
  console.log(req.query.key, process.env.CRON_SECRET);
  // 🔐 Security
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }

  const year = process.env.VITE_YEAR_NO;

  if (!year) {
    console.error(`[${runId}] VITE_YEAR_NO is not set`);
    return res.status(400).json({ ok: false, message: "Academic year number not set in .env file" });
  }

  if (running.students) {
    console.warn(`[${runId}] Skipping: already running`);
    return res.status(429).json({ ok: false, message: "The students info service is already running" });
  }

  running.students = true;

  console.log(`[${runId}] Starting SP execution for year ${year}`);

  try {
    const pool = await getPool();

    const request = pool.request();
    request.timeout = 60000; // 1 minute - just for safety, the job is almost done during 17 seconds 

    const result = await request
      .input("cyy", sql.Int, parseInt(year))
      .execute("FillStudentInfo");

    console.log(`[${runId}] SUCCESS_STUDENTS_INFO`, {
      rows: result.recordset?.length || 0,
    });

    return res.json({
      ok: true,
      processed: result.recordset?.length || 0
    });

  } catch (err) {
    console.error(`[${runId}] ERROR_STUDENTS_INFO`, err);

    return res.status(500).json({
      ok: false,
      error: err.message
    });

  } finally {
    running.students = false;
    console.log(`[${runId}] Finished_STUDENTS_INFO`);
  }
});

//fill additional fees (ministry , cambridge , trips) Run every 40 minutes 
app.get("/sync-additional-fees", async (req, res) => {
  const runId = Date.now();

  // 🔐 Security
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }

  // ⛔ Prevent overlap
  if (running.additional) {
    console.warn(`[${runId}] Skipping: additional fees service is already running`);
    return res.status(429).json({ ok: false, message: "Additional fees service is already running" });
  }

  const year = process.env.VITE_YEAR_NO;

  if (!year) {
    console.error(`[${runId}] VITE_YEAR_NO is not set`);
    return res.status(400).json({ ok: false, message: "Academic year number not set in .env file" });
  }

  running.additional = true;
  console.log(`[${runId}] Starting Additional Fees SP execution for year ${year}`);

  try {
    const pool = await getPool();

    const request = pool.request();
    request.timeout = 60000; //set the timeout period by 1 minut for safety only as the execution time is around 20 seconds

    const result = await request
      .input("cyy", sql.Int, parseInt(year))
      .execute("FillAdditional");

    console.log(`[${runId}] SUCCESS_ADDITIONAL_FEES`, {
      rows: result.recordset?.length || 0,
    });

    return res.json({
      ok: true,
      processed: result.recordset?.length || 0
    });

  } catch (err) {
    console.error(`[${runId}] ERROR_ADDITIONAL_FEES`, err);

    return res.status(500).json({
      ok: false,
      error: err.message
    });

  } finally {
    running.additional = false;
    console.log(`[${runId}] Finished_ADDITIONAL_FEES`);
  }
});

//fill payments (master & details tables) Run every 20 minutes 
app.get("/sync-payments", async (req, res) => {
  // 🔐 Security
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }

  const runId = Date.now();

  // ⛔ Prevent overlap
  if (running.payments) {
    console.warn(`[${runId}] Skipping: payments service is already running`);
    return res.status(429).json({ ok: false, message: "Payments service is already running" });
  }

  const year = process.env.VITE_YEAR_NO;

  if (!year) {
    console.error(`[${runId}] VITE_YEAR_NO is not set`);
    return res.status(400).json({ ok: false, message: "Academic year number not set in .env file" });
  }

  running.payments = true;
  console.log(`[${runId}] Starting Payments SP execution for year ${year}`);

  try {
    const pool = await getPool();

    const request = pool.request();
    request.timeout = 90000; // 1.5 minute for safety

    const result = await request
      .input("cyy", sql.Int, parseInt(year))
      .execute("FillPayments");

      console.log(`[${runId}] SUCCESS_PAYMENTS`, {
      rows: result.recordset?.length || 0,
    });

    return res.json({
      ok: true,
      processed: result.recordset?.length || 0
    });

  } catch (err) {
  console.error(`[${runId}] ERROR_PAYMENTS`, err.message);

  return res.status(500).json({
    ok: false,
    error: err.message
  });
} finally {
    running.payments = false;
    console.log(`[${runId}] Finished_PAYMENTS`);
  }
});

//fill discounts Run every 60 minutes 
app.get("/sync-discounts", async (req, res) => {
  // 🔐 Security
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }

  const runId = Date.now();

  // ⛔ Prevent overlap
  if (running.discounts) {
    console.warn(`[${runId}] Skipping: discounts service is already running`);
    return res.status(429).json({ ok: false, message: "Discounts service is already running" });
  }

  const year = process.env.VITE_YEAR_NO;

  if (!year) {
    console.error(`[${runId}] VITE_YEAR_NO is not set`);
    return res.status(400).json({ ok: false, message: "Academic year number not set in .env file" });
  }

  running.discounts = true;
  console.log(`[${runId}] Starting Discounts SP execution for year ${year}`);

  try {
    const pool = await getPool();

    const request = pool.request();
    request.timeout = 90000; // 1.5 minute for safety

    const result = await request
      .input("cyy", sql.Int, parseInt(year))
      .execute("FillDisc");

      console.log(`[${runId}] SUCCESS_DISCOUNTS`, {
      rows: result.recordset?.length || 0,
    });

    return res.json({
      ok: true,
      processed: result.recordset?.length || 0
    });

  } catch (err) {
  console.error(`[${runId}] ERROR_DISCOUNTS`, err.message);

  return res.status(500).json({
    ok: false,
    error: err.message
  });
} finally {
    running.discounts = false;
    console.log(`[${runId}] Finished_DISCOUNTS`);
  }
});

//fill fees matrix Run every hour at minute 0
app.get("/build-fees-matrix", async (req, res) => {
  const runId = Date.now();

  // 🔐 Security
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }

  // ⛔ Prevent overlap
  if (running.matrix) {
    console.warn(`[${runId}] Skipping: already running`);
    return res.status(429).json({ ok: false, message: "Already running" });
  }

  const year = process.env.VITE_YEAR_NO;

  if (!year) {
    console.error(`[${runId}] VITE_YEAR_NO is not set`);
    return res.status(400).json({ ok: false, message: "Year not set" });
  }

  running.matrix = true;
  console.log(`[${runId}] Starting Fees Matrix SP execution for year ${year}`);

  try {
    const pool = await getPool();

    const request = pool.request();
    request.timeout = 180000; // ✅ safer (3 minutes)

    const result = await request
      .input("cyy", sql.Int, parseInt(year))
      .execute("FillMtrx");

    console.log(`[${runId}] SUCCESS_FEES_MATRIX`, {
      rows: result.recordset?.length || 0,
    });

    return res.json({
      ok: true,
      processed: result.recordset?.length || 0
    });

  } catch (err) {
    console.error(`[${runId}] ERROR_FEES_MATRIX`, err);

    return res.status(500).json({
      ok: false,
      error: err.message
    });

  } finally {
    running.matrix = false;
    console.log(`[${runId}] Finished_FEES_MATRIX`);
  }
});
console.log("📧 loop APS ended");

const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => {
  res.send("Email cron service is running");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Email service running on port ${PORT}`);
});



