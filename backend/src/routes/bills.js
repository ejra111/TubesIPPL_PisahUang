import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { query } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfDir = path.join(__dirname, "../../pdfs");

// Create pdfs directory if it doesn't exist
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

const router = Router();

// Helper function to format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

// Endpoint untuk melihat bill melalui token share (public, tanpa auth)
router.get("/share/:token", async (req, res) => {
  const rows = await query("SELECT bill_id FROM share_links WHERE token=?", [req.params.token]).catch(() => []);
  if (!rows.length) return res.status(404).json({ error: "notfound" });
  req.params.id = rows[0].bill_id;
  const participants = await query("SELECT id,name FROM participants WHERE bill_id=?", [req.params.id]).catch(() => []);
  const items = await query("SELECT id,name,price,quantity FROM items WHERE bill_id=?", [req.params.id]).catch(() => []);
  const billRows = await query("SELECT tip_percent,tip_amount,tax_percent,tax_amount FROM bills WHERE id=?", [req.params.id]).catch(() => []);
  const bill = billRows[0] || {};
  const splitsByItem = {};
  for (const it of items) {
    const s = await query("SELECT participant_id,weight FROM item_splits WHERE item_id=?", [it.id]).catch(() => []);
    splitsByItem[it.id] = s;
  }
  const subtotalByParticipant = {};
  for (const p of participants) subtotalByParticipant[p.id] = 0;
  for (const it of items) {
    const total = Number(it.price) * Number(it.quantity || 1);
    const splits = splitsByItem[it.id];
    if (splits.length) {
      const sumW = splits.reduce((a, b) => a + Number(b.weight), 0) || 1;
      for (const s of splits) subtotalByParticipant[s.participant_id] += total * (Number(s.weight) / sumW);
    } else {
      const equal = total / (participants.length || 1);
      for (const p of participants) subtotalByParticipant[p.id] += equal;
    }
  }
  const subtotal = Object.values(subtotalByParticipant).reduce((a, b) => a + b, 0);
  let tip = 0;
  let tax = 0;
  if (bill.tip_amount != null) tip = Number(bill.tip_amount);
  else if (bill.tip_percent != null) tip = subtotal * Number(bill.tip_percent) / 100;
  if (bill.tax_amount != null) tax = Number(bill.tax_amount);
  else if (bill.tax_percent != null) tax = subtotal * Number(bill.tax_percent) / 100;
  const totalByParticipant = {};
  for (const p of participants) {
    const share = subtotal ? subtotalByParticipant[p.id] / subtotal : 0;
    totalByParticipant[p.id] = subtotalByParticipant[p.id] + tip * share + tax * share;
  }
});

// Endpoint untuk membuat bill baru (memerlukan autentikasi)
router.post("/", authRequired, async (req, res) => {
  const { title } = req.body || {};
  const rows = await query("INSERT INTO bills(owner_id,title,created_at) VALUES(?,?,NOW())", [req.user.id, title || "Split Bill"]).catch(() => null);
  if (!rows) return res.status(500).json({ error: "db" });
  const idRows = await query("SELECT LAST_INSERT_ID() as id");
});

// Endpoint untuk menambahkan peserta ke bill (memerlukan autentikasi)
router.post("/:id/participants", authRequired, async (req, res) => {
  const { participants } = req.body || {};
  if (!Array.isArray(participants)) return res.status(400).json({ error: "invalid" });
  for (const name of participants) {
    await query("INSERT INTO participants(bill_id,name) VALUES(?,?)", [req.params.id, String(name)]).catch(() => null);
  }
  const rows = await query("SELECT id,name FROM participants WHERE bill_id=?", [req.params.id]).catch(() => []);
});

// Endpoint untuk menghapus peserta dari bill (memerlukan autentikasi)
router.delete("/:id/participants/:participantId", authRequired, async (req, res) => {
  await query("DELETE FROM item_splits WHERE participant_id=?", [req.params.participantId]).catch(() => null);
  await query("DELETE FROM participants WHERE id=?", [req.params.participantId]).catch(() => null);
  const rows = await query("SELECT id,name FROM participants WHERE bill_id=?", [req.params.id]).catch(() => []);
});

