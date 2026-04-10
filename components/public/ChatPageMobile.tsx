"use client";

import { useState, useEffect, useRef, useCallback, useOptimistic, useMemo } from "react";
import { useRouter } from "next/navigation";
import { loadPorokhovaParticipants, registerPorokhovaParticipant } from "@/actions/porokhova";
import { createChatPoll, finishChatPoll } from "@/actions/chat-poll";
import ChatActivePoll, { ChatPollData } from "./ChatActivePoll";

const LS_KEY = "ldbl_chat_user";

// MOBILE ONLY — NEW 2026 APPROACH: Local state for chat messages to ensure real-time updates
// Previous approach (prop-only) didn't trigger re-renders on SSE updates

// ── Stickers (pavanpatil45/Classic-Meme-Stickers) ─────────────────────────
const STICKER_BASE = "https://raw.githubusercontent.com/pavanpatil45/Classic-Meme-Stickers/main/app/src/main/assets";
const MEME_STICKERS = Array.from({ length: 26 }, (_, i) => `${STICKER_BASE}/1/${i + 1}.webp`)
  .concat(Array.from({ length: 23 }, (_, i) => `${STICKER_BASE}/2/${i + 1}.webp`));

const ANIMATED_EMOJIS = [
  { label: "😂", url: "https://media.giphy.com/media/lQCV7UJzZGF9C/giphy.gif" },
  { label: "🤔", url: "https://media.giphy.com/media/3o85xIO33l7RlmLR4I/giphy.gif" },
  { label: "🎉", url: "https://media.giphy.com/media/g9GznKJmYvG46/giphy.gif" },
  { label: "👏", url: "https://media.giphy.com/media/l0HlTy9x8FZo0XO1i/giphy.gif" },
  { label: "🔥", url: "https://media.giphy.com/media/4xpB3eE00FfBUMwfqV/giphy.gif" },
  { label: "💯", url: "https://media.giphy.com/media/l4KhUQFRlqXpJAw9O/giphy.gif" },
];

const COOL_GIFS = [
  "https://media.giphy.com/media/l0HlUCQkL9clfhEpXm/giphy.gif",
  "https://media.giphy.com/media/lJNoBERP8leabuDxJ3/giphy.gif",
  "https://media.giphy.com/media/l0IycjSoWB5HyuVJm/giphy.gif",
];

const CLASSIC_MEMES = [
  { label: "🧌 Troll", url: "https://user-images.githubusercontent.com/1234567/66297786/e5cfe500-e9c1-11e9-880a-87e9c0f7c5f2.png" },
  { label: "😒 Poker", url: "https://user-images.githubusercontent.com/1234567/66297787/e5e9e500-e9c1-11e9-880a-87e9c0f7c5f2.png" },
];

const CAT_GIFS = [
  "https://media.giphy.com/media/ICOgUqgHScsFUYYLHS/giphy.gif",
  "https://media.giphy.com/media/jIQHnr3DMqMOQPIAvu/giphy.gif",
  "https://media.giphy.com/media/3o7TKz0S2C41IZ9fhG/giphy.gif",
];

// ── Shop ticker item ──────────────────────────────────────────
interface ShopItem {
  id: number;
  name: string;
  description: string;
  emoji: string;
  price: number;
  imageUrl: string | null;
}

// ── Chat message (MOBILE ONLY — FIX: reactions is array, not Record) ────
interface ChatMessage {
  id: number;
  phone: string;
  name: string;
  text: string;
  isMod: boolean;
  reactions: { id: number; phone: string; emoji: string }[];
  replyTo: { id: number; name: string; text: string } | null;  // MOBILE ONLY — FIX: Match API type, not recursive
  isLeaguePlayer?: boolean;
  createdAt?: string;
}

// ── User ──────────────────────────────────────────────────────
interface User {
  phone: string;
  firstName: string;
  lastName: string;
  hp: number;
  isMod: boolean;
  isLeaguePlayer: boolean;
  warns: number;
  mvpVote?: string | null;
}

interface Member {
  phone: string;
  firstName: string;
  lastName: string;
  hp: number;
  role: string;
  isMod: boolean;
  isOnline: boolean;
}

interface ChatPageMobileProps {
  user: User;
  messages: ChatMessage[];
  members: Member[];
  shopItems: ShopItem[];
  shopTicker: number;
  onlineUsers: Set<string>;
  onSendMessage: (text: string) => Promise<void>;
}

