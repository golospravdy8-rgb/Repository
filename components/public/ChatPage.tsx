"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import ChatPageMobile from "./ChatPageMobile";
import ChatActivePoll, { ChatPollData } from "./ChatActivePoll";
import NewsTicker from "@/components/NewsTicker";
import TvBlock from "@/components/TvBlock";
import RucheekGameCanvas from "./RucheekGameCanvas";
import { createChatPoll, finishChatPoll } from "@/actions/chat-poll";

const LS_KEY = "ldbl_chat_user";
const EMOJIS = ["👍", "❤️", "😂", "😮", "🔥", "🏀"];

// ── Helper: Get current mobile state synchronously (for render-time checks)
// This prevents hydration mismatch by checking viewport immediately
const getIsMobileNow = () => {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
};


// ── Stickers (pavanpatil45/Classic-Meme-Stickers) ─────────────────────────
const STICKER_BASE = "https://raw.githubusercontent.com/pavanpatil45/Classic-Meme-Stickers/main/app/src/main/assets";
const MEME_STICKERS = Array.from({ length: 26 }, (_, i) => `${STICKER_BASE}/1/${i + 1}.webp`)
  .concat(Array.from({ length: 23 }, (_, i) => `${STICKER_BASE}/2/${i + 1}.webp`));

// ── Classic Rage Face memes (user-images.githubusercontent.com — verified 200) ──
const CLASSIC_MEMES = [
  { name: "Sticker 1",  url: "https://user-images.githubusercontent.com/74038190/212284068-b4ee9a5c-331c-4d18-9481-53dd6b9debd5.gif" },
  { name: "Sticker 2",  url: "https://user-images.githubusercontent.com/74038190/212284087-bbe7e430-757e-4901-90bf-4cd2ce3e1852.gif" },
  { name: "Sticker 3",  url: "https://user-images.githubusercontent.com/74038190/212284094-e50ceae2-de86-4dd6-9f9c-a3ebcb3ede9e.gif" },
  { name: "Sticker 4",  url: "https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" },
  { name: "Sticker 5",  url: "https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" },
  { name: "Sticker 6",  url: "https://user-images.githubusercontent.com/74038190/212284136-03988914-d899-44b4-b1d9-4eeccf656e44.gif" },
  { name: "Sticker 7",  url: "https://user-images.githubusercontent.com/74038190/212284145-bf2c01a8-c448-4f1a-b911-996024c84606.gif" },
  { name: "Sticker 8",  url: "https://user-images.githubusercontent.com/74038190/212284158-e840e285-664b-44d7-b79b-e264b5e54825.gif" },
  { name: "Sticker 9",  url: "https://user-images.githubusercontent.com/74038190/212284164-662b26f5-a2e4-49cb-b675-4af56e609afa.gif" },
  { name: "Sticker 10", url: "https://user-images.githubusercontent.com/74038190/212744275-c56a72c2-50b1-45e2-a693-d19d40357766.gif" },
  { name: "Sticker 11", url: "https://user-images.githubusercontent.com/74038190/212744287-14f66c13-5458-40dc-9244-8ff533fc8f4a.gif" },
  { name: "Sticker 12", url: "https://user-images.githubusercontent.com/74038190/212744289-c46f1717-bfc9-4724-8ef3-4b08e3583110.gif" },
  { name: "Sticker 13", url: "https://user-images.githubusercontent.com/74038190/212747657-7a8d59da-69c8-4110-8ea8-f8102fd0b413.gif" },
  { name: "Sticker 14", url: "https://user-images.githubusercontent.com/74038190/212747903-e9bdf048-2dc8-41f9-b973-0e72ff07bfba.gif" },
  { name: "Sticker 15", url: "https://user-images.githubusercontent.com/74038190/212748830-4c709398-a386-4761-84d7-9e10b98fbe6e.gif" },
  { name: "Sticker 16", url: "https://user-images.githubusercontent.com/74038190/212748842-9fcbad5b-6173-4175-8a61-521f3dbb7514.gif" },
];

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