// Endpoint untuk menambahkan item ke bill (memerlukan autentikasi)
router.post("/:id/items", authRequired, async (req, res) => {
  const { name, price, quantity } = req.body || {};
  if (!name || price == null) return res.status(400).json({ error: "invalid" });
  await query("INSERT INTO items(bill_id,name,price,quantity) VALUES(?,?,?,?)", [req.params.id, name, Number(price), quantity ? Number(quantity) : 1]).catch(() => null);
  const items = await query("SELECT id,name,price,quantity FROM items WHERE bill_id=?", [req.params.id]).catch(() => []);
});

// Endpoint untuk menghapus item dari bill (memerlukan autentikasi)
router.delete("/:id/items/:itemId", authRequired, async (req, res) => {
  await query("DELETE FROM items WHERE id=? AND bill_id=?", [req.params.itemId, req.params.id]).catch(() => null);
  const items = await query("SELECT id,name,price,quantity FROM items WHERE bill_id=?", [req.params.id]).catch(() => []);
});

// Endpoint untuk mengatur pembagian item per peserta (memerlukan autentikasi)
router.post("/:id/items/:itemId/splits", authRequired, async (req, res) => {
  const { weights } = req.body || {};
  if (!weights || typeof weights !== "object") return res.status(400).json({ error: "invalid" });
  await query("DELETE FROM item_splits WHERE item_id=?", [req.params.itemId]).catch(() => null);
  for (const [participantId, weight] of Object.entries(weights)) {
    await query("INSERT INTO item_splits(item_id,participant_id,weight) VALUES(?,?,?)", [req.params.itemId, Number(participantId), Number(weight)]).catch(() => null);
  }
  const rows = await query("SELECT participant_id,weight FROM item_splits WHERE item_id=?", [req.params.itemId]).catch(() => []);
});

// Endpoint untuk mengatur tip dan tax pada bill (memerlukan autentikasi)
router.post("/:id/tipTax", authRequired, async (req, res) => {
  const { tipPercent, tipAmount, taxPercent, taxAmount } = req.body || {};
  // Normalize empty string to null and ensure numeric where provided
  const parseNullableNumber = v => {
    if (v === null || v === undefined) return null;
    if (v === "") return null;
    const n = Number(v);
    return isNaN(n) ? NaN : n;
  };
  const tp = parseNullableNumber(tipPercent);
  const ta = parseNullableNumber(tipAmount);
  const xp = parseNullableNumber(taxPercent);
  const xa = parseNullableNumber(taxAmount);
  // Validate non-negative numbers
  if ((tp !== null && (isNaN(tp) || tp < 0)) || (xp !== null && (isNaN(xp) || xp < 0)) || (ta !== null && (isNaN(ta) || ta < 0)) || (xa !== null && (isNaN(xa) || xa < 0))) {
    return res.status(400).json({ error: "invalid", message: "Tip/Tax harus bernilai >= 0" });
  }
  await query("UPDATE bills SET tip_percent=?, tip_amount=?, tax_percent=?, tax_amount=? WHERE id=?", [tp !== null ? tp : null, ta !== null ? ta : null, xp !== null ? xp : null, xa !== null ? xa : null, req.params.id]).catch(() => null);
});

