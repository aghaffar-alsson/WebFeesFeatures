//const express = require("express");
// const cors = require("cors");
// const sql = require("mssql");
// const path = require("path");
//******************IMPORT DIFFEREN LIBRARIES*********************************/
import express from 'express'
import cors from 'cors'
import sql from 'mssql'
import path from 'path'
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { log } from 'console';
import { createRequire } from 'module';
import bcrypt from "bcrypt";
import fs from "fs-extra";
import PDFDocument from "pdfkit";
//******************OPEN CONNECTION & ESTABLISH SERVER************************/
const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');

//dotenv.config({ path: './config.env' });
// dotenv.config({ path: './.env' });
dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.VITE_PORT || 3000;

app.use(cors());
app.use(express.json());
// console.log(process.env.SRVRNM)
// console.log(process.env.DBNAME)
// console.log(process.env.UNM)
// console.log(process.env.PSWD)
// SQL Config
// const sqlConfig = {
//   server: process.env.SRVRNM,
//   database: process.env.DBNAME,
//   user: process.env.UNM,
//   PSWD: process.env.PSWD,
//   options: {
//     encrypt: false,
//     trustServerCertificate: true,
//   },
//   requestTimeout: 15000,
// };
// console.log(sqlConfig)

// const sqlConfig = {
//   server: "41.128.168.249",
//   database: "feeswebtmp",
//   user: "sa",
//   password: "Finance@2025",
//   options: {
//     encrypt: false,
//     trustServerCertificate: true,
//   },
//   requestTimeout: 15000,
// };
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
// SQL Config
// const sqlConfig = {
//   server: "41.128.168.249",
//   database: "feesweb",
//   user: "sa",
//   password: "Finance@2025",
//   options: {
//     encrypt: false,
//     trustServerCertificate: true,
//   },
//   requestTimeout: 90000,
// };
// ✅ Create one shared connection pool
let poolPromise = sql.connect(sqlConfig)
  .then(pool => {
    console.log("✅ Connected to SQL Server");
    return pool;
  })
  .catch(err => {
    console.error("❌ Database Connection Failed!", err);
  });
// --- Start Server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${process.env.VITE_PORT}`);
});
// --- Test API
app.get("/", (req, res) => {
  res.send("Server is running");
});
//***************************APIs START**************************************************/
// --- Get family ID by mobile number Stored Procedure 
app.get("/api/spgetfmdet/:mobno", async (req, res) => {
  const mobno = req.params.mobno ? String(req.params.mobno).trim() : null;
  //console.log("Received mobno:", mobno);

  if (!mobno) {
    return res.status(400).json({ error: "Missing or invalid mobile number" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("mob", sql.VarChar, mobno)
      .execute("sp_GetFmDet");

    if (result.recordset.length > 0) {
      res.json(result.recordset);
    } else {
      res.json({ data: null });
    }

  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Database error");
  }
});

// --- Get family ID by email Address & Mobile No. Stored Procedure 
app.post("/api/sp_GetFmDetByMob&Email", async (req, res) => {
  const { mobno = req.params.mobno ? String(req.params.mobno).trim() : null, 
    emll  = req.params.emll ? String(req.params.emll).trim() : null } = req.body;
  if (!mobno) {
    return res.status(400).json({ error: "Missing or invalid mobile number" });
  }
  if (!emll) {
    return res.status(400).json({ error: "Missing or invalid email address" });
  }
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      // .request()
      .input("mob", sql.VarChar, mobno)
      .input("emll", sql.VarChar, emll)
      .execute("sp_GetFmDetByMob&Email");

    // Send result recordset back to frontend
    res.json(result.recordset[0] || {});
  } catch (err) {
    console.error("Error executing stored procedure:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

//Configure NODEMAILER
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: 'fees@alsson.com',
    pass: 'gwwowluzlabnfyqw',
  },
});

//create random temp password
function generateTempPassword(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

//CREATE NEW LOGIN
app.post('/api/signup', async (req, res) => {
  const { yr, famid, famnm, emll, mobb, pswd } = req.body;

  if (!yr || !famid || !famnm || !emll || !mobb || !pswd) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const tempPswd = generateTempPassword(10);
    console.log(tempPswd)
    //const hashedPswd = await bcrypt.hash(tempPswd, 10);    
    const hashedPswd = tempPswd;    
    const pool = await sql.connect(sqlConfig);
    const result = await pool
      .request()
      .input('yr', sql.Char(4), yr)
      .input('famid', sql.Int, famid)
      .input('famnm', sql.NVarChar(255), famnm)
      .input('emll', sql.NVarChar(255), emll)
      .input('mobb', sql.NVarChar(11), mobb)
      .input('pswd', sql.NVarChar(255), hashedPswd)
      .execute('signup');

      //SEND TEMP PASSWORD TO THE PARENT EMAIL
      const mailOptions = {
        from: process.env.FromEmailAddress,
        to: emll,
        subject: "Your Temporary Password For Parents' Fees Portal",
        html: `
          <font face="Calibri" size="3" color = "blue">
          <h3>Dear Parent: ${famnm},</h3>
          <br/>
          <h3>Welcome to our portal,</h3>
          <br/>
          <p>Your login account has been created for the <strong>Parents' Fees Portal</strong>.</p>
          <p>Here is your temporary password:</p><u><h2 style="color:#1a73e8;">${tempPswd}</h2></u>
          <p>You can login using the email adress:</p><u><h2 style="color:#1a73e8;">${emll}</h2></u>
          <br/>
          <p>Please write this password when you login for the first time only.</p>
          <p>You should change it by your own password immediately.</p>
          <br/>
          <p>Finance Department - Fees Section</p>
          <p>El Alsson School- </p>
          <p>Best regards,</p>
        `,
      };
      await transporter.sendMail(mailOptions);
      res.json({ message: 'Signup successful!' , tempPswd: tempPswd} , );
      
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Database Error', error: err.message });
  }
});

//CHECK THE EXISTENCE OF FAMILY LOGIN USING THE SUPPLIED MOBILE NUMBER
app.post('/api/chkLoginByMob', async (req, res) => {
  const { yr,  mobb } = req.body;

  if (!yr   || !mobb  ) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool
      .request()
      .input('yr', sql.Char(4), yr)
      .input('mobb', sql.NVarChar(11), mobb)
      .execute('chkLoginByMob');
      const record = result.recordset?.[0];
      //console.log(record)
      if (record) {
        res.json({ famid: record.famid, famnm: record.famnm });
      } else {
        res.json({ message: 'Unregistered Mobile Number' });
      }
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Database Error', error: err.message });
  }
});


//CHECK THE EXISTENCE OF FAMILY LOGIN USING THE SUPPLIED EMAIL ADDRESS
app.post('/api/chkLoginByEml', async (req, res) => {
  const { yr, emll } = req.body;

  if (!yr   || !emll  ) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool
      .request()
      .input('yr', sql.Char(4), yr)
      .input('emll', sql.NVarChar(255), emll)
      .execute('chkLoginByEml');
      const record = result.recordset?.[0];
      //console.log(record)
      if (record) {
        res.json({ famid: record.famid, famnm: record.famnm });
      } else {
        res.json({ message: 'Unregistered Mobile Number' });
      }
      
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Database Error', error: err.message });
  }
});

