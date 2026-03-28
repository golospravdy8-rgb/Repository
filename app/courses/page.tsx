"use client";

import { useState } from "react";

const TG_BOT = "7685937167:AAFfSNWb98RIshlHtOn9sId6M5DvH0FoV54";
const TG_CHAT = "-1003522476963";

const PROGRAMS = [
  {
    emoji: "🌱",
    title: "Початківці",
    age: "6–9 років",
    desc: "Основи гри, координація рухів, розвиток моторики. Ігрова форма навчання в малих групах.",
    topics: ["Базові навички гри", "Розвиток координації", "Командна взаємодія", "Ігрові вправи"],
  },
  {
    emoji: "⚡",
    title: "Середній рівень",
    age: "10–13 років",
    desc: "Техніка гри, тактика нападу і захисту. Підготовка до участі у змаганнях.",
    topics: ["Техніка дриблінгу і пасів", "Тактика команди", "Фізична підготовка", "Підготовка до турнірів"],
  },
  {
    emoji: "🏆",
    title: "Досвідчені",
    age: "14–16 років",
    desc: "Змагальна підготовка, розбір ігор, індивідуальна робота над слабкими сторонами.",
    topics: ["Змагальна підготовка", "Відеоаналіз матчів", "Психологія перемоги", "Індивідуальний розвиток"],
  },
];

export default function CoursesPage() {
  const [form, setForm] = useState({ childName: "", phone: "+380", age: "", level: "Початківці" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  function setF(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const text = `🏀 Запис на курс\n👦 Дитина: ${form.childName}\n📞 Батьки: ${form.phone}\n🎂 Вік: ${form.age} р.\n📚 Рівень: ${form.level}`;
      const res = await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TG_CHAT, text }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch { setStatus("error"); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: "10px",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
    color: "white", fontSize: "15px", fontFamily: "Exo 2, sans-serif", boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "white", fontFamily: "Exo 2, sans-serif" }}>
      {/* Header */}
      <header style={{ background: "#1e2a4a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <a href="/" style={{ color: "#f46f10", textDecoration: "none", fontSize: "14px" }}>← Головна</a>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>🎓 Тренерські курси</h1>
      </header>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #1e2a4a 0%, #0f172a 100%)", padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🏀</div>
        <h2 style={{ fontSize: "clamp(24px, 5vw, 42px)", fontWeight: 900, margin: "0 0 12px" }}>
          Тренерські курси для дітей
        </h2>
        <p style={{ fontSize: "18px", color: "#94a3b8", maxWidth: "600px", margin: "0 auto", lineHeight: 1.6 }}>
          Навчаємо баскетболу дітей від 6 до 16 років у Львові.<br />
          Досвідчені тренери, сучасні методики, результат гарантовано.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginTop: "32px", flexWrap: "wrap" }}>
          {[["200+", "Вихованців"], ["10+", "Років досвіду"], ["3", "Вікові групи"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: 900, color: "#f46f10" }}>{n}</div>
              <div style={{ fontSize: "13px", color: "#64748b" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Programs */}
      <div style={{ padding: "48px 24px", maxWidth: "1000px", margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "28px", fontWeight: 800, marginBottom: "32px" }}>
          Наші програми
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          {PROGRAMS.map((p) => (
            <div key={p.title} style={{ background: "#1e2a4a", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>{p.emoji}</div>
              <h3 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 800 }}>{p.title}</h3>
              <div style={{ color: "#f46f10", fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>{p.age}</div>
              <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, marginBottom: "16px" }}>{p.desc}</p>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#cbd5e1", fontSize: "13px", lineHeight: 1.8 }}>
                {p.topics.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Registration form */}
      <div style={{ background: "#1e2a4a", padding: "48px 24px" }}>
        <div style={{ maxWidth: "480px", margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "24px", fontWeight: 800, marginBottom: "8px" }}>
            Записатись на курс
          </h2>
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "14px", marginBottom: "32px" }}>
            Залиште заявку — ми зв&apos;яжемось для уточнення деталей
          </p>

          {status === "done" ? (
            <div style={{ textAlign: "center", padding: "32px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
              <h3 style={{ color: "#4ade80" }}>Заявку прийнято!</h3>
              <p style={{ color: "#94a3b8" }}>Ми зателефонуємо найближчим часом</p>
              <button onClick={() => setStatus("idle")} style={{ marginTop: "16px", padding: "10px 24px", background: "#f46f10", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif" }}>
                Надіслати ще одну
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Ім&apos;я дитини *</label>
                <input required value={form.childName} onChange={(e) => setF("childName", e.target.value)} placeholder="Олексій" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Телефон батьків *</label>
                <input required value={form.phone} onChange={(e) => setF("phone", e.target.value)} placeholder="+380 XX XXX XX XX" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Вік дитини *</label>
                <input required type="number" min="6" max="16" value={form.age} onChange={(e) => setF("age", e.target.value)} placeholder="Наприклад: 10" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Рівень підготовки</label>
                <select value={form.level} onChange={(e) => setF("level", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option>Початківці (6–9 р.)</option>
                  <option>Середній рівень (10–13 р.)</option>
                  <option>Досвідчені (14–16 р.)</option>
                </select>
              </div>
              {status === "error" && (
                <div style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", padding: "10px", borderRadius: "8px", fontSize: "13px" }}>
                  Помилка відправки. Спробуйте ще раз.
                </div>
              )}
              <button
                type="submit"
                disabled={status === "sending"}
                style={{ padding: "14px", background: "#f46f10", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 800, fontSize: "16px", fontFamily: "Exo 2, sans-serif", opacity: status === "sending" ? 0.7 : 1 }}
              >
                {status === "sending" ? "Відправка..." : "🏀 Записати на курс"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
