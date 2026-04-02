"use client";

import { useState, useEffect, useTransition } from "react";
import { updateSiteTexts } from "@/actions/site-settings";
import { updateShopProductChatSettings } from "@/actions/admin-data";

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

type ShopProduct = {
  id: number;
  name: string;
  emoji: string;
  category: string;
  price: number;
  showInChat: boolean;
  chatPriority: boolean;
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

export default function ChatModeratorsTab({
  settings,
  shopProducts,
}: {
  settings: Record<string, string>;
  shopProducts: ShopProduct[];
}) {
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [log, setLog] = useState<ModLogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<"mods" | "hp" | "shop-chat" | "log">("mods");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [chatOnline, setChatOnline] = useState(true);

  // HP settings
  const [joinBonus, setJoinBonus] = useState(Number(settings["chat.hp.joinBonus"] ?? "25"));
  const [referralBonus, setReferralBonus] = useState(Number(settings["chat.hp.referralBonus"] ?? "50"));
  const [hpSaved, setHpSaved] = useState(false);
  const [showHpRules, setShowHpRules] = useState(false);

  // Shop chat settings (local copy for optimistic UI)
  const [products, setProducts] = useState<ShopProduct[]>(shopProducts);
  const [shopSaving, setShopSaving] = useState<number | null>(null);

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
        for (const g of data.contacts || data.guests || []) {
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

  function saveHpSettings() {
    startTransition(async () => {
      await updateSiteTexts({
        "chat.hp.joinBonus": String(joinBonus),
        "chat.hp.referralBonus": String(referralBonus),
      });
      setHpSaved(true);
      setTimeout(() => setHpSaved(false), 2000);
    });
  }

  async function toggleShowInChat(product: ShopProduct) {
    const newVal = !product.showInChat;
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, showInChat: newVal } : p));
    setShopSaving(product.id);
    await updateShopProductChatSettings(product.id, { showInChat: newVal });
    setShopSaving(null);
  }

  async function toggleChatPriority(product: ShopProduct) {
    const newVal = !product.chatPriority;
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, chatPriority: newVal } : p));
    setShopSaving(product.id);
    await updateShopProductChatSettings(product.id, { chatPriority: newVal });
    setShopSaving(null);
  }

  async function updateEmoji(product: ShopProduct, emoji: string) {
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, emoji } : p));
    setShopSaving(product.id);
    await updateShopProductChatSettings(product.id, { emoji });
    setShopSaving(null);
  }

  const modPhones = new Set(moderators.map((m) => m.phone));
  const filtered = candidates.filter(
    (g) =>
      !modPhones.has(g.phone) &&
      g.name.toLowerCase().includes(search.toLowerCase())
  );

  const SECTIONS = [
    { id: "mods" as const, label: "🛡 Модератори" },
    { id: "hp" as const, label: "⚡ HP та реферали" },
    { id: "shop-chat" as const, label: "🛒 Товари в чаті" },
    { id: "log" as const, label: "📋 Журнал дій" },
  ];

  return (
    <div className="space-y-5">
      {/* Section tabs */}
      <div className="flex gap-2 border-b pb-3 flex-wrap items-center">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => { setSection(s.id); if (s.id === "log") fetchLog(); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${section === s.id ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            style={section === s.id ? { backgroundColor: "#1a2744" } : {}}
          >
            {s.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          {status && <span className="text-sm font-medium text-green-600">{status}</span>}
          <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-green-100 text-green-700">
            🟢 Чат онлайн
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
              Вибрати зі зареєстрованих учасників чату. Роль вступає в силу миттєво.
            </p>

  
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Пошук за ім'ям..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {candidates.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                Список порожній — жодного учасника в чаті ще немає.
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

      {/* HP & REFERRAL SETTINGS */}
      {section === "hp" && (
        <div className="space-y-6">
          {/* HP Accrual */}
          <section>
            <div className="flex items-center justify-between border-b pb-2 mb-4">
              <h2 className="font-bold text-gray-800 text-base">⚡ Нарахування HP</h2>
              <button
                type="button"
                onClick={() => setShowHpRules((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <span className="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center font-black text-blue-500 text-xs leading-none">?</span>
                {showHpRules ? "Сховати правила" : "Правила нарахування"}
              </button>
            </div>

            {showHpRules && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 text-sm">
                <p className="font-bold text-blue-800">Як нараховуються HP:</p>
                <div className="space-y-2 text-blue-700">
                  <div className="flex items-start gap-2">
                    <span className="text-lg leading-none mt-0.5">🆕</span>
                    <div>
                      <span className="font-semibold">Реєстрація в чаті</span>
                      <span className="ml-1 text-blue-600">— +{joinBonus} HP</span>
                      <p className="text-xs text-blue-500 mt-0.5">При першому вході та заповненні форми реєстрації</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-lg leading-none mt-0.5">🔗</span>
                    <div>
                      <span className="font-semibold">Реферальне запрошення</span>
                      <span className="ml-1 text-blue-600">— +{referralBonus} HP</span>
                      <p className="text-xs text-blue-500 mt-0.5">Нараховується реферу, коли новий учасник реєструється за його посиланням</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-lg leading-none mt-0.5">🏆</span>
                    <div>
                      <span className="font-semibold">Для чого потрібні HP</span>
                      <p className="text-xs text-blue-500 mt-0.5">HP — внутрішня валюта чату. Використовується для рейтингу учасників, голосування MVP та покупок у магазині</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-lg leading-none mt-0.5">⚙️</span>
                    <div>
                      <span className="font-semibold">Зміна значень</span>
                      <p className="text-xs text-blue-500 mt-0.5">Нові значення застосовуються тільки до нових реєстрацій — вже нарахованi HP не змінюються</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mb-4">
              HP (Health Points) — внутрішня валюта чату. Нараховується при реєстрації та за реферальні запрошення.
            </p>
            <div className="bg-gray-50 rounded-xl border p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">HP за реєстрацію</div>
                  <div className="text-xs text-gray-500 mt-0.5">Скільки HP отримує новий учасник при першому вході в чат</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={joinBonus}
                    onChange={(e) => setJoinBonus(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-24 font-mono text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <span className="text-sm text-gray-500 font-bold">HP</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">HP за реферала</div>
                  <div className="text-xs text-gray-500 mt-0.5">Скільки HP отримує учасник, коли хтось реєструється за його реферальним посиланням</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={referralBonus}
                    onChange={(e) => setReferralBonus(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-24 font-mono text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <span className="text-sm text-gray-500 font-bold">HP</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={saveHpSettings}
                disabled={pending}
                className="px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-60"
                style={{ backgroundColor: "#1a2744" }}
              >
                {pending ? "Зберігається..." : "Зберегти HP налаштування"}
              </button>
              {hpSaved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
            </div>
          </section>

          {/* Referral Link */}
          <section>
            <h2 className="font-bold text-gray-800 mb-1 text-base border-b pb-2">🔗 Реферальні посилання</h2>
            <p className="text-xs text-gray-500 mb-4">
              Кожен учасник чату має унікальне реферальне посилання. Телефон учасника є його реферальним кодом.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 text-sm">
              <div>
                <div className="font-semibold text-gray-800 mb-1">Формат реферального посилання:</div>
                <code className="bg-white border border-amber-200 rounded-lg px-3 py-2 block text-xs font-mono text-gray-700 break-all">
                  https://[домен-чату]/?ref=[ТЕЛЕФОН_УЧАСНИКА]
                </code>
              </div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">Приклад:</div>
                <code className="bg-white border border-amber-200 rounded-lg px-3 py-2 block text-xs font-mono text-gray-700 break-all">
                  https://chat.lbbl.lviv.ua/?ref=380991234567
                </code>
              </div>
              <div className="text-xs text-gray-600 bg-white border border-amber-100 rounded-lg p-3 space-y-1">
                <p className="font-semibold">Як працює:</p>
                <p>1. Учасник ділиться своїм посиланням</p>
                <p>2. Новий користувач реєструється за цим посиланням</p>
                <p>3. Учасник-реферер отримує <strong>{referralBonus} HP</strong> автоматично</p>
                <p>4. Новий учасник отримує <strong>{joinBonus} HP</strong> за реєстрацію</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* SHOP PRODUCTS IN CHAT */}
      {section === "shop-chat" && (
        <div className="space-y-4">
          <div>
            <h2 className="font-bold text-gray-800 mb-1 text-base border-b pb-2">🛒 Іконки товарів у чаті</h2>
            <p className="text-xs text-gray-500 mb-4">
              Керуйте тим, які товари з Магазину відображаються в чаті та їх пріоритетністю. Іконка (emoji) відображається поруч з назвою товару.
            </p>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed rounded-xl">
              Товарів у магазині ще немає
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-3 transition-opacity ${shopSaving === product.id ? "opacity-60" : ""}`}
                >
                  {/* Emoji editor */}
                  <div className="flex-shrink-0">
                    <input
                      type="text"
                      value={product.emoji}
                      onChange={(e) => {
                        const val = Array.from(e.target.value).slice(-2).join("") || product.emoji;
                        setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, emoji: val } : p));
                      }}
                      onBlur={(e) => {
                        if (e.target.value !== shopProducts.find((p) => p.id === product.id)?.emoji) {
                          updateEmoji(product, e.target.value || "🏀");
                        }
                      }}
                      className="w-12 h-12 text-2xl text-center border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-text"
                      title="Іконка товару (emoji)"
                      maxLength={4}
                    />
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 text-sm truncate">{product.name}</div>
                    <div className="text-xs text-gray-400">{product.category} · {product.price} грн</div>
                  </div>

                  {/* Show in chat toggle */}
                  <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                    <div
                      onClick={() => toggleShowInChat(product)}
                      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${product.showInChat ? "bg-orange-500" : "bg-gray-300"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${product.showInChat ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                    <span className="text-xs text-gray-600 w-20">
                      {product.showInChat ? "В чаті" : "Прихований"}
                    </span>
                  </label>

                  {/* Priority toggle */}
                  <label className={`flex items-center gap-2 cursor-pointer flex-shrink-0 ${!product.showInChat ? "opacity-40 pointer-events-none" : ""}`}>
                    <div
                      onClick={() => product.showInChat && toggleChatPriority(product)}
                      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${product.chatPriority ? "bg-yellow-400" : "bg-gray-300"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${product.chatPriority ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                    <span className="text-xs text-gray-600 w-20">
                      {product.chatPriority ? "⭐ Пріоритет" : "Звичайний"}
                    </span>
                  </label>

                  {shopSaving === product.id && (
                    <span className="text-xs text-gray-400 flex-shrink-0">збереження...</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
            <p className="font-bold mb-1">Як це працює:</p>
            <p>• <strong>В чаті</strong> — товар відображається в списку покупок чату</p>
            <p>• <strong>Пріоритет ⭐</strong> — товар показується першим / виділяється у списку</p>
            <p>• <strong>Іконка</strong> — emoji відображається поруч з назвою товару в чаті</p>
            <p>• Зміни зберігаються автоматично при перемиканні</p>
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
