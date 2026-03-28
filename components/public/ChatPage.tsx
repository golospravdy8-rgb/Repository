"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const LS_KEY = "ldbl_chat_user";
const EMOJIS = ["👍", "❤️", "😂", "😮", "🔥", "🏀"];

// ── Emoji groups ──────────────────────────────────────────────────────────
const EMOJI_GROUPS = {
  "Базові":  ["😀","😂","😍","🤩","😎","😭","🤣","😤","🥳","🤔","😴","🥺","😅","🤗","😏"],
  "Жести":   ["👍","👎","👏","🙌","🤝","💪","🙏","👋","🤙","☝️"],
  "Серця":   ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💕","💯"],
  "Спорт":   ["🏀","🏆","⛹️","🥇","🎯","🔥","⚡","👟","🧢","🎉"],
};

// ── Stickers (pavanpatil45/Classic-Meme-Stickers) ─────────────────────────
const STICKER_BASE = "https://raw.githubusercontent.com/pavanpatil45/Classic-Meme-Stickers/main/app/src/main/assets";
const MEME_STICKERS = Array.from({ length: 26 }, (_, i) => `${STICKER_BASE}/1/${i + 1}.webp`)
  .concat(Array.from({ length: 23 }, (_, i) => `${STICKER_BASE}/2/${i + 1}.webp`));

// ── Cool GIFs (Anmol-Baranwal) ────────────────────────────────────────────
const COOL_GIFS = [
  "https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif",
  "https://user-images.githubusercontent.com/74038190/212284158-e840e285-664b-44d7-b79b-e264b5e54825.gif",
  "https://user-images.githubusercontent.com/74038190/212284087-bbe7e430-757e-4901-90bf-4cd2ce3e1852.gif",
  "https://user-images.githubusercontent.com/74038190/212284094-e50ceae2-de86-4dd6-9f9c-a3ebcb3ede9e.gif",
  "https://user-images.githubusercontent.com/74038190/212284136-03988914-d899-44b4-b1d9-4eeccf656e44.gif",
  "https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif",
  "https://user-images.githubusercontent.com/74038190/212284119-fbfd994d-8c2a-4a07-a75f-84e513833c1c.gif",
  "https://user-images.githubusercontent.com/74038190/212284131-1a7b1d61-dfdb-4fd5-8da4-2cbe4e767db2.gif",
  "https://user-images.githubusercontent.com/74038190/212284145-bf2c01a8-c448-4f1a-b911-996024c84606.gif",
  "https://user-images.githubusercontent.com/74038190/212284149-98f19dd7-49e0-4f59-9c21-94c5a1c35b3b.gif",
  "https://user-images.githubusercontent.com/74038190/212284152-56bcc665-bef5-4c73-9b79-b9b72014dc55.gif",
  "https://user-images.githubusercontent.com/74038190/212284160-87ec8aa1-bd4a-4b54-8e60-e7c0e0f40c72.gif",
  "https://user-images.githubusercontent.com/74038190/212284163-82b34eac-0fcd-4ec1-9d75-71001ab4cc57.gif",
  "https://user-images.githubusercontent.com/74038190/212284165-04fe3e20-a7e4-44af-8a17-f9ba7c1eef00.gif",
  "https://user-images.githubusercontent.com/74038190/212284168-acba3a84-6acb-4abd-bfe4-87e0ba17db72.gif",
  "https://user-images.githubusercontent.com/74038190/212284172-5c8c7d89-1b07-4a9d-8b2c-c5f14a2a83a5.gif",
  "https://user-images.githubusercontent.com/74038190/212284175-c4fd4b9e-8e4e-4b37-a0b3-0e2b27f7b7c2.gif",
];

// ── Badge by HP ───────────────────────────────────────────────────────────
function getBadge(hp: number): string {
  if (hp >= 200) return "👑";
  if (hp >= 100) return "🔥";
  if (hp >= 50)  return "⭐";
  if (hp >= 25)  return "🌱";
  return "";
}

