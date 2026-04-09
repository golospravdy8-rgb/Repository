"use client";
import { useEffect, useState, useTransition } from "react";

interface Review { id: number; author: string; text: string; createdAt: string; }

function getMyName(): string {
  try { const a = localStorage.getItem("ldbl_chat_user"); if (a) { const u = JSON.parse(a); if (u?.firstName) return `${u.firstName} ${u.lastName ?? ""}`.trim(); } } catch {}
  try { const b = localStorage.getItem("parent_data"); if (b) { const { contact: c } = JSON.parse(b); if (c?.firstName) return `${c.firstName} ${c.lastName ?? ""}`.trim(); } } catch {}
  return "";
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [myName, setMyName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const reviews = await fetch("/api/reviews").then(r => r.json());
        setReviews(reviews);
      } catch (e) {
        console.error("Failed to fetch reviews:", e);
      }
    })();

    const name = getMyName();
    setMyName(name);
    setAuthor(name);

    // Check if user is admin by checking session/auth
    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        setIsAdmin(!!session?.user?.isAdmin);
      } catch {
        // Fallback: check cookie
        setIsAdmin(document.cookie.includes("admin_token=ldbl_admin_2025"));
      }
    };
    checkAdmin();
  }, []);

  async function save() {
    setErr("");
    if (!author.trim() || !text.trim()) { setErr("Заповніть всі поля"); return; }
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: author.trim(), text: text.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Помилка сервера"); return; }
    setReviews(prev => [data, ...prev]);
    setText("");
    setMsg("✓ Збережено!");
    setTimeout(() => setMsg(""), 3000);
  }

  async function remove(r: Review) {
    if (!confirm("Видалити цей відгук?")) return;
    setDeletingId(r.id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reviews/${r.id}`, {
          method: "DELETE",
          headers: { "x-author": myName },
        });
        if (res.ok) {
          setReviews(prev => prev.filter(x => x.id !== r.id));
          setMsg("✓ Видалено!");
          setTimeout(() => setMsg(""), 2000);
        } else {
          setErr("Помилка видалення");
          setTimeout(() => setErr(""), 2000);
        }
      } catch (e) {
        setErr("Помилка видалення: " + String(e));
        setTimeout(() => setErr(""), 2000);
      } finally {
        setDeletingId(null);
      }
    });
  }

  const canDelete = (r: Review) => isAdmin || (!!myName && myName === r.author);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 16px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1e2a4a", marginBottom: 4 }}>Відгуки</h1>
      <p style={{ color: "#888", marginBottom: 28 }}>Залиште свій відгук про ЛДБЛ</p>
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "0 0 280px", background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.09)" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 18 }}>Написати відгук</h2>
          <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 5 }}>Ваше імʼя</label>
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Імʼя та прізвище"
            style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box", marginBottom: 14 }} />
          <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 5 }}>Відгук</label>
          <textarea value={text} onChange={e => setText(e.target.value.slice(0, 1000))} placeholder="Поділіться враженнями..." rows={5}
            style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
          <div style={{ fontSize: 12, color: "#aaa", textAlign: "right", marginBottom: 10 }}>{text.length}/1000</div>
          {err && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>{err}</div>}
          {msg && <div style={{ color: "#16a34a", fontSize: 13, marginBottom: 8 }}>{msg}</div>}
          <button onClick={save} style={{ width: "100%", padding: 11, background: "#e87722", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Зберегти відгук
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          {reviews.length === 0 ? (
            <div style={{ color: "#aaa", textAlign: "center", paddingTop: 60 }}>Поки що немає відгуків. Будьте першим!</div>
          ) : reviews.map(r => (
            <div
              key={r.id}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 12,
                boxShadow: "0 1px 5px rgba(0,0,0,0.07)",
                transition: "all 0.2s ease",
                opacity: deletingId === r.id ? 0.5 : 1,
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12 }}>
                <div>
                  <strong style={{ fontSize: 15, color: "#1e2a4a" }}>{r.author}</strong>
                  <span style={{ fontSize: 12, color: "#aaa", marginLeft: 10 }}>
                    {new Date(r.createdAt).toLocaleDateString("uk-UA", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                {canDelete(r) && (
                  <button
                    onClick={() => remove(r)}
                    disabled={isPending || deletingId === r.id}
                    aria-label={`Видалити відгук від ${r.author}`}
                    title="Видалити цей відгук"
                    style={{
                      background: "#fee2e2",
                      border: "1px solid #fca5a5",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 12,
                      color: "#dc2626",
                      fontWeight: 600,
                      cursor: deletingId === r.id ? "wait" : "pointer",
                      flexShrink: 0,
                      transition: "all 0.2s ease",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      opacity: deletingId === r.id ? 0.6 : 1,
                    }}
                    onMouseOver={e => {
                      if (deletingId !== r.id && !isPending) {
                        e.currentTarget.style.background = "#fecaca";
                        e.currentTarget.style.borderColor = "#f87171";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = "#fee2e2";
                      e.currentTarget.style.borderColor = "#fca5a5";
                      e.currentTarget.style.transform = "scale(1)";
                    }}>
                    {deletingId === r.id ? "⏳" : "🗑️"} {deletingId === r.id ? "Видаляю..." : "Видалити"}
                  </button>
                )}
              </div>
              <p style={{ fontSize: 14, color: "#444", margin: 0, lineHeight: 1.6 }}>{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
