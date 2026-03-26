"use client";

import { useState } from "react";

const FEE = parseInt(process.env.NEXT_PUBLIC_TEAM_FEE || "500");

export default function RegisterTeamPage() {
  const [form, setForm] = useState({ teamName: "", school: "", coachName: "", email: "", phone: "", playerCount: "10" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: number; instructions: string } | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("http://localhost:3012/api/team-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, playerCount: parseInt(form.playerCount) }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Помилка"); setSubmitting(false); return; }
      setResult(json);
    } catch {
      setError("Не вдалось підключитись до сервера");
    }
    setSubmitting(false);
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🏀</div>
        <h1 className="text-2xl font-black mb-2" style={{ color: "#1e2a4a" }}>Заявку прийнято!</h1>
        <p className="text-gray-500 mb-8">Реєстрація №{result.id} — очікує підтвердження оплати</p>
        <div className="bg-white rounded-2xl shadow p-6 text-left border-l-4" style={{ borderColor: "#f46f10" }}>
          <h3 className="font-black text-gray-800 mb-3">Інструкція для оплати:</h3>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{result.instructions}</p>
        </div>
        <p className="text-sm text-gray-400 mt-4">Після підтвердження оплати адміністратором команда буде активована на сайті.</p>
        <button
          onClick={() => { setResult(null); setForm({ teamName: "", school: "", coachName: "", email: "", phone: "", playerCount: "10" }); }}
          className="mt-6 px-6 py-3 rounded-xl font-bold text-white"
          style={{ backgroundColor: "#f46f10" }}
        >
          Зареєструвати ще одну команду
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-3">
      <h1 className="text-xl font-black mb-1" style={{ color: "#1e2a4a" }}>Реєстрація команди</h1>
      <p className="text-gray-500 mb-8">
        Сезон 2025-2026 · Реєстраційний внесок:{" "}
        <strong style={{ color: "#f46f10" }}>{FEE} грн</strong>
      </p>

      <div className="bg-white rounded-2xl shadow p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Назва команди *</label>
              <input
                required
                value={form.teamName}
                onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                placeholder="Наприклад: Леопарди Школи №5"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Школа / організація</label>
              <input
                value={form.school}
                onChange={(e) => setForm({ ...form, school: e.target.value })}
                placeholder="Школа №5, ліцей, клуб..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">ПІБ тренера *</label>
            <input
              required
              value={form.coachName}
              onChange={(e) => setForm({ ...form, coachName: e.target.value })}
              placeholder="Прізвище Ім'я Побатькові"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email тренера *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="coach@school.ua"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Телефон</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+380..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Кількість гравців</label>
            <input
              type="number"
              min="5"
              max="20"
              value={form.playerCount}
              onChange={(e) => setForm({ ...form, playerCount: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl font-black text-white text-base transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#f46f10" }}
            >
              {submitting ? "Відправка..." : `Оплатити та зареєструватись (${FEE} грн)`}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              Після відправки ви отримаєте інструкцію з оплати. Команда буде активована після підтвердження платежу.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
