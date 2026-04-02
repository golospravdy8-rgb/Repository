"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Listing {
  id: number; title: string; description: string; price: number;
  category: string; condition: string; seller: string; phone: string;
  imageUrl: string; emoji: string; createdAt: string;
}
interface Bid { id: number; amount: number; bidder: string; createdAt: string; }
interface AuctionItem {
  id: number; title: string; description: string; category: string;
  seller: string; phone: string; imageUrl: string; emoji: string;
  startPrice: number; currentBid: number; minStep: number; endsAt: string; bids: Bid[];
}

const CATEGORIES = ["Всі", "М'ячі", "Взуття", "Форма", "Захист", "Обладнання", "Аксесуари", "Інше"];
const EMOJIS: Record<string, string> = { "М'ячі":"🏀","Взуття":"👟","Форма":"👕","Захист":"🛡️","Обладнання":"🏀","Аксесуари":"🎒","Інше":"📦" };
const CONDITIONS = ["Новий", "Гарний стан", "Б/у, 1 сезон", "Б/у"];

function Countdown({ endsAt }: { endsAt: string }) {
  const [left, setLeft] = useState(Math.max(0, new Date(endsAt).getTime() - Date.now()));
  useEffect(() => { const id = setInterval(() => setLeft(Math.max(0, new Date(endsAt).getTime() - Date.now())), 1000); return () => clearInterval(id); }, [endsAt]);
  if (left === 0) return <span style={{ color: "#ef4444", fontWeight: 700 }}>Завершено</span>;
  const h = Math.floor(left / 3600_000), m = Math.floor((left % 3600_000) / 60_000), s = Math.floor((left % 60_000) / 1000);
  return <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</span>;
}

