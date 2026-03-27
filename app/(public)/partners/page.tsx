"use client";

import { useState } from "react";
const sponsorsData = {"sponsors":[{"id":1,"name":"Спортмастер Львів","logo":null,"slogan":"Все для спорту та перемог!","description":"Найбільший спортивний магазин Львова","url":"https://sportmaster.ua","tier":"premium","positions":["hero","header","footer","pdf"],"pages":["all"],"active":false,"contactEmail":"partner@sportmaster.ua"},{"id":2,"name":"Академія спорту","logo":null,"slogan":"Твій шлях до чемпіонства","description":"Професійна спортивна підготовка для дітей","url":"https://example.com","tier":"official","positions":["page-top","footer","pdf"],"pages":["all"],"active":false,"contactEmail":""}]}


const TIERS = [
  { key: "premium", label: "Преміум партнери", size: "large" },
  { key: "official", label: "Офіційні партнери", size: "medium" },
  { key: "friend", label: "Друзі ліги", size: "small" },
];

export default function PartnersPage() {
  const [formData, setFormData] = useState({ companyName: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await fetch("http://localhost:3012/api/partner-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      setSent(true);
    } catch {}
    setSending(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <h1 className="text-xl font-black mb-1" style={{ color: "#1e2a4a" }}>Партнери ЛДБЛ</h1>
      <p className="text-gray-500 mb-10">Офіційні партнери Львівської Дитячої Баскетбольної Ліги</p>

      {/* Partners by tier */}
      {TIERS.map((tier) => {
        const partners = sponsorsData.sponsors.filter((s) => s.tier === tier.key);
        if (!partners.length) return null;
        return (
          <div key={tier.key} className="mb-12">
            <h2 className="text-xl font-black mb-6 pb-2 border-b-2" style={{ color: "#1e2a4a", borderColor: "#f46f10" }}>
              {tier.label}
            </h2>
            <div className={`grid gap-6 ${tier.size === "large" ? "grid-cols-1 md:grid-cols-2" : tier.size === "medium" ? "grid-cols-2 md:grid-cols-3" : "grid-cols-3 md:grid-cols-4 lg:grid-cols-6"}`}>
              {partners.map((partner) => (
                <a
                  key={partner.id}
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white rounded-2xl shadow hover:shadow-xl transition-shadow p-6 text-center group"
                >
                  {partner.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={partner.logo} alt={partner.name} className="h-16 mx-auto mb-4 object-contain" />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-black text-xl"
                      style={{ backgroundColor: "#1e2a4a" }}
                    >
                      {partner.name[0]}
                    </div>
                  )}
                  <div className="font-black text-gray-800 group-hover:text-orange-500 transition-colors">{partner.name}</div>
                  {partner.slogan && <div className="text-xs text-gray-500 mt-1">{partner.slogan}</div>}
                  {partner.description && tier.size === "large" && (
                    <div className="text-sm text-gray-600 mt-3">{partner.description}</div>
                  )}
                </a>
              ))}
            </div>
          </div>
        );
      })}

      {/* Placeholder if no partners */}
      {sponsorsData.sponsors.filter((s) => s.active).length === 0 && (
        <div className="bg-gray-50 rounded-2xl p-12 text-center mb-12 border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-4">🤝</div>
          <h3 className="text-xl font-black text-gray-600 mb-2">Ми шукаємо партнерів</h3>
          <p className="text-gray-400">Станьте першим офіційним партнером ЛДБЛ та отримайте максимальну видимість</p>
        </div>
      )}

      {/* CTA block */}
      <div
        className="rounded-2xl p-8 text-white mt-8"
        style={{ background: "linear-gradient(135deg, #1e2a4a, #2d3f6f)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="text-2xl font-black mb-4">Стати партнером ЛДБЛ</h2>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>✅ Логотип у хедері та футері сайту</li>
              <li>✅ Банер на всіх сторінках порталу</li>
              <li>✅ Логотип у PDF-протоколах матчів</li>
              <li>✅ Статус &quot;Офіційний партнер ЛДБЛ&quot;</li>
              <li>✅ Згадки в соціальних мережах</li>
              <li>✅ Доступ до бази уболівальників</li>
            </ul>
          </div>

          {sent ? (
            <div className="bg-white/10 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="font-bold">Заявку надіслано!</div>
              <div className="text-sm text-gray-300 mt-1">Ми зв&apos;яжемось з вами найближчим часом</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white/10 rounded-xl p-5 space-y-3">
              <h3 className="font-bold mb-3">Залишити заявку</h3>
              <input
                required
                placeholder="Назва компанії"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm outline-none"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm outline-none"
              />
              <input
                placeholder="Телефон"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={sending}
                className="w-full py-2.5 rounded-lg font-bold text-sm disabled:opacity-50"
                style={{ backgroundColor: "#f46f10", color: "white" }}
              >
                {sending ? "Надсилання..." : "Зв'язатись з нами"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
