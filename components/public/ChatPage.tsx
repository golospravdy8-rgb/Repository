"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const LS_KEY = "ldbl_chat_user";
const EMOJIS = ["👍", "❤️", "😂", "😮", "🔥", "🏀"];


// ── Stickers (pavanpatil45/Classic-Meme-Stickers) ─────────────────────────
const STICKER_BASE = "https://raw.githubusercontent.com/pavanpatil45/Classic-Meme-Stickers/main/app/src/main/assets";
const MEME_STICKERS = Array.from({ length: 26 }, (_, i) => `${STICKER_BASE}/1/${i + 1}.webp`)
  .concat(Array.from({ length: 23 }, (_, i) => `${STICKER_BASE}/2/${i + 1}.webp`));

// ── GIF tabs ───────────────────────────────────────────────────────────────
const PARROTS = [
  "https://cultofthepartyparrot.com/parrots/hd/parrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/hd_parrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/ultrafastparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/fastparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/dealwithitparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/boredparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/sadparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/angryparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/sleepyparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/coffeeparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/footballparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/loveparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/ukraineparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/congaparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/fiestasunglassesparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/chillparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/githubparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/60fpsparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/jumpingparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/opensourceparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/laptop_parrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/spinningparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/levitationparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/moonwalkingparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/pirateparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/illuminatiparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/mustacheparrot.gif",
  "https://cultofthepartyparrot.com/parrots/hd/scienceparrot.gif",
];
// Animated Fluent Emojis — github.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis (APNG)
const R = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis";
const ANIMATED_EMOJI = [
  // Smilies
  `${R}/Smilies/Beaming%20Face%20with%20Smiling%20Eyes.png`,
  `${R}/Smilies/Face%20with%20Tears%20of%20Joy.png`,
  `${R}/Smilies/Grinning%20Face%20with%20Smiling%20Eyes.png`,
  `${R}/Smilies/Smiling%20Face%20with%20Sunglasses.png`,
  `${R}/Smilies/Star-Struck.png`,
  `${R}/Smilies/Hugging%20Face.png`,
  `${R}/Smilies/Winking%20Face.png`,
  `${R}/Smilies/Face%20with%20Rolling%20Eyes.png`,
  `${R}/Smilies/Cowboy%20Hat%20Face.png`,
  `${R}/Smilies/Clown%20Face.png`,
  `${R}/Smilies/Exploding%20Head.png`,
  `${R}/Smilies/Crying%20Face.png`,
  `${R}/Smilies/Loudly%20Crying%20Face.png`,
  `${R}/Smilies/Angry%20Face%20with%20Horns.png`,
  `${R}/Smilies/Ghost.png`,
  `${R}/Smilies/Alien.png`,
  `${R}/Smilies/Hundred%20Points.png`,
  `${R}/Smilies/Red%20Heart.png`,
  `${R}/Smilies/Heart%20on%20Fire.png`,
  `${R}/Smilies/Sparkling%20Heart.png`,
  // Hand gestures
  `${R}/Hand%20gestures/Thumbs%20Up.png`,
  `${R}/Hand%20gestures/Thumbs%20Down.png`,
  `${R}/Hand%20gestures/Clapping%20Hands.png`,
  `${R}/Hand%20gestures/Raising%20Hands.png`,
  `${R}/Hand%20gestures/Flexed%20Biceps.png`,
  `${R}/Hand%20gestures/Folded%20Hands.png`,
  `${R}/Hand%20gestures/Waving%20Hand.png`,
  `${R}/Hand%20gestures/OK%20Hand.png`,
  // Activities & Objects
  `${R}/Activities/Trophy.png`,
  `${R}/Activities/Party%20Popper.png`,
  `${R}/Activities/Basketball.png`,
  `${R}/Activities/1st%20Place%20Medal.png`,
  `${R}/Activities/Bullseye.png`,
  `${R}/Activities/Sparkles.png`,
  `${R}/Objects/Crown.png`,
  `${R}/Objects/Gem%20Stone.png`,
  `${R}/Objects/Fire%20Extinguisher.png`,
  `${R}/Travel%20and%20places/Rocket.png`,
  `${R}/Travel%20and%20places/Fire.png`,
  `${R}/Travel%20and%20places/Rainbow.png`,
];
// Helpful GIFs — user-images.githubusercontent.com (надійний CDN)
const HELPFUL_GIFS = [
  "https://user-images.githubusercontent.com/74038190/238200426-29fd6286-4e7b-4d6c-818f-c4765d5e39a9.gif",
  "https://user-images.githubusercontent.com/74038190/238200428-67f477ed-6624-42da-99f0-1a7b1a16eecb.gif",
  "https://user-images.githubusercontent.com/74038190/238200430-a78a3b79-8d21-4f82-84d3-ecde66d7c6b5.gif",
  "https://user-images.githubusercontent.com/74038190/238200431-b48a1301-d976-4f17-ac8e-6626e6b8fc6b.gif",
  "https://user-images.githubusercontent.com/74038190/238200433-5b5fe855-b05e-4fa2-94bc-ed2413078e00.gif",
  "https://user-images.githubusercontent.com/74038190/238200435-a4af2fb1-60a5-4d52-a9fc-aaae4c55f528.gif",
  "https://user-images.githubusercontent.com/74038190/238200437-b8701960-9d70-4098-a5e0-54ff8d7c2ae2.gif",
  "https://user-images.githubusercontent.com/74038190/238200439-b0a7e0c7-b0c4-4df5-8c95-ced82b99bc4a.gif",
  "https://user-images.githubusercontent.com/74038190/238200441-7d2d3f42-3ffe-4bf4-8424-a0a6b2c48c41.gif",
  "https://user-images.githubusercontent.com/74038190/238200443-25ef52c2-fcff-43c2-a11a-8cb3d9e7d7f3.gif",
  "https://user-images.githubusercontent.com/74038190/238200445-adabdbb5-adad-4f8d-ae81-c7d8e8d15e5e.gif",
  "https://user-images.githubusercontent.com/74038190/238200447-5d9dbfe3-0b2a-4e55-a7ac-31f43c9b5e7f.gif",
  "https://user-images.githubusercontent.com/74038190/238200449-8c6e6f49-7e76-4f55-9af8-f6e754a9c2e0.gif",
  "https://user-images.githubusercontent.com/74038190/238200451-8ca14ef9-1523-47ed-a2d5-fd76fab47ede.gif",
  "https://user-images.githubusercontent.com/74038190/238200453-c82fb3d8-3936-4f5b-b29d-66fa6c0d2b62.gif",
  "https://user-images.githubusercontent.com/74038190/238200455-eb27c24c-6d3a-4b4f-a6f3-c6e5f15e1c52.gif",
  "https://user-images.githubusercontent.com/74038190/238200457-c3b6e59c-a3f6-41b2-9b0d-4f0d7a4b59b9.gif",
  "https://user-images.githubusercontent.com/74038190/238200459-8a6c40e1-c16d-4f24-97c0-50e0e8c95745.gif",
  "https://user-images.githubusercontent.com/74038190/238200461-16bb02ba-5c08-4c7e-b0da-c40d1c80e18e.gif",
  "https://user-images.githubusercontent.com/74038190/238200463-a65e1088-8f47-4dc7-b51d-3be39b49f1e6.gif",
  "https://user-images.githubusercontent.com/74038190/238200465-e1c8b0da-19fa-4acb-b20c-fa1e3de40b88.gif",
  "https://user-images.githubusercontent.com/74038190/238200467-8e62285a-9d86-4282-aba3-14a69d1a0cd5.gif",
  "https://user-images.githubusercontent.com/74038190/238200469-c5e0d3be-f2a9-4c1b-a53f-9e47c01b7f21.gif",
  "https://user-images.githubusercontent.com/74038190/238200471-e3b0c2fe-3a73-41f2-b777-2c6e5cfe00c9.gif",
  "https://user-images.githubusercontent.com/74038190/238200474-23de4e47-0e24-4b8a-bde3-53af9a9c3286.gif",
  "https://user-images.githubusercontent.com/74038190/238200476-d37b1c4c-7f38-42cf-97e7-a6aae4e15e47.gif",
  "https://user-images.githubusercontent.com/74038190/238200478-05d07fce-9459-4b15-8b44-0b11e5d23dbc.gif",
  "https://user-images.githubusercontent.com/74038190/238200480-5e75d0e4-ce20-4c9c-aa4f-e1a7f60f4f2a.gif",
];
// Pixel GIFs — ті самі що на скріні
const PIXEL_GIFS = [
  "https://user-images.githubusercontent.com/74038190/212748842-9fcbad5b-6173-4175-8a61-521f3dbb7514.gif",
  "https://user-images.githubusercontent.com/74038190/212748830-4c709398-a386-4761-84d7-9e10b98fbe6e.gif",
  "https://user-images.githubusercontent.com/74038190/212748838-4c6f3b94-9e5e-4f8e-974e-4a3d67e0dc95.gif",
  "https://user-images.githubusercontent.com/74038190/212748846-c26b8ded-6b9e-4f1b-8218-8c5e6b97e4e7.gif",
  "https://user-images.githubusercontent.com/74038190/212748849-5db6e93b-cc62-45c9-b4e5-c7e9b9e1f7c9.gif",
  "https://user-images.githubusercontent.com/74038190/212748852-6fdf54d0-e55c-4f88-9b13-2b8b9d3d5e7f.gif",
];
const GIF_TABS = [
  { key: "parrots", label: "🦜", data: PARROTS },
  { key: "helpful", label: "🎭", data: HELPFUL_GIFS },
  { key: "pixel",   label: "🎮", data: PIXEL_GIFS },
] as const;

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
  const [gifTab, setGifTab] = useState<"parrots" | "helpful" | "pixel">("parrots");
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
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#1e2a4a", padding: "6px 10px", flexShrink: 0, position: "relative" }} ref={panelRef}>

        {/* Emoji panel → Helpful GIFs */}
        {openPanel === "emoji" && (
          <div style={{ position: "absolute", bottom: "100%", left: "10px", width: "320px", background: "#1e2a4a", border: "1px solid #f46f10", borderRadius: "12px", padding: "8px", maxHeight: "280px", overflowY: "auto", zIndex: 100 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "5px" }}>
              {HELPFUL_GIFS.map((url) => (
                <button key={url} onClick={() => sendSpecial(`[GIF:${url}]`)}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "6px", cursor: "pointer", padding: "0", overflow: "hidden", width: 52, height: 52 }}>
                  <img src={url} alt="gif" style={{ width: 52, height: 52, objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sticker panel */}
        {openPanel === "sticker" && (
          <div style={{ position: "absolute", bottom: "100%", left: "10px", width: "300px", background: "#1e2a4a", border: "1px solid #f46f10", borderRadius: "12px", padding: "10px", maxHeight: "280px", overflowY: "auto", zIndex: 100 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
              {MEME_STICKERS.map((url) => (
                <button key={url} onClick={() => sendSpecial(`[STICKER:${url}]`)}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px", cursor: "pointer", padding: "3px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={url} alt="sticker" style={{ width: 56, height: 56, objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GIF panel with tabs */}
        {openPanel === "gif" && (
          <div style={{ position: "absolute", bottom: "100%", left: "10px", width: "320px", background: "#1e2a4a", border: "1px solid #f46f10", borderRadius: "12px", zIndex: 100, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "6px 6px 0" }}>
              {GIF_TABS.map((tab) => (
                <button key={tab.key} onClick={() => setGifTab(tab.key)}
                  style={{ flex: 1, padding: "5px 4px", border: "none", background: "none", cursor: "pointer", fontSize: "18px", borderBottom: gifTab === tab.key ? "2px solid #f46f10" : "2px solid transparent", opacity: gifTab === tab.key ? 1 : 0.5 }}>
                  {tab.label}
                </button>
              ))}
            </div>
            {/* GIF grid */}
            <div style={{ padding: "8px", maxHeight: "240px", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "5px" }}>
                {GIF_TABS.find((t) => t.key === gifTab)!.data.map((url) => (
                  <button key={url} onClick={() => sendSpecial(`[GIF:${url}]`)}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "6px", cursor: "pointer", padding: "0", overflow: "hidden", width: 52, height: 52 }}>
                    <img src={url} alt="gif" style={{ width: 52, height: 52, objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom row: panel buttons + input + send */}
        <form onSubmit={handleSend} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {/* Panel icon buttons */}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
          {([
            { panel: "emoji" as const,   icon: "😊" },
            { panel: "sticker" as const, icon: "🎭" },
            { panel: "gif" as const,     icon: "🎬" },
          ]).map(({ panel, icon }) => (
            <button key={panel} type="button" onClick={(e) => { e.stopPropagation(); setOpenPanel(openPanel === panel ? null : panel); }}
              style={{ width: 32, height: 32, flexShrink: 0, background: openPanel === panel ? "rgba(244,111,16,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${openPanel === panel ? "#f46f10" : "rgba(255,255,255,0.1)"}`, borderRadius: "8px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
              {icon}
            </button>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()}
            style={{ width: 32, height: 32, flexShrink: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: uploading ? "wait" : "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
            {uploading ? "⏳" : "🖼"}
          </button>
          {/* Text input */}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напишіть повідомлення..."
            maxLength={500}
            style={{ flex: 1, padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: "14px", fontFamily: "Exo 2, sans-serif", outline: "none" }}
          />
          {/* Send */}
          <button
            type="submit"
            disabled={sending || !input.trim()}
            style={{ width: 36, height: 36, flexShrink: 0, background: "#f46f10", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 800, fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: (sending || !input.trim()) ? 0.4 : 1 }}
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