// ── Animated Emoji (Google Noto Animated — fonts.gstatic.com CDN) ─────────
const ANIMATED_EMOJIS = [
  { name: "Fire",         url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif" },
  { name: "Party",        url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif" },
  { name: "Trophy",       url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.gif" },
  { name: "Basketball",   url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c0/512.gif" },
  { name: "Heart",        url: "https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.gif" },
  { name: "Thumbs Up",    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif" },
  { name: "Laugh",        url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif" },
  { name: "Star",         url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.gif" },
  { name: "Muscle",       url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f4aa/512.gif" },
  { name: "Clap",         url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.gif" },
  { name: "Rocket",       url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" },
  { name: "Eyes",         url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f440/512.gif" },
  { name: "100",          url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.gif" },
  { name: "Sunglasses",   url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.gif" },
  { name: "Cry",          url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.gif" },
  { name: "Mind Blown",   url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.gif" },
  { name: "Nerd",         url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f913/512.gif" },
  { name: "Ghost",        url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f47b/512.gif" },
  { name: "Snowflake",    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/2744_fe0f/512.gif" },
  { name: "Rainbow",      url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f308/512.gif" },
];

// ── Cool GIFs (user-images.githubusercontent.com — verified 200) ─────────
const COOL_GIFS = [
  "https://user-images.githubusercontent.com/74038190/213866269-5d00981c-7c98-46d7-8a8e-16f462f15227.gif",
  "https://user-images.githubusercontent.com/74038190/212257454-16e3712e-945a-4ca2-b238-408ad0bf87e6.gif",
  "https://user-images.githubusercontent.com/74038190/212257472-08e52665-c503-4bd9-aa20-f5a4dae769b5.gif",
  "https://user-images.githubusercontent.com/74038190/212257468-1e9a91f1-b626-4baa-b15d-5c385dfa7ed2.gif",
  "https://user-images.githubusercontent.com/74038190/212257465-7ce8d493-cac5-494e-982a-5a9deb852c4b.gif",
  "https://user-images.githubusercontent.com/74038190/212257463-4d082cb4-7483-4eaf-bc25-6dde2628aabd.gif",
  "https://user-images.githubusercontent.com/74038190/212257460-738ff738-247f-4445-a718-cdd0ca76e2db.gif",
  "https://user-images.githubusercontent.com/74038190/212257467-871d32b7-e401-42e8-a166-fcfd7baa4c6b.gif",
  "https://user-images.githubusercontent.com/74038190/212281756-450d3ffa-9335-4b98-a965-db8a18fee927.gif",
  "https://user-images.githubusercontent.com/74038190/212280805-9bcb336b-8c55-46a8-abf8-ff286ab55472.gif",
  "https://user-images.githubusercontent.com/74038190/212280823-79088828-a258-4a4d-8d6c-96315d5a07af.gif",
  "https://user-images.githubusercontent.com/74038190/212281763-e6ecd7ef-c4aa-45b6-a97c-f33f6bb592bd.gif",
];

// ── Cat GIFs (cataas.com — public cat GIF API, always returns 200) ────────
const CAT_GIFS = [
  "https://cataas.com/cat/gif",
  "https://cataas.com/cat/gif?tag=cute",
  "https://cataas.com/cat/gif?tag=funny",
  "https://cataas.com/cat/gif?tag=sleep",
  "https://cataas.com/cat/gif?tag=play",
  "https://cataas.com/cat/gif?tag=jump",
  "https://cataas.com/cat/gif?tag=food",
  "https://cataas.com/cat/gif?tag=box",
  "https://cataas.com/cat/gif?tag=kitten",
  "https://cataas.com/cat/gif?tag=angry",
];

// ── Pepe / Fun GIFs (user-images.githubusercontent.com — verified 200) ───
const PEPE_GIFS = [
  "https://user-images.githubusercontent.com/74038190/235294002-8aafea24-3179-45af-91d9-412ad7ff5359.gif",
  "https://user-images.githubusercontent.com/74038190/235294007-de441046-823e-4eff-89bf-d4df52858b65.gif",
  "https://user-images.githubusercontent.com/74038190/235294008-ed8de58b-d4d0-4790-aa81-a39fdc8a1e50.gif",
  "https://user-images.githubusercontent.com/74038190/235294009-98ca7572-795f-4056-b2c1-ccbde3f2982e.gif",
  "https://user-images.githubusercontent.com/74038190/235294010-ec412ef5-e3da-4efa-b1d4-0ab4d4638755.gif",
  "https://user-images.githubusercontent.com/74038190/235294011-b8074c31-9097-4a65-a594-4151b58743a8.gif",
  "https://user-images.githubusercontent.com/74038190/235294012-0a55e343-37ad-4b0f-924f-c8431d9d2483.gif",
  "https://user-images.githubusercontent.com/74038190/235294013-a33e5c43-a01c-43f6-b44d-a406d8b4ab75.gif",
  "https://user-images.githubusercontent.com/74038190/235294015-47144047-25ab-417c-af1b-6746820a20ff.gif",
  "https://user-images.githubusercontent.com/74038190/235294016-6556559a-ed58-4ca6-a4c9-c307cbe0b6b7.gif",
];

// ── Badge by HP ───────────────────────────────────────────────────────────
function getBadge(hp: number): string {
  if (hp >= 1000) return "🏆";
  if (hp >= 300)  return "👑";
  if (hp >= 100)  return "🔥";
  if (hp >= 25)   return "🌱";
  return "";
}

// ── Custom avatar by HP ───────────────────────────────────────────────────
function getAvatar(hp: number): { emoji: string; label: string } | null {
  if (hp >= 1000) return { emoji: "🏆", label: "Амбасадор клубу" };
  if (hp >= 300)  return { emoji: "👑", label: "Рекрутер" };
  if (hp >= 100)  return { emoji: "🔥", label: "Легенда ліги" };
  if (hp >= 50)   return { emoji: "⭐", label: "Активний учасник" };
  if (hp >= 25)   return { emoji: "🌱", label: "Новачок" };
  return null;
}

// ── Spin wheel sectors ────────────────────────────────────────────────────
const SPIN_SECTORS = [
  { hp: 5,  color: "#334155", label: "+5" },
  { hp: 10, color: "#1e3a5f", label: "+10" },
  { hp: 5,  color: "#334155", label: "+5" },
  { hp: 15, color: "#1e4040", label: "+15" },
  { hp: 10, color: "#1e3a5f", label: "+10" },
  { hp: 50, color: "#7c2d12", label: "+50" },
  { hp: 5,  color: "#334155", label: "+5" },
  { hp: 20, color: "#1e293b", label: "+20" },
  { hp: 10, color: "#1e3a5f", label: "+10" },
  { hp: 25, color: "#14532d", label: "+25" },
];

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
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [step, setStep] = useState<"checking" | "form" | "chat">("checking");
  const [formMode, setFormMode] = useState<"choose" | "player" | "parent">("choose");
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
  const [members, setMembers] = useState<{ phone: string; firstName: string; lastName: string; hp: number; role: string; isMod: boolean; isOnline: boolean }[]>([]);
  const [refCodeFromUrl, setRefCodeFromUrl] = useState<string | null>(null);
  const [showHpRules, setShowHpRules] = useState(false);
  const [showHpModal, setShowHpModal] = useState(false);
  const [modalMods, setModalMods] = useState<{ phone: string; name: string }[]>([]);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [activePoll, setActivePoll] = useState<ChatPollData | null>(null);
  const [showPorokhova, setShowPorokhova] = useState(false);
  const [porokhovaList, setPorokhovaList] = useState<{
    phone: string; name: string; status: "їду" | "їду_20" | "потрібен_1"; checkinAt: string;
  }[]>([]);
  const [porokhovaLoading, setPorokhovaLoading] = useState(false);
  const [openPanel, setOpenPanel] = useState<"sticker" | "gif" | null>(null);
  const [stickerTab, setStickerTab] = useState<"meme" | "animated" | "cool" | "classic" | "cat" | "pepe">("meme");
  const [uploading, setUploading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [shopItems, setShopItems] = useState<{ id: number; name: string; description: string; emoji: string; price: number; oldPrice: number | null; category: string; badge: string | null; imageUrl: string | null; sizes: string | null; inStock: boolean; chatPriority: boolean; showInChat: boolean; sortOrder: number }[]>([]);
  const [shopTicker, setShopTicker] = useState(0);
  const [mvpResults, setMvpResults] = useState<{ playerName: string; votes: number; photoUrl?: string | null }[]>([]);
  const [nextGame, setNextGame] = useState<{ id: number; homeTeam: { name: string }; awayTeam: { name: string }; scheduledAt: string; season: { name: string } } | null>(null);
  const [gameAttendees, setGameAttendees] = useState<{ phone: string; name: string }[]>([]);
  const [showNextGame, setShowNextGame] = useState(false);
  const [spinDone, setSpinDone] = useState(false);
  const [showSpin, setShowSpin] = useState(false);
  const [spinState, setSpinState] = useState<"idle" | "spinning" | "result">("idle");
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [spinAngle, setSpinAngle] = useState(0);
  const [streak, setStreak] = useState(0);
  const [activeRoom, setActiveRoom] = useState<"general" | "parents">("general");
  const [isParent, setIsParent] = useState(false);
  const [regSuccess, setRegSuccess] = useState<{ firstName: string; hp: number; refLink: string; isNew: boolean } | null>(null);
  const [teams, setTeams] = useState<{ id: number; name: string; shortName: string }[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState<"alltime" | "weekly">("weekly");
  const [leaderboard, setLeaderboard] = useState<{ phone: string; firstName: string; lastName: string; hp: number; weeklyHp?: number | null }[]>([]);
  const [leaderboardWeekStart, setLeaderboardWeekStart] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [showRucheekGame, setShowRucheekGame] = useState(false);
  // Polling is used instead of EventSource
  const activeRoomRef = useRef<"general" | "parents">("general");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // ── Mounted guard for hydration safety ────────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Detect mobile device ──────────────────────────────────────────────
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const mode = params.get("mode"); // "player" | "parent"
    const room = params.get("room"); // "parents"
    if (ref) setRefCodeFromUrl(ref);

    // 1. Перевіряємо chat-сесію гравця
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        const { phone, firstName, lastName } = JSON.parse(saved);
        if (phone && firstName && lastName) {
          // If ?room=parents requested but user is a player — still go to chat, room handled below
          doLogin(phone, firstName, lastName);
          return;
        }
      } catch {}
    }

    // 2. Перевіряємо сесію батька (parent_token + parent_data)
    const parentToken = localStorage.getItem("parent_token");
    const parentDataRaw = localStorage.getItem("parent_data");
    if (parentToken && parentDataRaw) {
      try {
        const { contact } = JSON.parse(parentDataRaw);
        if (contact?.phone && contact?.firstName && contact?.lastName) {
          setIsParent(true);
          if (room === "parents" || mode === "parent") setActiveRoom("parents");
          doLogin(contact.phone, contact.firstName, contact.lastName);
          return;
        }
      } catch {}
    }

    // 3. Not logged in — set formMode from ?mode param
    if (mode === "parent") setFormMode("parent");
    else if (mode === "player") setFormMode("player");
    // else stays "choose"

    setStep("form");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load teams for parent registration ───────────────────────────────
  useEffect(() => {
    if (step !== "form") return;
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setTeams(d.teams ?? []))
      .catch(() => {});
  }, [step]);

  // ── Shop ticker load ──────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "chat") return;
    fetch("/api/shop/products-chat")
      .then(r => r.json())
      .then(d => setShopItems(d.products || []))
      .catch(() => {});
  }, [step]);

  // ── Shop ticker rotation (every 19s) ─────────────────────────────────
  useEffect(() => {
    if (shopItems.length === 0) return;
    const t = setInterval(() => setShopTicker(n => n + 1), 19000);
    return () => clearInterval(t);
  }, [shopItems.length]);

  // ── Porokhova checkins — initial load + polling every 10s ─────────────
  useEffect(() => {
    const load = () => {
      fetch("/api/playground/checkin")
        .then(r => r.json())
        .then(d => setPorokhovaList(d.checkins || []))
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, []);

  async function doLogin(phone: string, firstName: string, lastName: string, refCode?: string, showWelcome?: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let res: Response, data: any;
    try {
      res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", phone, firstName, lastName, refCode }),
      });
      data = await res.json();
    } catch {
      notify("Помилка з'єднання. Спробуйте ще раз.");
      setStep("form");
      return;
    }
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
    // Auto-switch room from URL param
    const roomParam = new URLSearchParams(window.location.search).get("room");
    const modeParam = new URLSearchParams(window.location.search).get("mode");
    if (roomParam === "parents" || modeParam === "parent") {
      // will be handled by parent auth useEffect, or set directly for parents
    }
    // Show welcome screen for new registrations
    if ((showWelcome || data.isNewUser) && data.refLink) {
      setRegSuccess({ firstName, hp: data.guest.hp, refLink: data.refLink, isNew: !!data.isNewUser });
    }
    setStep("chat");
  }

  // ── Check parent auth from localStorage ──────────────────────────────
  useEffect(() => {
    if (step !== "chat") return;
    const token = typeof window !== "undefined" ? localStorage.getItem("parent_token") : null;
    if (token) {
      fetch("/api/parents/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d?.contact?.role === "parent") {
            setIsParent(true);
            // Auto-switch to parents room if ?room=parents in URL
            const roomParam = new URLSearchParams(window.location.search).get("room");
            if (roomParam === "parents") setActiveRoom("parents");
          }
        })
        .catch(() => {});
    }
  }, [step]);

  // ── Sync activeRoom ref (for SSE filtering) ───────────────────────────
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // ── Load history ───────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "chat") return;
    setMessages([]);
    const headers: Record<string, string> = {};
    if (activeRoom === "parents") {
      const token = typeof window !== "undefined" ? localStorage.getItem("parent_token") : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;
      else if (user?.phone) {
        // fallback: use phone param for chat-registered parents/players
        fetch(`/api/chat/messages?limit=50&room=${activeRoom}&phone=${encodeURIComponent(user.phone)}`)
          .then((r) => r.ok ? r.json() : { messages: [], pinnedMessage: null })
          .then((d) => { setMessages(d.messages ?? []); if (d.pinnedMessage) setPinnedMessage(d.pinnedMessage); })
          .catch(() => {});
        return;
      }
    }
    fetch(`/api/chat/messages?limit=50&room=${activeRoom}`, { headers })
      .then((r) => r.ok ? r.json() : { messages: [], pinnedMessage: null })
      .then((d) => {
        setMessages(d.messages ?? []);
        if (d.pinnedMessage) setPinnedMessage(d.pinnedMessage);
      })
      .catch(() => {});
  }, [step, activeRoom, user?.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load players for MVP ───────────────────────────────────────────────
  useEffect(() => {
    if (step !== "chat") return;
    fetch("/api/players?limit=100")
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []))
      .catch(() => {});
  }, [step]);

  // ── Load MVP vote results for current month ───────────────────────────
  const loadMvpResults = useCallback(() => {
    fetch("/api/chat/mvp-results")
      .then((r) => r.json())
      .then((d) => setMvpResults(d.results ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step !== "chat") return;
    loadMvpResults();
  }, [step, loadMvpResults]);

  // ── Load next game (within 24h) ───────────────────────────────────────
  useEffect(() => {
    if (step !== "chat") return;
    fetch("/api/chat/next-game")
      .then((r) => r.json())
      .then((d) => {
        setNextGame(d.game ?? null);
        setGameAttendees(d.attendees ?? []);
      })
      .catch(() => {});
  }, [step]);

  // ── Load spin/streak status + do streak checkin ───────────────────────
  useEffect(() => {
    if (step !== "chat" || !user) return;
    // Load status
    fetch(`/api/chat/status?phone=${encodeURIComponent(user.phone)}`)
      .then((r) => r.json())
      .then((d) => {
        setSpinDone(d.spinDone ?? false);
        setStreak(d.streak ?? 0);
      })
      .catch(() => {});
    // Checkin for streak
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkin", phone: user.phone }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.streak) setStreak(d.streak); })
      .catch(() => {});
  }, [step, user?.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load chat participants for sidebar ───────────────────────────────
  useEffect(() => {
    if (step !== "chat") return;
    const load = () =>
      fetch(`/api/chat/participants?room=${activeRoom}`)
        .then((r) => r.json())
        .then((d) => setMembers(d.members ?? []))
        .catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [step, activeRoom]);

  // ── Online presence: heartbeat + polling ──────────────────────────────
  useEffect(() => {
    if (step !== "chat" || !user) return;
    const userId = user.phone;
    const ping = () => {
      // Legacy in-memory ping
      fetch("/api/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }).catch(() => {});
      // Persistent DB heartbeat
      fetch("/api/chat/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: user.phone,
          name: `${user.firstName} ${user.lastName}`,
          role: isParent ? "parent" : "player",
          room: activeRoom,
        }),
      }).catch(() => {});
    };
    ping();
    const pingInterval = setInterval(ping, 30000);
    return () => clearInterval(pingInterval);
  }, [step, user, activeRoom, isParent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== "chat") return;
    const fetchOnline = () =>
      fetch("/api/online")
        .then((r) => r.json())
        .then((d) => setOnlineUsers(new Set<string>(d.onlineIds ?? [])))
        .catch(() => {});
    fetchOnline();
    const pollInterval = setInterval(fetchOnline, 15000);
    return () => clearInterval(pollInterval);
  }, [step]);

  // ── Load active poll ───────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "chat") return;

    const loadPoll = async () => {
      try {
        const res = await fetch("/api/chat/active-poll");
        const data = await res.json();
        if (data.poll) {
          setActivePoll(data.poll);
        } else {
          setActivePoll(null);
        }
      } catch (err) {
        console.error("[ChatPage] Load poll failed:", err);
      }
    };

    loadPoll();
    const interval = setInterval(loadPoll, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling for chat messages (every 1.5s) ──────────────────────────────
  useEffect(() => {
    if (step !== "chat" || !user) return;

    let lastMessageId = 0;
    let isMounted = true;

    const poll = async () => {
      try {
        const roomId = activeRoomRef.current || "general";
        const headers: Record<string, string> = {};
        if (roomId === "parents") {
          const token = typeof window !== "undefined" ? localStorage.getItem("parent_token") : null;
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/chat/messages?room=${roomId}&limit=50`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (!isMounted) return;

        const newMessages = data.messages || [];

        // Add only new messages since last poll
        if (newMessages.length > 0) {
          const maxId = Math.max(...newMessages.map((m: any) => m.id));
          if (maxId > lastMessageId) {
            const freshMessages = newMessages.filter((m: any) => m.id > lastMessageId);
            if (freshMessages.length > 0) {
              lastMessageId = maxId;
              setMessages((prev) => [...prev.slice(-199), ...freshMessages]);
            }
          } else if (lastMessageId === 0) {
            // Initial load
            lastMessageId = newMessages.length > 0 ? maxId : 0;
            setMessages(newMessages);
          }
        }

        if (data.pinnedMessage !== undefined) {
          setPinnedMessage(data.pinnedMessage);
        }
      } catch (err) {
        console.error("[chat polling error]", err);
      }

      if (isMounted) {
        setTimeout(poll, 1500);
      }
    };

    poll();
    return () => {
      isMounted = false;
    };
  }, [step, user?.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSSE(ev: {
    type: string; message?: ChatMessage; messageId?: number; reactions?: Reaction[];
    text?: string; phone?: string; mutedUntil?: string; count?: number; reason?: string;
    enabled?: boolean; roomId?: string;
  }) {
    if (ev.type === "message" && ev.message) {
      const msgRoom = (ev.message as { roomId?: string }).roomId ?? "general";
      const currentRoom = activeRoomRef.current;
      // Only add message if it belongs to the currently viewed room
      if (msgRoom === currentRoom) {
        setMessages((prev) => [...prev.slice(-199), ev.message!]);
      }
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
    if (ev.type === "mvp_vote") {
      loadMvpResults();
    }
    if (ev.type === "poll_vote") {
      // Refresh poll when someone votes
      fetch("/api/chat/active-poll")
        .then((r) => r.json())
        .then((d) => d.poll && setActivePoll(d.poll))
        .catch(() => {});
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
    if (formSubmitting) return;
    const fd = new FormData(e.currentTarget);
    const phone = (fd.get("phone") as string).trim();
    const firstName = (fd.get("firstName") as string).trim();
    const lastName = (fd.get("lastName") as string).trim();
    if (!phone || !firstName || !lastName) { notify("Заповніть всі поля"); return; }
    setFormSubmitting(true);
    localStorage.setItem(LS_KEY, JSON.stringify({ phone, firstName, lastName }));
    doLogin(phone, firstName, lastName, refCodeFromUrl ?? undefined, true).finally(() => setFormSubmitting(false));
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
          roomId: activeRoom,
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
    } catch {
      notify("Помилка з'єднання. Повідомлення не надіслано.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleReact(messageId: number, emoji: string) {
    if (!user) return;
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", phone: user.phone, messageId, emoji }),
      });
    } catch {}
    setEmojiTarget(null);
  }

  async function handleDeleteMsg(msgId: number) {
    if (!user) return;
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_message", phone: user.phone, messageId: msgId }),
      });
    } catch {}
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

  async function handleSpin() {
    if (!user || spinDone || spinState === "spinning") return;
    setSpinState("spinning");
    // Spin animation: random full rotations + land on sector
    const extraSpins = 5 + Math.floor(Math.random() * 4); // 5-8 full rotations
    const sectorAngle = 360 / SPIN_SECTORS.length;
    const targetSector = Math.floor(Math.random() * SPIN_SECTORS.length);
    const targetAngle = spinAngle + extraSpins * 360 + (targetSector * sectorAngle);
    setSpinAngle(targetAngle);
    setTimeout(async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "spin", phone: user.phone }),
        });
        const data = await res.json();
        if (data.alreadySpun) {
          setSpinResult(data.hpGained);
          setSpinState("result");
          setSpinDone(true);
        } else if (data.ok) {
          setSpinResult(data.hpGained);
          setSpinState("result");
          setSpinDone(true);
          setUser((u) => u ? { ...u, hp: data.newHp ?? u.hp } : u);
          notify(`🎰 Ви виграли +${data.hpGained} HP!`);
        } else {
          setSpinState("idle");
          notify("Помилка спіну, спробуй ще раз");
        }
      } catch {
        setSpinState("idle");
        notify("Помилка з'єднання");
      }
    }, 3500);
  }

  async function handleGameAttend() {
    if (!user || !nextGame) return;
    const res = await fetch("/api/chat/next-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: nextGame.id, phone: user.phone, name: `${user.firstName} ${user.lastName}` }),
    });
    const data = await res.json();
    if (data.attendees) setGameAttendees(data.attendees);
    if (data.attending) notify("✅ Ти в списку! До зустрічі на матчі 🏀");
    else notify("Ти прибрав(ла) свою відмітку");
  }

  function openLeaderboard(mode: "alltime" | "weekly" = "weekly") {
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
              roomId: activeRoom,
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
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          phone: user.phone,
          name: `${user.firstName} ${user.lastName}`,
          text,
          replyToId: replyTo?.id ?? null,
          roomId: activeRoom,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update HP if sent successfully
        if (data.newHp != null) {
          setUser((u) => u ? { ...u, hp: data.newHp } : u);
        }
        setReplyTo(null);
        setOpenPanel(null);
      } else {
        const err = await res.json();
        notify(err.error ?? "Помилка відправки стікера");
      }
    } catch {
      notify("Помилка з'єднання. Стікер не надіслано.");
    }
  }

  function handleLogout() {
    // Polling interval is cleared by useEffect cleanup
    setUser(null);
    setMessages([]);
    localStorage.removeItem(LS_KEY);
    setFormMode("choose");
    setRegSuccess(null);
    setFormSubmitting(false);
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

    // ── Choose screen ──────────────────────────────────────────────────
    if (formMode === "choose") {
      const inp: React.CSSProperties = { width: "100%", padding: "10px 13px", borderRadius: "8px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "white", fontSize: "14px", fontFamily: "Exo 2, sans-serif", boxSizing: "border-box", outline: "none" };
      const lbl: React.CSSProperties = { display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px", fontWeight: 600 };
      const expanded = formMode === "choose" ? (typeof window !== "undefined" ? (window as Window & { __chatExpanded?: string }).__chatExpanded : undefined) : undefined;
      void expanded; // suppress unused warning — we use DOM state via ref below

      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" }}>
          <div style={{ width: "100%", maxWidth: "680px" }}>
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{ fontSize: "44px", marginBottom: "6px" }}>🏀</div>
              <h1 style={{ color: "white", fontWeight: 800, fontSize: "24px", margin: "0 0 4px", fontFamily: "Exo 2, sans-serif" }}>Оберіть як ви хочете увійти</h1>
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Basket Lviv · Балачка та чат батьків</p>
            </div>
            {notification && (
              <div style={{ margin: "0 0 16px", padding: "10px 14px", background: "rgba(239,68,68,0.15)", borderRadius: "8px", color: "#fca5a5", fontSize: "13px", textAlign: "center" }}>
                {notification}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* ── Картка БАТЬКО ── */}
              <div style={{ background: "#1e3a5f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", overflow: "hidden" }}>
                {/* Header row */}
                <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "36px", flexShrink: 0 }}>👨‍👩‍👦</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "white", fontWeight: 800, fontSize: "18px", fontFamily: "Exo 2, sans-serif" }}>Я БАТЬКО</div>
                    <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>Реєстрація · Доступ до чату батьків</div>
                  </div>
                </div>
                {/* Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (formSubmitting) return;
                    const fd = new FormData(e.currentTarget);
                    const firstName = (fd.get("p_firstName") as string || "").trim();
                    const lastName = (fd.get("p_lastName") as string || "").trim();
                    const phone = (fd.get("p_phone") as string || "").trim();
                    const childTeamId = fd.get("p_childTeamId") as string || null;
                    if (!firstName || !lastName || !phone) { notify("Заповніть всі обов'язкові поля"); return; }
                    if (!/^\+380\d{9}$/.test(phone)) { notify("Телефон у форматі +380XXXXXXXXX (9 цифр після +380)"); return; }
                    setFormSubmitting(true);
                    try {
                      const res = await fetch("/api/parents/register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ phone, firstName, lastName, childTeamId }),
                      });
                      const data = await res.json();
                      if (!res.ok) { notify(data.error || "Помилка реєстрації"); setFormSubmitting(false); return; }
                      if (data.token) localStorage.setItem("parent_token", data.token);
                      if (data.contact) localStorage.setItem("parent_data", JSON.stringify({ contact: data.contact }));
                      setIsParent(true);
                      setActiveRoom("parents");
                      if (data.refLink) setRegSuccess({ firstName, hp: data.contact?.hp ?? 25, refLink: data.refLink, isNew: true });
                      doLogin(phone, firstName, lastName);
                    } catch { notify("Помилка з'єднання"); setFormSubmitting(false); }
                  }}
                  style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: "10px" }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div><label style={lbl}>Ваше ім'я *</label><input name="p_firstName" type="text" required placeholder="Ваше ім'я" style={inp} /></div>
                    <div><label style={lbl}>Прізвище *</label><input name="p_lastName" type="text" required placeholder="Ваше прізвище" style={inp} /></div>
                  </div>
                  <div>
                    <label style={lbl}>Номер телефону *</label>
                    <input name="p_phone" type="tel" required placeholder="+380XXXXXXXXX" style={inp} />
                  </div>
                  {teams.length > 0 && (
                    <div>
                      <label style={lbl}>Команда дитини</label>
                      <select name="p_childTeamId" style={{ ...inp, appearance: "none", WebkitAppearance: "none" }}>
                        <option value="">— Оберіть команду (необов'язково) —</option>
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  )}
                  <button type="submit" disabled={formSubmitting} style={{ padding: "12px", background: formSubmitting ? "#64748b" : "#f97316", color: "white", border: "none", borderRadius: "10px", cursor: formSubmitting ? "not-allowed" : "pointer", fontWeight: 800, fontSize: "14px", fontFamily: "Exo 2, sans-serif", marginTop: "4px" }}>
                    {formSubmitting ? "Реєстрація..." : "Зареєструватись як батько"}
                  </button>
                </form>
              </div>

              {/* ── Картка ГРАВЕЦЬ ── */}
              <div style={{ background: "#1a2744", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", overflow: "hidden" }}>
                {/* Header row */}
                <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "36px", flexShrink: 0 }}>🏀</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "white", fontWeight: 800, fontSize: "18px", fontFamily: "Exo 2, sans-serif" }}>Я ГРАВЕЦЬ</div>
                    <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>Вхід · Балачка ЛДБЛ</div>
                  </div>
                </div>
                {/* Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (formSubmitting) return;
                    const fd = new FormData(e.currentTarget);
                    const firstName = (fd.get("g_firstName") as string || "").trim();
                    const lastName = (fd.get("g_lastName") as string || "").trim();
                    const phone = (fd.get("g_phone") as string || "").trim();
                    if (!firstName || !lastName || !phone) { notify("Заповніть всі поля"); return; }
                    if (!/^\+380\d{9}$/.test(phone)) { notify("Телефон у форматі +380XXXXXXXXX (9 цифр після +380)"); return; }
                    setFormSubmitting(true);
                    localStorage.setItem(LS_KEY, JSON.stringify({ phone, firstName, lastName }));
                    doLogin(phone, firstName, lastName, refCodeFromUrl ?? undefined, true).finally(() => setFormSubmitting(false));
                  }}
                  style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: "10px" }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div><label style={lbl}>Ім'я *</label><input name="g_firstName" type="text" required placeholder="Ваше ім'я" style={inp} /></div>
                    <div><label style={lbl}>Прізвище *</label><input name="g_lastName" type="text" required placeholder="Ваше прізвище" style={inp} /></div>
                  </div>
                  <div>
                    <label style={lbl}>Номер телефону *</label>
                    <input name="g_phone" type="tel" required placeholder="+380XXXXXXXXX" style={inp} />
                  </div>
                  {teams.length > 0 && (
                    <div>
                      <label style={lbl}>Команда</label>
                      <select name="g_teamId" style={{ ...inp, appearance: "none", WebkitAppearance: "none" }}>
                        <option value="">— Оберіть команду (необов'язково) —</option>
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  )}
                  {refCodeFromUrl && (
                    <div style={{ background: "rgba(244,111,16,0.12)", border: "1px solid rgba(244,111,16,0.3)", borderRadius: "8px", padding: "9px 12px", fontSize: "12px", color: "#f46f10" }}>
                      🔗 Вас запросив учасник — він отримає бонус HP
                    </div>
                  )}
                  <button type="submit" disabled={formSubmitting} style={{ padding: "12px", background: formSubmitting ? "#334155" : "#2563eb", color: "white", border: "none", borderRadius: "10px", cursor: formSubmitting ? "not-allowed" : "pointer", fontWeight: 800, fontSize: "14px", fontFamily: "Exo 2, sans-serif", marginTop: "4px" }}>
                    {formSubmitting ? "Вхід..." : "Увійти як гравець"}
                  </button>
                </form>
              </div>

            </div>
            <p style={{ textAlign: "center", color: "#475569", fontSize: "12px", marginTop: "16px" }}>
              <a href="/" style={{ color: "#475569", textDecoration: "none" }}>← На головну</a>
            </p>
          </div>
        </div>
      );
    }

    // ── Parent registration form ───────────────────────────────────────
    if (formMode === "parent") {
      const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: "9px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "white", fontSize: "14px", fontFamily: "Exo 2, sans-serif", boxSizing: "border-box", outline: "none" };
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" }}>
          <div style={{ width: "100%", maxWidth: "440px", background: "#1e3a5f", borderRadius: "20px", overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "28px 24px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "44px" }}>👨‍👩‍👦</div>
              <h1 style={{ color: "white", fontWeight: 800, fontSize: "22px", margin: "8px 0 4px", fontFamily: "Exo 2, sans-serif" }}>Реєстрація батька</h1>
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Доступ до чату батьків ЛДБЛ</p>
            </div>
            {notification && (
              <div style={{ margin: "0 24px 16px", padding: "10px 14px", background: "rgba(239,68,68,0.15)", borderRadius: "8px", color: "#fca5a5", fontSize: "13px" }}>
                {notification}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (formSubmitting) return;
                const fd = new FormData(e.currentTarget);
                const phone = (fd.get("phone") as string || "").trim();
                const firstName = (fd.get("firstName") as string || "").trim();
                const lastName = (fd.get("lastName") as string || "").trim();
                const childTeamId = fd.get("childTeamId") as string || null;
                if (!phone || !firstName || !lastName) { notify("Заповніть всі обов'язкові поля"); return; }
                setFormSubmitting(true);
                try {
                  const res = await fetch("/api/parents/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone, firstName, lastName, childTeamId }),
                  });
                  const data = await res.json();
                  if (!res.ok) { notify(data.error || "Помилка реєстрації"); setFormSubmitting(false); return; }
                  if (data.token) localStorage.setItem("parent_token", data.token);
                  if (data.contact) localStorage.setItem("parent_data", JSON.stringify({ contact: data.contact }));
                  setIsParent(true);
                  setActiveRoom("parents");
                  if (data.refLink) {
                    setRegSuccess({ firstName, hp: data.contact?.hp ?? 25, refLink: data.refLink, isNew: true });
                  }
                  doLogin(phone, firstName, lastName);
                } catch { notify("Помилка з'єднання"); setFormSubmitting(false); }
              }}
              style={{ padding: "8px 24px 32px", display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "5px" }}>Ім'я *</label>
                <input name="firstName" type="text" required placeholder="Іван" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "5px" }}>Прізвище *</label>
                <input name="lastName" type="text" required placeholder="Петренко" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "5px" }}>Номер телефону *</label>
                <input name="phone" type="tel" required placeholder="+380XXXXXXXXX" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "5px" }}>Команда дитини</label>
                <select name="childTeamId" style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none" }}>
                  <option value="">— Оберіть команду (необов'язково) —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={formSubmitting} style={{ padding: "12px", background: formSubmitting ? "#64748b" : "#f97316", color: "white", border: "none", borderRadius: "10px", cursor: formSubmitting ? "not-allowed" : "pointer", fontWeight: 800, fontSize: "15px", fontFamily: "Exo 2, sans-serif", marginTop: "4px" }}>
                {formSubmitting ? "Реєстрація..." : "Зареєструватись як батько"}
              </button>
              <button type="button" onClick={() => setFormMode("choose")} style={{ padding: "10px", background: "transparent", color: "#64748b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "Exo 2, sans-serif" }}>
                ← Назад
              </button>
            </form>
          </div>
        </div>
      );
    }

    // ── Player login form ─────────────────────────────────────────────
    {
      const inp2: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: "9px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "white", fontSize: "14px", fontFamily: "Exo 2, sans-serif", boxSizing: "border-box", outline: "none" };
      const lbl2: React.CSSProperties = { display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "5px" };
      return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" }}>
        <div style={{ width: "100%", maxWidth: "440px", background: "#1a2744", borderRadius: "20px", overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
          <div style={{ padding: "28px 24px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "44px" }}>🏀</div>
            <h1 style={{ color: "white", fontWeight: 800, fontSize: "22px", margin: "8px 0 4px", fontFamily: "Exo 2, sans-serif" }}>Я ГРАВЕЦЬ</h1>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Чат фанів Basket Lviv</p>
          </div>
          {notification && (
            <div style={{ margin: "0 24px 16px", padding: "10px 14px", background: "rgba(239,68,68,0.15)", borderRadius: "8px", color: "#fca5a5", fontSize: "13px" }}>
              {notification}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (formSubmitting) return;
              const fd = new FormData(e.currentTarget);
              const firstName = (fd.get("firstName") as string || "").trim();
              const lastName = (fd.get("lastName") as string || "").trim();
              const phone = (fd.get("phone") as string || "").trim();
              if (!firstName || !lastName || !phone) { notify("Заповніть всі поля"); return; }
              setFormSubmitting(true);
              localStorage.setItem(LS_KEY, JSON.stringify({ phone, firstName, lastName }));
              doLogin(phone, firstName, lastName, refCodeFromUrl ?? undefined, true).finally(() => setFormSubmitting(false));
            }}
            style={{ padding: "8px 24px 32px", display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div><label style={lbl2}>Ім'я *</label><input name="firstName" type="text" required placeholder="Ваше ім'я" style={inp2} /></div>
              <div><label style={lbl2}>Прізвище *</label><input name="lastName" type="text" required placeholder="Ваше прізвище" style={inp2} /></div>
            </div>
            <div>
              <label style={lbl2}>Номер телефону *</label>
              <input name="phone" type="text" required placeholder="Номер телефону" style={inp2} />
            </div>
            {teams.length > 0 && (
              <div>
                <label style={lbl2}>Команда</label>
                <select name="teamId" style={{ ...inp2, appearance: "none", WebkitAppearance: "none" }}>
                  <option value="">— Оберіть команду (необов'язково) —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            {refCodeFromUrl && (
              <div style={{ background: "rgba(244,111,16,0.12)", border: "1px solid rgba(244,111,16,0.3)", borderRadius: "9px", padding: "10px 14px", fontSize: "12px", color: "#f46f10" }}>
                🔗 Вас запросив учасник — при реєстрації він отримає бонус HP
              </div>
            )}
            <button type="submit" disabled={formSubmitting} style={{ padding: "12px", background: formSubmitting ? "#334155" : "#2563eb", color: "white", border: "none", borderRadius: "10px", cursor: formSubmitting ? "not-allowed" : "pointer", fontWeight: 800, fontSize: "15px", fontFamily: "Exo 2, sans-serif", marginTop: "4px" }}>
              {formSubmitting ? "Вхід..." : "Увійти до чату"}
            </button>
            <button type="button" onClick={() => setFormMode("choose")} style={{ padding: "10px", background: "transparent", color: "#64748b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "Exo 2, sans-serif" }}>
              ← Назад
            </button>
            <p style={{ textAlign: "center", fontSize: "12px", color: "#475569", margin: 0 }}>
              Якщо реєструвались — введіть той самий номер телефону
            </p>
            {/* HP Rules */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "12px" }}>
              <button
                type="button"
                onClick={() => setShowHpRules((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer", fontFamily: "Exo 2, sans-serif", padding: 0 }}
              >
                <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1px solid #475569", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#64748b", flexShrink: 0 }}>?</span>
                {showHpRules ? "Сховати правила HP" : "⚡ Правила нарахування HP"}
              </button>
              {showHpRules && (
                <div style={{ marginTop: "10px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px", fontSize: "12px", color: "#94a3b8", lineHeight: "1.6" }}>
                  <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#e2e8f0" }}>⚡ Як отримати HP:</p>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "6px", marginBottom: "6px" }}>
                    <span>🆕 Реєстрація в чаті ЛДБЛ</span>
                    <span style={{ color: "#f46f10", fontWeight: 700 }}>+25 HP</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "6px", marginBottom: "6px" }}>
                    <span>🔗 Хтось зареєструвався за вашим посиланням</span>
                    <span style={{ color: "#f46f10", fontWeight: 700 }}>+50 HP</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "6px", marginBottom: "8px" }}>
                    <span>☀️ Зайшов на сайт + написав в чаті (раз на добу)</span>
                    <span style={{ color: "#f46f10", fontWeight: 700 }}>+15 HP</span>
                  </div>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#e2e8f0" }}>🏆 Звання за HP:</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    {[["🔥", "100+ HP «Легенда»"], ["👑", "300+ HP «Рекрутер»"], ["🏆", "1000+ HP «Амбасадор»"]].map(([icon, label]) => (
                      <span key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "6px", padding: "3px 8px" }}>{icon} {label}</span>
                    ))}
                  </div>
                  <p style={{ margin: "8px 0 0", color: "#475569", fontSize: "11px" }}>
                    Реферальне посилання доступне після входу в чаті (права колонка)
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    );
    }
  }

  // ── Render: chat ──────────────────────────────────────────────────────
  // ── Mobile layout ──────────────────────────────────────────────────────
  // FIX: Use getIsMobileNow() for immediate viewport check (avoids race condition from useEffect)
  if (mounted && step === "chat" && user && getIsMobileNow()) {
    const badge = getBadge(user.hp);
    const userName = `${user.firstName} ${user.lastName}`;
    return (
      <ChatPageMobile
        user={user}
        messages={messages}
        members={members}
        shopItems={shopItems}
        shopTicker={shopTicker}
        onlineUsers={onlineUsers}
        onSendMessage={async (text: string) => {
          if (!user) return;
          setSending(true);
          try {
            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "message",
                phone: user.phone,
                name: `${user.firstName} ${user.lastName}`,
                text,
                roomId: activeRoom,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              // Update HP locally if server returns new value
              if (data.newHp != null) {
                setUser((u) => u ? { ...u, hp: data.newHp } : u);
              }
            } else {
              const d = await res.json();
              notify(d.error ?? "Помилка відправки");
            }
          } finally {
            setSending(false);
          }
        }}
      />
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────
  const badge = user ? getBadge(user.hp) : "";
  const userName = user ? `${user.firstName} ${user.lastName}` : "";

  return (
    <div style={{ display: "flex", flexDirection: "row", height: "100dvh", background: "#0f172a", color: "white", fontFamily: "Exo 2, sans-serif" }}>

      {/* ── Welcome / Referral modal ──────────────────────────────────────── */}
      {regSuccess && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setRegSuccess(null); }}>
          <div style={{ background: "linear-gradient(135deg, #1e2a4a, #1e3a5f)", borderRadius: "24px", width: "100%", maxWidth: "420px", padding: "32px 28px", fontFamily: "Exo 2, sans-serif", boxShadow: "0 32px 64px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ fontSize: "52px", marginBottom: "8px" }}>🎉</div>
              <h2 style={{ color: "white", fontWeight: 800, fontSize: "22px", margin: "0 0 6px" }}>
                Ласкаво просимо, {regSuccess.firstName}!
              </h2>
              {regSuccess.isNew && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(244,111,16,0.15)", border: "1px solid rgba(244,111,16,0.3)", borderRadius: "20px", padding: "4px 14px", fontSize: "13px", color: "#f46f10", fontWeight: 700 }}>
                  ⚡ +{regSuccess.hp} HP за реєстрацію
                </div>
              )}
            </div>

            {/* Ref link block */}
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "10px", fontWeight: 600 }}>
                🔗 Ваше реферальне посилання:
              </div>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "#e2e8f0", wordBreak: "break-all", marginBottom: "10px", lineHeight: "1.5" }}>
                {regSuccess.refLink}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(regSuccess.refLink).then(() => notify("✅ Посилання скопійовано!")).catch(() => notify("Не вдалось скопіювати"));
                }}
                style={{ width: "100%", padding: "10px", background: "#f97316", color: "white", border: "none", borderRadius: "9px", cursor: "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "Exo 2, sans-serif" }}
              >
                📋 Скопіювати посилання
              </button>
            </div>

            {/* Info */}
            <div style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: "10px", padding: "12px 14px", fontSize: "12px", color: "#93c5fd", lineHeight: "1.7", marginBottom: "20px" }}>
              За кожного друга, хто зареєструється за вашим посиланням — <strong>+50 HP вам!</strong>
            </div>

            <button
              onClick={() => setRegSuccess(null)}
              style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 800, fontSize: "15px", fontFamily: "Exo 2, sans-serif" }}
            >
              Перейти до чату →
            </button>
          </div>
        </div>
      )}

      {/* ── Main chat column ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", position: "relative" }}>

      {/* ── Room tabs ──────────────────────────────────────────────────── */}
      <div style={{ background: "#162035", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 16px", flexShrink: 0, display: "flex", gap: 0 }}>
        <button
          onClick={() => setActiveRoom("general")}
          style={{ padding: "8px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "13px", color: activeRoom === "general" ? "#f46f10" : "#94a3b8", borderBottom: activeRoom === "general" ? "2px solid #f46f10" : "2px solid transparent", transition: "all 0.15s" }}
        >
          💬 Балачка
        </button>
        <button
          onClick={() => {
            if (isParent || (user && user.isLeaguePlayer)) {
              setActiveRoom("parents");
            } else {
              notify("Зареєструйся як батько або гравець щоб приєднатись");
            }
          }}
          style={{ padding: "8px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "13px", color: activeRoom === "parents" ? "#f46f10" : "#94a3b8", borderBottom: activeRoom === "parents" ? "2px solid #f46f10" : "2px solid transparent", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "4px" }}
        >
          👨‍👩‍👦 Батьки {!isParent && !user?.isLeaguePlayer && <span style={{ fontSize: "10px" }}>🔒</span>}
        </button>
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ background: "#1e2a4a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "10px 16px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.08)", color: "white", textDecoration: "none", fontSize: 16, flexShrink: 0 }} title="На головну">←</a>
          <span style={{ fontSize: "20px" }}>💬</span>
          <span style={{ fontWeight: 800, fontSize: "18px" }}>{activeRoom === "parents" ? "👨‍👩‍👦 Чат батьків" : "Балачка"}</span>
          {/* MVP — обидві вкладки */}
          <button
            onClick={() => setShowMvp(true)}
            style={{ background: "#f46f10", color: "white", border: "none", borderRadius: "8px", padding: "4px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap" }}
          >
            🏅 Гравець MVP місяця
          </button>

          {activeRoom === "general" ? (
            <>
              <button
                onClick={() => { setShowSpin(true); setSpinState(spinDone ? "result" : "idle"); }}
                style={{ background: spinDone ? "#334155" : "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white", border: "none", borderRadius: "8px", padding: "4px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap", opacity: spinDone ? 0.7 : 1 }}
              >
                🎰 {spinDone ? "Спін ✓" : "Спін"}
              </button>
              <button
                onClick={() => {
                  console.log('[ChatPage] Струмок button clicked');
                  setShowRucheekGame(true);
                  console.log('[ChatPage] showRucheekGame set to true');
                }}
                style={{ background: "linear-gradient(135deg,#ea580c,#f46f10)", color: "white", border: "none", borderRadius: "8px", padding: "4px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap" }}
              >
                🏀 Струмок
              </button>
              <button
                onClick={() => openLeaderboard()}
                style={{ background: "linear-gradient(135deg,#0f766e,#0e7490)", color: "white", border: "none", borderRadius: "8px", padding: "4px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap" }}
              >
                🏅 Топ HP
              </button>
              {nextGame && (
                <button
                  onClick={() => setShowNextGame(true)}
                  style={{ background: "linear-gradient(135deg,#166534,#15803d)", color: "white", border: "none", borderRadius: "8px", padding: "4px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap", animation: "pulse 2s infinite" }}
                >
                  🏀 Сьогоднішній матч
                </button>
              )}
              <button
                onClick={() => setShowPorokhova(true)}
                style={{ background: "#16a34a", color: "white", border: "none", borderRadius: "8px", padding: "4px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}
              >
                🏀 Порохова
                {porokhovaList.length > 0 && (
                  <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: "10px", padding: "0px 7px", fontSize: "12px", fontWeight: 800 }}>
                    {porokhovaList.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setShowHpModal(true);
                  fetch("/api/chat/moderators").then(r => r.json()).then(d => setModalMods(d.moderators || [])).catch(() => {});
                }}
                style={{ background: "linear-gradient(135deg, #f59e0b, #f46f10)", color: "white", border: "none", borderRadius: "8px", padding: "4px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap", width: "fit-content", minWidth: "unset", marginLeft: "10px" }}
              >
                ⚡ Правила HP
              </button>
            </>
          ) : (
            <>
              <a
                href="/marketplace"
                style={{ background: "linear-gradient(135deg,#0f766e,#0e7490)", color: "white", border: "none", borderRadius: "8px", padding: "4px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
              >
                🛒 Барахолка
              </a>
              <a
                href="/marketplace"
                style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white", border: "none", borderRadius: "8px", padding: "4px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
              >
                🏆 Аукціон
              </a>
            </>
          )}
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
              ❤️ {user!.hp} HP{user!.warns > 0 && ` · ⚠️${user!.warns}`}{streak >= 3 && <span style={{ marginLeft: "6px" }} title={`Стрік ${streak} днів`}>🔥×{streak}</span>}
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

      {/* ── TV Block (Chat Column) ────────────────────────────────────────── */}
      <TvBlock userName={userName} onSendMessage={sendSpecial} />

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", paddingRight: "52%", display: "flex", flexDirection: "column", gap: "4px" }}>
        {/* ── Active Poll Block ──────────────────────────────────────────── */}
        {activePoll && user && (
          <ChatActivePoll
            poll={activePoll}
            userPhone={user.phone}
            userName={`${user.firstName} ${user.lastName}`}
            onPollUpdated={(updated) => setActivePoll(updated)}
          />
        )}

        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#475569", fontSize: "13px", marginTop: "48px" }}>
            Поки немає повідомлень. Будьте першим! 🏀
          </div>
        )}

        {messages.filter((msg) => {
          const t = msg.text || "";
          return !t.startsWith("[POROKHOVA:") && !t.startsWith("[POLL:") && !t.startsWith("[VOTE:");
        }).map((msg) => {
          const isMe = msg.phone === user!.phone;
          const summary = reactionSummary(msg.reactions);
          const mine = myReactions(msg.reactions);
          const canDelete = isMe || user!.isMod;

          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }} className="group">
              {!isMe && (
                <div style={{ fontSize: "11px", color: msg.isMod ? "#3b82f6" : "#64748b", marginBottom: "2px", paddingLeft: "4px", alignSelf: "center", display: "flex", alignItems: "center", gap: "3px" }}>
                  {msg.name}
                  {msg.isMod && <span style={{ fontSize: "10px", background: "rgba(59,130,246,0.18)", color: "#93c5fd", borderRadius: "4px", padding: "0 4px", fontWeight: 700, letterSpacing: "0.03em" }}>🛡️ MOD</span>}
                </div>
              )}
              {msg.replyTo && (
                <div style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", marginBottom: "2px", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: "rgba(255,255,255,0.04)", color: "#94a3b8", borderLeft: "2px solid #f46f10" }}>
                  <strong>{msg.replyTo.name}:</strong> {msg.replyTo.text}
                </div>
              )}

              <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "4px", flexDirection: "row" }}>
                {/* Bubble */}
                <div
                  style={{ padding: msg.text.startsWith("[STICKER:") || msg.text.startsWith("[IMAGE:") || msg.text.startsWith("[GIF:") ? "4px" : "9px 13px", borderRadius: "16px", fontSize: "14px", maxWidth: "280px", wordBreak: "break-word", lineHeight: 1.4, background: isMe ? "#f46f10" : "rgba(255,255,255,0.08)", cursor: "pointer" }}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY }); }}
                >
                  {msg.text.startsWith("[STICKER:") ? (
                    <img src={msg.text.slice(9, -1)} alt="sticker" crossOrigin="anonymous" style={{ width: 100, height: 100, objectFit: "contain", display: "block", borderRadius: "8px" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.background = "rgba(255,100,100,0.2)"; (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }} />
                  ) : msg.text.startsWith("[IMAGE:") ? (
                    <img src={msg.text.slice(7, -1)} alt="photo" style={{ maxWidth: 220, maxHeight: 220, borderRadius: "10px", display: "block", objectFit: "cover" }} />
                  ) : msg.text.startsWith("[GIF:") ? (
                    <img src={msg.text.slice(5, -1)} alt="gif" style={{ maxWidth: 120, maxHeight: 120, borderRadius: "10px", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : msg.text}
                </div>
                {/* Quick actions (hover) */}
                <div style={{ display: "flex", gap: "2px", opacity: 0 }} className="msg-actions">
                  <QuickBtn onClick={(e) => { e.stopPropagation(); setEmojiTarget(emojiTarget === msg.id ? null : msg.id); }}>😊</QuickBtn>
                  <QuickBtn onClick={(e) => { e.stopPropagation(); setReplyTo(msg); inputRef.current?.focus(); }}>↩️</QuickBtn>
                  {canDelete && <QuickBtn onClick={(e) => { e.stopPropagation(); handleDeleteMsg(msg.id); }}>🗑️</QuickBtn>}
                  {user!.isMod && !isMe && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleMod("ban", msg.phone, { reason: "бан", minutes: 5 }); }}
                        style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5", borderRadius: "6px", fontSize: "10px", fontWeight: 700, cursor: "pointer", padding: "2px 6px", fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap" }}
                        title="Бан 5 хвилин">🔨 5хв</button>
                      <button onClick={(e) => { e.stopPropagation(); handleMod("ban", msg.phone, { reason: "бан", hours: 1 }); }}
                        style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5", borderRadius: "6px", fontSize: "10px", fontWeight: 700, cursor: "pointer", padding: "2px 6px", fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap" }}
                        title="Бан 1 годину">🔨 1год</button>
                      <button onClick={(e) => { e.stopPropagation(); handleMod("ban", msg.phone, { reason: "бан", hours: 24 }); }}
                        style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.5)", color: "#f87171", borderRadius: "6px", fontSize: "10px", fontWeight: 700, cursor: "pointer", padding: "2px 6px", fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap" }}
                        title="Бан 1 день">🔨 1день</button>
                    </>
                  )}
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
                <CtxItem onClick={() => { handleMod("warn", msg.phone, { reason: "порушення правил" }); setContextMenu(null); }}>⚠️ Варнінг</CtxItem>
                <CtxItem onClick={() => { handleMod("mute", msg.phone, { minutes: 30 }); setContextMenu(null); }}>🔇 Мют 30хв</CtxItem>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                <CtxItem onClick={() => { handleMod("ban", msg.phone, { reason: "бан", minutes: 15 }); setContextMenu(null); }} danger>🚫 Бан 15хв</CtxItem>
                <CtxItem onClick={() => { handleMod("ban", msg.phone, { reason: "бан", hours: 24 }); setContextMenu(null); }} danger>🚫 Бан 24г</CtxItem>
                <CtxItem onClick={() => { handleMod("ban", msg.phone, { reason: "бан" }); setContextMenu(null); }} danger>🚫 Бан назавжди</CtxItem>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                <CtxItem onClick={() => {
                  fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pin", phone: user!.phone, text: msg.text }) });
                  setContextMenu(null); notify("📌 Повідомлення закріплено");
                }}>📌 Закріпити</CtxItem>
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

      {/* ── HP Rules Modal ────────────────────────────────────────────────── */}
      {showHpModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowHpModal(false); }}
        >
          <div style={{ background: "#0f1623", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", width: "100%", maxWidth: "460px", padding: "24px", maxHeight: "85vh", overflowY: "auto", fontFamily: "Exo 2, sans-serif" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "white" }}>⚡ Правила нарахування HP</h2>
              <button onClick={() => setShowHpModal(false)} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "#94a3b8", cursor: "pointer", width: 32, height: 32, borderRadius: "8px", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>

            {/* Section: earn / lose */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>💰 Способи отримати / втратити HP</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { icon: "🆕", text: "Реєстрація в чаті ЛДБЛ (перший вхід)", hp: "+25", plus: true },
                  { icon: "🔗", text: "Хтось зареєструвався за твоїм реферальним посиланням", hp: "+50", plus: true },
                  { icon: "☀️", text: "Зайшов на сайт + написав повідомлення в чаті (раз на добу)", hp: "+15", plus: true },
                  { icon: "🥇", text: "Перший хто зайшов і написав коментар за день", hp: "+25", plus: true },
                  { icon: "😴", text: "Не заходив у чат 1 день", hp: "−10", plus: false },
                ].map(({ icon, text, hp, plus }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "10px 12px" }}>
                    <span style={{ fontSize: "18px", flexShrink: 0 }}>{icon}</span>
                    <span style={{ flex: 1, fontSize: "13px", color: "#cbd5e1", lineHeight: 1.4 }}>{text}</span>
                    <span style={{ fontWeight: 800, fontSize: "14px", flexShrink: 0, color: plus ? "#4ade80" : "#f87171" }}>{hp} HP</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section: rankings */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>🏆 Рейтинг та звання</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { place: "🔥", rank: "3-є місце", hp: "100 HP", title: "«Легенда ліги»" },
                  { place: "👑", rank: "2-е місце", hp: "300 HP", title: "«Рекрутер»" },
                  { place: "🏆", rank: "1-е місце", hp: "1000 HP", title: "«Амбасадор клубу»" },
                ].map(({ place, rank, hp, title }) => (
                  <div key={rank} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "10px 12px" }}>
                    <span style={{ fontSize: "22px", flexShrink: 0 }}>{place}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>{rank} — {hp}</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>{title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section: moderators */}
            <div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>🛡️ Модератори чату</div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {modalMods.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "#475569", textAlign: "center", padding: "4px 0" }}>Модераторів ще немає</div>
                ) : (
                  modalMods.map((m) => (
                    <div key={m.phone} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#a78bfa", flexShrink: 0 }}>
                        {(m.name || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>🛡️ {m.name}</div>
                      </div>
                      <span style={{ fontSize: "10px", background: "rgba(124,58,237,0.2)", color: "#a78bfa", padding: "2px 8px", borderRadius: "99px", fontWeight: 700 }}>МОД</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section: mod functionality */}
            <div style={{ marginTop: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>🔨 Функціонал модератора</div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                  Кнопки бану видимі <strong style={{ color: "white" }}>тільки модератору</strong> — з&apos;являються при наведенні на повідомлення:
                </div>
                {[
                  { label: "🔨 Бан 5 хв", desc: "Короткий бан — порушення тону" },
                  { label: "🔨 Бан 1 год", desc: "Середній бан — повторне порушення" },
                  { label: "🔨 Бан 1 день", desc: "Серйозне порушення правил" },
                ].map(({ label, desc }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", borderRadius: "6px", fontSize: "11px", fontWeight: 700, padding: "3px 10px", whiteSpace: "nowrap" }}>{label}</span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* My reflink reminder */}
            <div style={{ marginTop: "16px", background: "rgba(244,111,16,0.1)", border: "1px solid rgba(244,111,16,0.25)", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#f46f10" }}>
              🔗 Своє реферальне посилання знайдеш внизу правої колонки учасників
            </div>
          </div>
        </div>
      )}

      {/* ── MVP Modal ─────────────────────────────────────────────────────── */}
      {showMvp && (() => {
        const monthNames = ["Січень","Лютий","Березень","Квітень","Травень","Червень","Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"];
        const now = new Date();
        const monthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
        const topMvp = mvpResults[0] ?? null;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowMvp(false); }}>
            <div style={{ background: "#1e2a4a", borderRadius: "20px", width: "100%", maxWidth: "400px", padding: "24px", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, fontFamily: "Exo 2, sans-serif" }}>🏅 Гравець MVP місяця</h2>
                <button onClick={() => setShowMvp(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>

              {/* MVP поточного місяця */}
              <div style={{ marginBottom: "16px", padding: "14px", background: "rgba(244,111,16,0.08)", border: "1px solid rgba(244,111,16,0.25)", borderRadius: "14px" }}>
                <div style={{ fontSize: "11px", color: "#f46f10", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", fontFamily: "Exo 2, sans-serif" }}>
                  📅 {monthLabel}
                </div>
                {topMvp ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "54px", height: "54px", borderRadius: "50%", overflow: "hidden", background: "#0f1829", border: "2px solid #f46f10", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {topMvp.photoUrl ? (
                        <img src={topMvp.photoUrl} alt={topMvp.playerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: "26px" }}>🏀</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "white", fontFamily: "Exo 2, sans-serif" }}>{topMvp.playerName}</div>
                      <div style={{ fontSize: "13px", color: "#f46f10", fontWeight: 700, fontFamily: "Exo 2, sans-serif" }}>🗳️ {topMvp.votes} голос{topMvp.votes === 1 ? "" : topMvp.votes < 5 ? "и" : "ів"}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#64748b", fontSize: "13px", fontFamily: "Exo 2, sans-serif" }}>Голосування ще не розпочато</div>
                )}
              </div>

              {user!.mvpVote ? (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>✅</div>
                  <p style={{ color: "#94a3b8", margin: 0, fontFamily: "Exo 2, sans-serif", fontSize: "14px" }}>Ви вже проголосували цього місяця</p>
                  <p style={{ fontWeight: 700, color: "#f46f10", margin: "8px 0 0", fontFamily: "Exo 2, sans-serif" }}>Ваш вибір: {user!.mvpVote}</p>
                  {/* Поточні результати */}
                  {mvpResults.length > 1 && (
                    <div style={{ marginTop: "14px", textAlign: "left" }}>
                      {mvpResults.slice(1, 5).map((r, i) => (
                        <div key={r.playerName} style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "12px", marginBottom: "3px", fontFamily: "Exo 2, sans-serif" }}>
                          <span>{i + 2}. {r.playerName}</span>
                          <span style={{ color: "#f46f10" }}>{r.votes} гол.</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 10px", fontFamily: "Exo 2, sans-serif" }}>
                    Виберіть найкращого гравця місяця:
                  </p>
                  <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    {players.length === 0 ? (
                      <div style={{ color: "#64748b", textAlign: "center", padding: "20px 0", fontFamily: "Exo 2, sans-serif" }}>Список гравців не завантажено</div>
                    ) : players.map((p) => {
                      const name = `${p.firstName} ${p.lastName}`;
                      const voteInfo = mvpResults.find((r) => r.playerName === name);
                      return (
                        <button key={p.id} onClick={() => handleMvpVote(name)}
                          style={{ padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "9px", color: "white", cursor: "pointer", textAlign: "left", fontSize: "14px", fontFamily: "Exo 2, sans-serif", transition: "background 0.15s", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,111,16,0.15)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
                        >
                          <span>🏀 {name}</span>
                          {voteInfo && <span style={{ fontSize: "12px", color: "#f46f10", fontWeight: 700 }}>{voteInfo.votes} гол.</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Spin Modal ───────────────────────────────────────────────────── */}
      {showSpin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSpin(false); }}>
          <div style={{ background: "#1e2a4a", borderRadius: "20px", width: "100%", maxWidth: "360px", padding: "24px", textAlign: "center", fontFamily: "Exo 2, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "white" }}>🎰 Щоденний спін</h2>
              <button onClick={() => setShowSpin(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 12px" }}>Раз на день — крути і отримуй HP!</p>

            {/* Spin wheel SVG */}
            {spinState !== "result" ? (
              <div style={{ position: "relative", display: "inline-block", margin: "0 auto 16px" }}>
                {/* Pointer triangle */}
                <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "18px solid #f46f10", zIndex: 10 }} />
                <svg width="240" height="240" viewBox="0 0 240 240" style={{ display: "block", transition: spinState === "spinning" ? "transform 4s cubic-bezier(0.17,0.67,0.12,0.99)" : "none", transform: `rotate(${spinAngle}deg)`, transformOrigin: "120px 120px" }}>
                  {SPIN_SECTORS.map((sector, i) => {
                    const total = SPIN_SECTORS.length;
                    const angleStep = (2 * Math.PI) / total;
                    const startAngle = i * angleStep - Math.PI / 2;
                    const endAngle = startAngle + angleStep;
                    const r = 110;
                    const cx = 120, cy = 120;
                    const x1 = cx + r * Math.cos(startAngle);
                    const y1 = cy + r * Math.sin(startAngle);
                    const x2 = cx + r * Math.cos(endAngle);
                    const y2 = cy + r * Math.sin(endAngle);
                    const midAngle = startAngle + angleStep / 2;
                    const lx = cx + (r * 0.65) * Math.cos(midAngle);
                    const ly = cy + (r * 0.65) * Math.sin(midAngle);
                    return (
                      <g key={i}>
                        <path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`} fill={sector.color} stroke="#0f172a" strokeWidth="1.5" />
                        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="Exo 2, sans-serif">{sector.label}</text>
                      </g>
                    );
                  })}
                  <circle cx="120" cy="120" r="18" fill="#0f172a" stroke="#f46f10" strokeWidth="3" />
                  <text x="120" y="120" textAnchor="middle" dominantBaseline="middle" fill="#f46f10" fontSize="11" fontWeight="900" fontFamily="Exo 2, sans-serif">HP</text>
                </svg>
              </div>
            ) : (
              <div style={{ fontSize: "52px", margin: "16px 0" }}>🎉</div>
            )}

            {spinState === "result" && spinResult !== null && (
              <div style={{ background: "linear-gradient(135deg,#14532d,#166534)", borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#4ade80" }}>+{spinResult} HP</div>
                <div style={{ color: "#86efac", fontSize: "13px", marginTop: 4 }}>Нараховано до вашого рахунку!</div>
              </div>
            )}

            {spinDone && spinState !== "spinning" ? (
              <div style={{ color: "#64748b", fontSize: "13px", marginBottom: 8 }}>✅ Сьогодні вже крутили. Повертайтесь завтра!</div>
            ) : (
              <button
                onClick={handleSpin}
                disabled={spinState === "spinning" || spinDone}
                style={{ width: "100%", padding: "12px", borderRadius: "10px", fontWeight: 800, fontSize: "15px", cursor: spinState === "spinning" || spinDone ? "not-allowed" : "pointer", background: spinState === "spinning" ? "#334155" : "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white", border: "none", fontFamily: "Exo 2, sans-serif", opacity: spinState === "spinning" ? 0.7 : 1 }}
              >
                {spinState === "spinning" ? "Крутиться..." : "🎰 Крутити!"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Leaderboard Modal ────────────────────────────────────────────── */}
      {showLeaderboard && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLeaderboard(false); }}>
          <div style={{ background: "#1e2a4a", borderRadius: "20px", width: "100%", maxWidth: "360px", padding: "24px", fontFamily: "Exo 2, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>🏅 Таблиця лідерів HP</h2>
              <button onClick={() => setShowLeaderboard(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {/* Mode switcher */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 4 }}>
              <button
                onClick={() => openLeaderboard("weekly")}
                style={{ flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.15s", background: leaderboardMode === "weekly" ? "#f46f10" : "transparent", color: leaderboardMode === "weekly" ? "white" : "#94a3b8" }}
              >
                📅 Цей тиждень
              </button>
              <button
                onClick={() => openLeaderboard("alltime")}
                style={{ flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.15s", background: leaderboardMode === "alltime" ? "#0e7490" : "transparent", color: leaderboardMode === "alltime" ? "white" : "#94a3b8" }}
              >
                🏆 Весь час
              </button>
            </div>

            {/* Week label */}
            {leaderboardMode === "weekly" && leaderboardWeekStart && (
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12, textAlign: "center" }}>
                Тиждень з {new Date(leaderboardWeekStart).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })}
              </div>
            )}

            {leaderboard.length === 0 ? (
              <div style={{ color: "#475569", textAlign: "center", padding: "20px 0" }}>
                {leaderboardMode === "weekly" ? "Цього тижня ще немає активності" : "Завантаження..."}
              </div>
            ) : leaderboard.map((m, i) => {
              const av = getAvatar(m.hp);
              const medals = ["🥇", "🥈", "🥉"];
              const isMe = m.phone === user!.phone;
              const displayHp = leaderboardMode === "weekly" ? (m.weeklyHp ?? 0) : m.hp;
              return (
                <div key={m.phone} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px", marginBottom: "6px", background: isMe ? "rgba(244,111,16,0.12)" : i < 3 ? "rgba(255,255,255,0.04)" : "transparent", border: isMe ? "1px solid rgba(244,111,16,0.3)" : "1px solid transparent" }}>
                  <div style={{ width: "28px", textAlign: "center", fontSize: "18px", flexShrink: 0 }}>{medals[i] ?? `${i + 1}.`}</div>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: i === 0 ? "#b45309" : i === 1 ? "#374151" : i === 2 ? "#7c2d12" : "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                    {av ? av.emoji : (m.firstName?.[0] || "?").toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: isMe ? "#f46f10" : "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {getBadge(m.hp) && <span style={{ marginRight: "4px" }}>{getBadge(m.hp)}</span>}
                      {m.firstName} {m.lastName}{isMe && " (я)"}
                    </div>
                    {av && <div style={{ fontSize: "10px", color: "#64748b" }}>{av.emoji} {av.label}</div>}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#fb923c" : "#f46f10", flexShrink: 0 }}>
                    +{displayHp} HP
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Next Game Modal ──────────────────────────────────────────────── */}
      {showNextGame && nextGame && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNextGame(false); }}>
          <div style={{ background: "#1e2a4a", borderRadius: "20px", width: "100%", maxWidth: "400px", padding: "24px", fontFamily: "Exo 2, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>🏀 Сьогоднішній матч</h2>
              <button onClick={() => setShowNextGame(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {/* Match card */}
            <div style={{ background: "rgba(21,128,61,0.12)", border: "1px solid rgba(21,128,61,0.35)", borderRadius: "14px", padding: "18px", marginBottom: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#22c55e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                {nextGame.season.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "10px" }}>
                <div style={{ flex: 1, textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: "white" }}>{nextGame.homeTeam.name}</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>господарі</div>
                </div>
                <div style={{ fontSize: "22px", fontWeight: 900, color: "#f46f10", padding: "0 4px" }}>VS</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: "white" }}>{nextGame.awayTeam.name}</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>гості</div>
                </div>
              </div>
              <div style={{ fontSize: "14px", color: "#94a3b8" }}>
                🕐 {new Date(nextGame.scheduledAt).toLocaleString("uk-UA", { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* Attend button */}
            {(() => {
              const isAttending = gameAttendees.some((a) => a.phone === user!.phone);
              return (
                <button onClick={handleGameAttend}
                  style={{ width: "100%", padding: "12px", background: isAttending ? "#166534" : "linear-gradient(135deg,#16a34a,#15803d)", border: isAttending ? "2px solid #22c55e" : "none", borderRadius: "10px", color: "white", fontWeight: 800, fontSize: "15px", cursor: "pointer", fontFamily: "Exo 2, sans-serif", marginBottom: "16px" }}>
                  {isAttending ? "✅ Я буду! (зняти відмітку)" : "🙋 Я там буду!"}
                </button>
              );
            })()}

            {/* Attendees list */}
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                Підуть на матч ({gameAttendees.length}):
              </div>
              {gameAttendees.length === 0 ? (
                <div style={{ color: "#334155", fontSize: "13px", textAlign: "center", padding: "12px 0" }}>
                  Поки ніхто не відмітився. Будь першим! 🏀
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                  {gameAttendees.map((a, i) => (
                    <div key={a.phone} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", background: a.phone === user!.phone ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)", border: a.phone === user!.phone ? "1px solid rgba(34,197,94,0.3)" : "1px solid transparent" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "white", flexShrink: 0 }}>
                        {a.name[0]?.toUpperCase() || "?"}
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: a.phone === user!.phone ? 700 : 400, color: a.phone === user!.phone ? "#22c55e" : "white" }}>
                        {i + 1}. {a.name}{a.phone === user!.phone ? " (я)" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Poll Modal ────────────────────────────────────────────────────── */}
      {showPoll && (
        <div onClick={() => setShowPoll(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#1e2a4a", borderRadius: "20px", width: "100%", maxWidth: "380px", padding: "24px", fontFamily: "Exo 2, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>📊 {activePoll ? activePoll.question : "Створити опитування"}</h2>
              <button onClick={() => setShowPoll(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            {!activePoll ? (
              <>
                <input placeholder="Питання..." value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #334", background: "#0f172a", color: "white", fontSize: "14px", marginBottom: "12px", boxSizing: "border-box" }} />
                {pollOptions.map((opt, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input placeholder={`Варіант ${i + 1}`} value={opt}
                      onChange={(e) => { const next = [...pollOptions]; next[i] = e.target.value; setPollOptions(next); }}
                      style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #334", background: "#0f172a", color: "white", fontSize: "14px" }} />
                    {pollOptions.length > 2 && (
                      <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                        style={{ background: "#7f1d1d", border: "none", borderRadius: "6px", color: "white", padding: "0 10px", cursor: "pointer" }}>✕</button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 5 && (
                  <button onClick={() => setPollOptions([...pollOptions, ""])}
                    style={{ background: "transparent", border: "1px dashed #334", color: "#aaa", borderRadius: "8px", padding: "8px", width: "100%", cursor: "pointer", marginBottom: "12px", fontSize: "13px" }}>
                    + Додати варіант
                  </button>
                )}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => setShowPoll(false)}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #334", background: "transparent", color: "#aaa", cursor: "pointer" }}>
                    Скасувати
                  </button>
                  <button
                    onClick={() => {
                      const valid = pollOptions.filter((o) => o.trim());
                      if (!pollQuestion.trim()) {
                        notify("Заповніть питання");
                        return;
                      }
                      if (valid.length < 2) {
                        notify("Потрібно мінімум 2 варіанти");
                        return;
                      }
                      if (!user) {
                        notify("Помилка: користувач не знайдений");
                        return;
                      }

                      startTransition(async () => {
                        try {
                          const result = await createChatPoll(
                            pollQuestion.trim(),
                            valid,
                            user.phone,
                            `${user.firstName} ${user.lastName}`
                          );

                          if (!result) {
                            notify("❌ Помилка створення опитування");
                            console.error("[Poll] createChatPoll returned null");
                            return;
                          }

                          setActivePoll(result);
                          setPollQuestion("");
                          setPollOptions(["", ""]);
                          setShowPoll(false);
                          notify("✅ Опитування створено!");

                          try {
                            await sendSpecial(
                              `[POLL:${JSON.stringify({ q: result.question, opts: result.options })}]`
                            );
                          } catch (err) {
                            console.error("[Poll] sendSpecial failed:", err);
                          }
                        } catch (err) {
                          console.error("[Poll] Create failed:", err);
                          notify(`❌ Помилка: ${err instanceof Error ? err.message : "невідома помилка"}`);
                        }
                      });
                    }}
                    disabled={isPending}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: "none",
                      background: isPending ? "#9ca3af" : "#2563eb",
                      color: "white",
                      fontWeight: 700,
                      cursor: isPending ? "wait" : "pointer",
                      opacity: isPending ? 0.7 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    {isPending ? "⏳ Створюю..." : "Створити 🗳️"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 16px" }}>
                  Автор: {activePoll.createdBy} · Голосів: {Object.keys(activePoll.votes).length}
                </p>
                {activePoll.options.map((opt, i) => {
                  const total = Object.keys(activePoll.votes).length;
                  const cnt = Object.values(activePoll.votes).filter((v) => v === i).length;
                  const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                  const voted = activePoll.votes[user!.phone] === i;
                  const hasVoted = user!.phone in activePoll.votes;
                  return (
                    <button key={i} onClick={() => {
                      if (hasVoted) return;
                      setActivePoll({ ...activePoll, votes: { ...activePoll.votes, [user!.phone]: i } });
                    }}
                      style={{ width: "100%", marginBottom: "8px", padding: "10px 14px", borderRadius: "8px", border: voted ? "2px solid #2563eb" : "1px solid #334", background: voted ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.04)", color: "white", cursor: hasVoted ? "default" : "pointer", textAlign: "left", position: "relative", overflow: "hidden", fontSize: "14px" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "rgba(37,99,235,0.2)", transition: "width 0.3s" }} />
                      <span style={{ position: "relative" }}>{voted ? "✓ " : ""}{opt}</span>
                      <span style={{ position: "relative", float: "right", color: "#60a5fa", fontWeight: 700 }}>{pct}%</span>
                    </button>
                  );
                })}
                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button onClick={() => setShowPoll(false)}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #334", background: "transparent", color: "#aaa", cursor: "pointer" }}>Закрити</button>
                  {activePoll.createdBy === `${user!.firstName} ${user!.lastName}` && (
                    <button onClick={async () => {
                      await finishChatPoll(activePoll.id);
                      setActivePoll(null);
                      setShowPoll(false);
                    }}
                      style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#7f1d1d", color: "white", cursor: "pointer" }}>🗑️ Завершити</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Porokhova Modal ───────────────────────────────────────────────── */}
      {showPorokhova && (
        <div onClick={() => setShowPorokhova(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#1e2a4a", border: "2px solid #16a34a", borderRadius: "20px", padding: "28px", width: "420px", maxWidth: "92vw", fontFamily: "Exo 2, sans-serif", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>🏀</div>
              <h2 style={{ color: "#16a34a", margin: 0, fontSize: "22px" }}>Хто на Порохову?</h2>
              <p style={{ color: "#888", fontSize: "13px", margin: "6px 0 0" }}>Баскетбольний майданчик · вул. Порохова</p>
            </div>
            {([
              { status: "їду" as const,        emoji: "✅", label: "Їду!",               color: "#16a34a" },
              { status: "їду_20" as const,     emoji: "⏱️", label: "Їду через 20 хвилин", color: "#d97706" },
              { status: "потрібен_1" as const, emoji: "🙋", label: "Потрібен +1 гравець", color: "#2563eb" },
            ] as const).map(({ status, emoji, label, color }) => {
              const myEntry = porokhovaList.find((p) => p.phone === user!.phone);
              const isSelected = myEntry?.status === status;
              const group = porokhovaList.filter((p) => p.status === status);
              const cnt = group.length;
              return (
                <div key={status} style={{ marginBottom: "12px" }}>
                  <button
                    disabled={porokhovaLoading}
                    onClick={async () => {
                      setPorokhovaLoading(true);
                      try {
                        if (isSelected) {
                          // деселект — видалити свою відмітку
                          await fetch("/api/playground/checkin", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ phone: user!.phone }),
                          });
                          setPorokhovaList(prev => prev.filter(p => p.phone !== user!.phone));
                        } else {
                          // вибрати / змінити статус
                          const res = await fetch("/api/playground/checkin", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ phone: user!.phone, name: userName, status }),
                          });
                          const data = await res.json();
                          if (data.checkin) {
                            setPorokhovaList(prev => {
                              const filtered = prev.filter(p => p.phone !== user!.phone);
                              return [...filtered, data.checkin];
                            });
                          }
                        }
                      } finally {
                        setPorokhovaLoading(false);
                      }
                    }}
                    style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: isSelected ? `2px solid ${color}` : "1px solid #334", background: isSelected ? `${color}22` : "rgba(255,255,255,0.04)", color: "white", cursor: porokhovaLoading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "15px", fontFamily: "Exo 2, sans-serif", fontWeight: isSelected ? 700 : 400 }}>
                    <span>{emoji} {label}</span>
                    {cnt > 0 && (
                      <span style={{ background: color, borderRadius: "20px", padding: "2px 10px", fontSize: "13px", fontWeight: 700 }}>
                        {cnt} {cnt === 1 ? "гравець" : cnt < 5 ? "гравці" : "гравців"}
                      </span>
                    )}
                  </button>
                  {cnt > 0 && (
                    <div style={{ paddingLeft: "12px", paddingTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {group.map((p) => (
                        <div key={p.phone} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: p.phone === user!.phone ? color : "#cbd5e1" }}>
                          <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: `${color}33`, border: `1px solid ${color}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0 }}>
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                          <span>{p.name}{p.phone === user!.phone ? " (ти)" : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => setShowPorokhova(false)}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #334", background: "transparent", color: "#aaa", cursor: "pointer", fontFamily: "Exo 2, sans-serif" }}>
                Закрити
              </button>
              {user?.isMod && (
                <button onClick={async () => {
                  if (!confirm("Скинути всі відмітки?")) return;
                  await fetch("/api/playground/reset", { method: "POST", headers: { "x-mod-phone": user!.phone } });
                  setPorokhovaList([]);
                }}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#7f1d1d", color: "white", cursor: "pointer", fontFamily: "Exo 2, sans-serif" }}>
                  🗑️ Скинути всі
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Input bar ─────────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#1e2a4a", padding: "6px 10px", flexShrink: 0, position: "relative" }} ref={panelRef}>

        {/* Sticker panel — 😊 Meme + ✨ Animated + 🎭 Cool */}
        {openPanel === "sticker" && (
          <div style={{ position: "absolute", bottom: "100%", left: "10px", width: "360px", background: "#1e2a4a", border: "1px solid #f46f10", borderRadius: "12px", zIndex: 100, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            {/* Tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "8px 8px 0" }}>
              {([{ key: "meme", label: "😊 Звичайні" }, { key: "animated", label: "✨ Animated" }, { key: "cool", label: "🎭 Cool" }, { key: "classic", label: "🧌 Класичні" }, { key: "cat", label: "🐱 Cat" }, { key: "pepe", label: "🐸 Жаби" }] as const).map((t) => (
                <button key={t.key} onClick={() => setStickerTab(t.key)}
                  style={{ padding: "3px 8px", borderRadius: "6px", border: stickerTab === t.key ? "none" : "1px solid #334", background: stickerTab === t.key ? "#f46f10" : "transparent", color: stickerTab === t.key ? "white" : "#aaa", cursor: "pointer", fontSize: "11px", fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap" }}>
                  {t.label}
                </button>
              ))}
            </div>
            {/* Content */}
            <div style={{ padding: "8px", maxHeight: "270px", overflowY: "auto" }}>
              {stickerTab === "meme" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
                  {MEME_STICKERS.map((url) => (
                    <button key={url} onClick={() => sendSpecial(`[STICKER:${url}]`)}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px", cursor: "pointer", padding: "3px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "62px" }}>
                      <img src={url} alt="sticker" crossOrigin="anonymous" style={{ width: 56, height: 56, objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; (e.currentTarget as HTMLImageElement).parentElement!.style.background = "rgba(255,100,100,0.2)"; }} />
                    </button>
                  ))}
                </div>
              ) : stickerTab === "animated" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
                  {ANIMATED_EMOJIS.map((item) => (
                    <button key={item.url} onClick={() => sendSpecial(`[GIF:${item.url}]`)}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px", cursor: "pointer", padding: "3px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70px" }}>
                      <img src={item.url} width={64} height={64} title={item.name} crossOrigin="anonymous"
                        style={{ objectFit: "contain", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; (e.currentTarget as HTMLImageElement).parentElement!.style.background = "rgba(255,100,100,0.2)"; }} />
                    </button>
                  ))}
                </div>
              ) : stickerTab === "cool" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
                  {COOL_GIFS.map((url) => (
                    <button key={url} onClick={() => sendSpecial(`[GIF:${url}]`)}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px", cursor: "pointer", padding: "0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70px" }}>
                      <img src={url} alt="gif" crossOrigin="anonymous" style={{ width: 64, height: 64, objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; (e.currentTarget as HTMLImageElement).parentElement!.style.background = "rgba(255,100,100,0.2)"; }} />
                    </button>
                  ))}
                </div>
              ) : stickerTab === "classic" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
                  {CLASSIC_MEMES.map((item) => (
                    <button key={item.url} onClick={() => sendSpecial(`[GIF:${item.url}]`)}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px", cursor: "pointer", padding: "3px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "62px" }}>
                      <img src={item.url} alt={item.name} title={item.name} crossOrigin="anonymous" style={{ width: 56, height: 56, objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; (e.currentTarget as HTMLImageElement).parentElement!.style.background = "rgba(255,100,100,0.2)"; }} />
                    </button>
                  ))}
                </div>
              ) : stickerTab === "cat" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
                  {CAT_GIFS.map((url) => (
                    <button key={url} onClick={() => sendSpecial(`[GIF:${url}]`)}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px", cursor: "pointer", padding: "0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70px" }}>
                      <img src={url} alt="cat" crossOrigin="anonymous" style={{ width: 64, height: 64, objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; (e.currentTarget as HTMLImageElement).parentElement!.style.background = "rgba(255,100,100,0.2)"; }} />
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
                  {PEPE_GIFS.map((url) => (
                    <button key={url} onClick={() => sendSpecial(`[GIF:${url}]`)}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px", cursor: "pointer", padding: "0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70px" }}>
                      <img src={url} alt="pepe" crossOrigin="anonymous" style={{ width: 64, height: 64, objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; (e.currentTarget as HTMLImageElement).parentElement!.style.background = "rgba(255,100,100,0.2)"; }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* GIF panel — 🦜 Parrots only */}
        {openPanel === "gif" && (
          <div style={{ position: "absolute", bottom: "100%", left: "10px", width: "320px", background: "#1e2a4a", border: "1px solid #f46f10", borderRadius: "12px", padding: "8px", maxHeight: "280px", overflowY: "auto", zIndex: 100 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "5px" }}>
              {PARROTS.map((url) => (
                <button key={url} onClick={() => sendSpecial(`[GIF:${url}]`)}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "6px", cursor: "pointer", padding: "0", overflow: "hidden", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={url} alt="parrot" crossOrigin="anonymous" style={{ width: 52, height: 52, objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; (e.currentTarget as HTMLImageElement).parentElement!.style.background = "rgba(255,100,100,0.2)"; }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom row: panel buttons + input + send */}
        <form onSubmit={handleSend} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {/* Panel icon buttons */}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
          {([
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
          <button type="button" onClick={() => setShowPoll(true)}
            title="Голосування"
            style={{ width: 32, height: 32, flexShrink: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
            📊
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
      </div>{/* end main chat column */}

      {/* ── Shop + HP + Referral column ───────────────────────────────────── */}
      <div style={{ width: "240px", minWidth: "240px", background: "#0f1829", borderLeft: "1px solid #1e2d4a", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

        {/* ── Shop product card ────────────────────────────────────────────── */}
        {shopItems.length > 0 && (() => {
          const sorted = [...shopItems].sort((a, b) => (b.chatPriority ? 1 : 0) - (a.chatPriority ? 1 : 0) || a.sortOrder - b.sortOrder);
          const item = sorted[shopTicker % sorted.length];
          const sizeOptions = item.sizes ? item.sizes.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
          const images = item.imageUrl ? item.imageUrl.split("|") : [];
          const mainImage = images[0] ?? null;
          return (
            <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid #1e2d4a", flexShrink: 0 }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "10px", fontFamily: "Exo 2, sans-serif" }}>
                🛒 Магазин
              </div>
              <a
                href="/shop"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{ background: "#1e2a4a", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", cursor: "pointer" }}>
                  {/* Image */}
                  <div style={{ height: "120px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", position: "relative" }}>
                    {mainImage ? (
                      <img src={mainImage} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <span style={{ fontSize: "44px", lineHeight: 1 }}>{item.emoji}</span>
                    )}
                    {item.badge && (
                      <span style={{ position: "absolute", top: "8px", left: "8px", background: "#f46f10", color: "white", padding: "2px 7px", borderRadius: "5px", fontSize: "10px", fontWeight: 700, fontFamily: "Exo 2, sans-serif" }}>
                        {item.badge}
                      </span>
                    )}
                    {!item.inStock && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#94a3b8", fontFamily: "Exo 2, sans-serif" }}>
                        Немає в наявності
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "Exo 2, sans-serif" }}>
                      {item.category}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "13px", lineHeight: 1.3, color: "white", fontFamily: "Exo 2, sans-serif", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {item.name}
                    </div>
                    {/* Sizes */}
                    {sizeOptions.length > 0 && (
                      <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", marginTop: "2px" }}>
                        {sizeOptions.map((s: string) => (
                          <span key={s} style={{ width: "24px", height: "24px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "white", fontFamily: "Exo 2, sans-serif" }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Price + Buy */}
                    <div style={{ marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <span style={{ fontSize: "15px", fontWeight: 800, color: "#f46f10", fontFamily: "Exo 2, sans-serif" }}>{item.price} грн</span>
                        {item.oldPrice && (
                          <span style={{ fontSize: "11px", color: "#64748b", textDecoration: "line-through", marginLeft: "4px", fontFamily: "Exo 2, sans-serif" }}>
                            {item.oldPrice} грн
                          </span>
                        )}
                      </div>
                      <span style={{ padding: "5px 9px", background: item.inStock ? "#f46f10" : "#374151", color: "white", borderRadius: "7px", fontWeight: 700, fontSize: "11px", fontFamily: "Exo 2, sans-serif" }}>
                        🛒 Купити
                      </span>
                    </div>
                  </div>
                </div>
              </a>
              {/* Dots */}
              <div style={{ display: "flex", justifyContent: "center", gap: "4px", marginTop: "8px" }}>
                {sorted.map((_, i) => (
                  <div key={i} style={{ width: i === shopTicker % sorted.length ? 16 : 5, height: 5, borderRadius: 3, background: i === shopTicker % sorted.length ? "#f46f10" : "rgba(255,255,255,0.15)", transition: "all 0.3s" }} />
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── News ticker block ──────────────────────────────────────────────── */}
        <div style={{ padding: "14px", borderBottom: "1px solid #1e2d4a", flexShrink: 0, minHeight: "280px" }}>
          <NewsTicker />
        </div>

        {/* ── My HP + referral block ────────────────────────────────────────── */}
        <div style={{ padding: "14px", borderBottom: "1px solid #1e2d4a", flexShrink: 0 }}>
          <div style={{ fontFamily: "Exo 2, sans-serif", fontSize: "11px", color: "#64748b", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
            ⚡ Моя HP та реферал
          </div>
          {/* HP display */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{ fontSize: "26px" }}>{getBadge(user!.hp) || "⚡"}</span>
            <div>
              <div style={{ fontFamily: "Exo 2, sans-serif", fontSize: "18px", fontWeight: 800, color: "#f46f10" }}>
                {user!.hp} HP
              </div>
              <div style={{ fontSize: "11px", color: "#475569", fontFamily: "Exo 2, sans-serif" }}>
                {user!.hp < 25 ? "Зареєструйся" : user!.hp < 50 ? "Ще " + (50 - user!.hp) + " до ⭐" : user!.hp < 100 ? "Ще " + (100 - user!.hp) + " до 🔥" : user!.hp < 200 ? "Ще " + (200 - user!.hp) + " до 👑" : "Максимальний бейдж 👑"}
              </div>
            </div>
          </div>
          {/* Ref link */}
          <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "5px", fontFamily: "Exo 2, sans-serif" }}>
            🔗 Реферальне посилання (+50 HP другу):
          </div>
          <div
            style={{ background: "#0a1020", border: "1px solid #1e2d4a", borderRadius: "8px", padding: "7px 10px", fontFamily: "monospace", fontSize: "10px", color: "#94a3b8", wordBreak: "break-all", cursor: "pointer", transition: "border-color 0.15s" }}
            title="Натисни щоб скопіювати"
            onClick={() => {
              const link = `${window.location.origin}/chat?ref=${user!.phone}`;
              navigator.clipboard.writeText(link).then(() => notify("✅ Посилання скопійовано!"));
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#f46f10"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1e2d4a"; }}
          >
            {typeof window !== "undefined" ? `${window.location.origin}/chat?ref=${user!.phone}` : `/chat?ref=${user!.phone}`}
          </div>
          <div style={{ fontSize: "10px", color: "#334155", marginTop: "4px", fontFamily: "Exo 2, sans-serif" }}>
            Натисни щоб скопіювати
          </div>
        </div>

        {/* filler */}
        <div style={{ flex: 1 }} />
      </div>

      {/* ── Participants sidebar ───────────────────────────────────────────── */}
      <div style={{ width: "200px", minWidth: "200px", background: "#131f3a", borderLeft: "1px solid #1e2d4a", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e2d4a", fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "13px", color: "#f46f10", letterSpacing: "0.5px", textTransform: "uppercase", flexShrink: 0 }}>
          👥 Учасники ({members.length}){members.filter(m => m.isOnline || onlineUsers.has(m.phone)).length > 0 && <span style={{ color: "#22c55e", marginLeft: 6, fontSize: "11px", fontWeight: 600 }}>● {members.filter(m => m.isOnline || onlineUsers.has(m.phone)).length} онлайн</span>}
        </div>

        {/* List — full height */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {(() => {
              const mvpName = mvpResults[0]?.playerName ?? null;
              const mvpVotes = mvpResults[0]?.votes ?? 0;
              return members
                .slice()
                .sort((a, b) => {
                  if (a.isOnline && !b.isOnline) return -1;
                  if (!a.isOnline && b.isOnline) return 1;
                  return (b.hp ?? 0) - (a.hp ?? 0);
                })
                .map((member) => {
                  const isOnline = member.isOnline || onlineUsers.has(member.phone);
                  const fullName = `${member.firstName} ${member.lastName}`.trim();
                  const isMvp = mvpName !== null && fullName === mvpName && mvpVotes > 0;
                  const av = getAvatar(member.hp ?? 0);
                  const avatarBg = isMvp ? "#b45309" : av ? "#1e3a5f" : isOnline ? "#15803d" : "#1e293b";
                  const avatarContent = isMvp ? "🏆" : av ? av.emoji : (member.firstName?.[0] || "?").toUpperCase();
                  return (
                    <div
                      key={member.phone}
                      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 14px", cursor: "default", transition: "background 0.15s", background: isMvp ? "rgba(244,111,16,0.06)" : "transparent" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = isMvp ? "rgba(244,111,16,0.12)" : "rgba(255,255,255,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isMvp ? "rgba(244,111,16,0.06)" : "transparent")}
                    >
                      {/* Avatar with online dot */}
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: av || isMvp ? "18px" : "13px", fontWeight: 700, color: "white", fontFamily: "Exo 2, sans-serif" }}>
                          {avatarContent}
                        </div>
                        <span style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderRadius: "50%", background: isOnline ? "#22c55e" : "#4b5563", border: "2px solid #131f3a" }} />
                      </div>

                      {/* Name + status + HP */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "Exo 2, sans-serif", fontSize: "13px", fontWeight: isMvp ? 800 : 600, color: isMvp ? "#fbbf24" : isOnline ? "white" : "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {getBadge(member.hp ?? 0) && <span style={{ marginRight: "3px" }}>{getBadge(member.hp ?? 0)}</span>}
                          {member.isMod && <span style={{ marginRight: "3px" }} title="Модератор">🛡️</span>}
                          {fullName || "Без імені"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                          {isMvp && (
                            <span style={{ fontSize: "10px", color: "#fbbf24", fontFamily: "Exo 2, sans-serif", fontWeight: 700 }}>
                              MVP · {mvpVotes} гол.
                            </span>
                          )}
                          {!isMvp && member.isMod && (
                            <span style={{ fontSize: "10px", color: "#60a5fa", fontFamily: "Exo 2, sans-serif", fontWeight: 700 }}>
                              🛡 модератор
                            </span>
                          )}
                          {!isMvp && !member.isMod && (
                            <span style={{ fontSize: "11px", color: isOnline ? "#22c55e" : "#4b5563", fontFamily: "Exo 2, sans-serif" }}>
                              {isOnline ? "● онлайн" : "○ оффлайн"}
                            </span>
                          )}
                          {(member.hp ?? 0) > 0 && (
                            <span style={{ fontSize: "10px", color: "#f46f10", fontFamily: "Exo 2, sans-serif", fontWeight: 600 }}>
                              ⚡{member.hp}
                            </span>
                          )}
                          {av && (
                            <span style={{ fontSize: "10px", color: "#60a5fa", fontFamily: "Exo 2, sans-serif" }} title={`Аватар розблоковано: ${av.label}`}>
                              {av.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
            })()}
        </div>
      </div>

      {/* ── РУЧЕЁК Game Canvas (прозрачный overlay поверх всей страницы) ────── */}
      <RucheekGameCanvas
        isVisible={showRucheekGame}
        userName={user ? `${user.firstName} ${user.lastName}` : "Гравець"}
        userPhone={user?.phone || ""}
      />

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
