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
  requestTimeout: 15000,
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(sqlConfig);
  }
  return pool;
}

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

// async function sendEmail({ to, bcc, subject, html }) {
//   const boundary = "boundary_xyz";

//   const messageParts = [
//     `From: El Alsson School <${process.env.FromEmailAddress}>`,
//     `To: ${to}`,
//     bcc ? `Bcc: ${bcc}` : "",
//     `Subject: ${subject}`,
//     `MIME-Version: 1.0`,
//     `Content-Type: multipart/related; boundary=${boundary}`,
//     "",
//     `--${boundary}`,
//     `Content-Type: text/html; charset="UTF-8"`,
//     "",
//     html,
//     `--${boundary}`,
//     `Content-Type: image/jpeg`,
//     `Content-Transfer-Encoding: base64`,
//     `Content-ID: <schoollogo>`,
//     `Content-Disposition: inline; filename="logo.jpg"`,
//     "",
//     logoBase64,
//     `--${boundary}--`
//   ].filter(Boolean);

//   const rawMessage = messageParts.join("\n");

//   const encodedMessage = Buffer.from(rawMessage)
//     .toString("base64")
//     .replace(/\+/g, "-")
//     .replace(/\//g, "_")
//     .replace(/=+$/, "");

//   await gmail.users.messages.send({
//     userId: "me",
//     requestBody: { raw: encodedMessage },
//   });
// }


// Outlook or Internal SMTP
// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.FromEmailAddress,
//     pass: process.env.AppPswd,
//   }
// });
function encodeMimeWord(str) {
  return `=?UTF-8?B?${Buffer.from(str, "utf8").toString("base64")}?=`;
}

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
    // `Subject: ${subject}`,
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


// Run every minute
// cron.schedule("*/1 * * * *", async () => {
//   const pool = await sql.connect(sqlConfig);
//   const result = await pool.request()
//     .query(`SELECT * FROM OnlinePayfortLog WHERE emlsnt = 0 order by iden`);
//   console.log("📧 select rows");
//   for (const row of result.recordset) {
//     try {
//       const html = `
//       <div style="font-family: Tahoma, Helvetica, sans-serif; font-size: 14px; color: #333;">
//       <h2>Payment Receipt</h2>
//       <p>Dear Parent,</p>
//       <p>Your online payment through Amazon Payment Services (AWS - PayFort) has been successfully processed.</p>
//       <p><strong>Amounting:</strong> ${(row.amount / 100).toFixed(2)} EGP</p>
//       <p><strong>Date:</strong> ${(row.actiondate)} EGP</p>
//       <p><strong>Your FORT ID:</strong> ${row.fort_id}</p>
//       <p><strong>Transaction Reference:</strong> ${row.merchant_reference}</p>
//       <p><strong>Transaction Status:</strong> ${row.response_message}</p>
//       <br/>
//       <p>Thank you for your purchase.</p>
//       <p></p>
//       <p>Finance Department</p>
//       <p>El Alsson British & American International School - Newgiza</p>
//       <p>Kilo 22 Misr Alexandria Desert Road - Compound Newgiza</p>
//       <p>Tel: 002-02-38270800</p>
//       <p>www.alsson.com</p>
//       </div>
//       <div style="margin-top:20px; border-top:1px solid #ccc; padding-top:10px;">
//       <img src="cid:schoollogo" alt="School Logo" style="height:10px; width:10px; display:block; margin:auto;">
//       </div>
//     `;
//       console.log("📧 loop ended");
//       await transporter.sendMail({
//         from: process.env.FromEmailAddress,
//         to: row.customer_email,
//         bcc: process.env.BccEmailAddress,
//         // bcc: "feesemails@alsson.com",
//         subject: "Payment Receipt",
//         html,
//         attachments: [
//           {
//             filename: "newgiza-logo.jpg",
//             path: logoPath,
//             cid: "schoollogo" // same as used in <img src="cid:schoollogo">
//           }
//         ],
//       });
//       await pool.request().query(`
//         UPDATE OnlinePayfortLog SET emlsnt = 1 WHERE iden = ${row.iden}
//       `);

//       console.log("Email sent:", row.customer_email);

//     } catch (err) {
//       console.error("Email error:", err);
//     }
//   }
// });

cron.schedule("*/1 * * * *", async () => {
  const pool = await getPool();

  const result = await pool.request()
    .query(`SELECT * FROM OnlinePayfortLog WHERE emlsnt = 0 ORDER BY iden`);

  for (const row of result.recordset) {
    try {
      const html = `
      <div style="font-family: Tahoma, Helvetica, sans-serif; font-size: 14px; color: #333;">
      <h2>Payment Receipt</h2>
      <p>Dear Parent,</p>
      <p>Your online payment through Amazon Payment Services (AWS - PayFort) has been successfully processed.</p>
      <p><strong>Amounting:</strong> ${(row.amount / 100).toFixed(2)} EGP</p>
      <p><strong>Date:</strong> ${(row.actiondate)} EGP</p>
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
      <img src="cid:schoollogo" alt="School Logo" style="height:10px; width:10px; display:block; margin:auto;">
      </div>
    `;
      console.log(html)
      await sendEmail({
        to: row.customer_email,
        bcc: process.env.BccEmailAddress,
        subject: "Payment Receipt",
        html
      });

      await pool.request()
        .query(`UPDATE OnlinePayfortLog SET emlsnt = 1 WHERE iden = ${row.iden}`);

      console.log("Receipt sent:", row.customer_email);

    } catch (err) {
      console.error("Receipt error:", err);
    }
  }
});

// Run every 5 minutes
cron.schedule("*/2 * * * *", async () => {
  const pool = await sql.connect(sqlConfig);

  const result = await pool.request().query(`
    SELECT ap.iden, ap.facename, ap.InstCode, ap.fort_id, ap.merchant_reference,
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

  console.log("📧 select rows from APSTRANS");
  console.log("Number of records to process:", result.recordset.length);
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
            case 1: topic = "DP2 Exams Fees" + (faceYear ? ` (${faceYear})` : ""); break;
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
      //console.log("Determined topic:", topic);
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
        <img src="cid:schoollogo" alt="School Logo" style="height:10px; width:10px; display:block; margin:auto;">
      </div>
      `;

      //   await transporter.sendMail({
      //     from: process.env.FromEmailAddress,
      //     to: row.customer_email,
      //     bcc: process.env.BccEmailAddress,
      //     // bcc: "feesemails@alsson.com",
      //     subject: "Payment Confirmation for " + row.s_code + " " + row.student_name,
      //     html,
      //     attachments: [
      //       {
      //         filename: "newgiza-logo.jpg",
      //         path: logoPath,
      //         cid: "schoollogo" // same as used in <img src="cid:schoollogo">
      //       }
      //     ],
      //   });
      console.log(html);
      await sendEmail({
        to: row.customer_email,
        bcc: process.env.BccEmailAddress,
        subject: `Payment Confirmation for ${row.s_code} ${row.student_name} - ${topic}`,
        html
      });
      await pool.request().query(`
        UPDATE apstrans SET confrmd = 1 WHERE iden = ${row.iden}
      `);

      console.log("Email sent:", row.customer_email);

    } catch (err) {
      console.error("Email error:", err);
    }
  }
});

console.log("📧 loop APS ended");

app.listen(process.env.PORT || 3000);