// ── Types ─────────────────────────────────────────────────────────────────
interface User {
  phone: string;
  firstName: string;
  lastName: string;
  hp: number;
  isMod: boolean;
  warns: number;
  isLeaguePlayer: boolean;
  mvpVote: string | null; // player name voted this month, or null
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
  const [showMvp, setShowMvp] = useState(false);
  const [players, setPlayers] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [openPanel, setOpenPanel] = useState<"emoji" | "sticker" | "gif" | null>(null);
  const [uploading, setUploading] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        const { phone, firstName, lastName } = JSON.parse(saved);
        if (phone && firstName && lastName) { doLogin(phone, firstName, lastName); return; }
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
      if (data.banned) notify(data.error);
      setStep("form");
      return;
    }
    setUser({
      phone, firstName, lastName,
      hp: data.guest.hp,
      isMod: data.isMod,
      warns: data.warns,
      isLeaguePlayer: data.guest.isLeaguePlayer ?? false,
      mvpVote: data.mvpVote ?? null,
    });
    setPinnedMessage(data.pinnedMessage);
    setStep("chat");
  }

  // ── Load history ───────────────────────────────────────────────────────
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

  // ── Load players for MVP ───────────────────────────────────────────────
  useEffect(() => {
    if (step !== "chat") return;
    fetch("/api/players?limit=100")
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []))
      .catch(() => {});
  }, [step]);

  // ── SSE ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "chat") return;
    const es = new EventSource("/api/chat");
    esRef.current = es;
    es.onmessage = (e) => {
      try { handleSSE(JSON.parse(e.data)); } catch {}
    };
    return () => { es.close(); esRef.current = null; };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSSE(ev: {
    type: string; message?: ChatMessage; messageId?: number; reactions?: Reaction[];
    text?: string; phone?: string; mutedUntil?: string; count?: number; reason?: string;
  }) {
    if (ev.type === "message" && ev.message) {
      setMessages((prev) => [...prev.slice(-199), ev.message!]);
    }
    if (ev.type === "delete_message" && ev.messageId) {
      setMessages((prev) => prev.filter((m) => m.id !== ev.messageId));
    }
    if (ev.type === "reactions" && ev.messageId !== undefined) {
      setMessages((prev) => prev.map((m) => m.id === ev.messageId ? { ...m, reactions: ev.reactions ?? [] } : m));
    }
    if (ev.type === "pin") setPinnedMessage(ev.text ?? null);
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

  // ── Close menus on outside click ────────────────────────────────────────
  useEffect(() => {
    const close = (e: MouseEvent) => {
      setContextMenu(null);
      setEmojiTarget(null);
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    };
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
      if (res.ok) {
        const data = await res.json();
        // Update HP locally
        if (data.newHp != null) {
          setUser((u) => u ? { ...u, hp: data.newHp } : u);
        }
      } else {
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

  async function handleMvpVote(playerName: string) {
    if (!user) return;
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mvp_vote", voterPhone: user.phone, playerName }),
    });
    const data = await res.json();
    if (data.alreadyVoted) {
      notify(`Ви вже голосували цього місяця: ${data.playerName}`);
    } else {
      setUser((u) => u ? { ...u, mvpVote: playerName } : u);
      notify(`✅ Ваш голос за ${playerName} прийнято!`);
    }
    setShowMvp(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch("/api/chat/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, filename: file.name }),
        });
        if (res.ok) {
          const { url } = await res.json();
          // send as image message
          await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "message",
              phone: user.phone,
              name: `${user.firstName} ${user.lastName}`,
              text: `[IMAGE:${url}]`,
              replyToId: replyTo?.id ?? null,
            }),
          });
          setReplyTo(null);
        } else {
          notify("Помилка завантаження фото");
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      notify("Помилка завантаження фото");
      setUploading(false);
    }
    // reset file input
    if (fileRef.current) fileRef.current.value = "";
  }

  async function sendSpecial(text: string) {
    if (!user) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "message",
        phone: user.phone,
        name: `${user.firstName} ${user.lastName}`,
        text,
        replyToId: replyTo?.id ?? null,
      }),
    });
    setReplyTo(null);
    setOpenPanel(null);
  }

  function handleLogout() {
    esRef.current?.close();
    setUser(null);
    setMessages([]);
    localStorage.removeItem(LS_KEY);
    setStep("form");
  }

  function reactionSummary(reactions: Reaction[]) {
    const map: Record<string, number> = {};
    for (const r of reactions) map[r.emoji] = (map[r.emoji] ?? 0) + 1;
    return Object.entries(map);
  }

  function myReactions(reactions: Reaction[]) {
    return new Set(reactions.filter((r) => r.phone === user?.phone).map((r) => r.emoji));
  }

  // ── Render: checking ──────────────────────────────────────────────────
  if (step === "checking") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
        <span style={{ color: "white", opacity: 0.5, fontSize: "14px" }}>Завантаження...</span>
      </div>
    );
  }

  // ── Render: form ──────────────────────────────────────────────────────
  if (step === "form") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" }}>
        <div style={{ width: "100%", maxWidth: "440px", background: "#1e2a4a", borderRadius: "20px", overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
          <div style={{ padding: "32px 24px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "48px" }}>💬</div>
            <h1 style={{ color: "white", fontWeight: 800, fontSize: "24px", margin: "8px 0 4px", fontFamily: "Exo 2, sans-serif" }}>Балачка</h1>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Чат фанів Basket Lviv</p>
          </div>
          {notification && (
            <div style={{ margin: "0 24px 16px", padding: "10px 14px", background: "rgba(239,68,68,0.15)", borderRadius: "8px", color: "#fca5a5", fontSize: "13px" }}>
              {notification}
            </div>
          )}
          <form onSubmit={handleRegister} style={{ padding: "8px 24px 32px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { name: "phone", label: "Телефон", type: "tel", placeholder: "+380 XX XXX XX XX" },
              { name: "firstName", label: "Ім'я", type: "text", placeholder: "Іван" },
              { name: "lastName", label: "Прізвище", type: "text", placeholder: "Петренко" },
            ].map((f) => (
              <div key={f.name}>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "5px" }}>{f.label}</label>
                <input name={f.name} type={f.type} required placeholder={f.placeholder}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: "9px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "white", fontSize: "14px", fontFamily: "Exo 2, sans-serif", boxSizing: "border-box", outline: "none" }}
                />
              </div>
            ))}
            <button type="submit" style={{ padding: "12px", background: "#f46f10", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 800, fontSize: "15px", fontFamily: "Exo 2, sans-serif", marginTop: "4px" }}>
              Увійти до чату
            </button>
            <p style={{ textAlign: "center", fontSize: "12px", color: "#475569", margin: 0 }}>
              Якщо реєструвались — введіть той самий номер телефону
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ── Render: chat ──────────────────────────────────────────────────────
  const badge = getBadge(user!.hp);
  const userName = `${user!.firstName} ${user!.lastName}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#0f172a", color: "white", fontFamily: "Exo 2, sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ background: "#1e2a4a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "10px 16px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>💬</span>
          <span style={{ fontWeight: 800, fontSize: "18px" }}>Балачка</span>
          <button
            onClick={() => setShowMvp(true)}
            style={{ background: "#f46f10", color: "white", border: "none", borderRadius: "8px", padding: "4px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif" }}
          >
            🏆 MVP
          </button>
          {user!.isMod && (
            <span style={{ background: "#f46f10", color: "white", fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px" }}>МОД</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>
              {badge && <span style={{ marginRight: "4px" }}>{badge}</span>}
              {userName}
              {user!.isLeaguePlayer && <span style={{ marginLeft: "4px" }} title="Гравець ліги">⚡</span>}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              ❤️ {user!.hp} HP{user!.warns > 0 && ` · ⚠️${user!.warns}`}
            </div>
          </div>
          {user!.isMod && (
            <button onClick={() => setShowPinForm(!showPinForm)} title="Закріпити повідомлення"
              style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "#94a3b8", cursor: "pointer", padding: "5px 8px", borderRadius: "6px", fontSize: "14px" }}>
              📌
            </button>
          )}
          <button onClick={handleLogout}
            style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "#94a3b8", cursor: "pointer", padding: "5px 10px", borderRadius: "6px", fontSize: "12px" }}>
            Вийти
          </button>
        </div>
      </header>

      {/* ── Pin form ─────────────────────────────────────────────────────── */}
      {showPinForm && (
        <div style={{ background: "#162035", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "8px 16px", flexShrink: 0, display: "flex", gap: "8px" }}>
          <input value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Текст закріпленого повідомлення (порожньо = зняти)"
            style={{ flex: 1, padding: "7px 12px", borderRadius: "7px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "white", fontSize: "13px", fontFamily: "Exo 2, sans-serif", outline: "none" }}
          />
          <button onClick={handlePin} style={{ padding: "7px 14px", background: "#f46f10", color: "white", border: "none", borderRadius: "7px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif", fontSize: "13px" }}>
            Зберегти
          </button>
        </div>
      )}

      {/* ── Pinned message ────────────────────────────────────────────────── */}
      {pinnedMessage && (
        <div style={{ background: "rgba(244,111,16,0.08)", borderBottom: "1px solid rgba(244,111,16,0.18)", padding: "8px 16px", flexShrink: 0, display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <span>📌</span>
          <span style={{ color: "#fdba74", fontSize: "13px" }}>{pinnedMessage}</span>
        </div>
      )}

      {/* ── Notification ──────────────────────────────────────────────────── */}
      {notification && (
        <div style={{ margin: "8px 16px 0", padding: "9px 14px", background: "rgba(239,68,68,0.14)", borderRadius: "8px", color: "#fca5a5", fontSize: "13px", flexShrink: 0 }}>
          {notification}
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "4px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#475569", fontSize: "13px", marginTop: "48px" }}>
            Поки немає повідомлень. Будьте першим! 🏀
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.phone === user!.phone;
          const summary = reactionSummary(msg.reactions);
          const mine = myReactions(msg.reactions);
          const canDelete = isMe || user!.isMod;

          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }} className="group">
              {!isMe && (
                <div style={{ fontSize: "11px", color: msg.isMod ? "#f46f10" : "#64748b", marginBottom: "2px", paddingLeft: "4px" }}>
                  {msg.name}{msg.isMod && " ✦"}
                </div>
              )}
              {msg.replyTo && (
                <div style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", marginBottom: "2px", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: "rgba(255,255,255,0.04)", color: "#94a3b8", borderLeft: "2px solid #f46f10" }}>
                  <strong>{msg.replyTo.name}:</strong> {msg.replyTo.text}
                </div>
              )}

              <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "4px", flexDirection: isMe ? "row-reverse" : "row" }}>
                {/* Bubble */}
                <div
                  style={{ padding: msg.text.startsWith("[STICKER:") || msg.text.startsWith("[IMAGE:") || msg.text.startsWith("[GIF:") ? "4px" : "9px 13px", borderRadius: "16px", fontSize: "14px", maxWidth: "280px", wordBreak: "break-word", lineHeight: 1.4, background: isMe ? "#f46f10" : "rgba(255,255,255,0.08)", cursor: "pointer" }}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY }); }}
                >
                  {msg.text.startsWith("[STICKER:") ? (
                    <img src={msg.text.slice(9, -1)} alt="sticker" style={{ width: 80, height: 80, objectFit: "contain", display: "block", borderRadius: "8px" }} />
                  ) : msg.text.startsWith("[IMAGE:") ? (
                    <img src={msg.text.slice(7, -1)} alt="photo" style={{ maxWidth: 220, maxHeight: 220, borderRadius: "10px", display: "block", objectFit: "cover" }} />
                  ) : msg.text.startsWith("[GIF:") ? (
                    <img src={msg.text.slice(5, -1)} alt="gif" style={{ maxWidth: 220, maxHeight: 160, borderRadius: "10px", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : msg.text}
                </div>
                {/* Quick actions (hover) */}
                <div style={{ display: "flex", gap: "2px", opacity: 0 }} className="msg-actions">
                  <QuickBtn onClick={(e) => { e.stopPropagation(); setEmojiTarget(emojiTarget === msg.id ? null : msg.id); }}>😊</QuickBtn>
                  <QuickBtn onClick={(e) => { e.stopPropagation(); setReplyTo(msg); inputRef.current?.focus(); }}>↩️</QuickBtn>
                  {canDelete && <QuickBtn onClick={(e) => { e.stopPropagation(); handleDeleteMsg(msg.id); }}>🗑️</QuickBtn>}
                </div>
              </div>

              {/* Emoji picker */}
              {emojiTarget === msg.id && (
                <div style={{ display: "flex", gap: "4px", marginTop: "4px", padding: "6px 10px", background: "#1e2a4a", borderRadius: "99px", border: "1px solid rgba(255,255,255,0.09)" }} onClick={(e) => e.stopPropagation()}>
                  {EMOJIS.map((em) => (
                    <button key={em} onClick={() => handleReact(msg.id, em)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", opacity: mine.has(em) ? 1 : 0.55, padding: "0 2px" }}>
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {/* Reactions */}
              {summary.length > 0 && (
                <div style={{ display: "flex", gap: "4px", marginTop: "3px", flexWrap: "wrap" }}>
                  {summary.map(([em, count]) => (
                    <button key={em} onClick={() => handleReact(msg.id, em)}
                      style={{ padding: "2px 7px", borderRadius: "99px", fontSize: "12px", cursor: "pointer", background: mine.has(em) ? "rgba(244,111,16,0.22)" : "rgba(255,255,255,0.05)", border: `1px solid ${mine.has(em) ? "rgba(244,111,16,0.45)" : "rgba(255,255,255,0.09)"}`, color: "white" }}>
                      {em} {count}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ fontSize: "10px", color: "#334155", marginTop: "2px", paddingLeft: "2px" }}>
                {new Date(msg.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Context menu ─────────────────────────────────────────────────── */}
      {contextMenu && (() => {
        const msg = messages.find((m) => m.id === contextMenu.msgId);
        if (!msg) return null;
        const isMe = msg.phone === user!.phone;
        const canDelete = isMe || user!.isMod;
        return (
          <div style={{ position: "fixed", zIndex: 60, top: Math.min(contextMenu.y, window.innerHeight - 220), left: Math.min(contextMenu.x, window.innerWidth - 170), background: "#1e2a4a", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "12px", padding: "4px 0", minWidth: "150px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }} onClick={(e) => e.stopPropagation()}>
            <CtxItem onClick={() => { setReplyTo(msg); setContextMenu(null); inputRef.current?.focus(); }}>↩️ Відповісти</CtxItem>
            {canDelete && <CtxItem onClick={() => handleDeleteMsg(msg.id)} danger>🗑️ Видалити</CtxItem>}
            {user!.isMod && !isMe && (
              <>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                <CtxItem onClick={() => handleMod("warn", msg.phone, { reason: "порушення" })}>⚠️ Попередити</CtxItem>
                <CtxItem onClick={() => handleMod("mute", msg.phone, { minutes: 10 })}>🔇 Мют 10хв</CtxItem>
                <CtxItem onClick={() => handleMod("ban", msg.phone, { reason: "бан", hours: 24 })} danger>🚫 Бан 24г</CtxItem>
              </>
            )}
          </div>
        );
      })()}

      {/* ── Reply preview ─────────────────────────────────────────────────── */}
      {replyTo && (
        <div style={{ background: "rgba(244,111,16,0.07)", borderTop: "1px solid rgba(244,111,16,0.18)", padding: "7px 16px", flexShrink: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ flex: 1, fontSize: "12px", color: "#fdba74", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <strong>↩ {replyTo.name}:</strong> {replyTo.text}
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── MVP Modal ─────────────────────────────────────────────────────── */}
      {showMvp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowMvp(false); }}>
          <div style={{ background: "#1e2a4a", borderRadius: "20px", width: "100%", maxWidth: "380px", padding: "24px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>🏆 Голосування MVP</h2>
              <button onClick={() => setShowMvp(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            {user!.mvpVote ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: "40px", marginBottom: "8px" }}>✅</div>
                <p style={{ color: "#94a3b8", margin: 0 }}>Ви вже голосували цього місяця</p>
                <p style={{ fontWeight: 700, color: "#f46f10", margin: "8px 0 0" }}>Ваш вибір: {user!.mvpVote}</p>
              </div>
            ) : (
              <>
                <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 14px" }}>
                  Виберіть найкращого гравця місяця:
                </p>
                <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  {players.length === 0 ? (
                    <div style={{ color: "#64748b", textAlign: "center", padding: "20px 0" }}>Список гравців не завантажено</div>
                  ) : players.map((p) => (
                    <button key={p.id} onClick={() => handleMvpVote(`${p.firstName} ${p.lastName}`)}
                      style={{ padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "9px", color: "white", cursor: "pointer", textAlign: "left", fontSize: "14px", fontFamily: "Exo 2, sans-serif", transition: "background 0.15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,111,16,0.15)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
                    >
                      🏀 {p.firstName} {p.lastName}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Input bar ─────────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#1e2a4a", padding: "8px 12px", flexShrink: 0, position: "relative" }} ref={panelRef}>
        {/* Panel toggle buttons */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }} onClick={(e) => e.stopPropagation()}>
          {(["emoji","sticker","gif"] as const).map((panel, i) => {
            const labels = ["😊 Emoji","🎭 Стікери","🦜 GIF"];
            return (
              <button key={panel} onClick={() => setOpenPanel(openPanel === panel ? null : panel)}
                style={{ padding: "4px 10px", borderRadius: "8px", border: "1px solid", borderColor: openPanel === panel ? "#f46f10" : "rgba(255,255,255,0.12)", background: openPanel === panel ? "rgba(244,111,16,0.15)" : "rgba(255,255,255,0.05)", color: openPanel === panel ? "#f46f10" : "#94a3b8", cursor: "pointer", fontSize: "12px", fontFamily: "Exo 2, sans-serif" }}>
                {labels[i]}
              </button>
            );
          })}
          <button onClick={() => fileRef.current?.click()}
            style={{ padding: "4px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: uploading ? "wait" : "pointer", fontSize: "12px", fontFamily: "Exo 2, sans-serif" }}>
            {uploading ? "⏳" : "🖼 Фото"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
        </div>

        {/* Emoji panel */}
        {openPanel === "emoji" && (
          <div style={{ position: "absolute", bottom: "100%", left: "12px", right: "12px", background: "#1e2a4a", border: "1px solid #f46f10", borderRadius: "12px", padding: "12px", maxHeight: "280px", overflowY: "auto", zIndex: 100 }} onClick={(e) => e.stopPropagation()}>
            {Object.entries(EMOJI_GROUPS).map(([group, emojis]) => (
              <div key={group} style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>{group}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: "4px" }}>
                  {emojis.map((em) => (
                    <button key={em} onClick={() => { setInput((v) => v + em); setOpenPanel(null); inputRef.current?.focus(); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", padding: "3px", borderRadius: "6px", lineHeight: 1 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sticker panel */}
        {openPanel === "sticker" && (
          <div style={{ position: "absolute", bottom: "100%", left: "12px", right: "12px", background: "#1e2a4a", border: "1px solid #f46f10", borderRadius: "12px", padding: "12px", maxHeight: "280px", overflowY: "auto", zIndex: 100 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
              {MEME_STICKERS.map((url) => (
                <button key={url} onClick={() => sendSpecial(`[STICKER:${url}]`)}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={url} alt="sticker" style={{ width: 64, height: 64, objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GIF panel */}
        {openPanel === "gif" && (
          <div style={{ position: "absolute", bottom: "100%", left: "12px", right: "12px", background: "#1e2a4a", border: "1px solid #f46f10", borderRadius: "12px", padding: "12px", maxHeight: "280px", overflowY: "auto", zIndex: 100 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "8px" }}>
              {COOL_GIFS.map((url) => (
                <button key={url} onClick={() => sendSpecial(`[GIF:${url}]`)}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px", cursor: "pointer", padding: "0", overflow: "hidden" }}>
                  <img src={url} alt="gif" style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text input + send */}
        <form onSubmit={handleSend} style={{ display: "flex", gap: "8px", alignItems: "center", position: "relative" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напишіть повідомлення..."
            maxLength={500}
            style={{ flex: 1, padding: "10px 14px", borderRadius: "11px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: "14px", fontFamily: "Exo 2, sans-serif", outline: "none" }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            style={{ padding: "10px 16px", background: "#f46f10", color: "white", border: "none", borderRadius: "11px", cursor: "pointer", fontWeight: 800, fontSize: "18px", flexShrink: 0, opacity: (sending || !input.trim()) ? 0.4 : 1 }}
          >
            →
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
function QuickBtn({ children, onClick }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "2px", opacity: 0.7, lineHeight: 1 }}>
      {children}
    </button>
  );
}

function CtxItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ width: "100%", textAlign: "left", padding: "9px 14px", fontSize: "13px", background: "none", border: "none", cursor: "pointer", color: danger ? "#f87171" : "white", fontFamily: "Exo 2, sans-serif" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
      {children}
    </button>
  );
}
