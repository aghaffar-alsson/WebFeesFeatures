import nodemailer from "nodemailer";
import  sql from "mssql";
import  cron from "node-cron"
import dotenv from "dotenv"
import  path from "path"
import fs from "fs"

dotenv.config();
const logoPath = path.join(process.cwd(), "assets", "newgiza-logo.jpg");
console.log("Logo exists?", fs.existsSync(logoPath));
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
console.log("Email:", process.env.FromEmailAddress);
console.log("App Password exists?", process.env.AppPswd);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.FromEmailAddress,
    pass: process.env.AppPswd,
  }
});


// Run every minute
cron.schedule("*/1 * * * *", async () => {
  const pool = await sql.connect(sqlConfig);
  const result = await pool.request()
    .query(`SELECT * FROM OnlinePayfortLog WHERE emlsnt = 0 order by iden`);
  console.log("📧 select rows");
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
      console.log("📧 loop ended");
      await transporter.sendMail({
        from: process.env.FromEmailAddress,
        to: row.customer_email,
        bcc: process.env.BccEmailAddress,
        // bcc: "feesemails@alsson.com",
        subject: "Payment Receipt",
        html,
        attachments: [
          {
            filename: "newgiza-logo.jpg",
            path: logoPath,
            cid: "schoollogo" // same as used in <img src="cid:schoollogo">
          }
        ],
      });
      await pool.request().query(`
        UPDATE OnlinePayfortLog SET emlsnt = 1 WHERE iden = ${row.iden}
      `);

      console.log("Email sent:", row.customer_email);

    } catch (err) {
      console.error("Email error:", err);
    }
  }
});
