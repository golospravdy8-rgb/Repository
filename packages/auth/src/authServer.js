const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.AUTH_PORT || 3012;
const JWT_SECRET = process.env.JWT_SECRET || "ldbl_super_secret_2025";
const DB_PATH = path.join(__dirname, "../db/users.db");

// Init SQLite
const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    vip_until TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS team_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_name TEXT NOT NULL,
    coach_name TEXT NOT NULL,
    school TEXT,
    player_count INTEGER,
    email TEXT NOT NULL,
    phone TEXT,
    season TEXT DEFAULT '2025-2026',
    payment_status TEXT DEFAULT 'pending',
    amount INTEGER DEFAULT 500,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voter_user_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(voter_user_id, week_number, year)
  );
  CREATE TABLE IF NOT EXISTS vip_children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_user_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(parent_user_id, player_id)
  );
  CREATE TABLE IF NOT EXISTS partner_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS banner_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sponsor_id INTEGER,
    position TEXT,
    page TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const allowedOrigins = [
  "http://localhost:3006",
  "http://localhost:3007",
  "http://localhost:3008",
  "http://localhost:3009",
  "http://localhost:3010",
  "http://localhost:3011",
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function setTokenCookie(res, token) {
  res.cookie("ldbl_token", token, {
    httpOnly: true,
    sameSite: "lax",
    domain: "localhost",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function authMiddleware(req, res, next) {
  const token = req.cookies.ldbl_token || (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// POST /api/auth/register
app.post("/api/auth/register", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: "Всі поля обов'язкові" });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const stmt = db.prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)");
    const result = stmt.run(email.toLowerCase(), hash, name);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    const token = signToken(user);
    setTokenCookie(res, token);
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    if (e.message.includes("UNIQUE")) return res.status(400).json({ error: "Email вже зайнятий" });
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email та пароль обов'язкові" });
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Невірний email або пароль" });
  }
  const token = signToken(user);
  setTokenCookie(res, token);
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, vipUntil: user.vip_until });
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("ldbl_token", { domain: "localhost" });
  res.json({ ok: true });
});

// GET /api/auth/me
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = db.prepare("SELECT id, email, name, avatar_url, role, vip_until FROM users WHERE id = ?").get(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar_url, role: user.role, vipUntil: user.vip_until });
});

// POST /api/team-registration
app.post("/api/team-registration", (req, res) => {
  const { teamName, school, coachName, email, phone, playerCount } = req.body;
  if (!teamName || !coachName || !email) return res.status(400).json({ error: "Обов'язкові поля: назва команди, тренер, email" });
  const fee = parseInt(process.env.TEAM_REGISTRATION_FEE || "500");
  const stmt = db.prepare("INSERT INTO team_registrations (team_name, coach_name, school, player_count, email, phone, amount) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const result = stmt.run(teamName, coachName, school || "", playerCount || 0, email, phone || "", fee);
  res.json({
    id: result.lastInsertRowid,
    status: "pending",
    amount: fee,
    instructions: `Переказати ${fee} грн на картку: ${process.env.PAYMENT_CARD || "XXXX XXXX XXXX XXXX"}. Отримувач: ${process.env.PAYMENT_OWNER || "Організатор ЛДБЛ"}. Призначення: Реєстрація команди ${teamName}. Після оплати надіслати скріншот на: ${process.env.CONTACT_EMAIL || "info@basket.lviv.ua"}`,
  });
});

// GET /api/team-registration (admin)
app.get("/api/team-registration", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const list = db.prepare("SELECT * FROM team_registrations ORDER BY created_at DESC").all();
  res.json(list);
});

// PATCH /api/team-registration/:id/confirm (admin)
app.patch("/api/team-registration/:id/confirm", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  db.prepare("UPDATE team_registrations SET payment_status = 'confirmed' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// GET /api/vote/current
app.get("/api/vote/current", (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const week = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
  const year = now.getFullYear();
  // Sunday of this week
  const day = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + (7 - day));
  sunday.setHours(23, 59, 59, 0);

  const votes = db.prepare("SELECT player_id, COUNT(*) as count FROM votes WHERE week_number = ? AND year = ? GROUP BY player_id ORDER BY count DESC").all(week, year);
  const total = votes.reduce((s, v) => s + v.count, 0);
  res.json({ week, year, candidates: votes, endsAt: sunday.toISOString(), totalVotes: total });
});

// GET /api/vote/results
app.get("/api/vote/results", (req, res) => {
  const results = db.prepare(`
    SELECT week_number, year, player_id, COUNT(*) as votes
    FROM votes
    GROUP BY week_number, year, player_id
    ORDER BY year DESC, week_number DESC, votes DESC
  `).all();
  res.json({ winners: results });
});

// POST /api/vote/cast
app.post("/api/vote/cast", authMiddleware, (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ error: "playerId required" });
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const week = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
  const year = now.getFullYear();
  try {
    db.prepare("INSERT INTO votes (voter_user_id, player_id, week_number, year) VALUES (?, ?, ?, ?)").run(req.user.sub, playerId, week, year);
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "Ви вже проголосували цього тижня" });
  }
});

// GET /api/vote/my-vote
app.get("/api/vote/my-vote", authMiddleware, (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const week = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
  const year = now.getFullYear();
  const vote = db.prepare("SELECT player_id FROM votes WHERE voter_user_id = ? AND week_number = ? AND year = ?").get(req.user.sub, week, year);
  res.json({ playerId: vote ? vote.player_id : null });
});

// VIP children
app.get("/api/vip/children", authMiddleware, (req, res) => {
  const children = db.prepare("SELECT * FROM vip_children WHERE parent_user_id = ?").all(req.user.sub);
  res.json(children);
});

app.post("/api/vip/children", authMiddleware, (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ error: "playerId required" });
  try {
    db.prepare("INSERT OR IGNORE INTO vip_children (parent_user_id, player_id) VALUES (?, ?)").run(req.user.sub, playerId);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/users/:id/vip (admin)
app.patch("/api/users/:id/vip", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const until = new Date();
  until.setMonth(until.getMonth() + 1);
  db.prepare("UPDATE users SET role = 'vip', vip_until = ? WHERE id = ?").run(until.toISOString(), req.params.id);
  res.json({ ok: true });
});

// POST /api/partner-request
app.post("/api/partner-request", (req, res) => {
  const { companyName, email, phone, message } = req.body;
  if (!companyName || !email) return res.status(400).json({ error: "Назва компанії та email обов'язкові" });
  db.prepare("INSERT INTO partner_requests (company_name, email, phone, message) VALUES (?, ?, ?, ?)").run(companyName, email, phone || "", message || "");
  res.json({ ok: true });
});

// POST /api/analytics/banner-click
app.post("/api/analytics/banner-click", (req, res) => {
  const { sponsorId, position, page } = req.body;
  db.prepare("INSERT INTO banner_clicks (sponsor_id, position, page) VALUES (?, ?, ?)").run(sponsorId || null, position || "", page || "");
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
});
