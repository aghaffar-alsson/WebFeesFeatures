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
//import { log } from 'console';
import { createRequire } from 'module';
import bcrypt from "bcrypt";
import fs from "fs-extra";
import PDFDocument from "pdfkit";
import crypto from "crypto";
//import session from "express-session";
//import MSSQLStore from "connect-mssql-v2";
//const MSSQLStore = require('connect-mssql-v2')(session)
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();
//******************OPEN CONNECTION & ESTABLISH SERVER************************/
const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');

dotenv.config();

//const isProduction = process.env.NODE_ENV === "production";
// Trust proxy for secure cookies if behind a reverse proxy (e.g., Vercel)
app.set("trust proxy", 1);

//paths setup for static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;
//server connection configuration
const sqlConfig = {
  server: process.env.SERVER_NAME,
  database: process.env.DB_NAME,
  user: process.env.USER_ID,
  password: process.env.PSWD,
  options: {
    encrypt: false, // Use encryption as we are connecting to a remote server
    trustServerCertificate: true, // Do not trust server certificate in production, ensure proper SSL setup
  },
  requestTimeout: 35000,
};
console.log(sqlConfig)

//app.use(cors());
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL
];

//CORS configuration to allow only our frontend origin and credentials (cookies) to be sent
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow Postman/server-to-server
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
// --- Body parser
app.use(express.json());
// --- Security helmet middleware
app.use(helmet());
// --- Static files for receipts
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
// Create one shared connection pool
let poolPromise = sql.connect(sqlConfig)
  .then(pool => {
    console.log("✅ Connected to SQL Server");
    return pool;
  })
  .catch(err => {
    console.error("❌ Database Connection Failed!", err);
  });
// // --- Start Server

// // initialize MSSQL session store
// // --- Session Store
// let sessionStore;
// try {
//   sessionStore = new MSSQLStore({
//     config: sqlConfig,
//     table: "sessions",
//     columnNames: {
//       id: "sid",
//       expires: "expires",
//       data: "data",
//     },
//     ttl: 1000 * 60 * 30, // 30 minutes
//   });
// } catch (err) {
//   console.error("Failed to initialize MSSQL session store:", err);
//   throw err;
// }


// // session middleware
// app.use(
//   session({
//     name: "alsson.sid",
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     rolling: true,
//     proxy: true,
//     store: sessionStore,
//     cookie: {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? "none" : "lax",
//       maxAge: 1000 * 60 * 30,
//     },
//   })
// );

// // --- Listen for session store errors
// sessionStore.on("error", (err) => {
//   console.error("MSSQL session store error:", err);
// });

// // --- Test Route
// app.get("/test-session", (req, res) => {
//   if (!req.session.views) {
//     req.session.views = 1;
//     return res.send("First visit, session created!");
//   }

//   req.session.views += 1;
//   res.send(`You have visited this page ${req.session.views} times`);
// });

// --- Rate Limiter for auth endpoints

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later."
  }
});
app.use("/loginchk", authLimiter);
app.use("/verify-login-otp", authLimiter);
app.use("/resend-login-code", authLimiter);