//CHECK THE EXISTENCE OF FAMILY LOGIN USING THE EMAIL ADDRESS & MOBILE NUMBER
app.post('/api/chkLogin', async (req, res) => {
  const { yr, emll , mobb } = req.body;

  if (!yr   || !emll || !mobb ) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool
      .request()
      .input('yr', sql.Char(4), yr)
      .input('emll', sql.NVarChar(255), emll)
      .input('mobb', sql.NVarChar(11), mobb)
      .execute('chkLogin');
      const record = result.recordset?.[0];
      //console.log(record)
      if (record) {
        res.json({ famid: record.famid, famnm: record.famnm });
      } else {
        res.json({ message: 'Unregistered Mobile Number or Email Address' });
      }
      
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Database Error', error: err.message });
  }
});

//CHECK THE EXISTENCE OF FAMILY LOGIN USING THE EMAIL ADDRESS & MOBILE NUMBER
app.put('/api/updtLogin', async (req, res) => {
  const { yr, famid, emll, mobb, pswd } = req.body;
  //console.log(pswd)
  //const hashedPswd1 = await bcrypt.hash(pswd, 10);
  const hashedPswd1 = pswd;
  //console.log(hashedPswd1)
  if (!yr || !emll || !mobb || !famid || !pswd) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool
      .request()
      .input('yr', sql.Char(4), yr)
      .input('famid', sql.Int, famid)
      .input('emll', sql.NVarChar(255), emll)
      .input('mobb', sql.NVarChar(11), mobb)
      .input('pswd', sql.NVarChar(255), hashedPswd1)
      .execute('updtLogin');

    const record = result.recordset?.[0];
    if (record) {
      res.json({ message: 'Password updated successfully' });
    } else {
      res.json({ message: 'Error when updating password' });
    }
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Database Error', error: err.message });
  }
});


//CHECK THE EXISTENCE OF FAMILY LOGIN USING THE SUPPLIED PSWD
app.post('/api/chkLoginByPswd', async (req, res) => {
  const { yr, pswd } = req.body;

  if (!yr   || !pswd  ) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  // const encryptedPswd = await bcrypt.hash(pswd , 10);
  const encryptedPswd = pswd ;
  //console.log('hi')
  //console.log(pswd)
  //console.log(encryptedPswd)
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool
      .request()
      .input('yr', sql.Char(4), yr)
      .input('pswd', sql.NVarChar(255), encryptedPswd)
      .execute('chkLoginByPswd');
      const record = result.recordset?.[0];
      //console.log(record)
      //console.log(record)
      if (record) {
        res.json({ pswd: record.pswd ,famid: record.famid, famnm: record.famnm });
      } else {
        res.json({ message: 'Unregistered Mobile Number or Email Address' });
      }      
      // if (record  && result.recordset.length>0) {
      //   res.json({ famid:  pswd: pswd });
      // } else {
      //   res.json({ message: 'Incorrect password' });
      // }
      
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Database Error', error: err.message });
  }
});

