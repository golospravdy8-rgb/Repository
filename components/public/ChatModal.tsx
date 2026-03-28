"use client";

import { useState, useEffect, useRef } from "react";

const LS_KEY = "ldbl_chat_user";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  type: string;
  username?: string;
  text?: string;
  ts?: number;
}

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const [step, setStep] = useState<"checking" | "form" | "chat">("checking");
  const [username, setUsername] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // On open: check localStorage for saved user
  useEffect(() => {
    if (!isOpen) return;
    setStep("checking");
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        const { firstName, lastName } = JSON.parse(saved);
        if (firstName && lastName) {
          setUsername(`${firstName} ${lastName}`);
          setStep("chat");
          return;
        }
      } catch {}
    }
    setStep("form");
  }, [isOpen]);

  // Connect SSE when in chat step
  useEffect(() => {
    if (step !== "chat" || !isOpen) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }

    const es = new EventSource("/api/chat");
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg: Message = JSON.parse(e.data);
        if (msg.type === "message") {
          setMessages((prev) => [...prev.slice(-199), msg]);
        }
      } catch {}
    };

    es.onerror = () => {
      // SSE will auto-reconnect
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [step, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close: cleanup
  function handleClose() {
    esRef.current?.close();
    esRef.current = null;
    onClose();
  }

  function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const phone = (fd.get("phone") as string).trim();
    const firstName = (fd.get("firstName") as string).trim();
    const lastName = (fd.get("lastName") as string).trim();
    localStorage.setItem(LS_KEY, JSON.stringify({ phone, firstName, lastName }));
    setUsername(`${firstName} ${lastName}`);
    setStep("chat");
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, text }),
      });
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  const overlay = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    />
  );

  // ── Checking ──────────────────────────────────────────────────────────────
  if (step === "checking") {
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

  // ── Registration form ────────────────────────────────────────────────────
  if (step === "form") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
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
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          <div className="px-6 pb-2">
            <p className="text-gray-400 text-sm">
              Зареєструйтесь або увійдіть за номером телефону
            </p>
          </div>

          <form onSubmit={handleRegister} className="px-6 pb-6 pt-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Телефон</label>
              <input
                name="phone"
                type="tel"
                required
                placeholder="+380 XX XXX XX XX"
                className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-orange-500"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Ім&apos;я
              </label>
              <input
                name="firstName"
                type="text"
                required
                placeholder="Іван"
                className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-orange-500"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
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
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
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
              Якщо ви вже реєструвались — просто введіть той самий номер
              телефону і ваше ім&apos;я
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ── Chat window ───────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "#1e2a4a", height: "520px" }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "22px" }}>💬</span>
            <span className="text-white font-bold">Балачка</span>
            <span className="text-gray-400 text-xs ml-1">— {username}</span>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.length === 0 && (
            <p className="text-center text-gray-500 text-xs mt-8">
              Поки немає повідомлень. Будьте першим!
            </p>
          )}
          {messages.map((m, i) => {
            const isMe = m.username === username;
            return (
              <div
                key={i}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {!isMe && (
                  <span className="text-xs text-gray-400 mb-0.5 px-1">
                    {m.username}
                  </span>
                )}
                <div
                  className="px-3 py-2 rounded-xl text-sm text-white max-w-xs break-words"
                  style={{
                    backgroundColor: isMe
                      ? "#f46f10"
                      : "rgba(255,255,255,0.1)",
                  }}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="px-4 py-3 border-t border-white/10 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напишіть повідомлення..."
            maxLength={500}
            className="flex-1 px-4 py-2 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-orange-500"
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-40"
            style={{ backgroundColor: "#f46f10" }}
          >
            →
          </button>
        </form>
      </div>
    </div>
  );
}