export default function ChatPageMobile({ user, messages: initialMessages, members, shopItems, shopTicker, onlineUsers, onSendMessage }: ChatPageMobileProps) {
  const router = useRouter();
  // MOBILE ONLY — NEW 2026 APPROACH: Local chat messages state for real-time sync
  // This allows SSE updates from parent to trigger re-renders immediately
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(initialMessages);
  // Sync with parent prop changes when first loaded
  useEffect(() => {
    setLocalMessages(initialMessages);
  }, [initialMessages]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showMembersSheet, setShowMembersSheet] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showMvp, setShowMvp] = useState(false);
  const [showSpin, setShowSpin] = useState(false);
  const [showHpRules, setShowHpRules] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showPorokhova, setShowPorokhova] = useState(false);
  const [showStickerPanel, setShowStickerPanel] = useState(false); // MOBILE ONLY — NEW
  const [porokhovaSelected, setPorokhovaSelected] = useState<"going" | "later" | "needed" | null>(null);
  const [porokhovaParticipants, setPorokhovaParticipants] = useState<{ phone: string; firstName: string; lastName: string; status: "going" | "later" | "needed" }[]>([]);
  // MOBILE ONLY — optimistic UI updates for Porohova participants
  const [optimisticParticipants, addOptimisticParticipant] = useOptimistic(
    porokhovaParticipants,
    (state, newParticipant: { phone: string; firstName: string; lastName: string; status: "going" | "later" | "needed" }) => {
      const filtered = state.filter((p) => p.phone !== newParticipant.phone);
      return [newParticipant, ...filtered];
    }
  );
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ phone: string; firstName: string; lastName: string; hp: number; weeklyHp?: number | null }[]>([]);
  const [leaderboardMode, setLeaderboardMode] = useState<"alltime" | "weekly">("weekly");
  const [leaderboardWeekStart, setLeaderboardWeekStart] = useState<string>("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [activePoll, setActivePoll] = useState<ChatPollData | null>(null);
  const [spinDone, setSpinDone] = useState(false);
  const [spinState, setSpinState] = useState<"idle" | "spinning" | "result">("idle");
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [spinAngle, setSpinAngle] = useState(0);
  const [players, setPlayers] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [mvpResults, setMvpResults] = useState<{ playerName: string; votes: number; photoUrl?: string | null }[]>([]);
  const [userMvpVote, setUserMvpVote] = useState<string | null>(user.mvpVote ?? null);
  const [userRefLink, setUserRefLink] = useState<string>(""); // MOBILE ONLY — NEW
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Функція для відкриття таблиці лідерів
  const openLeaderboard = (mode: "alltime" | "weekly" = "weekly") => {
    setShowLeaderboard(true);
    setLeaderboardMode(mode);
    setLeaderboard([]);
    fetch(`/api/chat/leaderboard?mode=${mode}`)
      .then((r) => r.json())
      .then((d) => {
        setLeaderboard(d.leaderboard ?? []);
        setLeaderboardWeekStart(d.weekStart ?? "");
      })
      .catch(() => {});
  };

  // MOBILE ONLY — NEW 2026 APPROACH: Optimistic message update for instant UI feedback
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    localMessages,
    (state, newMsg: ChatMessage) => [...state, newMsg]
  );

  // MOBILE ONLY — FIX: Call /api/chat directly with action: "message"
  const sendMessage = async () => {
    if (!input.trim()) return;
    setSending(true);
    const messageText = input.trim();

    // MOBILE ONLY — optimistic update: show message immediately before server confirmation
    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      phone: user.phone,
      name: `${user.firstName} ${user.lastName}`,
      text: messageText,
      isMod: user.isMod,
      reactions: [],
      replyTo: null,
      isLeaguePlayer: user.isLeaguePlayer,
    };
    addOptimisticMessage(optimisticMsg);
    setInput("");

    try {
      // MOBILE ONLY — FIX: Send directly to /api/chat with action: "message"
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", phone: user.phone, name: `${user.firstName} ${user.lastName}`, text: messageText, roomId: "general" }),  // MOBILE ONLY — FIX: Add roomId
      });
      if (!res.ok) {
        console.error("[Chat] Send failed:", res.statusText);
      }
      // Message will appear via SSE, optimistic update just makes it instant
    } catch (err) {
      console.error("[Chat] Send failed:", err);
      // Rollback happens automatically via useOptimistic
    } finally {
      setSending(false);
    }
  };

  // MOBILE ONLY — FIX: handleFileSelect sends FormData correctly, format is [IMAGE:...]
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.url) {
        // MOBILE ONLY — Format: [IMAGE:url] for photos
        console.log("[Upload] Image uploaded:", data.url);  // MOBILE ONLY — FIX: Debug log
        setInput(`[IMAGE:${data.url}]`);
        setShowUploadMenu(false);
      } else {
        console.error("[Upload] No URL returned:", data);  // MOBILE ONLY — FIX: Debug log
      }
    } catch (err) {
      console.error("[Upload] Failed:", err);
      // Silent fail, user can try again
    }
  };

  // MOBILE ONLY — NEW: Sticker selection handler
  const handleStickerSelect = (stickerUrl: string) => {
    setInput(`[STICKER:${stickerUrl}]`);
    setShowStickerPanel(false);
  };

  // MOBILE ONLY — NEW: Poll creation handler — send as message with [POLL:...] format
  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.some((opt) => !opt.trim())) {
      alert("Заповніть питання і всі варіанти");
      return;
    }
    setSending(true);

    try {
      // MOBILE FIX — Call createChatPoll (Server Action) instead of sending raw message
      const result = await createChatPoll(
        pollQuestion.trim(),
        pollOptions.filter((opt) => opt.trim()),
        user.phone,
        `${user.firstName} ${user.lastName}`
      );
      if (!result) {
        console.error("[Poll] createChatPoll returned null");
        alert("❌ Помилка створення опитування");
        return;
      }
      // MOBILE FIX — Set active poll immediately (same as desktop)
      setActivePoll(result);
      console.log("[Poll] Created successfully via createChatPoll");
    } catch (err) {
      console.error("[Poll] Creation failed:", err);
      alert("Помилка створення опитування");
    } finally {
      setShowPoll(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setSending(false);
    }
  };

  // MOBILE ONLY — Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [optimisticMessages]);

  // MOBILE ONLY — Load active poll from API
  useEffect(() => {
    const loadPoll = async () => {
      try {
        const res = await fetch("/api/chat/active-poll");
        const data = await res.json();
        if (data.poll) {
          setActivePoll(data.poll);
        }
      } catch (err) {
        console.error("[ChatPageMobile] Load poll failed:", err);
      }
    };

    // Load immediately
    loadPoll();

    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(loadPoll, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load players for MVP
  useEffect(() => {
    fetch("/api/players?limit=100")
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []))
      .catch(() => {});
  }, []);

  // Load MVP results
  useEffect(() => {
    fetch("/api/chat/mvp-results")
      .then((r) => r.json())
      .then((d) => setMvpResults(d.results ?? []))
      .catch(() => {});
  }, [showMvp]);


  // MOBILE ONLY — NEW 2026 APPROACH: Load participants and restore user's previous choice
  useEffect(() => {
    if (showPorokhova) {
      loadPorokhovaParticipants()
        .then((participants) => {
          setPorokhovaParticipants(participants);
          // Auto-select user's current choice if already registered
          const userEntry = participants.find((p) => p.phone === user.phone);
          if (userEntry) {
            setPorokhovaSelected(userEntry.status);
          } else {
            setPorokhovaSelected(null);
          }
        })
        .catch((err) => {
          console.error("[Porokhova] Failed to load participants:", err);
          setPorokhovaParticipants([]);
        });
    }
  }, [showPorokhova, user.phone]);

  // MOBILE ONLY — NEW: Load referral link when members sheet opens
  useEffect(() => {
    if (showMembersSheet) {
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", phone: user.phone, firstName: user.firstName, lastName: user.lastName }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.refLink) setUserRefLink(d.refLink);
        })
        .catch(() => {});
    }
  }, [showMembersSheet, user.phone, user.firstName, user.lastName]);

  // MOBILE ONLY — NEW 2026 APPROACH: SSE listener for real-time updates
  useEffect(() => {
    const es = new EventSource("/api/chat");

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === "connected") {
          // Connected to SSE stream
        } else if (data.type === "message" && data.message) {
          // Add new message
          setLocalMessages((prev) => [...prev, data.message]);
        } else if (data.type === "delete_message" && data.messageId) {
          // Delete message
          setLocalMessages((prev) => prev.filter((m) => m.id !== data.messageId));
        } else if (data.type === "reactions" && data.messageId && data.reactions) {
          // Update reactions
          setLocalMessages((prev) =>
            prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
          );
        } else if (data.type === "poll_created") {
          // MOBILE ONLY — NEW: Poll created event - load active poll
          fetch("/api/chat/active-poll")
            .then((r) => r.json())
            .then((d) => d.poll && setActivePoll(d.poll))
            .catch(() => {});
        } else if (data.type === "poll_vote") {
          // MOBILE ONLY — NEW: Poll vote event - refresh poll stats
          fetch("/api/chat/active-poll")
            .then((r) => r.json())
            .then((d) => d.poll && setActivePoll(d.poll))
            .catch(() => {});
        } else if (data.type === "poll_end") {
          // MOBILE ONLY — NEW: Poll ended - hide poll block
          setActivePoll(null);
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, []);

  // MOBILE ONLY — NEW 2026 APPROACH: Porokhova selection with optimistic + server persistence
  const handlePorokhovaSelection = async (status: "going" | "later" | "needed") => {
    setPorokhovaSelected(status);

    // MOBILE ONLY — optimistic UI: immediately update with current user's choice
    const currentUser = {
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      status,
    };
    addOptimisticParticipant(currentUser);

    // Server Action — save to database (with automatic revalidatePath)
    try {
      const updated = await registerPorokhovaParticipant(
        user.phone,
        user.firstName,
        user.lastName,
        status
      );
      // Update local state with server response (guarantees persistence)
      setPorokhovaParticipants(updated);
    } catch (err) {
      console.error("[Porokhova] Registration failed:", err);
      // Rollback: reload from server if error
      try {
        const reloaded = await loadPorokhovaParticipants();
        setPorokhovaParticipants(reloaded);
        // Restore user's choice
        const userEntry = reloaded.find((p) => p.phone === user.phone);
        if (userEntry) {
          setPorokhovaSelected(userEntry.status);
        } else {
          setPorokhovaSelected(null);
        }
      } catch {}
    }
  };

  // Handle MVP vote
  const handleMvpVote = async (playerName: string) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mvp_vote", voterPhone: user.phone, playerName }),
    });
    const data = await res.json();
    if (data.alreadyVoted) {
      alert(`Ви вже голосували цього місяця: ${data.playerName}`);
    } else {
      setUserMvpVote(playerName);
      alert(`✅ Ваш голос за ${playerName} прийнято!`);
    }
    setShowMvp(false);
  };

  // MOBILE ONLY — NEW: Copy referral link
  const copyRefLink = () => {
    if (userRefLink) {
      navigator.clipboard.writeText(userRefLink);
      alert("Посилання скопійовано!");
    }
  };

  const currentShopItem = shopItems[shopTicker] || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#0f172a", color: "white", fontFamily: "Exo 2, sans-serif" }}>
      {/* ── HEADER: Shop ticker + icon buttons ──────────────────────── */}
      <header style={{ background: "#1e2a4a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "8px 12px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Top row: Back button + Upload button + empty space */}
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
          {/* Back button (left) - MOBILE ONLY */}
          <button
            onClick={() => router.push("/")}
            style={{ width: 44, height: 44, borderRadius: "8px", background: "rgba(244,111,16,0.15)", border: "1px solid rgba(244,111,16,0.3)", color: "white", fontSize: "18px", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", transition: "transform 0.2s, background 0.2s" }}
            title="На головну"
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,111,16,0.25)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,111,16,0.15)"; }}
          >
            ←
          </button>

          {/* Upload button */}
          <button
            onClick={() => setShowUploadMenu(!showUploadMenu)}
            style={{ width: 44, height: 44, borderRadius: "8px", background: "rgba(255,255,255,0.1)", border: "none", color: "white", fontSize: "18px", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
            title="Завантажити файл"
          >
            📎
          </button>

          {/* Upload menu */}
          {showUploadMenu && (
            <div style={{ position: "absolute", top: "50px", left: "12px", background: "#162035", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", zIndex: 10, overflow: "hidden" }}>
              <button
                onClick={() => {
                  fileRef.current?.click();
                  setShowUploadMenu(false);
                }}
                style={{ width: "100%", padding: "10px 16px", background: "none", border: "none", color: "white", fontSize: "13px", cursor: "pointer", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                📷 Фото
              </button>
              <button
                onClick={() => setShowStickerPanel(!showStickerPanel)}
                style={{ width: "100%", padding: "10px 16px", background: "none", border: "none", color: "white", fontSize: "13px", cursor: "pointer", textAlign: "left" }}
              >
                🎭 Стікери
              </button>
            </div>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />
        </div>

        {/* Second row: Shop block (left) + Button grid (right) */}
        <div style={{ display: "flex", gap: "12px", alignItems: "stretch", minHeight: "180px" }}>
          {/* Shop ticker (left half) */}
          {currentShopItem && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", background: "rgba(244,111,16,0.15)", borderRadius: "12px", padding: "12px", flex: "1 0 50%", aspectRatio: "1", minWidth: "0" }}>
              {currentShopItem.imageUrl ? (
                <img src={currentShopItem.imageUrl} alt={currentShopItem.name} style={{ width: 120, height: 120, borderRadius: "8px", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "80px" }}>{currentShopItem.emoji}</span>
              )}
              <div style={{ fontSize: "11px", color: "#fca5a5", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                <div style={{ fontWeight: 700, color: "#fbbf24" }}>{currentShopItem.name}</div>
                <div style={{ color: "#f46f10", marginTop: "2px" }}>{currentShopItem.price} HP</div>
              </div>
            </div>
          )}

          {/* Icon buttons grid (right half) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", flex: "1 0 50%", alignContent: "start", alignItems: "start" }}>
            {/* Row 1: MVP, Спін, Топ HP */}
            <button
              onClick={() => setShowMvp(true)}
              title="MVP місяця"
              style={{ width: "46px", height: "46px", borderRadius: "50%", background: "#f97316", border: "none", color: "white", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s" }}
            >
              🏅
            </button>

            <button
              onClick={() => { setShowSpin(true); setSpinState(spinDone ? "result" : "idle"); }}
              title="Спін"
              style={{ width: "46px", height: "46px", borderRadius: "50%", background: spinDone ? "#475569" : "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", color: "white", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s", opacity: spinDone ? 0.7 : 1 }}
            >
              🎰
            </button>

            <button
              onClick={() => openLeaderboard("weekly")}
              title="Топ HP"
              style={{ width: "46px", height: "46px", borderRadius: "50%", background: "#0f766e", border: "none", color: "white", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s" }}
            >
              🏅
            </button>

            {/* Row 2: Порохова, Правила HP, Опитування */}
            <button
              onClick={() => setShowPorokhova(true)}
              title="Порохова"
              style={{ width: "46px", height: "46px", borderRadius: "50%", background: "#16a34a", border: "none", color: "white", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s" }}
            >
              🏀
            </button>

            <button
              onClick={() => setShowHpRules(true)}
              title="Правила HP"
              style={{ width: "46px", height: "46px", borderRadius: "50%", background: "#8b5cf6", border: "none", color: "white", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s" }}
            >
              ⚡
            </button>

            <button
              onClick={() => setShowPoll(true)}
              title="Створити опитування"
              style={{ width: "46px", height: "46px", borderRadius: "50%", background: "#e5e7eb", border: "none", color: "#1f2937", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s" }}
            >
              📊
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE ONLY — PINNED Poll Block (OUTSIDE scrollable area) */}
      {activePoll && (
        <div style={{ background: "#1e2a4a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "12px 8px", flexShrink: 0 }}>
          <ChatActivePoll
            poll={activePoll}
            userPhone={user.phone}
            userName={`${user.firstName} ${user.lastName}`}
            onPollUpdated={(updated) => setActivePoll(updated)}
          />
        </div>
      )}

      {/* ── MESSAGES ──────────────────────────────────────────────────── */}
      {/* MOBILE ONLY — NEW 2026 APPROACH: Use optimisticMessages for real-time updates */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px", display: "flex", flexDirection: "column", gap: "4px" }}>

        {optimisticMessages.length === 0 && (
          <div style={{ textAlign: "center", color: "#475569", fontSize: "13px", marginTop: "48px" }}>
            Поки немає повідомлень. Будьте першим! 🏀
          </div>
        )}

        {optimisticMessages.map((msg) => {
          const isMe = msg.phone === user.phone;
          // MOBILE ONLY — FIX: Support [IMAGE:...] format
          const isImage = msg.text.startsWith("[IMAGE:") && msg.text.endsWith("]");
          const imageUrl = isImage ? msg.text.slice(7, -1) : null;
          // MOBILE ONLY — Support [STICKER:...] and [GIF:...] formats
          const isStickerOrGif = (msg.text.startsWith("[STICKER:") || msg.text.startsWith("[GIF:")) && msg.text.endsWith("]");
          const stickerUrl = isStickerOrGif ? msg.text.slice(msg.text.indexOf(":") + 1, -1) : null;
          // MOBILE ONLY — NEW: Support [POLL:...] format
          const isPoll = msg.text.startsWith("[POLL:") && msg.text.endsWith("]");

          // MOBILE ONLY — FIX: Skip rendering poll messages - they're shown in pinned block
          if (isPoll) {
            return null;
          }

          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: "6px", alignItems: "flex-end" }}>
              <div
                style={{
                  padding: isImage || isStickerOrGif ? "0" : "8px 12px",
                  borderRadius: "12px",
                  fontSize: "15px",  // MOBILE ONLY — FIX: Увеличен с 13px на 15px для лучшей читаемости
                  maxWidth: "75%",
                  wordBreak: "break-word",
                  background: isMe ? "#f46f10" : "rgba(255,255,255,0.08)",
                  color: isMe ? "white" : "#e2e8f0",
                }}
              >
                {!isMe && !isImage && !isStickerOrGif && <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "2px", fontWeight: 600 }}>{msg.name}</div>}  {/* MOBILE ONLY — FIX: fontSize 10px→12px, added fontWeight */}
                {isImage ? (
                  <img
                    src={imageUrl!}
                    alt="photo"
                    onError={(e) => {
                      console.error("[Image] Failed to load image:", imageUrl);  // MOBILE ONLY — FIX: Debug
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                    onLoad={() => {
                      console.log("[Image] Image loaded:", imageUrl);  // MOBILE ONLY — FIX: Debug
                    }}
                    style={{ maxWidth: "100%", maxHeight: "180px", borderRadius: "8px", objectFit: "cover", display: "block" }}
                  />
                ) : isStickerOrGif ? (
                  <img
                    src={stickerUrl!}
                    alt="sticker"
                    onError={(e) => {
                      console.error("[Image] Failed to load sticker:", stickerUrl);  // MOBILE ONLY — FIX: Debug
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                    onLoad={() => {
                      console.log("[Image] Sticker loaded:", stickerUrl);  // MOBILE ONLY — FIX: Debug
                    }}
                    style={{ maxWidth: "100%", maxHeight: "150px", borderRadius: "8px", objectFit: "contain", display: "block" }}
                  />
                ) : (
                  msg.text
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── INPUT AREA ────────────────────────────────────────────────── */}
      <div style={{ background: "#1e2a4a", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 12px", flexShrink: 0, display: "flex", gap: "6px", alignItems: "flex-end" }}>
        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && !sending && sendMessage()}
          placeholder="Напиши повідомлення..."
          style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "white", fontSize: "13px", fontFamily: "Exo 2, sans-serif", outline: "none" }}
        />

        {/* Send button */}
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          style={{ width: 40, height: 40, borderRadius: "8px", background: sending || !input.trim() ? "#475569" : "#f46f10", border: "none", color: "white", fontSize: "16px", cursor: sending || !input.trim() ? "not-allowed" : "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          ➤
        </button>

        {/* Members button */}
        <button
          onClick={() => setShowMembersSheet(true)}
          style={{ width: 40, height: 40, borderRadius: "8px", background: "linear-gradient(135deg, #f97316, #ec4899)", border: "none", color: "white", fontSize: "16px", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          title="Учасники онлайн"
        >
          👥
        </button>

        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
      </div>

      {/* ── STICKER PANEL (MOBILE ONLY — NEW) ────────────────────────────── */}
      {showStickerPanel && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#1e2a4a", borderTop: "1px solid rgba(255,255,255,0.08)", zIndex: 50, padding: "12px", maxHeight: "60dvh", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            {MEME_STICKERS.map((url) => (
              <button
                key={url}
                onClick={() => handleStickerSelect(url)}
                style={{ width: "100%", aspectRatio: "1", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
              >
                <img src={url} alt="sticker" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MEMBERS SHEET ────────────────────────────────────────────────── */}
      {showMembersSheet && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} onClick={() => setShowMembersSheet(false)} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#162035", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", zIndex: 50, maxHeight: "80dvh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease-out" }}>
            <div style={{ padding: "12px", textAlign: "center" }}>
              <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.3)", borderRadius: "2px", margin: "0 auto" }} />
            </div>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: 700 }}>👥 Учасники</h3>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
              {members.map((m) => (
                <div key={m.phone} style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{m.firstName} {m.lastName}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>💛 {m.hp} HP</div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#16a34a" }}>● {m.isOnline ? "Онлайн" : "Офлайн"}</div>
                </div>
              ))}
            </div>
            {/* MOBILE ONLY — NEW: Referral link at bottom of members sheet */}
            {userRefLink && (
              <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(244,111,16,0.08)" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>🔗 Ваше реферальне посилання:</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    value={userRefLink}
                    readOnly
                    style={{ flex: 1, padding: "8px 10px", borderRadius: "6px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: "11px", fontFamily: "monospace" }}
                  />
                  <button
                    onClick={copyRefLink}
                    style={{ padding: "8px 12px", borderRadius: "6px", background: "#f46f10", border: "none", color: "white", fontSize: "12px", cursor: "pointer", flexShrink: 0 }}
                  >
                    📋 Копіювати
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MVP MODAL ────────────────────────────────────────────────────── */}
      {showMvp && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} onClick={() => setShowMvp(false)} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#162035", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", zIndex: 50, maxHeight: "80dvh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease-out" }}>
            <div style={{ padding: "12px", textAlign: "center" }}>
              <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.3)", borderRadius: "2px", margin: "0 auto" }} />
            </div>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: 700 }}>🏅 MVP місяця</h3>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleMvpVote(player.firstName + " " + player.lastName)}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", background: userMvpVote === player.firstName + " " + player.lastName ? "#f46f10" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: "13px", cursor: "pointer", marginBottom: "6px", textAlign: "left", fontWeight: userMvpVote === player.firstName + " " + player.lastName ? 700 : 400 }}
                >
                  {userMvpVote === player.firstName + " " + player.lastName && "✓ "}{player.firstName} {player.lastName}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── SPIN MODAL ────────────────────────────────────────────────────── */}
      {showSpin && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} onClick={() => setShowSpin(false)} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#162035", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", zIndex: 50, maxHeight: "80dvh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease-out" }}>
            <div style={{ padding: "12px", textAlign: "center" }}>
              <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.3)", borderRadius: "2px", margin: "0 auto" }} />
            </div>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: 700 }}>🎰 Щоденний спін</h3>
            </div>
            <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
              {spinState === "idle" && (
                <>
                  <div style={{ fontSize: "14px", color: "#94a3b8" }}>Один спін в день!</div>
                  <button
                    onClick={() => {
                      setSpinState("spinning");
                      setTimeout(() => {
                        const prizes = [5, 5, 10, 10, 15, 15, 20, 25, 30, 50];
                        const prize = prizes[Math.floor(Math.random() * prizes.length)];
                        setSpinResult(prize);
                        setSpinState("result");
                        setSpinDone(true);
                      }, 2000);
                    }}
                    style={{ padding: "12px 24px", borderRadius: "8px", background: "#f46f10", border: "none", color: "white", fontSize: "16px", cursor: "pointer", fontWeight: 700 }}
                  >
                    Крутити!
                  </button>
                </>
              )}
              {spinState === "spinning" && (
                <div style={{ fontSize: "48px", animation: "spin 1s linear infinite" }}>🎰</div>
              )}
              {spinState === "result" && spinResult && (
                <>
                  <div style={{ fontSize: "48px" }}>✨</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#fbbf24" }}>+{spinResult} HP!</div>
                  <button
                    onClick={() => setShowSpin(false)}
                    style={{ padding: "10px 20px", borderRadius: "8px", background: "#475569", border: "none", color: "white", fontSize: "14px", cursor: "pointer" }}
                  >
                    ✓ Спін
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── HP RULES MODAL (MOBILE ONLY — UPDATED with full rules) ────────────────────────────────────────────– */}
      {showHpRules && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} onClick={() => setShowHpRules(false)} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#162035", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", zIndex: 50, maxHeight: "80dvh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease-out" }}>
            <div style={{ padding: "12px", textAlign: "center" }}>
              <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.3)", borderRadius: "2px", margin: "0 auto" }} />
            </div>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: 700 }}>⚡ Правила HP</h3>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#e2e8f0", fontSize: "14px" }}>Як заробити HP:</h4>
                <p style={{ margin: "6px 0" }}>🆕 <strong>Реєстрація в чаті:</strong> +25 HP</p>
                <p style={{ margin: "6px 0" }}>🔗 <strong>Реферальне посилання:</strong> +50 HP (коли друг зареєструється)</p>
                <p style={{ margin: "6px 0" }}>☀️ <strong>Перше повідомлення сьогодні:</strong> +15 HP</p>
                <p style={{ margin: "6px 0" }}>🥇 <strong>Перше повідомлення в день (всього):</strong> +25 HP</p>
                <p style={{ margin: "6px 0" }}>🎰 <strong>Щоденний спін:</strong> +5 до +50 HP</p>
              </div>
              <div style={{ marginBottom: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#e2e8f0", fontSize: "14px" }}>Штрафи:</h4>
                <p style={{ margin: "6px 0" }}>😴 <strong>Не заходив 1 день:</strong> −10 HP</p>
              </div>
              <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#e2e8f0", fontSize: "14px" }}>Рейтинги:</h4>
                <p style={{ margin: "6px 0" }}>🔥 <strong>100 HP:</strong> Легенда</p>
                <p style={{ margin: "6px 0" }}>👑 <strong>300 HP:</strong> Рекрутер</p>
                <p style={{ margin: "6px 0" }}>🏆 <strong>1000 HP:</strong> Амбасадор</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── POLL MODAL (MOBILE ONLY — REPLACED with functional form) ────────────────────────────────– */}
      {showPoll && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} onClick={() => setShowPoll(false)} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#162035", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", zIndex: 50, maxHeight: "80dvh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease-out" }}>
            <div style={{ padding: "12px", textAlign: "center" }}>
              <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.3)", borderRadius: "2px", margin: "0 auto" }} />
            </div>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: 700 }}>📊 Створити опитування</h3>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>Питання</label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Введіть питання опитування"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "white", fontSize: "13px", fontFamily: "Exo 2, sans-serif", outline: "none" }}
                />
              </div>
              {pollOptions.map((opt, idx) => (
                <div key={idx}>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>Варіант {idx + 1}</label>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[idx] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    placeholder={`Варіант ${idx + 1}`}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "white", fontSize: "13px", fontFamily: "Exo 2, sans-serif", outline: "none" }}
                  />
                </div>
              ))}
              <button
                onClick={() => setPollOptions([...pollOptions, ""])}
                style={{ padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", border: "1px dashed rgba(255,255,255,0.2)", color: "#94a3b8", fontSize: "13px", cursor: "pointer" }}
              >
                + Додати варіант
              </button>
            </div>
            <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "8px", flexShrink: 0 }}>
              <button
                onClick={() => setShowPoll(false)}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#475569", border: "none", color: "white", fontSize: "13px", cursor: "pointer" }}
              >
                Скасувати
              </button>
              <button
                onClick={handleCreatePoll}
                disabled={sending}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", background: sending ? "#475569" : "#f46f10", border: "none", color: "white", fontSize: "13px", cursor: sending ? "not-allowed" : "pointer", fontWeight: 700 }}
              >
                {sending ? "Створення..." : "Створити опитування"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── POROKHOVA MODAL ───────────────────────────────────────────────── */}
      {showPorokhova && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} onClick={() => setShowPorokhova(false)} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#162035", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", zIndex: 50, maxHeight: "80dvh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease-out" }}>
            <div style={{ padding: "12px", textAlign: "center" }}>
              <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.3)", borderRadius: "2px", margin: "0 auto" }} />
            </div>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: 700 }}>🏀 Порохова</h3>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {[
                  { status: "going" as const, label: "Їду", icon: "✅" },
                  { status: "later" as const, label: "Потім", icon: "⏳" },
                  { status: "needed" as const, label: "Потрібен", icon: "❓" },
                ].map((btn) => (
                  <button
                    key={btn.status}
                    onClick={() => handlePorokhovaSelection(btn.status)}
                    style={{ padding: "12px", borderRadius: "8px", background: porokhovaSelected === btn.status ? "#f46f10" : "rgba(255,255,255,0.04)", border: porokhovaSelected === btn.status ? "1px solid #f46f10" : "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
                  >
                    {btn.icon} {btn.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "12px", color: "#94a3b8" }}>
                {optimisticParticipants.length > 0 && (
                  <>
                    <div style={{ marginBottom: "8px", fontWeight: 600, color: "#e2e8f0" }}>Учасники ({optimisticParticipants.length}):</div>
                    {optimisticParticipants.map((p) => (
                      <div key={p.phone} style={{ padding: "6px 8px", marginBottom: "4px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
                        <span>{p.firstName} {p.lastName}</span>
                        <span>
                          {p.status === "going" ? "✅" : p.status === "later" ? "⏳" : "❓"}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── LEADERBOARD MODAL ─────────────────────────────────────────────── */}
      {showLeaderboard && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} onClick={() => setShowLeaderboard(false)} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#162035", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", zIndex: 50, maxHeight: "80dvh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease-out" }}>
            <div style={{ padding: "12px", textAlign: "center" }}>
              <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.3)", borderRadius: "2px", margin: "0 auto" }} />
            </div>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: "0", fontSize: "16px", fontWeight: 700 }}>🏅 Топ HP</h3>
              <div style={{ display: "flex", gap: "6px" }}>
                {["weekly", "alltime"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => openLeaderboard(mode as "weekly" | "alltime")}
                    style={{ padding: "6px 12px", borderRadius: "6px", background: leaderboardMode === mode ? "#f46f10" : "rgba(255,255,255,0.08)", border: "none", color: "#e2e8f0", fontSize: "11px", cursor: "pointer", fontWeight: leaderboardMode === mode ? 700 : 400 }}
                  >
                    {mode === "weekly" ? "Тиждень" : "Усього"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
              {leaderboard.map((u, idx) => (
                <div key={u.phone} style={{ padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 700, color: "#f46f10", width: "20px" }}>{idx + 1}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{u.firstName} {u.lastName}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: "#fbbf24" }}>{leaderboardMode === "weekly" ? (u.weeklyHp ?? u.hp) : u.hp} HP</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotateZ(0deg); }
          to { transform: rotateZ(360deg); }
        }
      `}</style>
    </div>
  );
}