function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json(); onChange(data.url || ""); setLoading(false);
  }
  return (
    <div>
      {value ? (
        <div style={{ position: "relative", marginBottom: 8 }}>
          <img src={value} alt="preview" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10 }} />
          <button type="button" onClick={() => onChange("")} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer" }}>✕</button>
        </div>
      ) : (
        <div onClick={() => ref.current?.click()} style={{ border: "2px dashed #d1d5db", borderRadius: 10, height: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#f9fafb", color: "#6b7280" }}>
          {loading ? "Завантаження..." : <><span style={{ fontSize: 28 }}>📷</span><span>Додати фото</span></>}
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

function ListingCard({ item, currentUser, onDelete }: { item: Listing; currentUser: { name: string } | null; onDelete: (id: number) => void }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const isOwner = currentUser?.name === item.seller;
  return (
    <div style={{ backgroundColor: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 200, background: item.imageUrl ? "#f8fafc" : "#1e2a4a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, overflow: "hidden" }}>
        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} /> : item.emoji}
      </div>
      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontWeight: 700, color: "#1e2a4a", fontSize: 15, marginBottom: 6 }}>{item.title}</div>
        {item.description && <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{item.description}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#f46f10" }}>{item.price.toLocaleString()} грн</span>
          <span style={{ fontSize: 11, color: "#9ca3af", background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>{item.condition}</span>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: item.phone ? 4 : 12 }}>{item.category} · {item.seller}</div>
        {item.phone && <div style={{ fontSize: 12, color: "#374151", marginBottom: 12 }}>📞 {item.phone}</div>}
        <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
          {item.phone && <a href={"tel:" + item.phone} style={{ flex: 1, padding: "9px 0", backgroundColor: "#1e2a4a", color: "white", borderRadius: 8, fontWeight: 700, fontSize: 12, textAlign: "center", textDecoration: "none" }}>Подзвонити</a>}
          {isOwner && (confirmDel
            ? <button onClick={() => onDelete(item.id)} style={{ flex: 1, padding: 9, backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Підтвердити</button>
            : <button onClick={() => setConfirmDel(true)} style={{ padding: "9px 12px", backgroundColor: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Видалити</button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddListingModal({ seller, onClose, onAdded }: { seller: string; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", price: "", category: "М'ячі", condition: "Гарний стан", phone: "", imageUrl: "" });
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.price) { setError("Заповніть обов'язкові поля"); return; }
    setLoading(true);
    const res = await fetch("/api/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, seller, price: Number(form.price), emoji: EMOJIS[form.category] || "📦" }) });
    if (res.ok) { onAdded(); onClose(); }
    else { const d = await res.json(); setError(d.error || "Помилка"); }
    setLoading(false);
  }
  const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "white", borderRadius: 20, padding: 28, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: "#1e2a4a", margin: 0 }}>Нове оголошення</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>
        </div>
        <div style={{ padding: "8px 12px", background: "#f0f7ff", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#1e2a4a" }}>Продавець: <strong>{seller}</strong></div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Фото товару</label><ImageUpload value={form.imageUrl} onChange={v => set("imageUrl", v)} /></div>
          <div><label style={lbl}>Назва *</label><input style={inp} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Назва товару" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Категорія</label><select style={inp} value={form.category} onChange={e => set("category", e.target.value)}>{CATEGORIES.filter(c => c !== "Всі").map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>Стан</label><select style={inp} value={form.condition} onChange={e => set("condition", e.target.value)}>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div><label style={lbl}>Ціна (грн) *</label><input style={inp} type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="0" min={0} /></div>
          <div><label style={lbl}>Телефон</label><input style={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+380..." /></div>
          <div><label style={lbl}>Опис</label><textarea style={{ ...inp, resize: "vertical" }} rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Стан, розмір, особливості..." /></div>
          {error && <div style={{ color: "#ef4444", fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding: 14, background: "#f46f10", color: "white", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>{loading ? "Публікуємо..." : "Опублікувати"}</button>
        </form>
      </div>
    </div>
  );
}

function AuctionCard({ item, onOpen }: { item: AuctionItem; onOpen: (i: AuctionItem) => void }) {
  const isOver = new Date() >= new Date(item.endsAt);
  return (
    <div onClick={() => onOpen(item)} style={{ background: "linear-gradient(145deg,#111118,#0d0d14)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, overflow: "hidden", cursor: "pointer", transition: "transform .2s,box-shadow .2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(13,110,253,0.25)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
      <div style={{ position: "relative", height: 200, background: item.imageUrl ? "#0d0d20" : "linear-gradient(135deg,#0d0d20,#1a1a35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, overflow: "hidden" }}>
        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} /> : item.emoji}
        {!isOver && <span style={{ position: "absolute", top: 12, left: 12, background: "#dc3545", color: "white", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4 }}>LIVE</span>}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(0deg,rgba(0,0,0,0.9),transparent)", padding: "8px 12px", fontSize: 13, color: isOver ? "#ef4444" : "#60a5fa" }}>⏱ <Countdown endsAt={item.endsAt} /></div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f5", marginBottom: 4 }}>{item.title}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{item.category} · {item.seller}</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: item.bids.length > 0 ? 8 : 14 }}>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Поточна ставка</div><div style={{ fontSize: 20, fontWeight: 800, color: "#3b82f6" }}>{item.currentBid.toLocaleString()} грн</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Ставок</div><div style={{ fontSize: 18, fontWeight: 700, color: "#f0f0f5" }}>{item.bids.length}</div></div>
        </div>
        {item.bids.length > 0 && (
          <div style={{ marginBottom: 12, padding: "6px 10px", background: "rgba(59,130,246,0.12)", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>👤</span>
            <span style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700 }}>{item.bids[0].bidder}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>лідер</span>
          </div>
        )}
        <div style={{ padding: 10, background: "#0d6efd", color: "white", borderRadius: 10, fontWeight: 700, fontSize: 13, textAlign: "center" }}>{isOver ? "Переглянути" : "Зробити ставку"}</div>
      </div>
    </div>
  );
}

function BidModal({ item, seller, onClose, onBid }: { item: AuctionItem | null; seller: string; onClose: () => void; onBid: () => void }) {
  const [amount, setAmount] = useState(""); const [error, setError] = useState("");
  const [success, setSuccess] = useState(false); const [loading, setLoading] = useState(false);
  useEffect(() => { if (item) { setAmount(String(item.currentBid + item.minStep)); setError(""); setSuccess(false); } }, [item]);
  if (!item) return null;
  const isOver = new Date() >= new Date(item.endsAt);
  async function handleBid() {
    setLoading(true);
    const res = await fetch("/api/auctions/" + item!.id + "/bids", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), bidder: seller }) });
    const data = await res.json();
    if (res.ok) { setSuccess(true); onBid(); } else setError(data.error || "Помилка");
    setLoading(false);
  }
  const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#f0f0f5", fontSize: 15, fontWeight: 700, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32, maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div><div style={{ fontSize: 20, fontWeight: 800, color: "#f0f0f5" }}>{item.title}</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{item.category} · {item.seller}</div></div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ marginBottom: 16, background: "linear-gradient(135deg,#0d0d20,#1a1a35)", borderRadius: 16, height: 220, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 12 }}>
          {item.imageUrl ? <img src={item.imageUrl} alt={item.title} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 72 }}>{item.emoji}</span>}
        </div>
        {item.description && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 20 }}>{item.description}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[{ label: "Поточна ставка", value: item.currentBid.toLocaleString() + " грн", color: "#3b82f6" }, { label: "Ставок", value: String(item.bids.length), color: "#f0f0f5" }, { label: "Мін. крок", value: item.minStep + " грн", color: "#f0f0f5" }].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(13,110,253,0.1)", border: "1px solid rgba(13,110,253,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Завершення:</span>
          <span style={{ fontSize: 16, color: isOver ? "#ef4444" : "#60a5fa" }}>⏱ <Countdown endsAt={item.endsAt} /></span>
        </div>
        {item.bids.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 10, textTransform: "uppercase" }}>Останні ставки</div>
            {item.bids.slice(0, 5).map((b, i) => (
              <div key={b.id || i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                <span style={{ color: "#f0f0f5", fontWeight: 600 }}>{b.bidder}</span>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ color: "#3b82f6", fontWeight: 700 }}>{b.amount.toLocaleString()} грн</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>{new Date(b.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {isOver ? (
          <div style={{ textAlign: "center", padding: 20, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12 }}>
            <div style={{ color: "#f87171", fontWeight: 700 }}>Аукціон завершено</div>
            {item.bids[0] && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>Переможець: {item.bids[0].bidder} — {item.bids[0].amount.toLocaleString()} грн</div>}
          </div>
        ) : success ? (
          <div style={{ textAlign: "center", padding: 20, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12 }}>
            <div style={{ fontSize: 32 }}>✅</div>
            <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 16 }}>Ставку прийнято!</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 6 }}>Ваша ставка: {Number(amount).toLocaleString()} грн</div>
          </div>
        ) : (
          <div>
            <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.06)", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Учасник: <strong style={{ color: "#f0f0f5" }}>{seller}</strong></div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8, textTransform: "uppercase" }}>Ваша ставка</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setError(""); }} min={item.currentBid + item.minStep} step={item.minStep} style={{ ...inp, flex: 1 }} />
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>грн</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {[1,2,5].map(mult => <button key={mult} onClick={() => setAmount(String(item.currentBid + item.minStep * mult))} style={{ padding: "6px 12px", background: "rgba(13,110,253,0.15)", border: "1px solid rgba(13,110,253,0.3)", borderRadius: 8, color: "#60a5fa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+{(item.minStep*mult).toLocaleString()} грн</button>)}
            </div>
            {error && <div style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{error}</div>}
            <button onClick={handleBid} disabled={loading} style={{ width: "100%", marginTop: 16, padding: 14, background: "#0d6efd", color: "white", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 0 20px rgba(13,110,253,0.5)" }}>{loading ? "Відправляємо..." : "Зробити ставку"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddAuctionModal({ seller, onClose, onAdded }: { seller: string; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", category: "М'ячі", phone: "", imageUrl: "", startPrice: "", minStep: "50", durationHours: "24" });
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.startPrice) { setError("Заповніть обов'язкові поля"); return; }
    setLoading(true);
    const res = await fetch("/api/auctions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, seller, startPrice: Number(form.startPrice), minStep: Number(form.minStep), durationHours: Number(form.durationHours), emoji: EMOJIS[form.category] || "📦" }) });
    if (res.ok) { onAdded(); onClose(); }
    else { const d = await res.json(); setError(d.error || "Помилка"); }
    setLoading(false);
  }
  const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#f0f0f5", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 6, textTransform: "uppercase" };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f0f0f5", margin: 0 }}>Новий аукціон</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>✕</button>
        </div>
        <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.06)", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Продавець: <strong style={{ color: "#f0f0f5" }}>{seller}</strong></div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Фото товару</label><ImageUpload value={form.imageUrl} onChange={v => set("imageUrl", v)} /></div>
          <div><label style={lbl}>Назва *</label><input style={inp} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Назва лоту" /></div>
          <div><label style={lbl}>Категорія</label><select style={inp} value={form.category} onChange={e => set("category", e.target.value)}>{CATEGORIES.filter(c => c !== "Всі").map(c => <option key={c} style={{ background: "#1a1a2e" }}>{c}</option>)}</select></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Стартова ціна *</label><input style={inp} type="number" value={form.startPrice} onChange={e => set("startPrice", e.target.value)} placeholder="0" min={1} /></div>
            <div><label style={lbl}>Мін. крок</label><input style={inp} type="number" value={form.minStep} onChange={e => set("minStep", e.target.value)} placeholder="50" min={1} /></div>
          </div>
          <div><label style={lbl}>Тривалість</label>
            <select style={inp} value={form.durationHours} onChange={e => set("durationHours", e.target.value)}>
              <option value="1">1 година</option><option value="6">6 годин</option><option value="12">12 годин</option>
              <option value="24">1 день</option><option value="48">2 дні</option><option value="72">3 дні</option><option value="168">7 днів</option>
            </select>
          </div>
          <div><label style={lbl}>Телефон</label><input style={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+380..." /></div>
          <div><label style={lbl}>Опис</label><textarea style={{ ...inp, resize: "vertical" }} rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Стан, особливості..." /></div>
          {error && <div style={{ color: "#f87171", fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding: 14, background: "#0d6efd", color: "white", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 0 20px rgba(13,110,253,0.4)" }}>{loading ? "Створюємо..." : "Запустити аукціон"}</button>
        </form>
      </div>
    </div>
  );
}

function LoginPrompt({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "white", borderRadius: 20, padding: 32, maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: "#1e2a4a", marginBottom: 8 }}>Потрібна реєстрація</h3>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>Для публікації оголошень та участі в аукціоні увійдіть через головний сайт ДЮБЛ</p>
        <a href="http://localhost:3006" style={{ display: "block", padding: "12px 24px", background: "#f46f10", color: "white", borderRadius: 12, fontWeight: 700, textDecoration: "none", marginBottom: 12 }}>Увійти через ДЮБЛ →</a>
        <button onClick={onClose} style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 10, cursor: "pointer", background: "white", color: "#6b7280", fontSize: 14 }}>Скасувати</button>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [tab, setTab] = useState<"marketplace" | "auction">("marketplace");
  const [listings, setListings] = useState<Listing[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [search, setSearch] = useState(""); const [category, setCategory] = useState("Всі");
  const [aucSearch, setAucSearch] = useState(""); const [aucCategory, setAucCategory] = useState("Всі");
  const [showAddListing, setShowAddListing] = useState(false); const [showAddAuction, setShowAddAuction] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<AuctionItem | null>(null);
  const [loadingListings, setLoadingListings] = useState(true); const [loadingAuctions, setLoadingAuctions] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ name: string; phone: string } | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    // Check JWT cookie via server-side API route (cookie is httpOnly, set by auth server on localhost)
    fetch("/api/me").then(r => r.json()).then(user => { if (user) setCurrentUser(user); }).catch(() => {});
  }, []);

  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    const p = new URLSearchParams(); if (category !== "Всі") p.set("category", category); if (search) p.set("search", search);
    const res = await fetch("/api/listings?" + p); if (res.ok) setListings(await res.json()); setLoadingListings(false);
  }, [category, search]);

  const fetchAuctions = useCallback(async () => {
    setLoadingAuctions(true);
    const p = new URLSearchParams(); if (aucCategory !== "Всі") p.set("category", aucCategory); if (aucSearch) p.set("search", aucSearch);
    const res = await fetch("/api/auctions?" + p); if (res.ok) setAuctions(await res.json()); setLoadingAuctions(false);
  }, [aucCategory, aucSearch]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { fetchAuctions(); }, [fetchAuctions]);
  useEffect(() => { const id = setInterval(fetchAuctions, 10_000); return () => clearInterval(id); }, [fetchAuctions]);

  function requireAuth(action: () => void) { if (!currentUser) { setShowLoginPrompt(true); return; } action(); }

  async function handleDeleteListing(id: number) { await fetch("/api/listings/" + id, { method: "DELETE" }); fetchListings(); }
  async function refreshSelectedAuction(auctionId: number) {
    const res = await fetch("/api/auctions/" + auctionId);
    if (res.ok) { const u = await res.json(); setSelectedAuction(u); setAuctions(prev => prev.map(a => a.id === auctionId ? u : a)); }
  }

  const sellerName = currentUser ? currentUser.name : "";
  const activeAuctions = auctions.filter(a => new Date() < new Date(a.endsAt));
  const totalBids = auctions.reduce((s, a) => s + a.bids.length, 0);
  const topBid = auctions.length ? Math.max(...auctions.map(a => a.currentBid)) : 0;

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(220,53,69,.5)}50%{box-shadow:0 0 0 6px rgba(220,53,69,0)}} *{box-sizing:border-box} body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}`}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: tab === "auction" ? "#f0f0f5" : "#1e2a4a", margin: 0 }}>{tab === "marketplace" ? "Барахолка ДЮБЛ" : "Аукціон ДЮБЛ"}</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {currentUser && <span style={{ fontSize: 13, color: "#6b7280", padding: "6px 12px", background: "#f1f5f9", borderRadius: 8 }}>👤 {currentUser.name}</span>}
            <button onClick={() => setTab("marketplace")} style={{ padding: "10px 22px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none", background: tab === "marketplace" ? "#f46f10" : "#e5e7eb", color: tab === "marketplace" ? "white" : "#374151" }}>Барахолка</button>
            <button onClick={() => setTab("auction")} style={{ padding: "10px 22px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none", background: tab === "auction" ? "#0d6efd" : "#e5e7eb", color: tab === "auction" ? "white" : "#374151", boxShadow: tab === "auction" ? "0 0 20px rgba(13,110,253,0.4)" : "none" }}>Аукціон</button>
          </div>
        </div>

        {tab === "marketplace" && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => requireAuth(() => setShowAddListing(true))} style={{ padding: "10px 20px", backgroundColor: "#f46f10", color: "white", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>+ Додати оголошення</button>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Пошук..." style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, flex: 1, minWidth: 200, outline: "none" }} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CATEGORIES.map(cat => <button key={cat} onClick={() => setCategory(cat)} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: category === cat ? "#f46f10" : "#e5e7eb", color: category === cat ? "white" : "#4a4a4a" }}>{cat}</button>)}
              </div>
            </div>
            {loadingListings ? <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Завантаження...</div>
            : listings.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Оголошень поки немає</div>
                <div style={{ marginBottom: 20 }}>Будьте першим — додайте своє оголошення!</div>
                <button onClick={() => requireAuth(() => setShowAddListing(true))} style={{ padding: "12px 24px", backgroundColor: "#f46f10", color: "white", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>+ Додати оголошення</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 20 }}>
                {listings.map(item => <ListingCard key={item.id} item={item} currentUser={currentUser} onDelete={handleDeleteListing} />)}
              </div>
            )}
          </>
        )}

        {tab === "auction" && (
          <div style={{ background: "linear-gradient(180deg,#0a0a0f,#0d0d1a)", borderRadius: 20, padding: 28, minHeight: 600 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>ДЮБЛ · Офіційний аукціон</div>
              <h2 style={{ fontSize: 30, fontWeight: 800, color: "#f0f0f5", margin: "0 0 8px" }}>Ставки на спортивні лоти</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: "0 0 20px" }}>Рідкісні речі, підписані форми, офіційний інвентар ДЮБЛ</p>
              <button onClick={() => requireAuth(() => setShowAddAuction(true))} style={{ padding: "12px 28px", background: "linear-gradient(135deg,#0d6efd,#3b82f6)", color: "white", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 0 24px rgba(13,110,253,0.5)" }}>Додати товар на аукціон</button>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <input value={aucSearch} onChange={e => setAucSearch(e.target.value)} placeholder="Пошук лотів..." style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#f0f0f5", fontSize: 14, flex: 1, outline: "none", fontFamily: "inherit" }} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {CATEGORIES.map(cat => <button key={cat} onClick={() => setAucCategory(cat)} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: aucCategory === cat ? "none" : "1px solid rgba(255,255,255,0.12)", background: aucCategory === cat ? "#0d6efd" : "rgba(255,255,255,0.05)", color: aucCategory === cat ? "white" : "rgba(255,255,255,0.6)" }}>{cat}</button>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
              {[{ label: "Активних лотів", value: activeAuctions.length }, { label: "Всього ставок", value: totalBids }, { label: "Топ ставка", value: topBid ? topBid.toLocaleString() + " грн" : "—" }].map(s => (
                <div key={s.label} style={{ background: "rgba(13,110,253,0.08)", border: "1px solid rgba(13,110,253,0.2)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#3b82f6" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {loadingAuctions ? <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>Завантаження...</div>
            : auctions.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "rgba(255,255,255,0.6)" }}>Аукціонів поки немає</div>
                <button onClick={() => requireAuth(() => setShowAddAuction(true))} style={{ padding: "12px 24px", background: "#0d6efd", color: "white", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>Додати лот</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
                {auctions.map(item => <AuctionCard key={item.id} item={item} onOpen={a => requireAuth(() => setSelectedAuction(a))} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddListing && currentUser && <AddListingModal seller={sellerName} onClose={() => setShowAddListing(false)} onAdded={fetchListings} />}
      {showAddAuction && currentUser && <AddAuctionModal seller={sellerName} onClose={() => setShowAddAuction(false)} onAdded={fetchAuctions} />}
      {selectedAuction && currentUser && <BidModal item={selectedAuction} seller={sellerName} onClose={() => setSelectedAuction(null)} onBid={() => refreshSelectedAuction(selectedAuction.id)} />}
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </>
  );
}