// Endpoint untuk mendapatkan ringkasan bill (subtotal, tip, tax, total per peserta) (memerlukan autentikasi)
router.get("/:id/summary", authRequired, async (req, res) => {
  const participants = await query("SELECT id,name FROM participants WHERE bill_id=?", [req.params.id]).catch(() => []);
  const items = await query("SELECT id,name,price,quantity FROM items WHERE bill_id=?", [req.params.id]).catch(() => []);
  const billRows = await query("SELECT tip_percent,tip_amount,tax_percent,tax_amount FROM bills WHERE id=?", [req.params.id]).catch(() => []);
  const bill = billRows[0] || {};
  const splitsByItem = {};
  for (const it of items) {
    const s = await query("SELECT participant_id,weight FROM item_splits WHERE item_id=?", [it.id]).catch(() => []);
    splitsByItem[it.id] = s;
  }
  const subtotalByParticipant = {};
  for (const p of participants) subtotalByParticipant[p.id] = 0;
  for (const it of items) {
    const total = Number(it.price) * Number(it.quantity || 1);
    const splits = splitsByItem[it.id];
    if (splits.length) {
      const sumW = splits.reduce((a, b) => a + Number(b.weight), 0) || 1;
      for (const s of splits) subtotalByParticipant[s.participant_id] += total * (Number(s.weight) / sumW);
    } else {
      const equal = total / (participants.length || 1);
      for (const p of participants) subtotalByParticipant[p.id] += equal;
    }
  }
  const subtotal = Object.values(subtotalByParticipant).reduce((a, b) => a + b, 0);
  let tip = 0;
  let tax = 0;
  if (bill.tip_amount != null) tip = Number(bill.tip_amount);
  else if (bill.tip_percent != null) tip = subtotal * Number(bill.tip_percent) / 100;
  if (bill.tax_amount != null) tax = Number(bill.tax_amount);
  else if (bill.tax_percent != null) tax = subtotal * Number(bill.tax_percent) / 100;
  const totalByParticipant = {};
  for (const p of participants) {
    const share = subtotal ? subtotalByParticipant[p.id] / subtotal : 0;
    totalByParticipant[p.id] = subtotalByParticipant[p.id] + tip * share + tax * share;
  }
});

// Endpoint untuk membuat link share bill (memerlukan autentikasi)
router.post("/:id/share", authRequired, async (req, res) => {
  const token = uuidv4();
  await query("INSERT INTO share_links(bill_id,token,created_at) VALUES(?,?,NOW())", [req.params.id, token]).catch(() => null);
});

