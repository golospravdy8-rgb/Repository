"use client";

import { useState, useEffect } from "react";

interface User {
  phone?: string;
  name?: string;
  email?: string;
  role?: string;
  vipStatus?: boolean;
  vipExpiresAt?: string;
}

// Monobank JAR ID (збирання Monobank)
const MONOBANK_JAR_ID = process.env.NEXT_PUBLIC_MONOBANK_JAR_ID || "6Wm6ypKDNBz7vZ8E3kPq4m";

const VIP_PLANS = [
  { id: "month", label: "Місяць", amount: 99, duration: "30 днів доступу" },
  { id: "season", label: "Сезон (3 міс)", amount: 249, duration: "Весь сезон 2025-2026", featured: true },
  { id: "year", label: "Рік", amount: 799, duration: "12 місяців доступу" },
];

function PricingAndPaymentForm({ user }: { user: User | null }) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    telegramId: "", // Додано Telegram ID
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const plan = VIP_PLANS.find((p) => p.id === selectedPlan);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !formData.firstName || !formData.lastName || !formData.phone) {
      setMessage("❌ Заповніть усі обов'язкові поля");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/vip/purchase-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.phone,
          firstName: formData.firstName,
          lastName: formData.lastName,
          plan: selectedPlan,
          amount: plan?.amount || 0,
          telegramId: formData.telegramId, // Передаємо Telegram ID
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("✅ Заявка відправлена адміну! Очікуйте активацію.");
        setTimeout(() => {
          setShowPaymentForm(false);
          setSelectedPlan(null);
          setFormData({ firstName: "", lastName: "", phone: "", telegramId: "" });
          setMessage("");
        }, 2000);
      } else {
        setMessage(`❌ Помилка: ${data.error}`);
      }
    } catch (error) {
      setMessage("❌ Помилка мережі");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Pricing Cards */}
      <div className="space-y-2 mb-6">
        {VIP_PLANS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedPlan(p.id);
              setShowPaymentForm(true);
              setMessage("");
            }}
            className={`w-full p-4 rounded-lg border-2 transition text-left ${
              p.featured
                ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-500"
                : "bg-white/5 border-white/20 hover:bg-white/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white">{p.label}</div>
                <div className="text-xs text-gray-300 mt-0.5">{p.duration}</div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-black ${p.featured ? "text-orange-400" : "text-white"}`}>
                  {p.amount}₴
                </div>
                {p.featured && (
                  <div className="text-xs text-orange-400 font-bold mt-0.5">ВИГІДНО</div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && plan && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-50">
          <div className="w-full bg-slate-900 rounded-t-2xl p-6 border-t border-white/20 animate-in slide-in-from-bottom">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-bold text-white mb-4">
                Оплата: {plan.label} ({plan.amount}₴)
              </h3>

              {!message && (
                <>
                  <a
                    href={`https://send.monobank.ua/jar/${MONOBANK_JAR_ID}?amount=${plan.amount * 100}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg mb-4 text-center transition"
                  >
                    Перейти до Monobank
                  </a>

                  <p className="text-xs text-gray-400 mb-4 text-center">
                    Після переводу заповніть форму нижче та натисніть "Я оплатив"
                  </p>

                  <form onSubmit={handlePaymentSubmit} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Ім'я"
                      value={formData.firstName}
                      onChange={(e) => setFormData((f) => ({ ...f, firstName: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 text-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Прізвище"
                      value={formData.lastName}
                      onChange={(e) => setFormData((f) => ({ ...f, lastName: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 text-sm"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="+380XXXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 text-sm"
                      required
                    />

                    <input
                      type="text"
                      placeholder="Telegram (@username или номер телефона)"
                      value={formData.telegramId}
                      onChange={(e) => setFormData((f) => ({ ...f, telegramId: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 text-sm"
                    />

                    <p className="text-xs text-gray-400 text-center">
                      💬 Укажіть свій Telegram для отримання сповіщень про активацію
                    </p>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPaymentForm(false);
                          setSelectedPlan(null);
                          setMessage("");
                        }}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition text-sm"
                      >
                        Скасувати
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition text-sm"
                      >
                        {loading ? "⏳ Надсилання..." : "✅ Я оплатив"}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {message && (
                <div className="text-center">
                  <p className="text-white mb-3">{message}</p>
                  {message.startsWith("✅") && (
                    <button
                      onClick={() => {
                        setShowPaymentForm(false);
                        setSelectedPlan(null);
                        setMessage("");
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition text-sm"
                    >
                      Закрити
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function VipPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Спробуй отримати юзера (якщо через auth система)
    fetch("/api/user", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        // Перевірити чи VIP не закінчився
        if (u && u.role === "vip" && u.vipExpiresAt) {
          const expiresAt = new Date(u.vipExpiresAt);
          const now = new Date();

          // Якщо VIP закінчився - оновити користувача локально
          if (expiresAt < now) {
            // Перезавантажити дані з сервера для оновлення статусу
            fetch("/api/user/vip-check", { credentials: "include" })
              .then((r) => r.json())
              .then((data) => {
                setUser({
                  ...u,
                  vipStatus: false,
                  role: "parent",
                });
              })
              .catch(() => setUser(u));
          } else {
            setUser(u);
          }
        } else {
          setUser(u);
        }
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  if (!checked) return null;

  // Перевірити чи VIP не закінчився
  const isVip = (user?.role === "vip" || user?.role === "admin") && user?.vipExpiresAt
    ? new Date(user.vipExpiresAt) > new Date()
    : user?.role === "admin"; // Admin завжди має доступ

  // VIP Cabinet (для активних VIP)
  if (isVip) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center px-4 py-6">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">⭐</div>
            <h1 className="text-2xl md:text-3xl font-black text-white">VIP-кабінет для батьків</h1>
            <p className="text-sm text-orange-400 mt-1">Статус: ✅ Активний</p>
          </div>

          {/* Grid 2x2 */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Stats */}
            <div className="bg-white/10 backdrop-blur rounded-lg p-3 border border-white/20 cursor-pointer hover:bg-white/15 transition">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-bold text-white text-sm">Статистика</div>
              <div className="text-xs text-gray-300 mt-1">Детальна статистика гравця</div>
            </div>

            {/* Progress */}
            <div className="bg-white/10 backdrop-blur rounded-lg p-3 border border-white/20 cursor-pointer hover:bg-white/15 transition">
              <div className="text-2xl mb-2">📈</div>
              <div className="font-bold text-white text-sm">Прогрес</div>
              <div className="text-xs text-gray-300 mt-1">Графіки та порівняння</div>
            </div>

            {/* Photos */}
            <div className="bg-white/10 backdrop-blur rounded-lg p-3 border border-white/20 cursor-pointer hover:bg-white/15 transition">
              <div className="text-2xl mb-2">📷</div>
              <div className="font-bold text-white text-sm">Фото</div>
              <div className="text-xs text-gray-300 mt-1">Ексклюзивний контент</div>
            </div>

            {/* Video */}
            <div className="bg-white/10 backdrop-blur rounded-lg p-3 border border-white/20 cursor-pointer hover:bg-white/15 transition">
              <div className="text-2xl mb-2">🎬</div>
              <div className="font-bold text-white text-sm">Відео</div>
              <div className="text-xs text-gray-300 mt-1">Кращі моменти матчів</div>
            </div>
          </div>

          {/* Certificate button */}
          <a
            href="/api/pdf/certificate"
            download="certificate-ldbl.pdf"
            className="block w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg text-center hover:shadow-lg transition"
          >
            📄 Завантажити сертифікат
          </a>
        </div>
      </div>
    );
  }

  // Check if VIP expired
  const isVipExpired = user?.role === "vip" && user?.vipExpiresAt
    ? new Date(user.vipExpiresAt) < new Date()
    : false;

  // Non-VIP Landing / VIP Expired
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col px-4 py-6">
      <div className="max-w-2xl w-full mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⭐</div>
          <h1 className="text-2xl md:text-3xl font-black text-white">VIP-кабінет для батьків</h1>
          <p className="text-sm text-gray-300 mt-2">
            {isVipExpired
              ? "🔒 Ваш VIP доступ закінчився"
              : "Отримайте доступ до статистики вашої дитини"}
          </p>
        </div>

        {/* VIP Expired Banner */}
        {isVipExpired && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="text-3xl mb-2">🔒</div>
              <h2 className="text-lg font-bold text-red-300 mb-2">Ваш VIP доступ закінчився</h2>
              <p className="text-sm text-gray-300 mb-3">
                Дійсна до: <strong>{user?.vipExpiresAt
                  ? new Date(user.vipExpiresAt).toLocaleDateString('uk-UA')
                  : '—'}</strong>
              </p>
              <p className="text-sm text-gray-300 mb-4">
                Оновіть підписку щоб знову отримати повний доступ
              </p>
            </div>
          </div>
        )}

        {/* Features Grid 2x2 */}
        <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
          {/* Stat */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 border border-white/20">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-bold text-white text-sm">Статистика</div>
            <div className="text-xs text-gray-300 mt-1">Детальні дані гравця</div>
          </div>

          {/* Progress */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 border border-white/20">
            <div className="text-2xl mb-2">📈</div>
            <div className="font-bold text-white text-sm">Прогрес</div>
            <div className="text-xs text-gray-300 mt-1">Графіки та порівняння</div>
          </div>

          {/* Photos */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 border border-white/20 opacity-50">
            <div className="text-2xl mb-2">📷🔒</div>
            <div className="font-bold text-white text-sm">Фото</div>
            <div className="text-xs text-gray-300 mt-1">Заблоковано</div>
          </div>

          {/* Video */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 border border-white/20 opacity-50">
            <div className="text-2xl mb-2">🎬🔒</div>
            <div className="font-bold text-white text-sm">Відео</div>
            <div className="text-xs text-gray-300 mt-1">Заблоковано</div>
          </div>
        </div>

        {/* Pricing Cards with Payment Form */}
        <PricingAndPaymentForm user={user} />

        {/* Info text */}
        <div className="text-center text-xs text-gray-400 mt-auto">
          <p>При кліку на "Перейти до оплати" відкриється Monobank JAR</p>
          <p className="mt-1">Після переводу натисніть "Я оплатив" внизу</p>
        </div>
      </div>
    </div>
  );
}
