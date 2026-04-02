"use client";
import { useEffect, useState } from "react";

interface Review {
  id: number;
  author: string;
  text: string;
  createdAt: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load reviews
    setLoading(true);
    fetch("/api/v1/reviews")
      .then((r) => r.json())
      .then(setReviews)
      .finally(() => setLoading(false));

    // Check if user is admin (server-side cookie check)
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((data) => {
        setIsAdmin(data.isAdmin === true);
        console.log("[ReviewsPage] isAdmin:", data.isAdmin);
      })
      .catch((e) => {
        console.error("[ReviewsPage] Error checking admin:", e);
        setIsAdmin(false);
      });
  }, []);

  async function save() {
    setErr("");
    if (!author.trim() || !text.trim()) {
      setErr("Заповніть всі поля");
      return;
    }

    const res = await fetch("/api/v1/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: author.trim(), text: text.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setErr(data.error ?? "Помилка сервера");
      return;
    }

    setReviews((prev) => [data, ...prev]);
    setText("");
    setMsg("✓ Збережено!");
    setTimeout(() => setMsg(""), 3000);
  }

  async function remove(reviewId: number) {
    if (!confirm("Видалити цей відгук?")) return;

    try {
      const res = await fetch(`/api/v1/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        setErr(data.error ?? "Помилка при видаленні");
        return;
      }

      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setMsg("✓ Видалено!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setErr("Помилка мережі: " + String(e));
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 16px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1e2a4a", marginBottom: 4 }}>
        Відгуки
      </h1>
      <p style={{ color: "#888", marginBottom: 28 }}>
        Залиште свій відгук про ЛДБЛ
      </p>

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Form */}
        <div
          style={{
            flex: "0 0 280px",
            background: "#fff",
            borderRadius: 14,
            padding: 22,
            boxShadow: "0 2px 8px rgba(0,0,0,0.09)",
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 18 }}>
            Написати відгук
          </h2>

          <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 5 }}>
            Ваше імʼя
          </label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Імʼя та прізвище"
            style={{
              width: "100%",
              padding: "9px 11px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              boxSizing: "border-box",
              marginBottom: 14,
            }}
          />

          <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 5 }}>
            Відгук
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            placeholder="Поділіться враженнями..."
            rows={5}
            style={{
              width: "100%",
              padding: "9px 11px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />

          <div style={{ fontSize: 12, color: "#aaa", textAlign: "right", marginBottom: 10 }}>
            {text.length}/1000
          </div>

          {err && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>{err}</div>}
          {msg && <div style={{ color: "#16a34a", fontSize: 13, marginBottom: 8 }}>{msg}</div>}

          <button
            onClick={save}
            style={{
              width: "100%",
              padding: 11,
              background: "#e87722",
              color: "#fff",
              border: "none",
              borderRadius: 9,
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Зберегти відгук
          </button>
        </div>

        {/* Reviews List */}
        <div style={{ flex: 1, minWidth: 280 }}>
          {loading ? (
            <div style={{ color: "#aaa", textAlign: "center", paddingTop: 60 }}>
              Завантаження...
            </div>
          ) : reviews.length === 0 ? (
            <div style={{ color: "#aaa", textAlign: "center", paddingTop: 60 }}>
              Поки що немає відгуків. Будьте першим!
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "16px 20px",
                  marginBottom: 12,
                  boxShadow: "0 1px 5px rgba(0,0,0,0.07)",
                }}
              >
                {/* Header with author, date, and delete button */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                    gap: 12,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 15, color: "#1e2a4a" }}>
                      {review.author}
                    </strong>
                    <span style={{ fontSize: 12, color: "#aaa", marginLeft: 10 }}>
                      {new Date(review.createdAt).toLocaleDateString("uk-UA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Delete button - visible only to admin */}
                  {isAdmin && (
                    <button
                      onClick={() => remove(review.id)}
                      style={{
                        background: "none",
                        border: "1px solid #dc2626",
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 12,
                        color: "#dc2626",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fef2f2";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "none";
                      }}
                      title="Видалити як адміністратор"
                    >
                      🗑 Видалити
                    </button>
                  )}
                </div>

                {/* Review text */}
                <p style={{ fontSize: 14, color: "#444", margin: 0, lineHeight: 1.6 }}>
                  {review.text}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