// Endpoint untuk generate dan download PDF struk bill (memerlukan autentikasi)
router.get("/:id/pdf", authRequired, async (req, res) => {
  try {
    const billId = req.params.id;
    const participants = await query("SELECT id,name FROM participants WHERE bill_id=?", [billId]).catch(() => []);
    const items = await query("SELECT id,name,price,quantity FROM items WHERE bill_id=?", [billId]).catch(() => []);
    const billRows = await query("SELECT tip_percent,tip_amount,tax_percent,tax_amount FROM bills WHERE id=?", [billId]).catch(() => []);
    const bill = billRows[0] || {};
    
    const splitsByItem = {};
    for (const it of items) {
      const s = await query("SELECT participant_id,weight FROM item_splits WHERE item_id=?", [it.id]).catch(() => []);
      splitsByItem[it.id] = s;
    }
    
    const subtotalByParticipant = {};
    for (const p of participants) subtotalByParticipant[p.id] = 0;
    for (const it of items) {
      const total = Number(it.price) * Number(it.quantity || 1);
      const splits = splitsByItem[it.id];
      if (splits.length) {
        const sumW = splits.reduce((a, b) => a + Number(b.weight), 0) || 1;
        for (const s of splits) subtotalByParticipant[s.participant_id] += total * (Number(s.weight) / sumW);
      } else {
        const equal = total / (participants.length || 1);
        for (const p of participants) subtotalByParticipant[p.id] += equal;
      }
    }
    
    const subtotal = Object.values(subtotalByParticipant).reduce((a, b) => a + b, 0);
    let tip = 0;
    let tax = 0;
    if (bill.tip_amount != null) tip = Number(bill.tip_amount);
    else if (bill.tip_percent != null) tip = subtotal * Number(bill.tip_percent) / 100;
    if (bill.tax_amount != null) tax = Number(bill.tax_amount);
    else if (bill.tax_percent != null) tax = subtotal * Number(bill.tax_percent) / 100;
    
    const totalByParticipant = {};
    for (const p of participants) {
      const share = subtotal ? subtotalByParticipant[p.id] / subtotal : 0;
      totalByParticipant[p.id] = subtotalByParticipant[p.id] + tip * share + tax * share;
    }
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const pdfFilename = `struk-${billId}-${Date.now()}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);
    
    // Pipe to file
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    
    try {
      const pageWidth = 612; // Standard letter width
      const margin = 40;
      const contentWidth = pageWidth - 2 * margin;
      
      // Header
      doc.fontSize(28).font("Helvetica-Bold").fillColor("#000").text("Struk Patungan", margin, 40, { 
        align: "center", 
        width: contentWidth 
      });
      doc.fontSize(12).font("Helvetica").fillColor("#999").text("Patungan jadi mudah", margin, doc.y + 5, { 
        align: "center", 
        width: contentWidth 
      });
      
      doc.moveDown(1.2);
      
      // Divider
      doc.strokeColor("#e0e0e0").lineWidth(1);
      doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(0.8);
      
      // Summary Section
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#333").text("Summary", margin, doc.y);
      doc.moveDown(0.5);
      
      // Summary items with right-aligned values
      const labelX = margin;
      const valueX = pageWidth - margin - 100;
      
      doc.fontSize(11).font("Helvetica").fillColor("#666");
      
      // Subtotal
      doc.text("Subtotal", labelX, doc.y);
      doc.fontSize(11).font("Helvetica").fillColor("#666").text(formatCurrency(subtotal), valueX, doc.y - doc.heightOfString("Subtotal"), { 
        align: "right", 
        width: 100 
      });
      doc.moveDown(0.4);
      
      // Tip (only if > 0)
      if (tip > 0) {
        doc.fontSize(11).font("Helvetica").fillColor("#666").text("Tip", labelX, doc.y);
        doc.text(formatCurrency(tip), valueX, doc.y - doc.heightOfString("Tip"), { 
          align: "right", 
          width: 100 
        });
        doc.moveDown(0.4);
      }
      
      // Tax (only if > 0)
      if (tax > 0) {
        doc.fontSize(11).font("Helvetica").fillColor("#666").text("Tax", labelX, doc.y);
        doc.text(formatCurrency(tax), valueX, doc.y - doc.heightOfString("Tax"), { 
          align: "right", 
          width: 100 
        });
        doc.moveDown(0.4);
      }
      
      // Divider before total
      doc.strokeColor("#e0e0e0").lineWidth(1);
      doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(0.4);
      
      // Total (big and bold)
      const total = subtotal + tip + tax;
      doc.fontSize(20).font("Helvetica-Bold").fillColor("#000");
      doc.text("Rp " + (total).toLocaleString("id-ID"), labelX, doc.y);
      
      doc.moveDown(1.2);
      
      // Divider
      doc.strokeColor("#e0e0e0").lineWidth(1);
      doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(0.8);
      
      // Breakdown section
      doc.fontSize(11).font("Helvetica").fillColor("#999");
      for (const p of participants) {
        const amount = totalByParticipant[p.id];
        doc.fontSize(11).font("Helvetica").fillColor("#333").text(p.name, labelX, doc.y);
        doc.fontSize(11).font("Helvetica").fillColor("#999").text(formatCurrency(amount), valueX, doc.y - doc.heightOfString(p.name), { 
          align: "right", 
          width: 100 
        });
        doc.moveDown(0.4);
      }
      
      doc.moveDown(0.8);
      
      // Footer
      const now = new Date();
      const dateStr = now.toLocaleDateString("id-ID", { 
        day: "2-digit", 
        month: "2-digit", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      
      doc.fontSize(9).fillColor("#ccc");
      doc.text(`Generated: ${dateStr}`, margin, doc.y, { 
        align: "center", 
        width: contentWidth 
      });
      
    } catch (docErr) {
      console.error("PDF document error:", docErr);
    }
    
    // End document
    doc.end();
    
    // Wait for stream to finish
    stream.on("finish", () => {
      res.download(pdfPath, pdfFilename);
    });
    
    stream.on("error", (err) => {
      console.error("Stream error:", err);
      res.status(500).json({ error: "pdf_generation_failed" });
    });
    
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: "internal_error", message: err.message });
  }
});

// Endpoint untuk reset bill (hapus semua data) (memerlukan autentikasi)
router.post("/:id/reset", authRequired, async (req, res) => {
  await query("DELETE FROM item_splits WHERE item_id IN (SELECT id FROM items WHERE bill_id=?)", [req.params.id]).catch(() => null);
  await query("DELETE FROM items WHERE bill_id=?", [req.params.id]).catch(() => null);
  await query("DELETE FROM participants WHERE bill_id=?", [req.params.id]).catch(() => null);
  await query("UPDATE bills SET tip_percent=NULL, tip_amount=NULL, tax_percent=NULL, tax_amount=NULL WHERE id=?", [req.params.id]).catch(() => null);
  res.json({ ok: true });
});

export default router;

