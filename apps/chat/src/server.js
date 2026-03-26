const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const path = require("path");
const cookieParser = require("cookie-parser");
const Database = require("better-sqlite3");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ["http://localhost:3006", "http://localhost:3011"], credentials: true },
  maxHttpBufferSize: 10 * 1024 * 1024,
});

const PORT = process.env.CHAT_PORT || 3011;
const JWT_SECRET = process.env.JWT_SECRET || "ldbl_super_secret_2025";
const MAIN_SITE = "http://localhost:3006";

// ── SQLite DB ──
const DB_PATH = path.join(__dirname, "../db/chat.db");
const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS guests (
    phone           TEXT PRIMARY KEY,
    firstName       TEXT NOT NULL,
    lastName        TEXT NOT NULL,
    refCode         TEXT,
    hp              INTEGER DEFAULT 25,
    joinedAt        TEXT DEFAULT (datetime('now')),
    isLeaguePlayer  INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS mvp_votes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    voterPhone  TEXT NOT NULL,
    playerName  TEXT NOT NULL,
    month       TEXT NOT NULL,
    time        TEXT DEFAULT (datetime('now')),
    UNIQUE(voterPhone, month)
  );
  CREATE TABLE IF NOT EXISTS daily_activity (
    phone TEXT NOT NULL,
    day   TEXT NOT NULL,
    PRIMARY KEY (phone, day)
  );
  CREATE TABLE IF NOT EXISTS daily_first_msg (
    day   TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    name  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS moderators (
    phone     TEXT PRIMARY KEY,
    addedAt   TEXT DEFAULT (datetime('now')),
    addedBy   TEXT
  );
  CREATE TABLE IF NOT EXISTS bans (
    phone      TEXT PRIMARY KEY,
    reason     TEXT,
    until      TEXT,
    permanent  INTEGER DEFAULT 0,
    bannedBy   TEXT,
    bannedAt   TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS warns (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    phone     TEXT NOT NULL,
    reason    TEXT,
    warnedBy  TEXT,
    warnedAt  TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS mutes (
    phone    TEXT PRIMARY KEY,
    until    TEXT,
    mutedBy  TEXT,
    mutedAt  TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS mod_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    action    TEXT NOT NULL,
    targetPhone TEXT,
    targetName  TEXT,
    modPhone  TEXT,
    modName   TEXT,
    details   TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS pinned_message (
    id       INTEGER PRIMARY KEY CHECK (id = 1),
    msgId    TEXT,
    msgText  TEXT,
    msgUser  TEXT,
    pinnedBy TEXT,
    pinnedAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS reactions (
    msgId   TEXT NOT NULL,
    phone   TEXT NOT NULL,
    emoji   TEXT NOT NULL,
    PRIMARY KEY (msgId, phone)
  );
  CREATE TABLE IF NOT EXISTS badges (
    phone    TEXT NOT NULL,
    badge    TEXT NOT NULL,
    awardedAt TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (phone, badge)
  );
  CREATE TABLE IF NOT EXISTS msg_count (
    phone TEXT PRIMARY KEY,
    total INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS quiz (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    question  TEXT NOT NULL,
    options   TEXT NOT NULL,
    correct   INTEGER NOT NULL,
    startedBy TEXT,
    startedAt TEXT DEFAULT (datetime('now')),
    endsAt    TEXT,
    active    INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS quiz_answers (
    quizId  INTEGER NOT NULL,
    phone   TEXT NOT NULL,
    answer  INTEGER NOT NULL,
    PRIMARY KEY (quizId, phone)
  );
`);

// Migration: add isLeaguePlayer column if not exists
try {
  db.exec("ALTER TABLE guests ADD COLUMN isLeaguePlayer INTEGER DEFAULT 0");
} catch {}

const cors = require("cors");
app.use(cors({
  origin: ["http://localhost:3006", "http://localhost:3011"],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ── Helpers ──
function genRefCode(phone) {
  return "REF" + phone.replace(/\D/g, "").slice(-6);
}
function getGuest(phone) {
  return db.prepare("SELECT * FROM guests WHERE phone = ?").get(phone) || null;
}
function isModerator(phone) {
  return !!db.prepare("SELECT 1 FROM moderators WHERE phone = ?").get(phone);
}
function isAdmin(phone) {
  // Admin = phone stored in SiteSettings on main app; fallback to env
  const adminPhone = process.env.ADMIN_PHONE || "";
  return phone === adminPhone;
}
function getBan(phone) {
  const ban = db.prepare("SELECT * FROM bans WHERE phone = ?").get(phone);
  if (!ban) return null;
  if (!ban.permanent && ban.until && new Date(ban.until) < new Date()) {
    db.prepare("DELETE FROM bans WHERE phone = ?").run(phone);
    return null;
  }
  return ban;
}
function getMute(phone) {
  const mute = db.prepare("SELECT * FROM mutes WHERE phone = ?").get(phone);
  if (!mute) return null;
  if (mute.until && new Date(mute.until) < new Date()) {
    db.prepare("DELETE FROM mutes WHERE phone = ?").run(phone);
    return null;
  }
  return mute;
}
function getWarnCount(phone) {
  return db.prepare("SELECT COUNT(*) as cnt FROM warns WHERE phone = ?").get(phone).cnt;
}
function modLog(action, modPhone, modName, targetPhone, targetName, details) {
  db.prepare("INSERT INTO mod_log (action, modPhone, modName, targetPhone, targetName, details) VALUES (?,?,?,?,?,?)")
    .run(action, modPhone, modName, targetPhone || "", targetName || "", details || "");
}
function awardBadge(phone, badge) {
  const already = db.prepare("SELECT 1 FROM badges WHERE phone = ? AND badge = ?").get(phone, badge);
  if (already) return false;
  db.prepare("INSERT OR IGNORE INTO badges (phone, badge) VALUES (?,?)").run(phone, badge);
  return true;
}
function checkAndAwardBadges(phone, socket) {
  const row = db.prepare("SELECT total FROM msg_count WHERE phone = ?").get(phone);
  const total = row?.total || 0;
  const newBadges = [];
  if (total >= 100 && awardBadge(phone, "msg100")) newBadges.push({ badge: "msg100", label: "💯 100 повідомлень" });
  if (total >= 50  && awardBadge(phone, "msg50"))  newBadges.push({ badge: "msg50",  label: "🔥 50 повідомлень" });
  if (total >= 10  && awardBadge(phone, "msg10"))  newBadges.push({ badge: "msg10",  label: "⭐ 10 повідомлень" });

  // First message of the day
  const today = new Date().toISOString().slice(0, 10);
  const alreadyToday = db.prepare("SELECT 1 FROM daily_activity WHERE phone = ? AND day = ?").get(phone, today);
  if (!alreadyToday && awardBadge(phone, "daily_" + today)) {
    newBadges.push({ badge: "daily", label: "🌅 Перше повідомлення дня" });
  }

  // 7 days streak
  let streak = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (db.prepare("SELECT 1 FROM daily_activity WHERE phone = ? AND day = ?").get(phone, ds)) streak++;
    else break;
  }
  if (streak >= 7 && awardBadge(phone, "streak7")) newBadges.push({ badge: "streak7", label: "🗓 7 днів поспіль" });

  if (newBadges.length && socket) {
    socket.emit("mod:badgesAwarded", newBadges);
  }
}
function getUserBadges(phone) {
  const rows = db.prepare("SELECT badge FROM badges WHERE phone = ?").all(phone);
  return rows.map(r => r.badge);
}
function getLeaderboard() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const daily = db.prepare(`
    SELECT g.phone, g.firstName || ' ' || g.lastName as name,
           COUNT(da.day) as cnt
    FROM guests g
    LEFT JOIN daily_activity da ON da.phone = g.phone AND da.day = ?
    GROUP BY g.phone ORDER BY cnt DESC LIMIT 5
  `).all(today);
  const weekly = db.prepare(`
    SELECT g.phone, g.firstName || ' ' || g.lastName as name,
           COUNT(da.day) as cnt
    FROM guests g
    LEFT JOIN daily_activity da ON da.phone = g.phone AND da.day >= ?
    GROUP BY g.phone ORDER BY cnt DESC LIMIT 5
  `).all(weekAgo);
  return { daily, weekly };
}

function getOrCreateGuest(phone, firstName, lastName, refCode) {
  const existing = getGuest(phone);
  if (existing) return { guest: existing, isNew: false };

  if (refCode) {
    const all = db.prepare("SELECT * FROM guests").all();
    for (const g of all) {
      if (genRefCode(g.phone) === refCode) {
        db.prepare("UPDATE guests SET hp = hp + 50 WHERE phone = ?").run(g.phone);
        for (const [, s] of io.sockets.sockets) {
          if (s.user?.phone === g.phone) {
            const updated = getGuest(g.phone);
            s.emit("hpUpdate", { hp: updated.hp });
            break;
          }
        }
        break;
      }
    }
  }

  db.prepare("INSERT INTO guests (phone, firstName, lastName, refCode, hp) VALUES (?, ?, ?, ?, 25)")
    .run(phone, firstName, lastName, refCode || null);
  db.prepare("INSERT OR IGNORE INTO msg_count (phone, total) VALUES (?, 0)").run(phone);

  const guest = getGuest(phone);
  fetch(`${MAIN_SITE}/api/guest-contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, firstName, lastName, refCode: refCode || null }),
  }).catch(() => {});

  return { guest, isNew: true };
}

function signGuestToken(guest) {
  return jwt.sign(
    { phone: guest.phone, name: `${guest.firstName} ${guest.lastName}` },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

// ── REST API ──
app.post("/api/chat/register", (req, res) => {
  const { phone, firstName, lastName, refCode } = req.body;
  if (!phone || !firstName || !lastName)
    return res.status(400).json({ error: "Введіть телефон, ім\u2019я та прізвище" });
  const cleaned = phone.replace(/\s/g, "");
  const ban = getBan(cleaned);
  if (ban) {
    const until = ban.permanent ? "назавжди" : new Date(ban.until).toLocaleString("uk-UA");
    return res.status(403).json({ error: `Вас заблоковано. Причина: ${ban.reason || "—"}. До: ${until}` });
  }
  const { guest, isNew } = getOrCreateGuest(cleaned, firstName, lastName, refCode);
  const token = signGuestToken(guest);
  res.cookie("ldbl_chat_token", token, {
    httpOnly: true, sameSite: "lax", domain: "localhost",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  res.json({
    phone: guest.phone,
    name: `${guest.firstName} ${guest.lastName}`,
    hp: guest.hp,
    refCode: genRefCode(guest.phone),
    isNew,
    isMod: isModerator(guest.phone),
    badges: getUserBadges(guest.phone),
  });
});

app.get("/api/chat/me", (req, res) => {
  const token = req.cookies.ldbl_chat_token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Check permanent ban even on auto-login
    const ban = getBan(decoded.phone);
    if (ban && ban.permanent) {
      res.clearCookie("ldbl_chat_token");
      return res.status(403).json({ error: `Вас заблоковано назавжди. Причина: ${ban.reason || "—"}` });
    }
    let guest = getGuest(decoded.phone);
    if (!guest) {
      const [firstName, ...rest] = decoded.name.split(" ");
      getOrCreateGuest(decoded.phone, firstName, rest.join(" ") || "-", null);
      guest = getGuest(decoded.phone);
    }
    res.json({
      phone: guest.phone,
      name: `${guest.firstName} ${guest.lastName}`,
      hp: guest.hp,
      refCode: genRefCode(guest.phone),
      isMod: isModerator(guest.phone),
      badges: getUserBadges(guest.phone),
    });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.get("/api/chat/guests", (req, res) => {
  const list = db.prepare("SELECT * FROM guests ORDER BY joinedAt ASC").all().map(g => ({
    phone: g.phone,
    name: `${g.firstName} ${g.lastName}`,
    hp: g.hp,
    isLeaguePlayer: g.isLeaguePlayer || 0,
    refCode: genRefCode(g.phone),
    joinedAt: g.joinedAt,
    isMod: isModerator(g.phone),
    badges: getUserBadges(g.phone),
    warns: getWarnCount(g.phone),
  }));
  res.json({ guests: list, count: list.length });
});

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

app.get("/api/chat/mvp", (req, res) => {
  const month = currentMonthKey();
  const token = req.cookies.ldbl_chat_token;
  let myPhone = null;
  if (token) { try { myPhone = jwt.verify(token, JWT_SECRET).phone; } catch {} }
  const rows = db.prepare("SELECT playerName, COUNT(*) as cnt FROM mvp_votes WHERE month = ? GROUP BY playerName ORDER BY cnt DESC LIMIT 10").all(month);
  const top10 = rows.map((r, i) => ({ rank: i + 1, playerName: r.playerName, votes: r.cnt }));
  const myVoteRow = myPhone ? db.prepare("SELECT playerName FROM mvp_votes WHERE voterPhone = ? AND month = ?").get(myPhone, month) : null;
  res.json({ top10, myVote: myVoteRow?.playerName || null, month });
});

app.post("/api/chat/mvp", (req, res) => {
  const token = req.cookies.ldbl_chat_token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { playerName } = req.body;
    if (!playerName?.trim()) return res.status(400).json({ error: "Введіть ім\u2019я гравця" });
    const month = currentMonthKey();
    try {
      db.prepare("INSERT INTO mvp_votes (voterPhone, playerName, month) VALUES (?, ?, ?)").run(decoded.phone, playerName.trim(), month);
    } catch {
      return res.status(400).json({ error: "Ви вже проголосували цього місяця" });
    }
    db.prepare("UPDATE guests SET hp = hp + 15 WHERE phone = ?").run(decoded.phone);
    const guest = getGuest(decoded.phone);
    for (const [, s] of io.sockets.sockets) {
      if (s.user?.phone === decoded.phone) { s.emit("hpUpdate", { hp: guest.hp }); break; }
    }
    res.json({ ok: true, hp: guest?.hp });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ── Moderator REST API ──
// GET /api/chat/mod/log — mod action log (owner only via secret header)
app.get("/api/chat/mod/log", (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (secret !== (process.env.ADMIN_SECRET || "ldbl_admin_2025")) return res.status(403).json({ error: "Forbidden" });
  const rows = db.prepare("SELECT * FROM mod_log ORDER BY createdAt DESC LIMIT 200").all();
  res.json({ log: rows });
});

// GET /api/chat/moderators
app.get("/api/chat/moderators", (req, res) => {
  const rows = db.prepare("SELECT m.phone, m.addedAt, g.firstName || ' ' || g.lastName as name FROM moderators m LEFT JOIN guests g ON g.phone = m.phone").all();
  res.json({ moderators: rows });
});

// POST /api/chat/moderators/add
app.post("/api/chat/moderators/add", (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (secret !== (process.env.ADMIN_SECRET || "ldbl_admin_2025")) return res.status(403).json({ error: "Forbidden" });
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone required" });
  db.prepare("INSERT OR IGNORE INTO moderators (phone) VALUES (?)").run(phone);
  // Notify online socket
  for (const [, s] of io.sockets.sockets) {
    if (s.user?.phone === phone) { s.emit("mod:roleGranted"); break; }
  }
  res.json({ ok: true });
});

// POST /api/chat/moderators/remove
app.post("/api/chat/moderators/remove", (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (secret !== (process.env.ADMIN_SECRET || "ldbl_admin_2025")) return res.status(403).json({ error: "Forbidden" });
  const { phone } = req.body;
  db.prepare("DELETE FROM moderators WHERE phone = ?").run(phone);
  for (const [, s] of io.sockets.sockets) {
    if (s.user?.phone === phone) { s.emit("mod:roleRevoked"); break; }
  }
  res.json({ ok: true });
});

// GET /api/chat/leaderboard
app.get("/api/chat/leaderboard", (req, res) => {
  res.json(getLeaderboard());
});

// ── Socket middleware ──
io.use((socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie || "";
  const match = cookieHeader.match(/ldbl_chat_token=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return next(new Error("Unauthorized"));
  try { socket.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { next(new Error("Invalid token")); }
});

const messages = [];
let porohova = [];
const onlineUsers = new Set();
let slowModeSeconds = 0; // 0 = off
const lastMessageTime = {}; // phone -> timestamp

function todayStr() { return new Date().toISOString().slice(0, 10); }

// Cleanup expired quiz
function getActiveQuiz() {
  const q = db.prepare("SELECT * FROM quiz WHERE active = 1 ORDER BY id DESC LIMIT 1").get();
  if (!q) return null;
  if (new Date(q.endsAt) < new Date()) {
    db.prepare("UPDATE quiz SET active = 0 WHERE id = ?").run(q.id);
    return null;
  }
  return q;
}

io.on("connection", (socket) => {
  const phone = socket.user.phone;
  const name = socket.user.name;
  const mod = isModerator(phone);
  console.log(`[chat] ${name} connected (mod:${mod})`);

  onlineUsers.add(name);

  // Send history with reactions
  const historyWithReactions = messages.slice(-50).map(m => ({
    ...m,
    reactions: getReactionsForMsg(m.id),
  }));
  socket.emit("history", historyWithReactions);
  socket.emit("porohovaList", porohova);
  socket.emit("slowMode", slowModeSeconds);

  // Pinned message
  const pinned = db.prepare("SELECT * FROM pinned_message WHERE id = 1").get();
  if (pinned) socket.emit("mod:pinned", { msgId: pinned.msgId, msgText: pinned.msgText, msgUser: pinned.msgUser });

  // Active quiz
  const activeQuiz = getActiveQuiz();
  if (activeQuiz) {
    const myAnswer = db.prepare("SELECT answer FROM quiz_answers WHERE quizId = ? AND phone = ?").get(activeQuiz.id, phone);
    socket.emit("mod:quizActive", {
      id: activeQuiz.id,
      question: activeQuiz.question,
      options: JSON.parse(activeQuiz.options),
      endsAt: activeQuiz.endsAt,
      myAnswer: myAnswer?.answer ?? null,
    });
  }

  // Leaderboard
  socket.emit("leaderboard", getLeaderboard());

  // Widget — send current product to new connection
  if (widgetEnabled && widgetProducts.length) {
    const currentProduct = widgetProducts[widgetCurrentIndex % widgetProducts.length] || widgetProducts[0];
    socket.emit("widget:product_update", { ...currentProduct, _interval: widgetInterval });
  }

  io.emit("userJoined", { name });
  io.emit("onlineUsers", Array.from(onlineUsers));
  io.emit("guestCount", db.prepare("SELECT COUNT(*) as cnt FROM guests").get().cnt);

  // ── Message ──
  socket.on("message", (text) => {
    if (!text || typeof text !== "string" || !text.trim()) return;

    const ban = getBan(phone);
    if (ban) {
      const until = ban.permanent ? "назавжди" : new Date(ban.until).toLocaleString("uk-UA");
      socket.emit("mod:banned", { reason: ban.reason, until, permanent: !!ban.permanent });
      return;
    }

    const mute = getMute(phone);
    if (mute) {
      const until = new Date(mute.until).toLocaleString("uk-UA");
      socket.emit("mod:muted", { until });
      return;
    }

    // Slow mode
    if (slowModeSeconds > 0 && !mod) {
      const last = lastMessageTime[phone] || 0;
      const diff = (Date.now() - last) / 1000;
      if (diff < slowModeSeconds) {
        socket.emit("mod:slowModeWait", { wait: Math.ceil(slowModeSeconds - diff) });
        return;
      }
    }
    lastMessageTime[phone] = Date.now();

    // HP & daily activity
    const today = todayStr();
    const alreadyToday = db.prepare("SELECT 1 FROM daily_activity WHERE phone = ? AND day = ?").get(phone, today);
    if (!alreadyToday) {
      db.prepare("INSERT OR IGNORE INTO daily_activity (phone, day) VALUES (?, ?)").run(phone, today);

      let hpDelta = 15; // base daily bonus
      const notifications = [];

      // +10 HP for first message of the day across all users
      const firstToday = db.prepare("SELECT phone FROM daily_first_msg WHERE day = ?").get(today);
      if (!firstToday) {
        db.prepare("INSERT OR IGNORE INTO daily_first_msg (day, phone, name) VALUES (?, ?, ?)").run(today, phone, name);
        hpDelta += 10;
        notifications.push({ type: "first_msg_day", text: `🌅 Перший в чаті сьогодні! +10 HP` });
        // announce to all
        const sysMsg = { id: "sys_" + Date.now(), type: "system", text: `🌅 ${name} — перший у чаті сьогодні! +10 HP`, time: new Date().toISOString() };
        io.emit("message", sysMsg);
      }

      // -10 HP penalty if missed yesterday
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const wasYesterday = db.prepare("SELECT 1 FROM daily_activity WHERE phone = ? AND day = ?").get(phone, yesterday);
      if (!wasYesterday) {
        // check if user is old enough (joined before yesterday)
        const guest = getGuest(phone);
        if (guest && guest.joinedAt < yesterday + "T23:59:59") {
          hpDelta -= 10;
          notifications.push({ type: "missed_day", text: `😴 Вчора не заходив у чат. -10 HP` });
        }
      }

      db.prepare("UPDATE guests SET hp = max(0, hp + ?) WHERE phone = ?").run(hpDelta, phone);
      const updatedGuest = getGuest(phone);
      if (updatedGuest) {
        socket.emit("hpUpdate", { hp: updatedGuest.hp });
        notifications.forEach(n => socket.emit("hpNotification", n));
      }
    }

    // Msg count
    db.prepare("INSERT OR IGNORE INTO msg_count (phone, total) VALUES (?, 0)").run(phone);
    db.prepare("UPDATE msg_count SET total = total + 1 WHERE phone = ?").run(phone);

    // Badges
    checkAndAwardBadges(phone, socket);

    const isMod = isModerator(phone);
    const msg = {
      id: String(Date.now()),
      type: "text",
      user: name,
      phone,
      text: text.trim().slice(0, 500),
      time: new Date().toISOString(),
      isMod,
      reactions: {},
    };
    messages.push(msg);
    if (messages.length > 200) messages.shift();
    io.emit("message", msg);
  });

  socket.on("image", (data) => {
    if (!data?.url || typeof data.url !== "string") return;
    if (data.url.length > 10 * 1024 * 1024 * 1.4) return;

    const ban = getBan(phone);
    if (ban) return;
    const mute = getMute(phone);
    if (mute) return;

    const isMod = isModerator(phone);
    const msg = {
      id: String(Date.now()),
      type: "image",
      user: name,
      phone,
      url: data.url,
      name: (data.name || "image").slice(0, 100),
      time: new Date().toISOString(),
      isMod,
      reactions: {},
    };
    messages.push(msg);
    if (messages.length > 200) messages.shift();
    io.emit("message", msg);
  });

  socket.on("sticker", (data) => {
    if (!data?.url || typeof data.url !== "string") return;
    if (!data.url.startsWith("https://raw.githubusercontent.com/seanprashad/slackmoji/master/emoji/")) return;

    const ban = getBan(phone);
    if (ban) return;
    const mute = getMute(phone);
    if (mute) return;

    const isMod = isModerator(phone);
    const msg = {
      id: String(Date.now()),
      type: "sticker",
      user: name,
      phone,
      url: data.url,
      time: new Date().toISOString(),
      isMod,
      reactions: {},
    };
    messages.push(msg);
    if (messages.length > 200) messages.shift();
    io.emit("message", msg);
  });

  // ── Reactions ──
  socket.on("mod:react", ({ msgId, emoji }) => {
    if (!msgId || !emoji) return;
    const allowed = ["👍", "❤️", "😂", "🔥", "👏"];
    if (!allowed.includes(emoji)) return;
    const existing = db.prepare("SELECT emoji FROM reactions WHERE msgId = ? AND phone = ?").get(msgId, phone);
    if (existing) {
      if (existing.emoji === emoji) {
        db.prepare("DELETE FROM reactions WHERE msgId = ? AND phone = ?").run(msgId, phone);
      } else {
        db.prepare("UPDATE reactions SET emoji = ? WHERE msgId = ? AND phone = ?").run(emoji, msgId, phone);
      }
    } else {
      db.prepare("INSERT OR IGNORE INTO reactions (msgId, phone, emoji) VALUES (?,?,?)").run(msgId, phone, emoji);
    }
    const reactions = getReactionsForMsg(msgId);
    io.emit("mod:reactions", { msgId, reactions });
    // Update in-memory
    const m = messages.find(x => x.id === msgId);
    if (m) m.reactions = reactions;
  });

  // ── MODERATOR ACTIONS ──
  function requireMod() {
    if (!isModerator(phone)) { socket.emit("error", "Немає прав модератора"); return false; }
    return true;
  }

  // mod:ban { targetPhone, reason, duration } duration: 15m | 24h | permanent
  socket.on("mod:ban", ({ targetPhone, reason, duration }) => {
    if (!requireMod()) return;
    const target = getGuest(targetPhone);
    if (!target) return;
    const targetName = `${target.firstName} ${target.lastName}`;

    // League players cannot be permanently banned
    if (duration === "permanent" && target.isLeaguePlayer) {
      socket.emit("error", "Гравців ліги не можна банити назавжди");
      return;
    }

    let until = null;
    let permanent = 0;

    if (duration === "permanent") {
      permanent = 1;
    } else if (duration === "15m") {
      until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    } else if (duration === "24h") {
      until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    db.prepare("INSERT OR REPLACE INTO bans (phone, reason, until, permanent, bannedBy) VALUES (?,?,?,?,?)")
      .run(targetPhone, reason || "Порушення правил", until, permanent, phone);
    modLog("ban", phone, name, targetPhone, targetName, `duration:${duration} reason:${reason}`);

    const untilLabel = permanent ? "назавжди" : new Date(until).toLocaleString("uk-UA");

    // Kick from socket
    for (const [, s] of io.sockets.sockets) {
      if (s.user?.phone === targetPhone) {
        s.emit("mod:banned", { reason: reason || "Порушення правил", until: untilLabel, permanent });
        s.disconnect(true);
        break;
      }
    }

    const sysMsg = {
      id: "sys_" + Date.now(), type: "system",
      text: `🚫 ${targetName} заблоковано. Причина: ${reason || "—"}. До: ${untilLabel}`,
      time: new Date().toISOString(),
    };
    io.emit("message", sysMsg);
    socket.emit("mod:actionDone", { action: "ban", targetName });
  });

  // mod:unban
  socket.on("mod:unban", ({ targetPhone }) => {
    if (!requireMod()) return;
    db.prepare("DELETE FROM bans WHERE phone = ?").run(targetPhone);
    const target = getGuest(targetPhone);
    const targetName = target ? `${target.firstName} ${target.lastName}` : targetPhone;
    modLog("unban", phone, name, targetPhone, targetName, "");
    socket.emit("mod:actionDone", { action: "unban", targetName });
  });

  // mod:warn { targetPhone, reason }
  socket.on("mod:warn", ({ targetPhone, reason }) => {
    if (!requireMod()) return;
    const target = getGuest(targetPhone);
    if (!target) return;
    const targetName = `${target.firstName} ${target.lastName}`;
    db.prepare("INSERT INTO warns (phone, reason, warnedBy) VALUES (?,?,?)").run(targetPhone, reason || "Порушення правил", phone);
    modLog("warn", phone, name, targetPhone, targetName, reason);

    const warnCount = getWarnCount(targetPhone);

    // Notify target
    for (const [, s] of io.sockets.sockets) {
      if (s.user?.phone === targetPhone) {
        s.emit("mod:warned", { reason: reason || "Порушення правил", count: warnCount });
        break;
      }
    }

    // Auto-ban at 3 warns
    if (warnCount >= 3) {
      const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      db.prepare("INSERT OR REPLACE INTO bans (phone, reason, until, permanent, bannedBy) VALUES (?,?,?,?,?)")
        .run(targetPhone, "Автобан: 3 попередження", until, 0, "system");
      modLog("autoban", phone, name, targetPhone, targetName, "3 warns");
      for (const [, s] of io.sockets.sockets) {
        if (s.user?.phone === targetPhone) {
          s.emit("mod:banned", { reason: "Автобан: 3 попередження", until: new Date(until).toLocaleString("uk-UA"), permanent: false });
          s.disconnect(true);
          break;
        }
      }
      const sysMsg = { id: "sys_" + Date.now(), type: "system", text: `⚠️ ${targetName} отримав 3 попередження і автоматично заблокований на 24 год`, time: new Date().toISOString() };
      io.emit("message", sysMsg);
    } else {
      const sysMsg = { id: "sys_" + Date.now(), type: "system", text: `⚠️ ${targetName} отримав попередження (${warnCount}/3)`, time: new Date().toISOString() };
      io.emit("message", sysMsg);
    }
    socket.emit("mod:actionDone", { action: "warn", targetName, warnCount });
  });

  // mod:mute { targetPhone, minutes }
  socket.on("mod:mute", ({ targetPhone, minutes }) => {
    if (!requireMod()) return;
    const target = getGuest(targetPhone);
    if (!target) return;
    const targetName = `${target.firstName} ${target.lastName}`;
    const until = new Date(Date.now() + (minutes || 30) * 60 * 1000).toISOString();
    db.prepare("INSERT OR REPLACE INTO mutes (phone, until, mutedBy) VALUES (?,?,?)").run(targetPhone, until, phone);
    modLog("mute", phone, name, targetPhone, targetName, `${minutes}min`);
    for (const [, s] of io.sockets.sockets) {
      if (s.user?.phone === targetPhone) {
        s.emit("mod:muted", { until: new Date(until).toLocaleString("uk-UA") });
        break;
      }
    }
    socket.emit("mod:actionDone", { action: "mute", targetName });
  });

  // mod:unmute
  socket.on("mod:unmute", ({ targetPhone }) => {
    if (!requireMod()) return;
    db.prepare("DELETE FROM mutes WHERE phone = ?").run(targetPhone);
    socket.emit("mod:actionDone", { action: "unmute" });
  });

  // mod:deleteMsg { msgId }
  socket.on("mod:deleteMsg", ({ msgId }) => {
    if (!requireMod()) return;
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx !== -1) {
      const m = messages[idx];
      modLog("deleteMsg", phone, name, m.phone || "", m.user, `msgId:${msgId}`);
      messages.splice(idx, 1);
    }
    io.emit("mod:msgDeleted", { msgId });
  });

  // mod:pin { msgId }
  socket.on("mod:pin", ({ msgId }) => {
    if (!requireMod()) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    db.prepare("INSERT OR REPLACE INTO pinned_message (id, msgId, msgText, msgUser, pinnedBy) VALUES (1,?,?,?,?)")
      .run(msg.id, msg.text || "[зображення]", msg.user, name);
    modLog("pin", phone, name, msg.phone || "", msg.user, `msgId:${msgId}`);
    io.emit("mod:pinned", { msgId: msg.id, msgText: msg.text || "[зображення]", msgUser: msg.user });
  });

  // mod:unpin
  socket.on("mod:unpin", () => {
    if (!requireMod()) return;
    db.prepare("DELETE FROM pinned_message WHERE id = 1").run();
    io.emit("mod:unpinned");
  });

  // mod:setLeaguePlayer { targetPhone, value } — mark/unmark as league player
  socket.on("mod:setLeaguePlayer", ({ targetPhone, value }) => {
    if (!requireMod()) return;
    db.prepare("UPDATE guests SET isLeaguePlayer = ? WHERE phone = ?").run(value ? 1 : 0, targetPhone);
    const target = getGuest(targetPhone);
    if (!target) return;
    modLog("setLeaguePlayer", phone, name, targetPhone, `${target.firstName} ${target.lastName}`, `value:${value}`);
    socket.emit("mod:actionDone", { action: "setLeaguePlayer", targetName: `${target.firstName} ${target.lastName}` });
    // Notify all clients to refresh guests list
    io.emit("mod:leaguePlayerUpdated", { targetPhone, isLeaguePlayer: value ? 1 : 0 });
  });

  // mod:slowMode { seconds } 0 = off
  socket.on("mod:slowMode", ({ seconds }) => {
    if (!requireMod()) return;
    slowModeSeconds = Number(seconds) || 0;
    modLog("slowMode", phone, name, "", "", `${slowModeSeconds}s`);
    io.emit("slowMode", slowModeSeconds);
  });

  // mod:startQuiz { question, options:[4 strings], correct:0-3 }
  socket.on("mod:startQuiz", ({ question, options, correct }) => {
    if (!requireMod()) return;
    if (!question || !Array.isArray(options) || options.length !== 4) return;
    // End any active quiz
    db.prepare("UPDATE quiz SET active = 0").run();
    const endsAt = new Date(Date.now() + 30 * 1000).toISOString();
    const result = db.prepare("INSERT INTO quiz (question, options, correct, startedBy, endsAt) VALUES (?,?,?,?,?)")
      .run(question, JSON.stringify(options), correct, phone, endsAt);
    const quizId = result.lastInsertRowid;
    modLog("quiz", phone, name, "", "", question);
    io.emit("mod:quizActive", { id: quizId, question, options, endsAt, myAnswer: null });

    // Auto-end after 30s
    setTimeout(() => {
      const q = db.prepare("SELECT * FROM quiz WHERE id = ?").get(quizId);
      if (!q || !q.active) return;
      db.prepare("UPDATE quiz SET active = 0 WHERE id = ?").run(quizId);
      const answers = db.prepare("SELECT qa.phone, qa.answer, g.firstName || ' ' || g.lastName as name FROM quiz_answers qa LEFT JOIN guests g ON g.phone = qa.phone WHERE qa.quizId = ?").all(quizId);
      const winners = answers.filter(a => a.answer === correct).map(a => a.name);
      io.emit("mod:quizEnded", {
        id: quizId, question, options, correct,
        correctLabel: options[correct],
        winners,
        totalAnswers: answers.length,
      });
    }, 30000);
  });

  // mod:quizAnswer { quizId, answer }
  socket.on("mod:quizAnswer", ({ quizId, answer }) => {
    const q = db.prepare("SELECT * FROM quiz WHERE id = ? AND active = 1").get(quizId);
    if (!q) return;
    db.prepare("INSERT OR IGNORE INTO quiz_answers (quizId, phone, answer) VALUES (?,?,?)").run(quizId, phone, answer);
    socket.emit("mod:quizAnswered", { quizId, answer });
  });

  // Porohova
  socket.on("porohovaJoin", (type) => {
    const label = type === "20min" ? "Іду через 20 хвилин" : type === "need1" ? "Потрібен +1 гравець" : null;
    const existing = porohova.find(e => e.name === name);
    if (!existing) porohova.push({ name, time: new Date().toISOString(), label });
    else existing.label = label;
    io.emit("porohovaList", porohova);
  });
  socket.on("porohovaLeave", () => { porohova = porohova.filter(e => e.name !== name); io.emit("porohovaList", porohova); });
  socket.on("porohovaClear", () => { porohova = []; io.emit("porohovaList", porohova); });

  socket.on("disconnect", () => {
    onlineUsers.delete(name);
    io.emit("userLeft", { name });
    io.emit("onlineUsers", Array.from(onlineUsers));
  });
});

function getReactionsForMsg(msgId) {
  const rows = db.prepare("SELECT emoji, COUNT(*) as cnt FROM reactions WHERE msgId = ? GROUP BY emoji").all(msgId);
  const result = {};
  for (const r of rows) result[r.emoji] = r.cnt;
  return result;
}

// ─── Widget ──────────────────────────────────────────────────────────────────
const SHOP_URL = process.env.SHOP_URL || "http://localhost:3009";
const WIDGET_ADMIN_SECRET = process.env.CHAT_ADMIN_SECRET || "ldbl_admin_2025";

let widgetProducts = [];
let widgetCurrentIndex = 0;
let widgetRotationTimer = null;
let widgetEnabled = true;
let widgetInterval = 20; // seconds
let widgetMode = "sequential";

async function fetchWidgetSettings() {
  try {
    const res = await fetch(`${SHOP_URL}/api/chat-widget/settings`);
    if (res.ok) {
      const data = await res.json();
      widgetEnabled = data.enabled;
      widgetInterval = data.interval || 20;
      widgetMode = data.mode || "sequential";
    }
  } catch { /* shop may be down */ }
}

async function fetchWidgetProducts() {
  try {
    const res = await fetch(`${SHOP_URL}/api/chat-widget/products`);
    if (res.ok) {
      const data = await res.json();
      widgetProducts = data;
    }
  } catch { /* shop may be down */ }
}

function getNextProduct() {
  if (!widgetProducts.length) return null;
  if (widgetMode === "random") {
    return widgetProducts[Math.floor(Math.random() * widgetProducts.length)];
  }
  // sequential
  const product = widgetProducts[widgetCurrentIndex % widgetProducts.length];
  widgetCurrentIndex++;
  return product;
}

function broadcastWidgetProduct(product) {
  if (!product) return;
  io.emit("widget:product_update", { ...product, _interval: widgetInterval });
}

function startWidgetRotation() {
  if (widgetRotationTimer) clearInterval(widgetRotationTimer);
  if (!widgetEnabled || !widgetProducts.length) return;
  widgetRotationTimer = setInterval(() => {
    const product = getNextProduct();
    if (product) broadcastWidgetProduct(product);
  }, widgetInterval * 1000);
}

// POST /api/widget/push — push specific product immediately (from shop admin)
app.post("/api/widget/push", (req, res) => {
  if (req.headers["x-admin-secret"] !== WIDGET_ADMIN_SECRET) {
    return res.status(403).json({ error: "forbidden" });
  }
  const product = req.body;
  if (!product || !product.id) return res.status(400).json({ error: "product required" });
  broadcastWidgetProduct(product);
  res.json({ ok: true });
});

// GET /api/widget/current — returns current product for new connections
app.get("/api/widget/current", (req, res) => {
  if (!widgetEnabled || !widgetProducts.length) return res.json(null);
  const product = widgetProducts[widgetCurrentIndex % widgetProducts.length] || null;
  res.json(product);
});

// Initial load + periodic refresh every 5 minutes
(async () => {
  await fetchWidgetSettings();
  await fetchWidgetProducts();
  startWidgetRotation();
})();

setInterval(async () => {
  await fetchWidgetSettings();
  await fetchWidgetProducts();
  startWidgetRotation();
}, 5 * 60 * 1000);

server.listen(PORT, () => console.log(`Chat server running on http://localhost:${PORT}`));
