const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database("astra.db");
const upload = multer({ dest: "uploads/" });

db.exec(`
CREATE TABLE IF NOT EXISTS bookings (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 customer_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
 venue TEXT NOT NULL, booking_date TEXT NOT NULL, start_time TEXT NOT NULL,
 end_time TEXT NOT NULL, amount REAL DEFAULT 0, status TEXT DEFAULT 'pending',
 proof TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inquiries (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT, email TEXT, phone TEXT, message TEXT,
 status TEXT DEFAULT 'new', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT, date TEXT, time TEXT, description TEXT, status TEXT DEFAULT 'published'
);
CREATE TABLE IF NOT EXISTS faqs (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 question TEXT, answer TEXT, sort_order INTEGER DEFAULT 0, published INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS settings (
 key TEXT PRIMARY KEY, value TEXT
);
`);

const defaults = {
  venue_name: "Astra Pickleball Center",
  phone: "+63 929 821 8812",
  email: "info@astrapickleball.com",
  address: "9009 B Felix Ave, Sto. Domingo, Cainta, Philippines, 1900",
  court_rate: "600",
  entrance_rate: "100",
  opening_hours: "8:00 AM – 11:00 PM",
  courts: "8"
};
for (const [key,value] of Object.entries(defaults)) {
  db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)").run(key,value);
}

const faqCount = db.prepare("SELECT COUNT(*) c FROM faqs").get().c;
if (!faqCount) {
  const seed = [
    ["What are your court rates?", "PHP 600 / hour / court. Entrance is PHP 100 per person."],
    ["Operating Hours", "Open daily, 8:00 AM – 11:00 PM."],
    ["How many courts do you have?", "We have 8 indoor courts with cushioned acrylic flooring."],
    ["Do you have parking?", "Yes, free parking for up to 40 cars."],
    ["Do you offer coaching?", "Yes. Beginner clinics and private coaching are available."],
    ["Do you accept walk-ins?", "Yes, subject to court availability. Advance booking is recommended."]
  ];
  const ins = db.prepare("INSERT INTO faqs(question,answer) VALUES (?,?)");
  const tx = db.transaction(rows => rows.forEach(r => ins.run(...r)));
  tx(seed);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/settings", (_,res) => {
  const rows = db.prepare("SELECT key,value FROM settings").all();
  res.json(Object.fromEntries(rows.map(r=>[r.key,r.value])));
});
app.put("/api/settings", (req,res) => {
  const stmt = db.prepare("INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  for (const [k,v] of Object.entries(req.body)) stmt.run(k,String(v));
  res.json({ok:true});
});

app.get("/api/faqs", (_,res) => res.json(db.prepare("SELECT * FROM faqs WHERE published=1 ORDER BY sort_order,id").all()));
app.get("/api/events", (_,res) => res.json(db.prepare("SELECT * FROM events WHERE status='published' ORDER BY date").all()));

app.get("/api/bookings", (_,res) => res.json(db.prepare("SELECT * FROM bookings ORDER BY booking_date DESC,start_time DESC").all()));
app.post("/api/bookings", upload.single("proof"), (req,res) => {
  const {customer_name,email,phone,venue,booking_date,start_time,end_time,amount} = req.body;
  if (!customer_name || !email || !venue || !booking_date || !start_time || !end_time)
    return res.status(400).json({error:"Missing required booking fields"});
  const proof = req.file ? `/uploads/${req.file.filename}` : null;
  const result = db.prepare(`
    INSERT INTO bookings(customer_name,email,phone,venue,booking_date,start_time,end_time,amount,proof)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(customer_name,email,phone||"",venue,booking_date,start_time,end_time,Number(amount||0),proof);
  res.json({ok:true,id:result.lastInsertRowid});
});
app.patch("/api/bookings/:id", (req,res) => {
  const status = ["pending","confirmed","paid","cancelled","completed"].includes(req.body.status) ? req.body.status : "pending";
  db.prepare("UPDATE bookings SET status=? WHERE id=?").run(status,req.params.id);
  res.json({ok:true});
});

app.post("/api/inquiries", (req,res) => {
  const {name,email,phone,message} = req.body;
  db.prepare("INSERT INTO inquiries(name,email,phone,message) VALUES (?,?,?,?)").run(name,email,phone,message);
  res.json({ok:true});
});
app.get("/api/inquiries", (_,res) => res.json(db.prepare("SELECT * FROM inquiries ORDER BY created_at DESC").all()));
app.patch("/api/inquiries/:id", (req,res) => {
  db.prepare("UPDATE inquiries SET status=? WHERE id=?").run(req.body.status || "new", req.params.id);
  res.json({ok:true});
});

app.post("/api/events", (req,res) => {
  const {title,date,time,description} = req.body;
  const r = db.prepare("INSERT INTO events(title,date,time,description) VALUES (?,?,?,?)").run(title,date,time,description);
  res.json({ok:true,id:r.lastInsertRowid});
});
app.delete("/api/events/:id", (req,res) => {
  db.prepare("DELETE FROM events WHERE id=?").run(req.params.id);
  res.json({ok:true});
});

app.get("/api/dashboard", (_,res) => {
  const today = new Date().toISOString().slice(0,10);
  res.json({
    bookings: db.prepare("SELECT COUNT(*) c FROM bookings").get().c,
    pending: db.prepare("SELECT COUNT(*) c FROM bookings WHERE status='pending'").get().c,
    inquiries: db.prepare("SELECT COUNT(*) c FROM inquiries WHERE status='new'").get().c,
    today: db.prepare("SELECT COUNT(*) c FROM bookings WHERE booking_date=?").get(today).c
  });
});

app.get("*", (_,res) => res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`Astra clone running at http://localhost:${PORT}`));
