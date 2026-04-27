"use client";

import { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  redirectAfter?: string;
  onSuccess?: (user: { id: number; name: string; email: string; role: string }) => void;
}

export default function AuthModal({ isOpen, onClose, message, redirectAfter, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const data: Record<string, string> = {};
    new FormData(form).forEach((v, k) => { data[k] = v as string; });

    const url = tab === "login" ? "http://localhost:3012/api/auth/login" : "http://localhost:3012/api/auth/register";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Помилка"); setLoading(false); return; }
      onSuccess?.(json);
      onClose();
      if (redirectAfter) window.location.href = redirectAfter;
      else window.location.reload();
    } catch {
      setError("Не вдалось підключитись до сервера авторизації");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "#1e2a4a" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: "#f46f10" }}>
              БЛ
            </div>
            <span className="text-white font-bold text-lg">ЛДБЛ</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {/* Message */}
        {message && (
          <div className="mx-6 mb-4 px-4 py-3 rounded-lg text-sm text-white" style={{ backgroundColor: "rgba(244,111,16,0.2)", border: "1px solid #f46f10" }}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex mx-6 mb-6 rounded-lg overflow-hidden border border-white/10">
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className="flex-1 py-2.5 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: tab === t ? "#f46f10" : "transparent",
                color: tab === t ? "white" : "rgba(255,255,255,0.6)",
              }}
            >
              {t === "login" ? "Увійти" : "Зареєструватись"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {tab === "register" && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ім&apos;я</label>
              <input
                name="name"
                required
                placeholder="Ваше ім'я"
                className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="email@example.com"
              className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Пароль</label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-bold text-white text-sm transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#f46f10" }}
          >
            {loading ? "Завантаження..." : tab === "login" ? "Увійти" : "Зареєструватись"}
          </button>
        </form>
      </div>
    </div>
  );
}
