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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load reviews
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/v1/reviews");
        if (r.ok) {
          const reviews = await r.json();
          setReviews(reviews);
        }
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setLoading(false);
      }
    })();

    // Check if user is admin (server-side cookie check)
    (async () => {
      try {
        const r = await fetch("/api/admin/check");
        if (r.ok) {
          const data = await r.json();
          setIsAdmin(data.isAdmin === true);
          console.log("[ReviewsPage-UA] isAdmin:", data.isAdmin);
        }
      } catch (e) {
        console.error("[ReviewsPage-UA] Error checking admin:", e);
        setIsAdmin(false);
      }
    })();
  }, []);

  async function submit() {
    if (!author.trim() || !text.trim()) {
      setMsg("Заповніть всі поля");
      return;
    }

    try {
      const res = await fetch("/api/v1/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: author.trim(), text: text.trim() }),
      });

      if (res.ok) {
        const r = await res.json();
        setReviews((prev) => [r, ...prev]);
        setText("");
        setMsg("Відгук збережено!");
        setTimeout(() => setMsg(""), 3000);
      } else {
        const d = await res.json();
        setMsg(d.error ?? "Помилка");
      }
    } catch (err) {
      console.error("Submit review error:", err);
      setMsg("Помилка мережі");
    }
  }

  async function remove(review: Review) {
    if (!confirm("Видалити відгук?")) return;

    try {
      const res = await fetch(`/api/v1/reviews/${review.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setReviews((prev) => prev.filter((x) => x.id !== review.id));
        setMsg("Видалено!");
        setTimeout(() => setMsg(""), 3000);
      } else {
        const data = await res.json();
        setMsg(data.error ?? "Немає прав або помилка");
      }
    } catch (e) {
      setMsg("Помилка мережі: " + String(e));
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Відгуки</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Залиште свій відгук про ЛДБЛ</p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Форма */}
        <div
          style={{
            flex: "0 0 280px",
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Написати відгук
          </h2>
          <label style={{ fontSize: 13, color: "#444" }}>Ваше ім&apos;я</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Ім'я та прізвище"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              marginTop: 4,
              marginBottom: 12,
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
          <label style={{ fontSize: 13, color: "#444" }}>Відгук</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            placeholder="Поділіться враженнями про лігу..."
            rows={5}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              marginTop: 4,
              marginBottom: 4,
              fontSize: 14,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: 12, color: "#999", textAlign: "right", marginBottom: 12 }}>
            {text.length}/1000
          </div>
          {msg && (
            <div
              style={{
                fontSize: 13,
                color: msg.includes("збережено") || msg.includes("Видалено")
                  ? "green"
                  : "red",
                marginBottom: 8,
              }}
            >
              {msg}
            </div>
          )}
          <button
            onClick={submit}
            style={{
              width: "100%",
              padding: "10px",
              background: "#e87722",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Зберегти відгук
          </button>
        </div>

        {/* Список */}
        <div style={{ flex: 1, minWidth: 280 }}>
          {loading ? (
            <p style={{ color: "#999" }}>Завантаження...</p>
          ) : reviews.length === 0 ? (
            <p style={{ color: "#999" }}>Відгуків поки немає</p>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "16px 20px",
                  marginBottom: 12,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
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
                    <strong style={{ fontSize: 15 }}>{review.author}</strong>
                    <span style={{ fontSize: 12, color: "#999", marginLeft: 12 }}>
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
                      onClick={() => remove(review)}
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
                        e.currentTarget.style.background = "#ffe0e0";
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
                <p style={{ fontSize: 14, color: "#333", margin: 0 }}>
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
