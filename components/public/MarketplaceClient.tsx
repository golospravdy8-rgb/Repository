"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────
interface Listing {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  seller: string;
  phone: string;
  imageUrl: string | null;
  emoji: string;
}

interface Auction {
  id: number;
  title: string;
  description: string;
  category: string;
  seller: string;
  phone: string;
  imageUrl: string | null;
  emoji: string;
  startPrice: number;
  currentBid: number;
  minStep: number;
  endsAt: string;
  isActive: boolean;
  bids: { id: number; amount: number; bidder: string; createdAt: string }[];
}

const PAGE_STYLE: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0f172a",
  color: "white",
  fontFamily: "Exo 2, sans-serif",
};

// ── Main Component ────────────────────────────────────────────────────────
export default function MarketplaceClient() {
  const [tab, setTab] = useState<"listings" | "auctions">("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [revealPhone, setRevealPhone] = useState<number | null>(null);
  const [bidModal, setBidModal] = useState<Auction | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [l, a] = await Promise.all([
      fetch("/api/marketplace/listings").then((r) => r.json()).catch(() => ({ listings: [] })),
      fetch("/api/marketplace/auctions").then((r) => r.json()).catch(() => ({ auctions: [] })),
    ]);
    setListings(l.listings ?? []);
    setAuctions(a.auctions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "12px", background: active ? "#f46f10" : "transparent",
    color: "white", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "15px",
    fontFamily: "Exo 2, sans-serif", borderRadius: active ? "8px 8px 0 0" : "0",
    transition: "background 0.2s",
  });

  return (
    <div style={PAGE_STYLE}>
      {/* Header */}
      <header style={{ background: "#1e2a4a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <a href="/" style={{ color: "#f46f10", textDecoration: "none", fontSize: "14px" }}>← Головна</a>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>🛒 Барахолка ЛДБЛ</h1>
      </header>

      {/* Tabs */}
      <div style={{ background: "#1e2a4a", display: "flex", gap: "0", padding: "0 24px" }}>
        <button style={tabBtn(tab === "listings")} onClick={() => setTab("listings")}>📋 Оголошення</button>
        <button style={tabBtn(tab === "auctions")} onClick={() => setTab("auctions")}>🔨 Аукціон</button>
      </div>

      <div style={{ padding: "24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0" }}>Завантаження...</div>
        ) : tab === "listings" ? (
          <ListingsTab
            listings={listings}
            revealPhone={revealPhone}
            setRevealPhone={setRevealPhone}
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            onAdded={loadData}
          />
        ) : (
          <AuctionsTab
            auctions={auctions}
            onBid={(a) => setBidModal(a)}
          />
        )}
      </div>

      {bidModal && (
        <BidModal
          auction={bidModal}
          onClose={() => setBidModal(null)}
          onBid={() => { setBidModal(null); loadData(); }}
        />
      )}
    </div>
  );
}

