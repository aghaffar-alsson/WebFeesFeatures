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
app.use("/receipts", express.static(path.join(process.cwd(), "public", "receipts")));

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
  requestTimeout: 25000,
};
console.log(sqlConfig)

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
// // --- Start Server
// app.listen(port, () => {
//   console.log(`🚀 Server is running on port ${process.env.VITE_PORT}`);
// });
// --- Start Server
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.VITE_PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
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

// --- Get family ID by mobile number from FMLOGIN TABLE Stored Procedure 
app.get("/api/spgetlogindet/:mobno", async (req, res) => {
  const mobno = req.params.mobno ? String(req.params.mobno).trim() : null;
  //console.log("Received mobno:", mobno);

  if (!mobno) {
    return res.status(400).json({ error: "Missing or invalid mobile number" });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("mob", sql.VarChar, mobno)
      .execute("sp_GetLoginDet");
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

// --- Get family ID by email Address & Mobile No. Stored Procedure 
app.post("/api/sp_GetLoginDetByMob&Email", async (req, res) => {
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
      .execute("sp_GetLoginDetByMob&Email");

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
  const { yr,  famid, famnm, emll, mobb, pswd } = req.body;
  console.log(req.body);
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
          <p>and this mobile number:</p><u><h2 style="color:#1a73e8;">${mobb}</h2></u>
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

//MODIFY AN EXISTING LOGIN BY RESETTING THE PASSWORD TO A NEW TEMPORARY ONE & SEND IT TO THE PARENT EMAIL ADDRESS
app.post('/api/modifylogin', async (req, res) => {
  const { yr,  famid, famnm, emll, mobb, pswd } = req.body;
  console.log(req.body);
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
      .execute('ModifyLogin');

      //SEND TEMP PASSWORD TO THE PARENT EMAIL
      const mailOptions = {
        from: process.env.FromEmailAddress,
        to: emll,
        subject: "Your Reset Password For Parents' Fees Portal",
        html: `
          <font face="Calibri" size="3" color = "blue">
          <h3>Dear Parent: ${famnm},</h3>
          <br/>
          <h3>Welcome again to our portal,</h3>
          <br/>
          <p>Your login account for the <strong>Parents' Fees Portal</strong> has been modified.</p>
          <p>Here is your new temporary password:</p><u><h2 style="color:#1a73e8;">${tempPswd}</h2></u>
          <p>You can login using the email adress:</p><u><h2 style="color:#1a73e8;">${emll}</h2></u>
          <p>and this mobile number:</p><u><h2 style="color:#1a73e8;">${mobb}</h2></u>
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
      res.json({ message: 'Reset Password is successful!' , tempPswd: tempPswd} , );
      
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
  const { yr,  famid, emll, mobb, pswd } = req.body;
  console.log(req.body);
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
  const { yr, pswd, email_reg, phone_reg } = req.body;

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
      .input('email_reg', sql.NVarChar(255), email_reg)
      .input('phone_reg', sql.NVarChar(255), phone_reg)
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

//HERE TO SETTLE THE FEES PAYMENT FOR THE SELECTED STUDENT
app.post('/api/settlefees', async (req, res) => {
  const { famid, curstid, onlyRem } = req.body;

  if (!famid || !curstid || onlyRem === undefined) {
    return res.status(400).json({ message: 'Missing required fields on settling fees payments' });
  }

  try {
    const pool = await sql.connect(sqlConfig);

    // SETTLE FEES PAYMENTS FOR THE CURRENT STUDENT
    await pool
      .request()
      .input('famid', sql.Int, famid)
      .input('stid', sql.NVarChar(255), curstid)
      .execute('sp_GetStFeesDetDue');

    // RELOAD FEES FOR THE CURRENT STUDENT AFTER SETTLEMENT
    const feesResult = await pool
      .request()
      .input('famid', sql.Int, famid)
      .input('stid', sql.NVarChar(255), curstid)
      .input('onlyRem', sql.Int, onlyRem)
      .execute('sp_GetStFees');

    res.json({
      success: true,
      fees: feesResult.recordset || []
    });

  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({
      success: false,
      message: 'Database Error',
      error: err.message
    });
  }
});


//FETCH THE LOGO PICTURE
async function fetchImageBuffer(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      Accept: "image/jpeg,image/png"
    }
  });

  return Buffer.from(res.data);
}

// Function to generate receipt PDF
async function generateReceiptPDF(data) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];

      doc.on("data", c => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ---------- LOGO (LOCAL FILE) ----------
      if (data.logoPath) {
        try {
          doc.image(data.logoPath, 40, 40, { width: 90 });
          doc.moveDown(3);
        } catch (e) {
          console.warn("Local logo failed:", e.message);
        }
      }
      doc.moveDown(5);
      const primaryColor = "#0C3C78"; // School theme color
      doc
        .fontSize(20)
        .fillColor(primaryColor)
        .text("El Alsson School – Payment Receipt",  35, 85);

      doc
        .fontSize(10)
        .fillColor("black")
        .text(`Date: ${data.date}`, 35, 115);

      doc.moveDown(2);

      // -----------------------------------------------------------
      // Section Title
      // -----------------------------------------------------------
      doc
        .fontSize(16)
        .fillColor(primaryColor)
        .text("Receipt Details:", { underline: true });

      doc.moveDown(1.5);
      // -----------------------------------------------------------
      // Student Information
      // -----------------------------------------------------------
      drawBoxTitle(doc, "Student Information:");

      doc
        .fontSize(12)
        .fillColor("black")
        .text(`Student ID: ${data.studentId || "N/A"}`)
        .moveDown(0.3)
        .text(`Student Name: ${data.studentName || "N/A"}`)
        .moveDown(0.3)
        .text(`Year Group: ${data.curYgp || "N/A"}`)
        .moveDown(1);

      doc.moveDown(1.5);

      // -----------------------------------------------------------
      // Summary Box
      // -----------------------------------------------------------
      drawBoxTitle(doc, "Payment Summary:");

      doc
        .fontSize(12)
        .fillColor("black")
        .text(`Parent Email: ${data.parentEmail}`)
        .moveDown(0.3)
        .text(`Amount Paid: ${data.amount} EGP`)
        .moveDown(1);

      // -----------------------------------------------------------
      // Transaction Table
      // -----------------------------------------------------------
      drawBoxTitle(doc, "Transaction Information:");

      const rows = [
        ["Transaction ID", data.fort_id],
        ["Order Reference", data.merchant_reference],
        ["Status", data.status],
        ["Message", data.response_message],
        ["Transaction Date", data.date],
      ];

      drawTable(doc, rows, 12);

      // -----------------------------------------------------------
      // Footer
      // -----------------------------------------------------------
      doc.moveDown(3);
      doc
        .fontSize(10)
        .fillColor("#555")
        .text("This receipt is automatically generated by El Alsson School - Online Fees Portal.",35, 580)
        // .moveDown(0.5)
        // .text("If you have questions, please contact: fees@alsson.com");

      doc.end();

      // // ---------- TITLE ----------
      // doc
      //   .fontSize(20)
      //   .fillColor("#1b3a57")
      //   .text("El Alsson School – Payment Receipt");

      // doc.moveDown(0.5);

      // doc
      //   .fontSize(10)
      //   .fillColor("black")
      //   .text(`Date: ${data.date}`);

      // doc.moveDown(2);

      // // ---------- BODY ----------
      // doc.fontSize(12)
      //   .text(`Parent Email: ${data.parentEmail}`)
      //   .text(`Amount Paid: ${data.amount} EGP`)
      //   .moveDown();

      // doc
      //   .text(`Transaction ID: ${data.fort_id}`)
      //   .text(`Reference: ${data.merchant_reference}`)
      //   .text(`Status: ${data.status}`)
      //   .text(`Message: ${data.response_message}`);

      // doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
function getLogoPath() {
  const p = path.join(process.cwd(), "assets", "newgiza-logo.jpg");
  return fs.existsSync(p) ? p : null;
}
// Endpoint to generate receipt for whtasapp
app.post("/api/generate-receipt", async (req, res) => {
  try {
    const data = req.body;

    if (!data?.parentEmail || !data?.amount) {
      return res.status(400).json({
        error: "parentEmail and amount are required"
      });
    }

    const pdfBuffer = await generateReceiptPDF({
      ...data,
      logoPath: getLogoPath(),
      date: data.date || new Date().toLocaleString("en-GB")
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=receipt.pdf");

    res.send(pdfBuffer);
  } catch (err) {
    console.error("Receipt generation error:", err);
    res.status(500).json({
      error: "Failed to generate receipt",
      details: err.message
    });
  }
});




// Main endpoint to send email
app.post("/api/send-receipt-email", async (req, res) => {
  try {
    const { receiptData } = req.body;

    if (!receiptData?.parentEmail || !receiptData?.amount) {
      return res.status(400).json({ error: "Invalid receiptData" });
    }

    if (!receiptData.studentId || !receiptData.studentName) {
      console.warn("Student info missing in receipt data");
    }


    const pdfBuffer = await generateReceiptPDF({
      ...receiptData,
      logoPath: getLogoPath()
    });

    const emailText = `
    Dear Fees Team,

    Please find attached the payment receipt for the following transaction:

    Student ID: ${receiptData.studentId || "N/A"}
    Student Name: ${receiptData.studentName || "N/A"}
    Year Group: ${receiptData.curYgp || "N/A"}

    Parent Email: ${receiptData.parentEmail}
    Amount Paid: ${receiptData.amount} EGP
    Transaction Reference: ${receiptData.merchant_reference}
    Transaction ID: ${receiptData.fort_id}
    Status: ${receiptData.status}

    This receipt was generated automatically by the El Alsson School Online Fees Portal.

    Best regards,
    El Alsson School
    `;

    const emailHtml = `
    <div dir="ltr" style="font-family: Tahoma, sans-serif; font-size: 12px; color: #000;">
      <p>Dear Fees Team,</p>

      <p>Please find attached the payment receipt for the following transaction:</p>

      <p>
        <strong>Student ID:</strong> ${receiptData.studentId || "N/A"}<br/><br/>
        <strong>Student Name:</strong> ${receiptData.studentName || "N/A"}<br/><br/>
        <strong>Year Group:</strong> ${receiptData.curYgp || "N/A"}<br/><br/>

        <strong>Parent Email:</strong> ${receiptData.parentEmail}<br/><br/>
        <strong>Amount Paid:</strong> ${receiptData.amount} EGP<br/><br/>
        <strong>Transaction Reference:</strong> ${receiptData.merchant_reference}<br/><br/>
        <strong>Transaction ID:</strong> ${receiptData.fort_id}<br/><br/>
        <strong>Status:</strong> ${receiptData.status}
      </p>

      <p>
        This receipt was generated automatically by the El Alsson School Online Fees Portal.
      </p>

      <p>
        Best regards,<br/>
      </p>
    </div>
    `;
    console.log(process.env.SMTP_USER);
    const mailOptions = {
      from: `"El Alsson School" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      // replies go to the parent
      replyTo: receiptData.parentEmail,
      subject: `Payment Receipt ${receiptData.merchant_reference}`,
      text: emailText,
      html: emailHtml,
      attachments: [
        {
          filename: `receipt-${receiptData.merchant_reference}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ error: err.message });
  }
});


// app.post("/api/send-receipt-email", async (req, res) => {
//   try {
//     const { receiptData } = req.body;

//     if (!receiptData?.parentEmail || !receiptData?.amount) {
//       return res.status(400).json({ error: "Invalid receiptData" });
//     }

//     const pdfBuffer = await generateReceiptPDF(receiptData);

//     const mailOptions = {
//       from: `"El Alsson School" <${process.env.VITE_SMTP_USER}>`,
//       to: "fees@alsson.com",
//       subject: `Payment Receipt ${receiptData.merchant_reference}`,
//       text: "Please find the payment receipt attached.",
//       attachments: [
//         {
//           filename: `receipt-${receiptData.merchant_reference}.pdf`,
//           content: pdfBuffer,
//           contentType: "application/pdf"
//         }
//       ]
//     };

//     await transporter.sendMail(mailOptions);

//     res.json({ success: true });
//   } catch (err) {
//     console.error("Email error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });



// export async function generateReceiptPDF(data) {
//   console.log("Generating receipt PDF with data:", data);
//   return new Promise((resolve, reject) => {
//     try {
//       const RECEIPTS_DIR = path.join(process.cwd(), "public", "receipts");
//       if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

//       const filename = `receipt_${data.merchant_reference || data.fort_id}.pdf`;
//       const filePath = path.join(RECEIPTS_DIR, filename);
//       const publicUrl = `/receipts/${filename}`;

//       const doc = new PDFDocument({
//         size: "A4",
//         margin: 10,
//       });

//       const stream = fs.createWriteStream(filePath);
//       doc.pipe(stream);

//       const primaryColor = "#0C3C78"; // School theme color

//       // -----------------------------------------------------------
//       // Header with Logo
//       // -----------------------------------------------------------
//       console.log("Logo path:", data.logoPath);
//       if (data.logoPath && fs.existsSync(data.logoPath)) {
//         doc.image(data.logoPath, 40, 40, { width: 90 });
//       }

//       doc
//         .fontSize(20)
//         .fillColor(primaryColor)
//         .text("El Alsson School – Payment Receipt",  35, 45);

//       doc
//         .fontSize(10)
//         .fillColor("black")
//         .text(`Date: ${data.date}`, 35, 75);

//       doc.moveDown(2);

//       // -----------------------------------------------------------
//       // Section Title
//       // -----------------------------------------------------------
//       doc
//         .fontSize(16)
//         .fillColor(primaryColor)
//         .text("Receipt Details", { underline: true });

//       doc.moveDown(1.5);

//       // -----------------------------------------------------------
//       // Summary Box
//       // -----------------------------------------------------------
//       drawBoxTitle(doc, "Payment Summary");

//       doc
//         .fontSize(12)
//         .fillColor("black")
//         .text(`Parent Email: ${data.parentEmail}`)
//         .moveDown(0.3)
//         .text(`Amount Paid: ${data.amount} EGP`)
//         .moveDown(1);

//       // -----------------------------------------------------------
//       // Transaction Table
//       // -----------------------------------------------------------
//       drawBoxTitle(doc, "Transaction Information");

//       const rows = [
//         ["Transaction ID", data.fort_id],
//         ["Order Reference", data.merchant_reference],
//         ["Status", data.status],
//         ["Message", data.response_message],
//         ["Transaction Date", data.date],
//       ];

//       drawTable(doc, rows, 12);

//       // -----------------------------------------------------------
//       // Footer
//       // -----------------------------------------------------------
//       doc.moveDown(3);
//       doc
//         .fontSize(10)
//         .fillColor("#555")
//         .text("This receipt is automatically generated by El Alsson School - Online Fees Portal.",35, 400)
//         // .moveDown(0.5)
//         // .text("If you have questions, please contact: fees@alsson.com");

//       doc.end();

//       stream.on("finish", () => {
//         resolve({ filePath, publicUrl });
//       });
//       stream.on("error", reject);
//     } catch (err) {
//       reject(err);
//     }
//   });
// }

export async function generateReceiptPDFWhatsApp(data) {
  return new Promise((resolve, reject) => {
    try {
      const RECEIPTS_DIR = path.join(process.cwd(), "public", "receipts");
      if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

      const filename = `receipt_${data.merchant_reference || data.fort_id}.pdf`;
      const filePath = path.join(RECEIPTS_DIR, filename);
      const publicUrl = `/receipts/${filename}`;

      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const primaryColor = "#0C3C78";

      // Header
      if (data.logoPath && fs.existsSync(data.logoPath)) {
        doc.image(data.logoPath, 40, 40, { width: 90 });
      }
      doc.fontSize(20).fillColor(primaryColor).text("El Alsson School – Payment Receipt", 150, 50);
      doc.fontSize(10).fillColor("black").text(`Date: ${data.date}`, 150, 80);
      doc.moveDown(2);

      // Receipt Details
      drawBoxTitle(doc, "Payment Summary");
      doc.fontSize(12).fillColor("black")
        .text(`Parent Email: ${data.parentEmail}`)
        .moveDown(0.3)
        .text(`Amount Paid: ${data.amount} EGP`)
        .moveDown(1);

      drawBoxTitle(doc, "Transaction Information");
      const rows = [
        ["Transaction ID", data.fort_id],
        ["Order Reference", data.merchant_reference],
        ["Status", data.status],
        ["Message", data.response_message],
        ["Transaction Date", data.date],
      ];
      drawTable(doc, rows, 12);

      // Footer
      doc.moveDown(2);
      doc.fontSize(10).fillColor("#555")
        .text(
          "This receipt is automatically generated by El Alsson School - Online Fees Portal.",
          { align: "center" }
        )
        .moveDown(0.2)
        .text("If you have questions, please contact: fees@alsson.com", { align: "center" });

      doc.end();

      stream.on("finish", () => resolve({ filePath, publicUrl }));
      stream.on("error", (err) => reject(err));

    } catch (err) {
      reject(err);
    }
  });
}

// Function to drow box inside the PDF
function drawBoxTitle(doc, title) {
  doc
    .moveDown(1)
    .fontSize(14)
    .fillColor("#0C3C78")
    .text(title, { underline: true })
    .moveDown(0.5);
}
// Function to draw table inside the PDF
function drawTable(doc, rows, fontSize = 12) {
  const startX = 40;
  let y = doc.y;

  const col1Width = 150;
  const col2Width = 350;
  const rowHeight = 22;

  doc.lineWidth(0.5);

  rows.forEach(([label, value]) => {
    // Draw background
    doc.rect(startX, y, col1Width + col2Width, rowHeight).stroke();

    // Label
    doc
      .fontSize(fontSize)
      .fillColor("#0C3C78")
      .text(label, startX + 5, y + 6);

    // Value
    doc
      .fontSize(fontSize)
      .fillColor("black")
      .text(String(value || ""), startX + col1Width + 15, y + 6, {
        width: col2Width - 20,
      });

    y += rowHeight;
  });

  doc.moveDown(2);
}

// // ---------- LOG PAYMENT ACTION ----------
// async function keepTrackPaymentAction(paymentItems) {
//   const pool = await sql.connect(sqlConfig);
//   const transaction = new sql.Transaction(pool);

//   try {
//     await transaction.begin();

//     const request = new sql.Request(transaction);

//     // DELETE first
//     await request
//       .input("CURYEAR", sql.VarChar, paymentItems.curyear)
//       .input("S_CODE", sql.VarChar, paymentItems.stid)
//       .input("FAMID", sql.Int, paymentItems.famid)
//       .input("SCHOOLID", sql.Int, paymentItems.schoolId)
//       .input("INSTCODE", sql.Int, paymentItems.instCode)
//       .input("FACENAME", sql.VarChar, paymentItems.facename)
//       .query(`
//         DELETE FROM APSTRANS
//         WHERE CURYEAR=@CURYEAR
//           AND S_CODE=@S_CODE
//           AND FAMID=@FAMID
//           AND SCHOOLID=@SCHOOLID
//           AND InstCode=@INSTCODE
//           AND FACENAME=@FACENAME
//           AND SETTLED=0
//       `);

//     // INSERT
//     await request
//       .input("PAIDAMOUNT", sql.Numeric, paymentItems.amount)
//       .input("TRNSDT", sql.Date, new Date())
//       .query(`
//         INSERT INTO APSTRANS
//           (CURYEAR,S_CODE,FAMID,SCHOOLID,InstCode,FACENAME,PAIDAMOUNT,TRNSDT,SETTLED)
//         VALUES
//           (@CURYEAR,@S_CODE,@FAMID,@SCHOOLID,@INSTCODE,@FACENAME,@PAIDAMOUNT,@TRNSDT,0)
//       `);

//     await transaction.commit();
//     console.log("Payment logged:", paymentItems.instCode);
//   } catch (err) {
//     await transaction.rollback();
//     console.error("SQL Error:", err);
//     throw err;
//   }
// }

// app.post("/api/log-payment", async (req, res) => {
//   const { paymentItems } = req.body;

//   console.log("Incoming items:", paymentItems);

//   if (!Array.isArray(paymentItems) || !paymentItems.length) {
//     return res.status(400).json({ message: "paymentItems array is required" });
//   }

//   try {
//     for (const item of paymentItems) {
//       await keepTrackPaymentAction(item);
//     }

//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });


// Endpoint to generate WhatsApp link
app.post("/api/generate-whatsapp-link", (req, res) => {
  try {
    const {
      schoolNumber = "201003828160",
      receiptData,
      publicUrl,
    } = req.body;

    if (!receiptData || !publicUrl) {
      return res.status(400).json({ error: "receiptData and publicUrl are required" });
    }

    const { amount, fort_id, merchant_reference, parentEmail } = receiptData;
    const fullPublicUrl = `https://my-payfort-backend.onrender.com/receipts/receipt_${receiptPayload.merchant_reference}.pdf`;
    const msg = `Payment Receipt Sent by Parent
                Amount: ${amount} EGP
                Fort ID: ${fort_id}
                Order Ref: ${merchant_reference}
                Parent Email: ${parentEmail}
                Download receipt: ${publicUrl}`;

    //const waLink = `https://wa.me/${schoolNumber}?text=${encodeURIComponent(msg)}`;
    const waLink = `https://wa.me/${schoolNumber}?text=${encodeURIComponent(
      `Payment Receipt Sent by Parent
    Amount: ${receiptPayload.amount} EGP
    Fort ID: ${receiptPayload.fort_id}
    Order Ref: ${receiptPayload.merchant_reference}
    Parent Email: ${receiptPayload.parentEmail}
    Download receipt: ${fullPublicUrl}`
    )}`;
    return res.json({ success: true, waLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate WhatsApp link", details: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

export default app;