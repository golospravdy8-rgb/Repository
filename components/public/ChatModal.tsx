"use client";

import { useState, useEffect } from "react";

const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost:3011";
const LS_KEY = "ldbl_chat_user";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setChecking(true);

    // Check localStorage for saved user — redirect directly to chat with params
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        const { phone, firstName, lastName } = JSON.parse(saved);
        if (phone && firstName && lastName) {
          const params = new URLSearchParams({ phone, firstName, lastName });
          window.location.href = `${CHAT_URL}?${params.toString()}`;
          return;
        }
      } catch {}
    }

    setChecking(false);
  }, [isOpen]);

  if (!isOpen) return null;

  if (checking) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <div
          className="w-full max-w-md rounded-2xl shadow-2xl p-8 flex items-center justify-center"
          style={{ backgroundColor: "#1e2a4a" }}
        >
          <span className="text-white text-sm">Перевірка...</span>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const phone = (fd.get("phone") as string).trim();
    const firstName = (fd.get("firstName") as string).trim();
    const lastName = (fd.get("lastName") as string).trim();

    // Save to localStorage so next visit skips the form
    localStorage.setItem(LS_KEY, JSON.stringify({ phone, firstName, lastName }));

    // Redirect directly to chat server with params — no Vercel proxy needed
    const params = new URLSearchParams({ phone, firstName, lastName });
    window.location.href = `${CHAT_URL}?${params.toString()}`;
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
            <span style={{ fontSize: "32px" }}>💬</span>
            <span className="text-white font-bold text-lg">Балачка</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="px-6 pb-2">
          <p className="text-gray-400 text-sm">Зареєструйтесь або увійдіть за номером телефону</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Телефон</label>
            <input
              name="phone"
              type="tel"
              required
              placeholder="+380 XX XXX XX XX"
              className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-orange-500"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Ім&apos;я</label>
            <input
              name="firstName"
              type="text"
              required
              placeholder="Іван"
              className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-orange-500"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Прізвище</label>
            <input
              name="lastName"
              type="text"
              required
              placeholder="Петренко"
              className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-orange-500"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg font-bold text-white text-sm"
            style={{ backgroundColor: "#f46f10" }}
          >
            Увійти до чату
          </button>

          <p className="text-center text-xs text-gray-500">
            Якщо ви вже реєструвались — просто введіть той самий номер телефону і ваше ім&apos;я
          </p>
        </form>
      </div>
    </div>
  );
}
