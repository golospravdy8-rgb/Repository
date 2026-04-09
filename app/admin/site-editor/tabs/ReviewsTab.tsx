"use client";

import { useState, useTransition, useEffect } from "react";

interface Review {
  id: number;
  author: string;
  text: string;
  createdAt: string;
}

export default function ReviewsTab() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then(setReviews)
      .catch((e) => setError("Помилка завантаження: " + String(e)));
  }, []);

  const handleDelete = (id: number, author: string) => {
    if (!confirm(`Видалити відгук від ${author}?`)) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
        if (res.ok) {
          setReviews((prev) => prev.filter((r) => r.id !== id));
          setSuccess("✓ Видалено!");
          setTimeout(() => setSuccess(null), 2000);
        } else {
          setError("Помилка видалення");
          setTimeout(() => setError(null), 3000);
        }
      } catch (e) {
        setError("Помилка: " + String(e));
        setTimeout(() => setError(null), 3000);
      }
    });
  };

  const handleEdit = (id: number, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleSaveEdit = (id: number) => {
    if (!editText.trim()) {
      setError("Текст не може бути порожним");
      setTimeout(() => setError(null), 2000);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/reviews/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: editText.trim() }),
        });

        if (res.ok) {
          setReviews((prev) =>
            prev.map((r) => (r.id === id ? { ...r, text: editText } : r))
          );
          setEditingId(null);
          setSuccess("✓ Оновлено!");
          setTimeout(() => setSuccess(null), 2000);
        } else {
          const data = await res.json();
          setError(data.error || "Помилка оновлення");
          setTimeout(() => setError(null), 3000);
        }
      } catch (e) {
        setError("Помилка: " + String(e));
        setTimeout(() => setError(null), 3000);
      }
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditText("");
  };

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#1e2a4a" }}>
        📋 Управління відгуками
      </h3>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#dc2626",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 12,
          }}>
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: "#dcfce7",
            color: "#16a34a",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 12,
          }}>
          {success}
        </div>
      )}

      {reviews.length === 0 ? (
        <div style={{ color: "#999", textAlign: "center", padding: "24px 0" }}>
          Немає відгуків
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontWeight: 600,
                    color: "#374151",
                  }}>
                  Автор
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontWeight: 600,
                    color: "#374151",
                  }}>
                  Текст
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontWeight: 600,
                    color: "#374151",
                  }}>
                  Дата
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "10px 12px",
                    fontWeight: 600,
                    color: "#374151",
                  }}>
                  Дії
                </th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    background: editingId === r.id ? "#f0fdf4" : "#fff",
                  }}>
                  <td style={{ padding: "12px", color: "#1e2a4a", fontWeight: 500 }}>
                    {r.author}
                  </td>
                  <td style={{ padding: "12px", color: "#444", maxWidth: 300 }}>
                    {editingId === r.id ? (
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: 4,
                          border: "1px solid #d1d5db",
                          fontSize: 13,
                          fontFamily: "inherit",
                          minHeight: 60,
                          resize: "vertical",
                          boxSizing: "border-box",
                        }}
                      />
                    ) : (
                      <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {r.text.length > 150
                          ? r.text.substring(0, 150) + "..."
                          : r.text}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px", color: "#666", whiteSpace: "nowrap" }}>
                    {new Date(r.createdAt).toLocaleDateString("uk-UA")}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      {editingId === r.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(r.id)}
                            disabled={isPending}
                            style={{
                              padding: "4px 8px",
                              background: "#16a34a",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 11,
                              cursor: isPending ? "wait" : "pointer",
                              fontWeight: 600,
                              transition: "all 0.2s",
                              opacity: isPending ? 0.7 : 1,
                            }}
                            onMouseOver={(e) => {
                              if (!isPending) e.currentTarget.style.background = "#15803d";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = "#16a34a";
                            }}>
                            ✓ Зберегти
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={isPending}
                            style={{
                              padding: "4px 8px",
                              background: "#999",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 11,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}>
                            ✕ Скасувати
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(r.id, r.text)}
                            disabled={isPending}
                            style={{
                              padding: "4px 8px",
                              background: "#3b82f6",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 11,
                              cursor: "pointer",
                              fontWeight: 600,
                              transition: "all 0.2s",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = "#2563eb";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = "#3b82f6";
                            }}>
                            ✏️ Редагувати
                          </button>
                          <button
                            onClick={() => handleDelete(r.id, r.author)}
                            disabled={isPending}
                            style={{
                              padding: "4px 8px",
                              background: "#dc2626",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 11,
                              cursor: "pointer",
                              fontWeight: 600,
                              transition: "all 0.2s",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = "#b91c1c";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = "#dc2626";
                            }}>
                            🗑️ Видалити
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
