// server.js
const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const PDFDocument = require("pdfkit");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PDF_PORT = process.env.PORT || 5000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PDF_PORT}`;
const RECEIPTS_DIR = path.join(__dirname, "public", "receipts");
fs.ensureDirSync(RECEIPTS_DIR);

// Serve static files
app.use("/public", express.static(path.join(__dirname, "public")));

// Generate PDF receipt
async function generateReceiptPDF(data) {
  const tx = data.merchant_reference || data.fort_id || Date.now();
  const fileName = `receipt_${tx}.pdf`;
  const filePath = path.join(RECEIPTS_DIR, fileName);
  const publicUrl = `${PUBLIC_URL}/public/receipts/${fileName}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    if (data.logoPath) {
      try { doc.image(data.logoPath, { fit: [160, 60], align: "center" }); } catch {}
    }

    doc.fontSize(20).text("Payment Receipt", { align: "center" }).moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Transaction ID: ${data.fort_id || "-"}`);
    doc.text(`Order Reference: ${data.merchant_reference || "-"}`);
    doc.text(`Amount: ${data.amount} EGP`);
    doc.text(`Payment Status: ${data.status || "-"}`);
    doc.text(`Parent Email: ${data.parentEmail || "-"}`);
    doc.text(`Date: ${data.date || new Date().toLocaleString()}`);
    doc.moveDown();

    if (Array.isArray(data.items)) {
      doc.text("Items:", { underline: true });
      data.items.forEach((it) => {
        doc.text(`${it.name} — ${it.amount} EGP`);
      });
      doc.moveDown();
    }

    doc.text("Regards,");
    doc.text("El Alsson School");
    doc.text("Finance Department");

    doc.end();
    stream.on("finish", () => resolve({ filePath, publicUrl }));
    stream.on("error", (err) => reject(err));
  });
}

// Endpoint to generate receipt
app.post("/api/generate-receipt", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.parentEmail || !data.amount) {
      return res.status(400).json({ error: "parentEmail and amount are required" });
    }

    const logoPath = path.join(__dirname, "assets", "newgiza-logo.jpg");
    const pdfInfo = await generateReceiptPDF({
      ...data,
      logoPath: fs.existsSync(logoPath) ? logoPath : undefined,
      date: data.date || new Date().toLocaleString(),
    });

    return res.json({ success: true, ...pdfInfo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate receipt", details: err.message });
  }
});

// Endpoint to generate WhatsApp link
app.post("/api/generate-whatsapp-link", (req, res) => {
  try {
    const { schoolNumber = "201003828160", publicUrl, amount, fort_id, merchant_reference, parentEmail } = req.body;
    if (!publicUrl) return res.status(400).json({ error: "publicUrl required" });

    const msg = encodeURIComponent(
      `Payment Receipt Sent by Parent\nAmount: ${amount} EGP\nFort ID: ${fort_id}\nOrder Ref: ${merchant_reference}\nParent Email: ${parentEmail}\nDownload receipt: ${publicUrl}`
    );
    const waLink = `https://wa.me/${schoolNumber}?text=${msg}`;
    return res.json({ success: true, waLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate WhatsApp link", details: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