//GET THE PERSONAL INFO FOR THE SELECTED FAMILY
app.post('/api/sp_GetFmInfo', async (req, res) => {
  const { yrNo, CurFmNo } = req.body;

  if (!yrNo || !CurFmNo) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool
      .request()
      .input('yrNo', sql.Char(4), yrNo)
      .input('famid', sql.Int, CurFmNo)
      .execute('sp_GetFmInfo');
    const records = result.recordset;      
    if (records && records.length > 0) {
      res.json(records); // ✅ sends array
    } else {
      res.json([]);
    }      

// const record = result.recordset?.[0];

// if (record) {
//   res.json({
//     schoolNm: record.schoolNm,
//     stid: record.stid,
//     fullname: record.fullname,
//     famnm: record.famnm,
//     ygpnm: record.ygpnm,
//     famid: record.famid,
//   });
// } else {
//   res.json({ message: 'Unregistered Mobile Number' });
// }
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Database Error', error: err.message });
  }
});

// --- Bank Details Stored Procedure
app.get("/api/bankdet/:bnkId", async (req, res) => {
  const bnkId = parseInt(req.params.bnkId, 10);
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request()
      .input("bnkid", sql.Int, bnkId)
      .execute("sp_GetBnkDet");

    res.json(result.recordset.length > 0 ? result.recordset : { data: null });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});


// --- Banks API
app.get("/api/banks", async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query(
      "SELECT BANKID, BANKNAME FROM [FEESFORMSSETUP] ORDER BY BANKNAME"
    );
    res.json(result.recordset);
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).send("Database error");
  }
});

//GET WHOLE FFES SITUATION FOR THE SELECTED STUDENT
app.post('/api/getstfees', async (req, res) => {
  const { famid, curstid, onlyRem } = req.body;

  if (!famid || !curstid || !onlyRem) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool
      .request()
      .input('famid', sql.Int, famid)
      .input('stid', sql.NVarChar(255), curstid)
      .input('onlyRem', sql.Int, onlyRem)
      .execute('sp_GetStFees');
      const records = result.recordset;      
      if (records && records.length > 0) {
        res.json(records); // ✅ sends array
      } else {
        res.json([]);
      }      
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Database Error', error: err.message });
  }
});


//GET PAYMENT HISTORY FOR THE SELECTED STUDENT
app.post('/api/getstpayhist', async (req, res) => {
  const { famid, curstid, ygpno } = req.body;

  if (!famid || !curstid || !ygpno) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool
      .request()
      .input('famid', sql.Int, famid)
      .input('stid', sql.NVarChar(255), curstid)
      .input('ygpno', sql.Int, ygpno)
      .execute('sp_GetStPay');
      const records = result.recordset;      
      if (records && records.length > 0) {
        res.json(records); // ✅ sends array
      } else {
        res.json([]);
      }      
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Database Error', error: err.message });
  }
});

// Generate PDF function
async function generatePDF(data) {
  const filePath = path.join("receipts", `receipt_${data.merchant_reference}.pdf`);
  await fs.mkdirSync("receipts", { recursive: true });

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));
  doc.fontSize(18).text("Payment Receipt", { align: "center" });
  doc.moveDown();
  doc.fontSize(12)
    .text(`Parent Email: ${data.parentEmail}`)
    .text(`Amount: ${data.amount} EGP`)
    .text(`Fort ID: ${data.fort_id}`)
    .text(`Merchant Ref: ${data.merchant_reference}`)
    .text(`Message: ${data.response_message}`)
    .text(`Status: ${data.status}`)
    .text(`Date: ${new Date().toLocaleString()}`);
  doc.end();

  return filePath;
}

// Main endpoint to send email
app.post("/api/send-receipt-email", async (req, res) => {
  try {
    const { receiptData } = req.body;
    if (!receiptData || !receiptData.parentEmail || !receiptData.amount) {
      return res.status(400).json({ error: "Invalid receiptData" });
    }

    const filePath = await generatePDF(receiptData);

    const mailOptions = {
      from: `"Parent" <${receiptData.parentEmail}>`,
      to: "fees@alsson.com",
      subject: `Receipt ${receiptData.merchant_reference}`,
      text: "Please find the payment receipt attached.",
      attachments: [
        {
          filename: path.basename(filePath),
          path: filePath
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Email sent to school" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});