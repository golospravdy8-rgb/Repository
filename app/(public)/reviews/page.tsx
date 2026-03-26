"use client";

import { useState, useEffect } from "react";

type Review = { id: number; author: string; text: string; createdAt: string };

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !text.trim()) { setError("Заповніть всі поля"); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: author.trim(), text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Помилка"); return; }
      setReviews((r) => [data, ...r]);
      setAuthor("");
      setText("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <h1 className="text-xl font-black mb-1" style={{ color: "#1e2a4a" }}>Відгуки</h1>
      <p className="text-gray-500 mb-8">Залиште свій відгук про ЛДБЛ</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 mb-8 space-y-4">
        <h2 className="font-bold text-gray-800">Написати відгук</h2>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Ваше ім&apos;я</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            placeholder="Ім'я та прізвище"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={100}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Відгук</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none"
            placeholder="Поділіться враженнями про лігу..."
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
          />
          <div className="text-xs text-gray-400 text-right mt-0.5">{text.length}/1000</div>
        </div>
        {error && <div className="text-sm text-red-500">{error}</div>}
        {success && <div className="text-sm text-green-600 font-medium">Дякуємо за відгук!</div>}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-50"
          style={{ backgroundColor: "#f46f10" }}
        >
          {saving ? "Збереження..." : "Зберегти відгук"}
        </button>
      </form>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Поки що немає відгуків. Будьте першим!</div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-800">{r.author}</span>
                <span className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{r.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