// --- Utility function to normalize database records with flexible field names
function normalizeRecord(record, fallback = {}) {
  if (!record) return null;

  return {
    famid: record.FAMID ?? record.famid ?? fallback.famid ?? null,
    famnm: record.FAMNM ?? record.famnm ?? fallback.famnm ?? null,
    email: record.EMAIL_ADDRESS ?? record.email_address ?? fallback.email ?? null,
    mobile: record.MOBILE_NUMBER ?? record.mobile_number ?? fallback.mobile ?? null
  };
}
// // --- Middleware to protect routes
// function requireAuth(req, res, next) {
//   if (!req.session || !req.session.user || !req.session.user.authenticated) {
//     return res.status(401).json({
//       success: false,
//       message: "Unauthorized"
//     });
//   }
//   next();
// }
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
// // Optional: simple async wrapper
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
// --- Health Check Endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    env: process.env.NODE_ENV || "development",
    session: !!req.session,
    user: req.session?.user ? {
      famid: req.session.user.famid,
      famnm: req.session.user.famnm
    } : null
  });
});
// --- Test API
app.get("/", (req, res) => {
  res.send("API Server is running on Port: " + port);
});
//***************************APIs START**************************************************/
// --- Get family ID by mobile number Stored Procedure 
app.post("/spgetfmdet", async (req, res) => {
  const { yr, mobno } = req.body;

  console.log("Received mobno:", mobno);
  console.log("Received yr:", yr);

  if (!mobno || !yr) {
    return res.status(400).json({ error: "Missing or invalid mobile number or year" });
  }

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("yr", sql.VarChar, yr)
      .input("mob", sql.VarChar, mobno)
      .execute("sp_GetFmDet");

    if (result.recordset.length > 0) {
      return res.json(result.recordset);
    } else {
      return res.json([]);
      // or return res.json({ data: null });
      // but [] is easier for frontend because you're checking data[0]
    }
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});
// --- Get family ID by mobile number from FMLOGIN TABLE Stored Procedure 
app.get("/spgetlogindet/:mobno", async (req, res) => {
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
app.post("/sp_GetFmDetByMob&Email", async (req, res) => {
  const { yrNo = req.params.yrNo ? String(req.params.yrNo).trim() : null,
    mobno = req.params.mobno ? String(req.params.mobno).trim() : null,
    emll = req.params.emll ? String(req.params.emll).trim() : null
  } = req.body;
  if (!yrNo) {
    return res.status(400).json({ error: "Missing or invalid academic year" });
  }
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
      .input("yr", sql.Char(4), yrNo)
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
app.post("/sp_GetLoginDetByMob&Email", async (req, res) => {
  const { mobno = req.params.mobno ? String(req.params.mobno).trim() : null,
    emll = req.params.emll ? String(req.params.emll).trim() : null } = req.body;
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


//CREATE NEW LOGIN
app.post('/signup', async (req, res) => {
  const { yr, famid, famnm, emll, mobb, pswd } = req.body;
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
          <p>El Alsson School</p>
          <p>Best regards,</p>
          <img src="https://www.alsson.com/wp-content/themes/alsson/img/newgiza-logo.jpg" alt="Alsson Logo" width="150" />
          </font>`,
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Signup successful!', tempPswd: tempPswd },);

  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Database Error', error: err.message });
  }
});

//MODIFY AN EXISTING LOGIN BY RESETTING THE PASSWORD TO A NEW TEMPORARY ONE & SEND IT TO THE PARENT EMAIL ADDRESS
app.post('/modifylogin', async (req, res) => {
  const { yr, famid, famnm, emll, mobb, pswd } = req.body;
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
          <p>El Alsson School</p>
          <p>Best regards,</p>
          <img src="https://www.alsson.com/wp-content/themes/alsson/img/newgiza-logo.jpg" alt="Alsson Logo" width="150" />
          </font>`,
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Reset Password is successful!', tempPswd: tempPswd },);

  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Database Error', error: err.message });
  }
});

//CHECK THE EXISTENCE OF FAMILY LOGIN USING THE SUPPLIED MOBILE NUMBER
app.post('/chkLoginByMob', async (req, res) => {
  const { yr, mobb } = req.body;

  if (!yr || !mobb) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool
      .request()
      .input('yr', sql.Char(4), yr)
      .input('mobb', sql.NVarChar(11), mobb)
      .execute('chkLoginByMob');

    const record = result.recordset?.[0];

    if (record) {
      return res.json({
        success: true,
        famid: record.famid,
        famnm: record.famnm
      });
    }

    return res.json({
      success: false,
      message: 'Unregistered Mobile Number'
    });
  } catch (err) {
    console.error('Database Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Database Error',
      error: err.message
    });
  }
});

//CHECK THE EXISTENCE OF FAMILY LOGIN USING THE SUPPLIED EMAIL ADDRESS
app.post('/chkLoginByEml', async (req, res) => {
  const { yr, emll } = req.body;

  if (!yr || !emll) {
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
      res.json({ message: 'Unregistered Email Address' });
    }

  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Database Error', error: err.message });
  }
});

//CHECK THE EXISTENCE OF FAMILY LOGIN USING THE EMAIL ADDRESS & MOBILE NUMBER
app.post('/chkLogin', async (req, res) => {
  const { yr, emll, mobb } = req.body;

  if (!yr || !emll || !mobb) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  try {
    const pool = await sql.connect(sqlConfig);

    const result = await pool
      .request()
      .input('yr', sql.Char(4), String(yr).trim())
      .input('emll', sql.NVarChar(255), String(emll).trim())
      .input('mobb', sql.NVarChar(11), String(mobb).trim())
      .execute('chkLogin');

    const record = result.recordset?.[0];

    if (record) {
      return res.json({
        success: true,
        famid: record.famid,
        famnm: record.famnm
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Unregistered Mobile Number or Email Address'
    });

  } catch (err) {
    console.error('Database Error in /chkLogin:', err);
    return res.status(500).json({
      success: false,
      message: 'Database Error',
      error: err.message
    });
  }
});

//CHECK THE EXISTENCE OF FAMILY LOGIN USING THE EMAIL ADDRESS & MOBILE NUMBER
app.put('/updtLogin', async (req, res) => {
  const { yr, famid, emll, mobb, pswd } = req.body;
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
app.post('/chkLoginByPswd', async (req, res) => {
  const { yr, pswd, email_reg, phone_reg } = req.body;

  if (!yr || !pswd) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  // const encryptedPswd = await bcrypt.hash(pswd , 10);
  const encryptedPswd = pswd;
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
      res.json({ pswd: record.pswd, famid: record.famid, famnm: record.famnm });
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
app.post('/sp_GetFmInfo', async (req, res) => {
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
app.get("/bankdet/:bnkId", async (req, res) => {
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

//API to check login credentials and send OTP if valid, then return verification token to frontend
// app.post("/loginchk", async (req, res) => {
//   const { yr,emll, pswd, mobno } = req.body;

//   try {
//     // 1) check user credentials in DB
//     const pool = await sql.connect(dbConfig);

//     const result = await pool.request()
//       .input("yr", sql.Char(4), yr)
//       .input("emll", sql.VarChar, emll)
//       .input("pswd", sql.VarChar, pswd)
//       .input("mobno", sql.VarChar, mobno)
//       .query(`
//         SELECT TOP 1 famid, famnm, eml, mobb
//         FROM dbo.FMLOGIN
//         WHERE emll = @emll
//           AND pswd = @pswd
//           AND mobb = @mobno
//       `);

//     if (!result.recordset.length) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid login credentials"
//       });
//     }

//     const user = result.recordset[0];

//     // 2) generate OTP & verification token
//     const otp = generateOtp();
//     const verificationToken = generateVerificationToken();

//     // 3) store temporarily
//     pendingLoginOtps[verificationToken] = {
//       email: user.emll,
//       famid: user.famid,
//       famnm: user.famnm,
//       mobile: user.mobb,
//       otp,
//       expiresAt: Date.now() + 5 * 60 * 1000, // OTP expires in 5 minutes
//       attempts: 0
//     };

//     // 4) send email
//     await sendVerificationCodeEmail(user.emll, otp, user.famnm);

//     // 5) return token only
//     return res.json({
//       success: true,
//       otpRequired: true,
//       verificationToken,
//       message: "Verification code sent to your email"
//     });

//   } catch (err) {
//     console.error("loginchk error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// });

// API to validate credentials, generate OTP, store it in DB, and send it by email
app.post("/loginchk", asyncHandler(async (req, res) => {
  const { yr, emll, pswd, mobno } = req.body;

  if (!yr || !emll || !pswd || !mobno) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }

  try {
    const pool = await sql.connect(sqlConfig);

    // 1) Validate credentials using your existing stored procedure
    const result = await pool
      .request()
      .input("yr", sql.Char(4), yr)
      .input("pswd", sql.NVarChar(255), pswd) // currently plain text in your system
      .input("email_reg", sql.NVarChar(255), emll)
      .input("phone_reg", sql.NVarChar(20), mobno)
      .execute("chkLoginByPswd");
    const record = result.recordset?.[0];

    if (!record || !record.famid || !record.famnm) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials"
      });
    }
    // 2) Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    // 3) Generate verification token
    const verificationToken = crypto.randomUUID();
    // 4) Expiry = 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const otpHash = await bcrypt.hash(otpCode, 10);
    console.log("OTP plain:", otpCode);
    console.log("OTP hash:", otpHash);
    // 5) Invalidate previous unused OTPs for same user (optional but recommended)
    await pool
      .request()
      .input("famid", sql.Int, record.famid)
      .input("emll", sql.NVarChar(255), emll)
      .input("mobno", sql.NVarChar(20), mobno)
      .query(`
        UPDATE LOGIN_OTP_VERIFICATIONS SET IS_USED = 1, USED_AT = GETDATE() WHERE FAMID = @famid  
        AND EMAIL_ADDRESS = @emll AND MOBILE_NUMBER = @mobno AND IS_USED = 0
      `);

    // 6) Insert new OTP record into DB table
    await pool
      .request()
      .input("verificationToken", sql.NVarChar(100), verificationToken)
      .input("famid", sql.Int, record.famid)
      .input("famnm", sql.NVarChar(255), record.famnm)
      .input("emll", sql.NVarChar(255), emll)
      .input("mobno", sql.NVarChar(20), mobno)
      .input("otpCode", sql.NVarChar(255), otpHash)
      .input("expiresAt", sql.DateTime, expiresAt)
      .query(`
        INSERT INTO LOGIN_OTP_VERIFICATIONS
        (VERIFICATION_TOKEN,FAMID,FAMNM,EMAIL_ADDRESS,MOBILE_NUMBER,OTP_CODE,EXPIRES_AT,IS_USED,ATTEMPTS,CREATED_AT)
        VALUES (@verificationToken,@famid,@famnm,@emll,@mobno,@otpCode,@expiresAt,0,0,GETDATE())
      `);
    // 7) Send OTP email
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: emll,
      subject: "Your Login Verification Code",
      html: `
      <font face="Calibri" size="3" color = "#000">
      <h3>Dear Parent: ${record.famnm},</h3>
      <br/>
      <h3>Welcome to our portal,</h3>
      <br/>
      <p>Your one time verification OTP code is:</p>
      <h2 style="letter-spacing: 4px;">${otpCode}</h2>
      <br/>
      <p>This OTP code will expire in 5 minutes.</p>
      <br/>
      <p>Please do not share this code with anyone.</p>
      <br/>
      <p>Maximum 3 attempts allowed.</p>
      <br/>
      <p>Finance Department - Fees Section</p>
      <p>El Alsson School</p>
      <p>Best regards,</p>
      <div style="margin-top: 20px; margin-bottom: 20px;">
      <img src="https://www.alsson.com/wp-content/themes/alsson/img/newgiza-logo.jpg" alt="Alsson Logo" width="150" />
      </div>
      </font>`,
    });
    return res.json({
      success: true,
      otpRequired: true,
      verificationToken,
      expiresAt: expiresAt.toISOString(),
      maxAttempts: 3,
      message: "Verification code sent to your email"
    });
  } catch (err) {
    console.error("loginchk error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
}));

// API to resend OTP code if expired or attempts exceeded
app.post("/resend-login-code", asyncHandler(async (req, res) => {
  const { verificationToken } = req.body;
  if (!verificationToken) {
    return res.status(400).json({
      success: false,
      message: "Missing verification token"
    });
  }

  try {
    const pool = await sql.connect(sqlConfig);
    // 1) Load existing OTP request
    const result = await pool
      .request()
      .input("verificationToken", sql.NVarChar(100), String(verificationToken).trim())
      .query(`SELECT TOP 1 OTP_ID,FAMID,FAMNM,EMAIL_ADDRESS,MOBILE_NUMBER,EXPIRES_AT,IS_USED,ATTEMPTS ,  
    case is_used when 1 then 'True' else 'False' end as ussdd
    FROM LOGIN_OTP_VERIFICATIONS WHERE VERIFICATION_TOKEN = @verificationToken
  `);
    const record = result.recordset?.[0];
    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification request"
      });
    }
    // 2) Decide if resend is allowed
    const isExpired = new Date() > new Date(record.EXPIRES_AT);
    const attemptsExceeded = record.ATTEMPTS >= 3;
    if (!isExpired && !attemptsExceeded) {
      return res.status(400).json({
        success: false,
        message: "You can request a new code only after expiry or after exceeding maximum attempts"
      });
    }
    // 3) Mark old OTP as used
    await pool
      .request()
      .input("otpId", sql.Int, record.OTP_ID)
      .query(`UPDATE LOGIN_OTP_VERIFICATIONS SET IS_USED = 1,USED_AT = GETDATE() WHERE OTP_ID = @otpId`);
    // 4) Generate new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);
    console.log("OTP plain:", otpCode);
    console.log("OTP hash:", otpHash);

    // 5) New token + expiry
    const newVerificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    // 6) Insert new OTP record
    await pool
      .request()
      .input("verificationToken", sql.NVarChar(100), newVerificationToken)
      .input("famid", sql.Int, record.FAMID || record.famid)
      .input("famnm", sql.NVarChar(255), record.FAMNM || record.famnm)
      .input("emll", sql.NVarChar(255), record.EMAIL_ADDRESS || record.email_address)
      .input("mobno", sql.NVarChar(20), record.MOBILE_NUMBER || record.mobile_number)
      .input("otpCode", sql.NVarChar(255), otpHash)
      .input("expiresAt", sql.DateTime, expiresAt)
      .query(`INSERT INTO LOGIN_OTP_VERIFICATIONS (VERIFICATION_TOKEN,FAMID,FAMNM,EMAIL_ADDRESS,MOBILE_NUMBER,OTP_CODE,
    EXPIRES_AT,IS_USED,ATTEMPTS,CREATED_AT) VALUES
    (@verificationToken,@famid,@famnm,@emll,@mobno,@otpCode,@expiresAt,0,0,GETDATE())
  `);

    // 7) Send email
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: record.EMAIL_ADDRESS || record.email_address,
      subject: "Your New Login Verification Code",
      html: `
      <font face="Calibri" size="3" color = "#000">
      <h3>Dear Parent: ${record.famnm},</h3>
      <br/>
      <h3>Welcome to our portal,</h3>
      <br/>
      <p>Your one time verification OTP code is:</p>
      <h2 style="letter-spacing: 4px;">${otpCode}</h2>
      <br/>
      <p>This OTP code will expire in 5 minutes.</p>
      <br/>
      <p>Please do not share this code with anyone.</p>
      <br/>
      <p>Maximum 3 attempts allowed.</p>
      <br/>
      <p>Finance Department - Fees Section</p>
      <p>El Alsson School</p>
      <p>Best regards,</p>
      <img src="https://www.alsson.com/wp-content/themes/alsson/img/newgiza-logo.jpg" alt="Alsson Logo" width="150" />
      </font>`,
    });
    // return res.json({
    //   success: true,
    //   otpRequired: true,
    //   newVerificationToken,
    //   expiresAt: expiresAt.toISOString(),
    //   maxAttempts: 3,
    //   message: "A new verification code has been sent to your email"
    // });

    return res.json({
      success: true,
      message: "A new verification code has been sent to your email",
      verificationToken: newVerificationToken,
      otpRequired: true,
      expiresAt: expiresAt.toISOString(),
      maxAttempts: 3
    });

  } catch (err) {
    console.error("resend-login-code error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
}));

//API to verify the OTP code sent to email, then create session/JWT if valid
// app.post("/verify-login-code", async (req, res) => {
//   const { verificationToken, OTP_Code } = req.body;

//   try {
//     const pending = pendingLoginOtps[verificationToken];

//     if (!pending) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid or expired verification request"
//       });
//     }

//     if (Date.now() > pending.expiresAt) {
//       delete pendingLoginOtps[verificationToken];
//       return res.status(400).json({
//         success: false,
//         message: "Verification code expired"
//       });
//     }

//     pending.attempts += 1;

//     if (pending.attempts > 5) {
//       delete pendingLoginOtps[verificationToken];
//       return res.status(429).json({
//         success: false,
//         message: "Number of attempts exceeded. Please request a new verification code."
//       });
//     }

//     if (pending.otp !== String(OTP_Code).trim()) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid verification code, please try again"
//       });
//     }

//     // OTP correct -> create final login/session/JWT
//     // Example response (replace with your real token/session logic)
//     const authPayload = {
//       famid: pending.famid,
//       famnm: pending.famnm,
//       emll: pending.email,
//       mobb: pending.mobile,
//     };

//     delete pendingLoginOtps[verificationToken];

//     return res.json({
//       success: true,
//       message: "Login successful",
//       user: authPayload
//     });

//   } catch (err) {
//     console.error("verify-login-code error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// });
app.post("/verify-login-code", asyncHandler(async (req, res) => {
  const { verificationToken, code } = req.body;
  console.log("Verification request received:", { verificationToken, code });
  if (!verificationToken || !code) {
    return res.status(400).json({
      success: false,
      message: "Missing verification token or code"
    });
  }
  //verificationToken = String(verificationToken).trim();
  console.log("Received verification request:", { verificationToken, code });
  try {
    const pool = await sql.connect(sqlConfig);

    const result = await pool
      .request()
      .input("verificationToken", sql.NVarChar(100), String(verificationToken).trim())
      .query(`SELECT TOP 1 OTP_ID,FAMID,FAMNM,EMAIL_ADDRESS,MOBILE_NUMBER,OTP_CODE,EXPIRES_AT,IS_USED,ATTEMPTS ,  
        case is_used when 1 then 'True' else 'False' end as ussdd 
        FROM LOGIN_OTP_VERIFICATIONS WHERE VERIFICATION_TOKEN = @verificationToken`);

    const record = result.recordset?.[0];
    console.log("DB record for verification:", record);
    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification request",
        reason: "INVALID_REQUEST"
      });
    }
    console.log(record.IS_USED)
    console.log(record.ussdd)
    //if (record.IS_USED) {
    if (record.ussdd === 'True') {
      return res.status(400).json({
        success: false,
        message: "This verification code is no longer valid",
        reason: "OTP_USED",
        allowResend: true
      });
    }

    if (new Date() > new Date(record.EXPIRES_AT)) {
      await pool
        .request()
        .input("otpId", sql.Int, record.OTP_ID)
        .query(`UPDATE LOGIN_OTP_VERIFICATIONS SET IS_USED = 1, USED_AT = GETDATE() WHERE OTP_ID = @otpId`);

      return res.status(400).json({
        success: false,
        message: "Verification code expired",
        reason: "OTP_EXPIRED",
        allowResend: true
      });
    }

    if ((record.ATTEMPTS || 0) >= 3) {
      await pool
        .request()
        .input("otpId", sql.Int, record.OTP_ID)
        .query(`
          UPDATE LOGIN_OTP_VERIFICATIONS SET IS_USED = 1, USED_AT = GETDATE() WHERE OTP_ID = @otpId`);

      return res.status(429).json({
        success: false,
        message: "Number of attempts exceeded. Please request a new verification code.",
        reason: "ATTEMPTS_EXCEEDED",
        allowResend: true
      });
    }
    console.log("Comparing OTP code:", { inputCode: String(code).trim(), dbHash: String(record.OTP_CODE).trim() });
    const isMatch = await bcrypt.compare(String(code).trim(), String(record.OTP_CODE).trim());
    if (!isMatch) {
      await pool
        .request()
        .input("otpId", sql.Int, record.OTP_ID)
        .query(`UPDATE LOGIN_OTP_VERIFICATIONS SET ATTEMPTS = ATTEMPTS + 1,
          IS_USED = CASE WHEN ATTEMPTS + 1 >= 3 THEN 1 ELSE IS_USED END,
          USED_AT = CASE WHEN ATTEMPTS + 1 >= 3 THEN GETDATE() ELSE USED_AT END WHERE OTP_ID = @otpId
        `);

      const nextAttempts = (record.ATTEMPTS || 0) + 1;
      const lockedNow = nextAttempts >= 3;

      return res.status(401).json({
        success: false,
        message: lockedNow
          ? "Number of attempts exceeded. Please request a new verification code."
          : "Invalid verification code, please try again",
        reason: lockedNow ? "ATTEMPTS_EXCEEDED" : "INVALID_CODE",
        allowResend: lockedNow,
        attemptsLeft: Math.max(0, 3 - nextAttempts)
      });
    }

    // Successful verification -> mark OTP as used
    await pool
      .request()
      .input("otpId", sql.Int, record.OTP_ID)
      .query(`
        UPDATE LOGIN_OTP_VERIFICATIONS
        SET IS_USED = 1, USED_AT = GETDATE()
        WHERE OTP_ID = @otpId
      `);

    // Regenerate session to prevent session fixation
    // req.session.regenerate((regenErr) => {
    //   if (regenErr) {
    //     console.error("Session regenerate error:", regenErr);
    //     return res.status(500).json({
    //       success: false,
    //       message: "Unable to create session"
    //     });
    //   }

    // // Set session data INSIDE regenerate callback
    // req.session.isAuthenticated = true;
    // req.session.user = {
    //   famid: record.FAMID,
    //   famnm: record.FAMNM,
    //   email: record.EMAIL_ADDRESS,
    //   mobile: record.MOBILE_NUMBER,
    //   authenticated: true,
    //   loginAt: new Date().toISOString()
    // };

    //   // Save session before responding
    //   req.session.save((saveErr) => {
    //     if (saveErr) {
    //       console.error("Session save error:", saveErr);
    //       return res.status(500).json({
    //         success: false,
    //         message: "Failed to save session"
    //       });
    //     }

    //     return res.status(200).json({
    //       success: true,
    //       message: "Login successful",
    //       user: {
    //         famid: record.FAMID,
    //         famnm: record.FAMNM,
    //         emll: record.EMAIL_ADDRESS,
    //         mobno: record.MOBILE_NUMBER
    //       }
    //     });
    //   });
    // });
    return res.status(200).json({
      success: true,
      message: "Login successful (session bypass test)",
      user: //req.session.user
      {
        famid: record.FAMID,
        famnm: record.FAMNM,
        emll: record.EMAIL_ADDRESS,
        mobno: record.MOBILE_NUMBER
      }
    });
    //  return res.json({
    //     success: true,
    //     message: "Login verified successfully",
    //     user: req.session.user
    //   });    
  } catch (err) {
    console.error("verify-login-code error:", err);
    console.error("verify-login-code stack:", err?.stack);
    console.error("Request body:", req.body);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}));
// //API to logout and destroy session
// app.post("/logout", (req, res) => {
//   if (!req.session) {
//     return res.json({
//       success: true,
//       message: "Logged out"
//     });
//   }

//   req.session.destroy((err) => {
//     if (err) {
//       console.error("Logout error:", err);
//       return res.status(500).json({
//         success: false,
//         message: "Logout failed"
//       });
//     }

//     res.clearCookie("alsson.sid", {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? "none" : "lax"
//     });

//     return res.json({
//       success: true,
//       message: "Logged out successfully"
//     });
//   });
// });
// //API to test protected route
// app.get("/protected-test",  (req, res) => {
//   res.json({
//     success: true,
//     message: "You are authenticated",
//     //user: req.session.user
//     user: {
//       famid: record.FAMID,
//       famnm: record.FAMNM,
//       emll: record.EMAIL_ADDRESS,
//       mobno: record.MOBILE_NUMBER
//     }    

//   });
// });
// //API to get current logged in user info 
// app.get("/me",  (req, res) => {
//   return res.json({
//     success: true,
//     user: {
//       famid: req.session.user.famid,
//       famnm: req.session.user.famnm,
//       email: req.session.user.email,
//       mobile: req.session.user.mobile
//     }
//   });
// });
// --- Banks API
app.get("/banks", async (req, res) => {
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
app.post('/getstfees', async (req, res) => {
  const { famid, curstid, onlyRem } = req.body;
  console.log(req.body);
  if (!famid || !curstid) {
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
    console.log("records:", records);
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
app.post('/getstpayhist', async (req, res) => {
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
app.post('/settlefees', async (req, res) => {
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
        .text("El Alsson School – Payment Receipt", 35, 85);

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
        .text("This receipt is automatically generated by El Alsson School - Online Fees Portal.", 35, 580)
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
app.post("/generate-receipt", async (req, res) => {
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
app.post("/send-receipt-email", async (req, res) => {
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
      <img src="https://www.alsson.com/wp-content/themes/alsson/img/newgiza-logo.jpg" alt="Alsson Logo" width="150"/>
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


// app.post("/send-receipt-email", async (req, res) => {
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

// app.post("/log-payment", async (req, res) => {
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
app.post("/generate-whatsapp-link", (req, res) => {
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

// --- Health Check & Test Endpoint
app.get("/health", (req, res) => {
  res.json({ ok: true });
});
//Greeting endpoint to test server functionality
app.get("/hello", (req, res) => {
  res.json({ message: "Hello from VSCode!" });
});
// --- Start Server
// if (process.env.NODE_ENV !== "production") {
//   const PORT = process.env.VITE_PORT || 3000;
//   app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//   });
// }
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Allowed origins:`, allowedOrigins);
});

export default app;