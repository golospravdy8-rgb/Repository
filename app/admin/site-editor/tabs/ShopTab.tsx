"use client";

import { useState, useTransition, useRef } from "react";
import {
  createShopProduct,
  updateShopProduct,
  deleteShopProduct,
  type ShopProductInput,
} from "@/actions/admin-data";
import { updateSiteTexts } from "@/actions/site-settings";

const CATEGORIES = ["М'ячі", "Форма", "Взуття", "Захист", "Обладнання", "Аксесуари"];
const BADGES = ["", "ХІТ", "НОВІ", "ЗНИЖКА", "ОФІЦІЙНА", "РОЗПРОДАЖ"];

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  oldPrice: number | null;
  category: string;
  emoji: string;
  badge: string | null;
  imageUrl: string | null;
  sizes: string | null;
  inStock: boolean;
  sortOrder: number;
  showInChat?: boolean;
  chatPriority?: boolean;
};

const EMPTY_FORM: ShopProductInput = {
  name: "",
  description: "",
  price: 0,
  oldPrice: null,
  category: "М'ячі",
  emoji: "🏀",
  badge: null,
  imageUrl: null,
  sizes: null,
  inStock: true,
  sortOrder: 0,
};

type TabSection = "products" | "settings" | "widget";

export default function ShopTab({
  products,
  settings,
}: {
  products: Product[];
  settings: Record<string, string>;
}) {
  const [section, setSection] = useState<TabSection>("products");
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<ShopProductInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterCat, setFilterCat] = useState("Всі");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [tgBotToken, setTgBotToken] = useState(settings["shop.tgBotToken"] ?? "");
  const [tgChatId, setTgChatId] = useState(settings["shop.tgChatId"] ?? "");
  const [tgAdminChatId, setTgAdminChatId] = useState(settings["vip.tgAdminChatId"] ?? "");
  const [cardNumber, setCardNumber] = useState(settings["donate.cardNumber"] ?? "4149510093172395");
  const [cardName, setCardName] = useState(settings["donate.cardName"] ?? "Христина Полякова");
  const [notifyEmail, setNotifyEmail] = useState(settings["shop.notifyEmail"] ?? "bclvivbasketball@gmail.com");
  const [gmailUser, setGmailUser] = useState(settings["shop.gmailUser"] ?? "");
  const [gmailPass, setGmailPass] = useState(settings["shop.gmailPass"] ?? "");
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Widget state
  const [widgetEnabled, setWidgetEnabled] = useState(settings["widget.enabled"] !== "false");
  const [widgetInterval, setWidgetInterval] = useState(Number(settings["widget.interval"] || "20"));
  const [widgetMode, setWidgetMode] = useState(settings["widget.mode"] || "sequential");
  const [widgetSaved, setWidgetSaved] = useState(false);
  const [widgetPushingId, setWidgetPushingId] = useState<number | null>(null);
  const [widgetTogglingId, setWidgetTogglingId] = useState<number | null>(null);
  const [localProducts, setLocalProducts] = useState(products);

  const filtered = filterCat === "Всі" ? products : products.filter((p) => p.category === filterCat);

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      price: p.price,
      oldPrice: p.oldPrice,
      category: p.category,
      emoji: p.emoji,
      badge: p.badge,
      imageUrl: p.imageUrl,
      sizes: p.sizes,
      inStock: p.inStock,
      sortOrder: p.sortOrder,
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "shop");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setForm((f) => ({ ...f, imageUrl: data.url }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    if (!form.name.trim() || form.price <= 0) return;
    startTransition(async () => {
      if (editingId) {
        await updateShopProduct(editingId, form);
      } else {
        await createShopProduct(form);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Видалити товар?")) return;
    startTransition(async () => { await deleteShopProduct(id); });
  };

  const handleToggleStock = (p: Product) => {
    startTransition(async () => { await updateShopProduct(p.id, { inStock: !p.inStock }); });
  };

  const handleSaveSettings = () => {
    startTransition(async () => {
      await updateSiteTexts({
        "shop.tgBotToken": tgBotToken,
        "shop.tgChatId": tgChatId,
        "vip.tgAdminChatId": tgAdminChatId,
        "donate.cardNumber": cardNumber,
        "donate.cardName": cardName,
        "shop.notifyEmail": notifyEmail,
        "shop.gmailUser": gmailUser,
        "shop.gmailPass": gmailPass,
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    });
  };

  const handleSaveWidgetSettings = async () => {
    await fetch("/api/chat-widget/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: widgetEnabled, interval: widgetInterval, mode: widgetMode }),
    });
    setWidgetSaved(true);
    setTimeout(() => setWidgetSaved(false), 2000);
  };

  const handleToggleShowInChat = async (p: Product) => {
    const newVal = !p.showInChat;
    setLocalProducts(prev => prev.map(x => x.id === p.id ? { ...x, showInChat: newVal } : x));
    setWidgetTogglingId(p.id);
    await fetch("/api/chat-widget/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: p.id, showInChat: newVal }),
    });
    setWidgetTogglingId(null);
  };

  const handleTogglePriority = async (p: Product) => {
    const newVal = !p.chatPriority;
    setLocalProducts(prev => prev.map(x => x.id === p.id ? { ...x, chatPriority: newVal } : x));
    setWidgetTogglingId(p.id);
    await fetch("/api/chat-widget/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: p.id, chatPriority: newVal }),
    });
    setWidgetTogglingId(null);
  };

  const handlePushNow = async (p: Product) => {
    setWidgetPushingId(p.id);
    await fetch("/api/chat-widget/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: p.id }),
    });
    setWidgetPushingId(null);
  };

  const cats = ["Всі", ...CATEGORIES];

  return (
    <div className="space-y-5">
      {/* Section tabs */}
      <div className="flex gap-2 border-b pb-3">
        <button
          onClick={() => setSection("products")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${section === "products" ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          style={section === "products" ? { backgroundColor: "#1a2744" } : {}}
        >
          Товари
        </button>
        <button
          onClick={() => setSection("settings")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${section === "settings" ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          style={section === "settings" ? { backgroundColor: "#1a2744" } : {}}
        >
          Налаштування магазину
        </button>
        <button
          onClick={() => setSection("widget")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${section === "widget" ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          style={section === "widget" ? { backgroundColor: "#f46f10" } : {}}
        >
          Витрина в чаті
        </button>
      </div>

      {/* ===== SETTINGS SECTION ===== */}
      {section === "settings" && (
        <div className="space-y-5">
          {/* Telegram */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">✈️</span>
              <h3 className="font-bold text-blue-800">Telegram сповіщення про замовлення</h3>
            </div>
            <p className="text-xs text-blue-600">
              Щоб отримувати повідомлення — створіть бота через <strong>@BotFather</strong> в Telegram, скопіюйте токен. Потім напишіть боту будь-яке повідомлення і знайдіть ваш Chat ID через <strong>@userinfobot</strong>.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block font-medium">Bot Token (від @BotFather)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
                  value={tgBotToken}
                  onChange={(e) => setTgBotToken(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block font-medium">Chat ID (замовлення в канал)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="123456789"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block font-medium">📱 Telegram Admin Personal Chat ID</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="123456789"
                  value={tgAdminChatId}
                  onChange={(e) => setTgAdminChatId(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Ваш особистий Telegram ID (не канал). Отримайте через @userinfobot</p>
              </div>
            </div>
          </div>

          {/* Email notifications */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📧</span>
              <h3 className="font-bold text-orange-800">Email-сповіщення про замовлення</h3>
            </div>
            <p className="text-xs text-orange-600">
              Для відправки через Gmail потрібно: 1) увімкнути двофакторну авторизацію в Google, 2) створити <strong>App Password</strong> (Пароль застосунку) в налаштуваннях безпеки Google → використовуйте його як пароль нижче.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block font-medium">Email для сповіщень (куди надсилати)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="bclvivbasketball@gmail.com"
                  type="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Gmail відправника (логін)</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="bclvivbasketball@gmail.com"
                    type="email"
                    value={gmailUser}
                    onChange={(e) => setGmailUser(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block font-medium">App Password (не звичайний пароль!)</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                    placeholder="xxxx xxxx xxxx xxxx"
                    type="password"
                    value={gmailPass}
                    onChange={(e) => setGmailPass(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Email test button */}
          {gmailUser && gmailPass && (
            <div className="bg-gray-50 border rounded-xl p-4">
              <h4 className="font-bold text-gray-700 text-sm mb-2">Тест email-сповіщення</h4>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/admin/test-email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ gmailUser, gmailPass, notifyEmail }),
                    });
                    const d = await res.json();
                    alert(d.ok ? "✅ Email надіслано! Перевірте " + notifyEmail : "❌ Помилка: " + d.error);
                  } catch (e) {
                    alert("❌ Помилка мережі: " + e);
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                Надіслати тестовий email
              </button>
            </div>
          )}

          {/* Card for payment */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <h3 className="font-bold text-green-800">Реквізити для оплати (Monobank)</h3>
            </div>
            <p className="text-xs text-green-600">
              Ці дані відображаються покупцю при оформленні замовлення для переказу на картку.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block font-medium">Номер картки</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="4149 5100 9317 2395"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block font-medium">Ім&apos;я власника картки</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Христина Полякова"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSettings}
              disabled={pending}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "#1a2744" }}
            >
              Зберегти налаштування
            </button>
            {settingsSaved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
          </div>

          {/* Test Telegram */}
          {tgBotToken && tgChatId && (
            <div className="bg-gray-50 border rounded-xl p-4">
              <h4 className="font-bold text-gray-700 text-sm mb-2">Тест сповіщення</h4>
              <button
                onClick={async () => {
                  const r = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ chat_id: tgChatId, text: "✅ Тест — Магазин ЛДБЛ підключено до Telegram!" }),
                  });
                  const d = await r.json();
                  alert(d.ok ? "✅ Повідомлення надіслано!" : "❌ Помилка: " + d.description);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                Надіслати тестове повідомлення
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== WIDGET SECTION ===== */}
      {section === "widget" && (
        <div className="space-y-5">
          {/* Global settings */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-4">
            <h3 className="font-bold text-orange-800 flex items-center gap-2">Налаштування віджету</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={widgetEnabled}
                  onChange={(e) => setWidgetEnabled(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">Увімкнути віджет товарів у чаті</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block font-medium">Інтервал ротації (сек)</label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={widgetInterval}
                  onChange={(e) => setWidgetInterval(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block font-medium">Режим ротації</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={widgetMode}
                  onChange={(e) => setWidgetMode(e.target.value)}
                >
                  <option value="sequential">Послідовний</option>
                  <option value="random">Випадковий</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleSaveWidgetSettings}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: "#f46f10" }}
            >
              {widgetSaved ? "Збережено!" : "Зберегти налаштування"}
            </button>
          </div>

          {/* Products for widget */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">Товари у чаті</h3>
            <p className="text-xs text-gray-400 mb-3">Оберіть які товари показувати у чаті. Пріоритет — показується першим.</p>
            <div className="space-y-2">
              {localProducts.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Немає товарів. Спочатку додайте товари в розділі &quot;Товари&quot;.</p>
              ) : (
                localProducts.filter(p => p.inStock).map((p) => (
                  <div key={p.id} className="bg-white border rounded-xl flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-xl">
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : p.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm truncate">{p.name}</div>
                      <div className="text-xs text-orange-500 font-bold">{p.price} грн</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handlePushNow(p)}
                        disabled={widgetPushingId === p.id}
                        className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                      >
                        {widgetPushingId === p.id ? "..." : "Показати зараз"}
                      </button>
                      <label className="flex items-center gap-1.5 cursor-pointer" title="Пріоритет">
                        <input
                          type="checkbox"
                          checked={!!p.chatPriority}
                          onChange={() => handleTogglePriority(p)}
                          disabled={widgetTogglingId === p.id}
                          className="w-3.5 h-3.5 accent-orange-500"
                        />
                        <span className="text-xs text-gray-500">Пріорітет</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!p.showInChat}
                          onChange={() => handleToggleShowInChat(p)}
                          disabled={widgetTogglingId === p.id}
                          className="w-3.5 h-3.5 accent-green-500"
                        />
                        <span className="text-xs text-gray-600 font-medium">У чаті</span>
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== PRODUCTS SECTION ===== */}
      {section === "products" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">Товари магазину</h2>
              <p className="text-xs text-gray-400 mt-0.5">Каталог магазину ЛДБЛ (localhost:3009)</p>
            </div>
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: "#f97316" }}
            >
              + Додати товар
            </button>
          </div>

          {showForm && (
            <div className="bg-gray-50 border rounded-xl p-4 space-y-3">
              <h3 className="font-bold text-gray-700">{editingId ? "Редагувати товар" : "Новий товар"}</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Назва *</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Назва товару"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Категорія</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Опис</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Короткий опис товару"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Розмірна сітка <span className="text-gray-400">(через кому: XS,S,M,L,XL або 36,37,38,39)</span></label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="XS,S,M,L,XL,XXL"
                  value={form.sizes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value || null }))}
                />
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {["XS,S,M,L,XL,XXL", "S,M,L,XL", "36,37,38,39,40,41,42", "Один розмір"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, sizes: preset }))}
                      className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:border-orange-400 hover:text-orange-500 bg-white"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ціна (грн) *</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.price || ""}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Стара ціна</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="необов'язково"
                    value={form.oldPrice ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, oldPrice: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Emoji</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm text-center text-xl"
                    value={form.emoji}
                    onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Бейдж</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.badge ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value || null }))}
                  >
                    {BADGES.map((b) => <option key={b} value={b}>{b || "— немає —"}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Порядок сортування</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    id="inStock"
                    checked={form.inStock}
                    onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <label htmlFor="inStock" className="text-sm text-gray-700 cursor-pointer">В наявності</label>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Фото товару</label>
                <div className="flex items-start gap-3">
                  {form.imageUrl ? (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-gray-100 flex-shrink-0">
                      <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, imageUrl: null }))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black"
                      >×</button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0 bg-white text-4xl">
                      {form.emoji}
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      {uploading ? "Завантаження..." : "Завантажити фото"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={pending || uploading || !form.name.trim() || form.price <= 0}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#1a2744" }}
                >
                  {editingId ? "Зберегти" : "Додати товар"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2 rounded-lg text-sm border text-gray-600"
                >
                  Скасувати
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === c ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                style={filterCat === c ? { backgroundColor: "#f97316" } : {}}
              >
                {c}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} товарів</span>
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Товарів немає. Додайте перший!</p>
            ) : (
              filtered.map((p) => (
                <div key={p.id} className={`bg-white border rounded-xl flex items-center gap-3 px-4 py-3 ${!p.inStock ? "opacity-60" : ""}`}>
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-2xl">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800 text-sm truncate">{p.name}</span>
                      {p.badge && <span className="text-xs px-2 py-0.5 rounded text-white font-bold" style={{ backgroundColor: "#f97316" }}>{p.badge}</span>}
                      {!p.inStock && <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-500 font-medium">Немає</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">{p.category}</span>
                      <span className="font-bold text-orange-500 text-sm">{p.price} грн</span>
                      {p.sizes && <span className="text-xs text-blue-500">📏 {p.sizes}</span>}
                      {p.oldPrice && <span className="text-xs text-gray-400 line-through">{p.oldPrice} грн</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleStock(p)}
                      disabled={pending}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${p.inStock ? "border-green-200 text-green-600 hover:bg-green-50" : "border-gray-300 text-gray-500 hover:bg-gray-50"}`}
                    >
                      {p.inStock ? "В наявності" : "Немає"}
                    </button>
                    <button onClick={() => handleEdit(p)} className="text-xs text-blue-500 hover:underline">Ред.</button>
                    <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:underline">Вид.</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
