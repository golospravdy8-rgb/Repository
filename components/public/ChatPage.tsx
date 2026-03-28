"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const LS_KEY = "ldbl_chat_user";
const EMOJIS = ["👍", "❤️", "😂", "😮", "🔥", "🏀"];

// ── Types ─────────────────────────────────────────────────────────────────
interface User {
  phone: string;
  firstName: string;
  lastName: string;
  hp: number;
  isMod: boolean;
  warns: number;
}

interface Reaction {
  id: number;
  phone: string;
  emoji: string;
}

interface ReplyPreview {
  id: number;
  name: string;
  text: string;
}

interface ChatMessage {
  id: number;
  phone: string;
  name: string;
  text: string;
  createdAt: string;
  isMod: boolean;
  replyTo: ReplyPreview | null;
  reactions: Reaction[];
}

// ── Main Component ────────────────────────────────────────────────────────
export default function ChatPage() {
  const [step, setStep] = useState<"checking" | "form" | "chat">("checking");
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [emojiTarget, setEmojiTarget] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ msgId: number; x: number; y: number } | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [showPinForm, setShowPinForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Notifications ──────────────────────────────────────────────────────
  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // ── Init: check localStorage ───────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        const { phone, firstName, lastName } = JSON.parse(saved);
        if (phone && firstName && lastName) {
          doLogin(phone, firstName, lastName);
          return;
        }
      } catch {}
    }
    setStep("form");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function doLogin(phone: string, firstName: string, lastName: string) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", phone, firstName, lastName }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.banned) {
        setStep("form");
        notify(data.error);
        return;
      }
      setStep("form");
      return;
    }
    setUser({
      phone,
      firstName,
      lastName,
      hp: data.guest.hp,
      isMod: data.isMod,
      warns: data.warns,
    });
    setPinnedMessage(data.pinnedMessage);
    setStep("chat");
  }

  // ── Load message history ───────────────────────────────────────────────
  useEffect(() => {
    if (step !== "chat") return;
    fetch("/api/chat/messages?limit=50")
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        if (d.pinnedMessage) setPinnedMessage(d.pinnedMessage);
      })
      .catch(() => {});
  }, [step]);

  // ── SSE connection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "chat") return;

    const es = new EventSource("/api/chat");
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        handleSSE(ev);
      } catch {}
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSSE(ev: {
    type: string;
    message?: ChatMessage;
    messageId?: number;
    reactions?: Reaction[];
    text?: string;
    phone?: string;
    mutedUntil?: string;
    count?: number;
    reason?: string;
  }) {
    if (ev.type === "message" && ev.message) {
      setMessages((prev) => [...prev.slice(-199), ev.message!]);
    }
    if (ev.type === "delete_message" && ev.messageId) {
      setMessages((prev) => prev.filter((m) => m.id !== ev.messageId));
    }
    if (ev.type === "reactions" && ev.messageId !== undefined) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === ev.messageId ? { ...m, reactions: ev.reactions ?? [] } : m
        )
      );
    }
    if (ev.type === "pin") {
      setPinnedMessage(ev.text ?? null);
    }
    if (ev.type === "banned" && ev.phone === user?.phone) {
      notify("Вас заблоковано в чаті");
      setStep("form");
      localStorage.removeItem(LS_KEY);
    }
    if (ev.type === "muted" && ev.phone === user?.phone) {
      notify(`Вас замовчано до ${new Date(ev.mutedUntil!).toLocaleTimeString("uk-UA")}`);
    }
    if (ev.type === "warn" && ev.phone === user?.phone) {
      notify(`⚠️ Попередження: ${ev.reason || "порушення правил"} (${ev.count}/3)`);
      setUser((u) => u ? { ...u, warns: ev.count ?? 0 } : u);
    }
  }

  // ── Auto-scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Close context menu on click ────────────────────────────────────────
  useEffect(() => {
    const close = () => { setContextMenu(null); setEmojiTarget(null); };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const phone = (fd.get("phone") as string).trim();
    const firstName = (fd.get("firstName") as string).trim();
    const lastName = (fd.get("lastName") as string).trim();
    localStorage.setItem(LS_KEY, JSON.stringify({ phone, firstName, lastName }));
    doLogin(phone, firstName, lastName);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !user) return;
    setSending(true);
    setInput("");
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          phone: user.phone,
          name: `${user.firstName} ${user.lastName}`,
          text,
          replyToId: replyId,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        notify(d.error ?? "Помилка відправки");
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleReact(messageId: number, emoji: string) {
    if (!user) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "react", phone: user.phone, messageId, emoji }),
    });
    setEmojiTarget(null);
  }

  async function handleDeleteMsg(msgId: number) {
    if (!user) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_message", phone: user.phone, messageId: msgId }),
    });
    setContextMenu(null);
  }

  async function handleMod(action: string, targetPhone: string, extra?: Record<string, unknown>) {
    if (!user) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, phone: user.phone, targetPhone, ...extra }),
    });
    setContextMenu(null);
    notify(`${action} виконано`);
  }

  async function handlePin() {
    if (!user) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pin", phone: user.phone, text: pinInput.trim() || null }),
    });
    setShowPinForm(false);
    setPinInput("");
  }

  function handleLogout() {
    localStorage.removeItem(LS_KEY);
    esRef.current?.close();
    setUser(null);
    setMessages([]);
    setStep("form");
  }

  // ── Reaction summary ───────────────────────────────────────────────────
  function reactionSummary(reactions: Reaction[]) {
    const map: Record<string, number> = {};
    for (const r of reactions) map[r.emoji] = (map[r.emoji] ?? 0) + 1;
    return Object.entries(map);
  }

  function myReactions(reactions: Reaction[]) {
    return new Set(reactions.filter((r) => r.phone === user?.phone).map((r) => r.emoji));
  }

  // ── Render ─────────────────────────────────────────────────────────────
  if (step === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f172a" }}>
        <div className="text-white text-sm opacity-60">Завантаження...</div>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" }}
      >
        <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: "#1e2a4a" }}>
          <div className="px-6 pt-8 pb-4 text-center">
            <div style={{ fontSize: "48px" }}>💬</div>
            <h1 className="text-white font-bold text-2xl mt-2">Балачка</h1>
            <p className="text-gray-400 text-sm mt-1">Чат фанів Basket Lviv</p>
          </div>

          {notification && (
            <div className="mx-6 mb-4 px-4 py-2 rounded-lg text-sm text-red-300" style={{ background: "rgba(239,68,68,0.15)" }}>
              {notification}
            </div>
          )}

          <form onSubmit={handleRegister} className="px-6 pb-8 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Телефон</label>
              <input
                name="phone" type="tel" required placeholder="+380 XX XXX XX XX"
                className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-orange-500"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ім&apos;я</label>
              <input
                name="firstName" type="text" required placeholder="Іван"
                className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-orange-500"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Прізвище</label>
              <input
                name="lastName" type="text" required placeholder="Петренко"
                className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-orange-500"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-lg font-bold text-white text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#f46f10" }}
            >
              Увійти до чату
            </button>
            <p className="text-center text-xs text-gray-500">
              Якщо ви вже реєструвались — введіть той самий номер телефону
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ── Chat UI ───────────────────────────────────────────────────────────
  const userName = `${user!.firstName} ${user!.lastName}`;

  return (
    <div
      className="flex flex-col"
      style={{ height: "100dvh", background: "#0f172a", color: "white" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: "#1e2a4a", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "22px" }}>💬</span>
          <span className="font-bold text-lg">Балачка</span>
          {user!.isMod && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#f46f10" }}>
              МОД
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium">{userName}</div>
            <div className="text-xs text-gray-400">{user!.hp} HP{user!.warns > 0 && ` · ⚠️${user!.warns}`}</div>
          </div>
          {user!.isMod && (
            <button
              onClick={() => setShowPinForm(!showPinForm)}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded"
              style={{ background: "rgba(255,255,255,0.05)" }}
              title="Закріпити повідомлення"
            >
              📌
            </button>
          )}
          <button onClick={handleLogout} className="text-gray-400 hover:text-white text-xs">
            Вийти
          </button>
        </div>
      </header>

      {/* ── Pin form (mod only) ─────────────────────────────────────────── */}
      {showPinForm && (
        <div className="px-4 py-2 flex gap-2 flex-shrink-0" style={{ background: "#162035", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <input
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Текст закріпленого повідомлення (порожньо = зняти)"
            className="flex-1 px-3 py-1.5 rounded text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
          />
          <button
            onClick={handlePin}
            className="px-3 py-1.5 rounded text-sm font-bold text-white"
            style={{ background: "#f46f10" }}
          >
            Зберегти
          </button>
        </div>
      )}

      {/* ── Pinned message ─────────────────────────────────────────────── */}
      {pinnedMessage && (
        <div
          className="px-4 py-2 text-sm flex items-start gap-2 flex-shrink-0"
          style={{ background: "rgba(244,111,16,0.1)", borderBottom: "1px solid rgba(244,111,16,0.2)" }}
        >
          <span>📌</span>
          <span className="text-orange-300">{pinnedMessage}</span>
        </div>
      )}

      {/* ── Notification toast ────────────────────────────────────────── */}
      {notification && (
        <div
          className="mx-4 mt-2 px-4 py-2 rounded-lg text-sm text-center flex-shrink-0"
          style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}
        >
          {notification}
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-16">
            Поки немає повідомлень. Будьте першим! 🏀
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.phone === user!.phone;
          const summary = reactionSummary(msg.reactions);
          const mine = myReactions(msg.reactions);
          const canDelete = isMe || user!.isMod;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"} group`}
            >
              {/* Sender name */}
              {!isMe && (
                <div className="flex items-center gap-1.5 mb-0.5 px-1">
                  <span className="text-xs font-medium" style={{ color: msg.isMod ? "#f46f10" : "#94a3b8" }}>
                    {msg.name}
                    {msg.isMod && <span className="ml-1 text-xs">✦</span>}
                  </span>
                </div>
              )}

              {/* Reply preview */}
              {msg.replyTo && (
                <div
                  className={`text-xs px-2 py-1 rounded mb-0.5 max-w-xs truncate ${isMe ? "text-right" : ""}`}
                  style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", borderLeft: "2px solid #f46f10" }}
                >
                  <span className="font-medium">{msg.replyTo.name}: </span>
                  {msg.replyTo.text}
                </div>
              )}

              {/* Bubble */}
              <div
                className="relative px-3 py-2 rounded-2xl text-sm max-w-xs break-words cursor-pointer select-text"
                style={{
                  backgroundColor: isMe ? "#f46f10" : "rgba(255,255,255,0.08)",
                  wordBreak: "break-word",
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY });
                }}
              >
                {msg.text}

                {/* Quick action buttons (hover) */}
                <div
                  className={`absolute top-0 ${isMe ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setEmojiTarget(emojiTarget === msg.id ? null : msg.id); }}
                    className="text-base hover:scale-125 transition-transform"
                    title="Реакція"
                  >😊</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setReplyTo(msg); inputRef.current?.focus(); }}
                    className="text-base hover:scale-125 transition-transform"
                    title="Відповісти"
                  >↩️</button>
                  {canDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteMsg(msg.id); }}
                      className="text-base hover:scale-125 transition-transform"
                      title="Видалити"
                    >🗑️</button>
                  )}
                </div>
              </div>

              {/* Emoji picker */}
              {emojiTarget === msg.id && (
                <div
                  className="flex gap-1 mt-1 px-2 py-1 rounded-full"
                  style={{ background: "#1e2a4a", border: "1px solid rgba(255,255,255,0.1)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {EMOJIS.map((em) => (
                    <button
                      key={em}
                      onClick={() => handleReact(msg.id, em)}
                      className="text-lg hover:scale-125 transition-transform"
                      style={{ opacity: mine.has(em) ? 1 : 0.6 }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {/* Reaction summary */}
              {summary.length > 0 && (
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {summary.map(([em, count]) => (
                    <button
                      key={em}
                      onClick={() => handleReact(msg.id, em)}
                      className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full transition-colors"
                      style={{
                        background: mine.has(em) ? "rgba(244,111,16,0.25)" : "rgba(255,255,255,0.05)",
                        border: mine.has(em) ? "1px solid rgba(244,111,16,0.5)" : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {em} <span className="text-gray-400">{count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-gray-600 mt-0.5 px-1">
                {new Date(msg.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Context menu (right-click) ─────────────────────────────────── */}
      {contextMenu && (() => {
        const msg = messages.find((m) => m.id === contextMenu.msgId);
        if (!msg) return null;
        const isMe = msg.phone === user!.phone;
        const canDelete = isMe || user!.isMod;
        return (
          <div
            className="fixed z-50 rounded-xl shadow-2xl py-1 min-w-32"
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 200),
              left: Math.min(contextMenu.x, window.innerWidth - 160),
              background: "#1e2a4a",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem onClick={() => { setReplyTo(msg); setContextMenu(null); inputRef.current?.focus(); }}>
              ↩️ Відповісти
            </MenuItem>
            {canDelete && (
              <MenuItem onClick={() => handleDeleteMsg(msg.id)} danger>
                🗑️ Видалити
              </MenuItem>
            )}
            {user!.isMod && !isMe && (
              <>
                <div className="h-px my-1" style={{ background: "rgba(255,255,255,0.05)" }} />
                <MenuItem onClick={() => handleMod("warn", msg.phone, { reason: "порушення" })}>
                  ⚠️ Попередити
                </MenuItem>
                <MenuItem onClick={() => handleMod("mute", msg.phone, { minutes: 10 })}>
                  🔇 Замовчати 10хв
                </MenuItem>
                <MenuItem onClick={() => handleMod("ban", msg.phone, { reason: "бан", hours: 24 })} danger>
                  🚫 Бан 24г
                </MenuItem>
              </>
            )}
          </div>
        );
      })()}

      {/* ── Reply preview ────────────────────────────────────────────────── */}
      {replyTo && (
        <div
          className="px-4 py-2 flex items-center justify-between flex-shrink-0"
          style={{ background: "rgba(244,111,16,0.08)", borderTop: "1px solid rgba(244,111,16,0.2)" }}
        >
          <div className="text-xs text-orange-300 truncate flex-1">
            <span className="font-medium">↩ {replyTo.name}: </span>{replyTo.text}
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* ── Input bar ─────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        className="px-4 py-3 flex gap-2 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#1e2a4a" }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Напишіть повідомлення..."
          maxLength={500}
          className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-orange-500"
          style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-4 py-2.5 rounded-xl font-bold text-white text-base disabled:opacity-40 transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#f46f10", minWidth: "48px" }}
        >
          →
        </button>
      </form>
    </div>
  );
}

// ── Context menu item ─────────────────────────────────────────────────────
function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/5"
      style={{ color: danger ? "#f87171" : "white" }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
