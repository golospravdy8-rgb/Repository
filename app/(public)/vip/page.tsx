"use client";

import { useState, useEffect } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  vipUntil: string | null;
}

const VIP_FEE_MONTHLY = parseInt(process.env.NEXT_PUBLIC_VIP_MONTHLY_FEE || "150");
const VIP_FEE_SEASON = parseInt(process.env.NEXT_PUBLIC_VIP_SEASON_FEE || "1000");

export default function VipPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payPlan, setPayPlan] = useState<"monthly" | "season">("monthly");

  useEffect(() => {
    fetch("http://localhost:3012/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { setUser(u); setChecked(true); })
      .catch(() => setChecked(true));
  }, []);

  if (!checked) return null;

  const isVip = user?.role === "vip" || user?.role === "admin";

  if (isVip) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="text-3xl">⭐</div>
          <div>
            <h1 className="text-3xl font-black" style={{ color: "#1e2a4a" }}>VIP-кабінет</h1>
            <p className="text-gray-500">Вітаємо, {user?.name}! Ваш VIP-доступ активний.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Select child */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="font-black text-gray-800 mb-4">🏀 Прив&apos;язати дитину-гравця</h3>
            <p className="text-sm text-gray-500 mb-4">Оберіть свою дитину зі списку гравців ліги для перегляду розширеної статистики</p>
            <a
              href="/players"
              className="block text-center py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: "#f46f10" }}
            >
              Переглянути гравців →
            </a>
          </div>

          {/* Certificate */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="font-black text-gray-800 mb-4">🎖️ Сертифікат учасника</h3>
            <p className="text-sm text-gray-500 mb-4">Завантажте сертифікат учасника сезону 2025-2026 у форматі PDF</p>
            <a
              href="/api/pdf/certificate"
              download="certificate-ldbl.pdf"
              className="block text-center py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: "#1e2a4a" }}
            >
              📄 Завантажити сертифікат
            </a>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl shadow p-6 md:col-span-2">
            <h3 className="font-black text-gray-800 mb-4">📊 Розширена статистика</h3>
            <p className="text-sm text-gray-500">Прив&apos;яжіть дитину-гравця щоб побачити детальну статистику, графіки прогресу та порівняння з іншими гравцями ліги.</p>
          </div>

          {/* VIP content */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="font-black text-gray-800 mb-4">📸 Ексклюзивні фото</h3>
            <div className="text-center py-8 text-gray-400 text-sm">
              Ексклюзивний фотоконтент стане доступний після публікації адміністратором
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="font-black text-gray-800 mb-4">💬 Повідомлення від тренера</h3>
            <div className="text-center py-8 text-gray-400 text-sm">
              Повідомлення від тренера з&apos;являться тут
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Landing for non-VIP
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <div className="text-5xl mb-4">⭐</div>
        <h1 className="text-4xl font-black mb-3" style={{ color: "#1e2a4a" }}>VIP-кабінет для батьків</h1>
        <p className="text-xl text-gray-500">Отримайте повний доступ до статистики вашої дитини</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        {[
          ["📊", "Детальна статистика", "Графіки очок, підбирань та передач по кожному матчу"],
          ["📈", "Прогрес та порівняння", "Порівняння з середнім по команді та лізі загалом"],
          ["📸", "Ексклюзивні фото", "Фотографії матчів за участю вашої дитини"],
          ["🎥", "Відео моменти", "Відеофрагменти кращих моментів з матчів"],
          ["💬", "Повідомлення тренера", "Персональні нотатки та коментарі тренера"],
          ["🎖️", "Сертифікат учасника", "Офіційний сертифікат учасника сезону PDF"],
        ].map(([icon, title, desc]) => (
          <div key={title} className="bg-white rounded-2xl shadow p-5 flex gap-4">
            <span className="text-2xl flex-shrink-0">{icon}</span>
            <div>
              <div className="font-bold text-gray-800 mb-1">{title}</div>
              <div className="text-sm text-gray-500">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div
          className="rounded-2xl p-6 text-center cursor-pointer border-2 transition-all hover:shadow-lg"
          style={{ borderColor: "#f46f10", backgroundColor: "#fff9f5" }}
          onClick={() => { setPayPlan("monthly"); setShowPayModal(true); }}
        >
          <div className="text-3xl font-black mb-1" style={{ color: "#f46f10" }}>{VIP_FEE_MONTHLY} грн</div>
          <div className="font-bold text-gray-800">на місяць</div>
          <div className="text-sm text-gray-400 mt-1">30 днів доступу</div>
          <button
            className="mt-4 w-full py-3 rounded-xl font-bold text-white"
            style={{ backgroundColor: "#f46f10" }}
          >
            Отримати VIP-доступ
          </button>
        </div>
        <div
          className="rounded-2xl p-6 text-center cursor-pointer border-2 transition-all hover:shadow-lg relative overflow-hidden"
          style={{ borderColor: "#1e2a4a", backgroundColor: "#f8faff" }}
          onClick={() => { setPayPlan("season"); setShowPayModal(true); }}
        >
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: "#f46f10" }}>ВИГІДНО</div>
          <div className="text-3xl font-black mb-1" style={{ color: "#1e2a4a" }}>{VIP_FEE_SEASON} грн</div>
          <div className="font-bold text-gray-800">до кінця сезону</div>
          <div className="text-sm text-gray-400 mt-1">Весь сезон 2025-2026</div>
          <button
            className="mt-4 w-full py-3 rounded-xl font-bold text-white"
            style={{ backgroundColor: "#1e2a4a" }}
          >
            Отримати VIP-доступ
          </button>
        </div>
      </div>

      {/* Payment modal */}
      {showPayModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPayModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-black mb-2" style={{ color: "#1e2a4a" }}>Інструкція оплати</h3>
            <p className="text-gray-500 text-sm mb-6">Для активації VIP-доступу виконайте переказ:</p>
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2 mb-6">
              <div><strong>Сума:</strong> {payPlan === "monthly" ? VIP_FEE_MONTHLY : VIP_FEE_SEASON} грн</div>
              <div><strong>Картка:</strong> {process.env.NEXT_PUBLIC_PAYMENT_CARD || "XXXX XXXX XXXX XXXX"}</div>
              <div><strong>Призначення:</strong> VIP-доступ ЛДБЛ {user?.email || ""}</div>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Після оплати надішліть скріншот на{" "}
              <a href="mailto:info@basket.lviv.ua" className="text-orange-500 underline">info@basket.lviv.ua</a>.
              Доступ буде активований протягом 24 годин.
            </p>
            <button
              onClick={() => setShowPayModal(false)}
              className="w-full py-3 rounded-xl font-bold"
              style={{ backgroundColor: "#f46f10", color: "white" }}
            >
              Зрозуміло
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