// ── Listings Tab ──────────────────────────────────────────────────────────
function ListingsTab({
  listings, revealPhone, setRevealPhone, showAddForm, setShowAddForm, onAdded,
}: {
  listings: Listing[];
  revealPhone: number | null;
  setRevealPhone: (id: number | null) => void;
  showAddForm: boolean;
  setShowAddForm: (v: boolean) => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({ title: "", description: "", price: "", category: "М'ячі", condition: "Новий", seller: "", phone: "" });
  const [saving, setSaving] = useState(false);

  function setF(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/marketplace/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price) }),
    });
    setSaving(false);
    setShowAddForm(false);
    setForm({ title: "", description: "", price: "", category: "М'ячі", condition: "Новий", seller: "", phone: "" });
    onAdded();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
    color: "white", fontSize: "14px", fontFamily: "Exo 2, sans-serif", boxSizing: "border-box",
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <span style={{ color: "#94a3b8", fontSize: "14px" }}>{listings.length} оголошень</span>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ padding: "8px 16px", background: "#f46f10", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif" }}
        >
          + Додати оголошення
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} style={{ background: "#1e2a4a", borderRadius: "16px", padding: "20px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ margin: 0 }}>Нове оголошення</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Назва *</label><input required value={form.title} onChange={(e) => setF("title", e.target.value)} style={inputStyle} /></div>
            <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Ціна (грн) *</label><input required type="number" value={form.price} onChange={(e) => setF("price", e.target.value)} style={inputStyle} /></div>
          </div>
          <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Опис</label><input value={form.description} onChange={(e) => setF("description", e.target.value)} style={inputStyle} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Категорія</label>
              <select value={form.category} onChange={(e) => setF("category", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {["М'ячі", "Форма", "Взуття", "Аксесуари", "Захист", "Обладнання"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Стан</label>
              <select value={form.condition} onChange={(e) => setF("condition", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option>Новий</option><option>Б/у</option><option>Ідеальний</option><option>Задовільний</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Ваше ім&apos;я *</label><input required value={form.seller} onChange={(e) => setF("seller", e.target.value)} style={inputStyle} /></div>
            <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Телефон *</label><input required value={form.phone} onChange={(e) => setF("phone", e.target.value)} placeholder="+380..." style={inputStyle} /></div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" disabled={saving} style={{ padding: "10px 20px", background: "#f46f10", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif" }}>
              {saving ? "Збереження..." : "Додати"}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: "10px 20px", background: "rgba(255,255,255,0.1)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Exo 2, sans-serif" }}>
              Скасувати
            </button>
          </div>
        </form>
      )}

      {listings.length === 0 ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0" }}>Оголошень поки немає</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
          {listings.map((l) => (
            <div key={l.id} style={{ background: "#1e2a4a", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)" }}>
                {l.imageUrl
                  ? <img src={l.imageUrl} alt={l.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: "56px" }}>{l.emoji}</span>
                }
              </div>
              <div style={{ padding: "14px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>{l.category} · {l.condition}</div>
                <div style={{ fontWeight: 700, marginBottom: "8px" }}>{l.title}</div>
                {l.description && <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>{l.description}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "20px", fontWeight: 800, color: "#f46f10" }}>{l.price} ₴</span>
                  <button
                    onClick={() => setRevealPhone(revealPhone === l.id ? null : l.id)}
                    style={{ padding: "6px 12px", background: revealPhone === l.id ? "rgba(255,255,255,0.1)" : "#1e3a5f", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "Exo 2, sans-serif" }}
                  >
                    {revealPhone === l.id ? l.phone : "📞 Зв'язатись"}
                  </button>
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>Продавець: {l.seller}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Auctions Tab ──────────────────────────────────────────────────────────
function AuctionsTab({ auctions, onBid }: { auctions: Auction[]; onBid: (a: Auction) => void }) {
  return auctions.length === 0 ? (
    <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0" }}>Активних аукціонів немає</div>
  ) : (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
      {auctions.map((a) => <AuctionCard key={a.id} auction={a} onBid={onBid} />)}
    </div>
  );
}

// ── Auction Card ──────────────────────────────────────────────────────────
function AuctionCard({ auction, onBid }: { auction: Auction; onBid: (a: Auction) => void }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(auction.endsAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Завершено"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}г ${m}хв ${s}с`);
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [auction.endsAt]);

  const ended = new Date(auction.endsAt) < new Date();

  return (
    <div style={{ background: "#1e2a4a", borderRadius: "16px", overflow: "hidden", border: `1px solid ${ended ? "rgba(255,255,255,0.08)" : "rgba(244,111,16,0.3)"}` }}>
      <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", position: "relative" }}>
        {auction.imageUrl
          ? <img src={auction.imageUrl} alt={auction.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: "64px" }}>{auction.emoji}</span>
        }
        <div style={{ position: "absolute", top: "8px", right: "8px", background: ended ? "#374151" : "#f46f10", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
          {ended ? "Завершено" : `⏱ ${timeLeft}`}
        </div>
      </div>
      <div style={{ padding: "16px" }}>
        <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>{auction.category}</div>
        <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "12px" }}>{auction.title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Поточна ставка</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#f46f10" }}>{auction.currentBid} ₴</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Мін. крок</div>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>+{auction.minStep} ₴</div>
          </div>
        </div>
        {auction.bids.length > 0 && (
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
            Остання ставка: {auction.bids[0].bidder} — {auction.bids[0].amount} ₴
          </div>
        )}
        <button
          onClick={() => onBid(auction)}
          disabled={ended}
          style={{ width: "100%", padding: "10px", background: ended ? "#374151" : "#f46f10", color: "white", border: "none", borderRadius: "8px", cursor: ended ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "14px", fontFamily: "Exo 2, sans-serif" }}
        >
          {ended ? "Аукціон завершено" : "⬆ Зробити ставку"}
        </button>
      </div>
    </div>
  );
}

// ── Bid Modal ─────────────────────────────────────────────────────────────
function BidModal({ auction, onClose, onBid }: { auction: Auction; onClose: () => void; onBid: () => void }) {
  const minBid = auction.currentBid + auction.minStep;
  const [bidder, setBidder] = useState("");
  const [amount, setAmount] = useState(String(minBid));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(amount) < minBid) { setError(`Мінімальна ставка: ${minBid} грн`); return; }
    setSending(true);
    setError("");
    const res = await fetch("/api/marketplace/bid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auctionId: auction.id, amount: Number(amount), bidder }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Помилка"); setSending(false); return; }
    onBid();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
    color: "white", fontSize: "14px", fontFamily: "Exo 2, sans-serif", boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#1e2a4a", borderRadius: "20px", width: "100%", maxWidth: "400px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>⬆ Зробити ставку</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
          <div style={{ fontWeight: 700 }}>{auction.title}</div>
          <div style={{ color: "#94a3b8", fontSize: "13px" }}>Поточна ставка: <strong style={{ color: "#f46f10" }}>{auction.currentBid} ₴</strong></div>
          <div style={{ color: "#94a3b8", fontSize: "13px" }}>Мінімальна ставка: <strong style={{ color: "white" }}>{minBid} ₴</strong></div>
        </div>
        {error && <div style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", padding: "10px", borderRadius: "8px", marginBottom: "12px", fontSize: "13px" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Ваше ім&apos;я *</label><input required value={bidder} onChange={(e) => setBidder(e.target.value)} placeholder="Іван" style={inputStyle} /></div>
          <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Сума ставки (мін. {minBid} ₴) *</label><input required type="number" min={minBid} value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} /></div>
          <button type="submit" disabled={sending} style={{ padding: "12px", background: "#f46f10", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "15px", fontFamily: "Exo 2, sans-serif" }}>
            {sending ? "Відправка..." : `Поставити ${amount} ₴`}
          </button>
        </form>
      </div>
    </div>
  );
}
