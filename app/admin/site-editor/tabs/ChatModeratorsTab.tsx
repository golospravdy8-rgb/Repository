"use client";

import { useState, useEffect, useTransition } from "react";

// All requests go through Next.js proxy → no CORS issues
const proxy = (path: string) => `/api/chat-proxy?path=${encodeURIComponent(path)}`;

type Moderator = {
  phone: string;
  name: string;
  addedAt: string;
};

type Candidate = {
  phone: string;
  name: string;
  source: "chat" | "player";
  hp?: number;
  position?: string;
};

type ModLogEntry = {
  id: number;
  action: string;
  modName: string;
  targetName: string;
  details: string;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  ban: "🚫 Бан",
  unban: "✅ Розбан",
  warn: "⚠️ Попередження",
  autoban: "🤖 Автобан (3 варни)",
  mute: "🔇 Вимкнення",
  unmute: "🔊 Увімкнення",
  deleteMsg: "🗑 Видалення повід.",
  pin: "📌 Закріплення",
  slowMode: "🐢 Повільний режим",
  quiz: "❓ Вікторина",
};

export default function ChatModeratorsTab() {
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [log, setLog] = useState<ModLogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<"mods" | "log">("mods");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [chatOnline, setChatOnline] = useState(true);

  async function fetchModerators() {
    try {
      const res = await fetch(proxy("/api/chat/moderators"));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setModerators(data.moderators || []);
      setChatOnline(true);
    } catch {
      setChatOnline(false);
    }
  }

  async function fetchCandidates() {
    const list: Candidate[] = [];
    const seen = new Set<string>();

    // 1. Chat guests (registered in chat)
    try {
      const res = await fetch(proxy("/api/chat/guests"));
      if (res.ok) {
        const data = await res.json();
        for (const g of data.guests || []) {
          if (!seen.has(g.phone)) {
            seen.add(g.phone);
            list.push({ phone: g.phone, name: g.name, source: "chat", hp: g.hp });
          }
        }
      }
    } catch {}

    // 2. Players from main DB (via GuestContacts — players who registered in chat)
    try {
      const res = await fetch("/api/guest-contacts");
      if (res.ok) {
        const data = await res.json();
        for (const g of data.guests || data || []) {
          const name = g.name || `${g.firstName || ""} ${g.lastName || ""}`.trim();
          if (g.phone && name && !seen.has(g.phone)) {
            seen.add(g.phone);
            list.push({ phone: g.phone, name, source: "chat", hp: g.hp });
          }
        }
      }
    } catch {}

    setCandidates(list);
  }

  async function fetchLog() {
    try {
      const res = await fetch(proxy("/api/chat/mod/log"));
      if (res.ok) {
        const data = await res.json();
        setLog(data.log || []);
      }
    } catch {}
  }

  useEffect(() => {
    fetchModerators();
    fetchCandidates();
  }, []);

  function addModerator(phone: string) {
    startTransition(async () => {
      try {
        const res = await fetch(proxy("/api/chat/moderators/add"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        if (res.ok) {
          setStatus("✅ Модератора додано");
          setTimeout(() => setStatus(""), 2000);
          await fetchModerators();
        }
      } catch {
        setStatus("❌ Помилка");
        setTimeout(() => setStatus(""), 2000);
      }
    });
  }

  function removeModerator(phone: string) {
    if (!confirm("Зняти повноваження модератора?")) return;
    startTransition(async () => {
      await fetch(proxy("/api/chat/moderators/remove"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      setStatus("✅ Повноваження знято");
      setTimeout(() => setStatus(""), 2000);
      await fetchModerators();
    });
  }

  const modPhones = new Set(moderators.map((m) => m.phone));
  const filtered = candidates.filter(
    (g) =>
      !modPhones.has(g.phone) &&
      g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Section tabs */}
      <div className="flex gap-2 border-b pb-3 flex-wrap items-center">
        <button
          onClick={() => setSection("mods")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${section === "mods" ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          style={section === "mods" ? { backgroundColor: "#1a2744" } : {}}
        >
          🛡 Модератори
        </button>
        <button
          onClick={() => { setSection("log"); fetchLog(); }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${section === "log" ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          style={section === "log" ? { backgroundColor: "#1a2744" } : {}}
        >
          📋 Журнал дій
        </button>
        <div className="ml-auto flex items-center gap-3">
          {status && <span className="text-sm font-medium text-green-600">{status}</span>}
          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${chatOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            {chatOnline ? "🟢 Чат онлайн" : "🔴 Чат недоступний"}
          </span>
        </div>
      </div>

      {/* MODERATORS */}
      {section === "mods" && (
        <div className="space-y-5">
          {/* Current moderators */}
          <div>
            <h2 className="font-bold text-gray-800 mb-3">Поточні модератори ({moderators.length})</h2>
            {moderators.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">Модераторів ще немає</p>
            ) : (
              <div className="space-y-2">
                {moderators.map((m) => (
                  <div key={m.phone} className="bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-purple-200 flex-shrink-0 text-lg font-bold text-purple-700 flex items-center justify-center">
                      {(m.name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-sm">{m.name || m.phone}</div>
                      <div className="text-xs text-gray-400">{m.phone} · Додано {new Date(m.addedAt).toLocaleDateString("uk-UA")}</div>
                    </div>
                    <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-lg font-bold mr-2">🛡 Модератор</span>
                    <button
                      onClick={() => removeModerator(m.phone)}
                      disabled={pending}
                      className="text-xs text-red-400 hover:text-red-600 hover:underline disabled:opacity-50"
                    >
                      Зняти
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add moderator */}
          <div className="bg-gray-50 border rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-gray-700">Призначити модератора</h3>
            <p className="text-xs text-gray-400">
              Вибрати з учасників чату — людей які хоча б раз заходили на{" "}
              <a href="http://localhost:3011" target="_blank" className="text-blue-500 underline">localhost:3011</a>.
              Роль вступає в силу миттєво.
            </p>

            {!chatOnline && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-600">
                ⚠️ Чат сервер не відповідає. Запустіть його командою{" "}
                <code className="bg-red-100 px-1 rounded">npm run portal</code> в кореневій папці проєкту.
              </div>
            )}

            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Пошук за ім'ям..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {candidates.length === 0 && chatOnline && (
              <p className="text-xs text-gray-400 text-center py-2">
                Список порожній — жодного учасника в чаті ще немає.
                Попросіть людей зайти на{" "}
                <a href="http://localhost:3011" target="_blank" className="text-blue-500 underline">localhost:3011</a>{" "}
                і зареєструватися.
              </p>
            )}

            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filtered.map((g) => (
                <div key={g.phone} className="bg-white border rounded-lg flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                    {g.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-800">{g.name}</div>
                    <div className="text-xs text-gray-400">
                      {g.phone}
                      {g.hp !== undefined && <span className="ml-1">· ⚡ {g.hp} HP</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => addModerator(g.phone)}
                    disabled={pending}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: "#7c3aed" }}
                  >
                    + Призначити
                  </button>
                </div>
              ))}
              {search && filtered.length === 0 && candidates.length > 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Нічого не знайдено за &ldquo;{search}&rdquo;</p>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
            <p className="font-bold mb-1">Можливості модератора в чаті:</p>
            <p>• Бан на 15 хв / 24 год / назавжди</p>
            <p>• Попередження ⚠️ (3 варни = автобан на 24 год)</p>
            <p>• Вимкнення (mute) на 30 хвилин</p>
            <p>• Видалення та закріплення повідомлень</p>
            <p>• Запуск вікторини (30 секунд, 4 варіанти)</p>
            <p>• Повільний режим (1 повід. кожні 30 сек)</p>
          </div>
        </div>
      )}

      {/* MOD LOG */}
      {section === "log" && (
        <div>
          <h2 className="font-bold text-gray-800 mb-3">Журнал дій модераторів ({log.length})</h2>
          {log.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">Дій поки не було</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {log.map((entry) => (
                <div key={entry.id} className="bg-white border rounded-xl px-4 py-3 flex items-start gap-3">
                  <div className="flex-shrink-0 text-sm mt-0.5">
                    {(ACTION_LABELS[entry.action] || "📝").split(" ")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-800">{ACTION_LABELS[entry.action] || entry.action}</span>
                      {entry.targetName && <span className="text-xs text-gray-500">→ <b>{entry.targetName}</b></span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Мод: {entry.modName}
                      {entry.details && <span className="ml-2 text-gray-300">· {entry.details}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-300 flex-shrink-0 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
