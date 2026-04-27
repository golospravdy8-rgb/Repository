"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  bids: { id: number; amount: number; bidder: string; phone: string; createdAt: string }[];
}

const PAGE_STYLE: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0f172a",
  color: "white",
  fontFamily: "Exo 2, sans-serif",
};

// ── Toast notification ────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: "outbid" | "info" }

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div style={{ position: "fixed", top: "16px", right: "16px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px", pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: t.type === "outbid" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "#1e3a5f",
            color: "white",
            padding: "14px 18px",
            borderRadius: "12px",
            fontFamily: "Exo 2, sans-serif",
            fontWeight: 700,
            fontSize: "14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            border: t.type === "outbid" ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.1)",
            maxWidth: "320px",
            pointerEvents: "auto",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "toastIn 0.3s ease",
          }}
          onClick={() => onRemove(t.id)}
        >
          <span style={{ fontSize: "20px", flexShrink: 0 }}>{t.type === "outbid" ? "🔔" : "ℹ️"}</span>
          <span>{t.message}</span>
        </div>
      ))}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateX(40px) } to { opacity: 1; transform: translateX(0) } }`}</style>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function MarketplaceClient() {
  const [tab, setTab] = useState<"listings" | "auctions">("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const [bidModal, setBidModal] = useState<Auction | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevAuctionsRef = useRef<Auction[]>([]);
  const toastCounter = useRef(0);
  const [currentUser, setCurrentUser] = useState<{ name: string; phone: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Try chat user (ldbl_chat_user = { phone, firstName, lastName })
    try {
      const chatRaw = localStorage.getItem("ldbl_chat_user");
      if (chatRaw) {
        const u = JSON.parse(chatRaw);
        if (u?.phone && u?.firstName) {
          setCurrentUser({ name: `${u.firstName} ${u.lastName || ""}`.trim(), phone: u.phone });
          setAuthChecked(true);
          return;
        }
      }
    } catch {}
    // Try parent auth (parent_data = { contact: {...}, team: {...} })
    try {
      const pRaw = localStorage.getItem("parent_data");
      if (pRaw) {
        const { contact } = JSON.parse(pRaw);
        if (contact?.phone && contact?.firstName) {
          setCurrentUser({ name: `${contact.firstName} ${contact.lastName || ""}`.trim(), phone: contact.phone });
          setAuthChecked(true);
          return;
        }
      }
    } catch {}
    // Try parent_token — fetch from API
    try {
      const token = localStorage.getItem("parent_token");
      if (token) {
        fetch("/api/parents/me", { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (data?.contact) {
              setCurrentUser({ name: `${data.contact.firstName} ${data.contact.lastName || ""}`.trim(), phone: data.contact.phone });
            } else {
              setCurrentUser({ name: "", phone: "" });
            }
            setAuthChecked(true);
          })
          .catch(() => { setCurrentUser({ name: "", phone: "" }); setAuthChecked(true); });
        return;
      }
    } catch {}
    setAuthChecked(true);
  }, []);

  function addToast(message: string, type: Toast["type"] = "info") {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [l, a] = await Promise.all([
      fetch("/api/marketplace/listings").then((r) => r.json()).catch(() => ({ listings: [] })),
      fetch("/api/marketplace/auctions").then((r) => r.json()).catch(() => ({ auctions: [] })),
    ]);
    const newAuctions: Auction[] = a.auctions ?? [];

    // Check for outbid notifications
    const myName = typeof window !== "undefined" ? localStorage.getItem("auction_bidder_name") : null;
    if (myName && prevAuctionsRef.current.length > 0) {
      for (const newA of newAuctions) {
        const prev = prevAuctionsRef.current.find((p) => p.id === newA.id);
        if (!prev) continue;
        if (newA.currentBid === prev.currentBid) continue;
        // Bid changed — check if I was the previous leader and now I'm not
        const prevLeader = prev.bids[0]?.bidder ?? "";
        const newLeader = newA.bids[0]?.bidder ?? "";
        if (prevLeader.toLowerCase() === myName.toLowerCase() && newLeader.toLowerCase() !== myName.toLowerCase()) {
          addToast(`Тебе перебили! Ставка зросла до ${newA.currentBid} ₴`, "outbid");
        }
      }
    }

    prevAuctionsRef.current = newAuctions;
    setListings(l.listings ?? []);
    setAuctions(newAuctions);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll every 5 seconds when on auctions tab
  useEffect(() => {
    if (tab !== "auctions") return;
    const interval = setInterval(() => loadData(true), 5000);
    return () => clearInterval(interval);
  }, [tab, loadData]);

  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "12px", background: active ? "#f46f10" : "transparent",
    color: "white", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "15px",
    fontFamily: "Exo 2, sans-serif", borderRadius: active ? "8px 8px 0 0" : "0",
    transition: "background 0.2s",
  });

  // Show nothing while checking auth to avoid flash
  if (!authChecked) {
    return <div style={{ ...PAGE_STYLE, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><span style={{ color: "#94a3b8" }}>...</span></div>;
  }

  // Auth gate — must be logged in to view marketplace
  if (authChecked && !currentUser) {
    return (
      <div style={{ ...PAGE_STYLE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "24px", padding: "32px" }}>
        <div style={{ fontSize: "64px" }}>🛒</div>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, textAlign: "center" }}>Барахолка ДЮБЛ</h1>
        <p style={{ color: "#94a3b8", textAlign: "center", maxWidth: "360px", margin: 0 }}>
          Для доступу до барахолки потрібно увійти в акаунт батьків або зареєструватися.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <a href="/" style={{ padding: "10px 24px", background: "rgba(255,255,255,0.08)", color: "white", borderRadius: "10px", textDecoration: "none", fontWeight: 700, fontFamily: "Exo 2, sans-serif", border: "1px solid rgba(255,255,255,0.15)" }}>
            ← Головна
          </a>
        </div>
        <p style={{ color: "#64748b", fontSize: "12px", textAlign: "center" }}>
          Увійдіть через кнопку «Батькам» у верхній частині сайту
        </p>
      </div>
    );
  }

  return (
    <div style={PAGE_STYLE}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* Header */}
      <header style={{ background: "#1e2a4a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <a href="/" style={{ color: "#f46f10", textDecoration: "none", fontSize: "14px" }}>← Головна</a>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>🛒 Барахолка ДЮБЛ</h1>
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
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            onAdded={loadData}
            currentUser={currentUser}
          />
        ) : (
          <AuctionsTab
            auctions={auctions}
            onBid={(a) => setBidModal(a)}
            onRefresh={loadData}
            currentUser={currentUser}
          />
        )}
      </div>

      {bidModal && (
        <BidModal
          auction={bidModal}
          currentUser={currentUser}
          onClose={() => setBidModal(null)}
          onBid={() => { setBidModal(null); loadData(); }}
        />
      )}
    </div>
  );
}

// ── Shared modal overlay styles ───────────────────────────────────────────
const OVERLAY: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" };
const MODAL_BOX: React.CSSProperties = { background: "#1e2a4a", borderRadius: "20px", width: "100%", maxWidth: "480px", maxHeight: "92vh", overflowY: "auto", fontFamily: "Exo 2, sans-serif" };
const MODAL_IMG_WRAP: React.CSSProperties = { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "20px 20px 0 0", overflow: "hidden" };
const CLOSE_BTN: React.CSSProperties = { position: "absolute", top: "12px", right: "12px", width: "32px", height: "32px", background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "50%", cursor: "pointer", fontSize: "17px", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 };
const LABEL_STYLE: React.CSSProperties = { fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "3px" };
const DIVIDER: React.CSSProperties = { height: "1px", background: "rgba(255,255,255,0.08)", margin: "14px 0" };
const CONTACT_BOX: React.CSSProperties = { background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "12px 14px" };

// ── Listing Modal ─────────────────────────────────────────────────────────
function ListingModal({ listing: l, onClose }: { listing: Listing; onClose: () => void }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={OVERLAY}>
      <div style={MODAL_BOX}>
        {/* Image */}
        <div style={{ ...MODAL_IMG_WRAP, background: l.imageUrl ? "#0f1a2e" : "rgba(255,255,255,0.04)", minHeight: l.imageUrl ? "180px" : "120px" }}>
          {l.imageUrl
            ? <img src={l.imageUrl} alt={l.title} style={{ width: "100%", maxHeight: "340px", objectFit: "contain", display: "block" }} />
            : <span style={{ fontSize: "72px", padding: "32px 0" }}>{l.emoji}</span>
          }
          <button onClick={onClose} style={CLOSE_BTN}>✕</button>
        </div>

        <div style={{ padding: "18px 22px 22px" }}>
          {/* Category · Condition */}
          <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "5px" }}>{l.category} · {l.condition}</div>

          {/* Title */}
          <div style={{ fontWeight: 800, fontSize: "19px", marginBottom: "10px", lineHeight: 1.3 }}>{l.title}</div>

          {/* Price */}
          <div style={{ fontSize: "30px", fontWeight: 800, color: "#f46f10", marginBottom: "14px", lineHeight: 1 }}>{l.price} ₴</div>

          {/* Description */}
          {l.description && l.description.trim() && (
            <>
              <div style={DIVIDER} />
              <div style={{ marginBottom: "14px" }}>
                <div style={LABEL_STYLE}>Опис</div>
                <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{l.description}</div>
              </div>
            </>
          )}

          <div style={DIVIDER} />

          {/* Seller */}
          <div style={{ ...CONTACT_BOX, marginBottom: "16px" }}>
            <div style={LABEL_STYLE}>Продавець</div>
            <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: l.phone ? "3px" : 0 }}>{l.seller}</div>
            {l.phone && <div style={{ fontSize: "13px", color: "#94a3b8" }}>📞 {l.phone}</div>}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            {l.phone && (
              <a
                href={`tel:${l.phone}`}
                style={{ flex: 1, padding: "12px", background: "#f46f10", color: "white", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "14px", fontFamily: "Exo 2, sans-serif", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                📞 Зв&apos;язатись
              </a>
            )}
            <button
              onClick={onClose}
              style={{ padding: "12px 20px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "14px", fontFamily: "Exo 2, sans-serif" }}
            >
              ✕ Закрити
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Auction Modal ─────────────────────────────────────────────────────────
function AuctionModal({ auction: a, onClose, onBid }: { auction: Auction; onClose: () => void; onBid: (auction: Auction) => void }) {
  const top = a.bids[0] ?? null;

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={OVERLAY}>
      <div style={MODAL_BOX}>
        {/* Image */}
        <div style={{ ...MODAL_IMG_WRAP, background: a.imageUrl ? "#0f1a2e" : "rgba(255,255,255,0.04)", minHeight: a.imageUrl ? "180px" : "120px" }}>
          {a.imageUrl
            ? <img src={a.imageUrl} alt={a.title} style={{ width: "100%", maxHeight: "340px", objectFit: "contain", display: "block" }} />
            : <span style={{ fontSize: "72px", padding: "32px 0" }}>{a.emoji}</span>
          }
          <button onClick={onClose} style={CLOSE_BTN}>✕</button>
          {/* Bid count badge */}
          <div style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(0,0,0,0.65)", color: "white", padding: "3px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, border: "1px solid rgba(255,255,255,0.15)" }}>
            {a.bids.length} ставок
          </div>
        </div>

        <div style={{ padding: "18px 22px 22px" }}>
          {/* Title */}
          <div style={{ fontWeight: 800, fontSize: "19px", marginBottom: "14px", lineHeight: 1.3 }}>{a.title}</div>

          {/* Bid stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
            <div style={{ background: "rgba(244,111,16,0.12)", borderRadius: "10px", padding: "10px 12px", border: "1px solid rgba(244,111,16,0.25)" }}>
              <div style={LABEL_STYLE}>Поточна ставка</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#f46f10", lineHeight: 1 }}>{a.currentBid} ₴</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "10px 12px" }}>
              <div style={LABEL_STYLE}>Стартова ціна</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#94a3b8" }}>{a.startPrice} ₴</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "10px 12px" }}>
              <div style={LABEL_STYLE}>Мін. крок</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>+{a.minStep} ₴</div>
            </div>
          </div>

          {/* Description */}
          {a.description && a.description.trim() && (
            <>
              <div style={DIVIDER} />
              <div style={{ marginBottom: "14px" }}>
                <div style={LABEL_STYLE}>Опис</div>
                <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{a.description}</div>
              </div>
            </>
          )}

          <div style={DIVIDER} />

          {/* Seller */}
          <div style={{ ...CONTACT_BOX, marginBottom: "10px" }}>
            <div style={LABEL_STYLE}>Продавець</div>
            <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: a.phone ? "3px" : 0 }}>{a.seller}</div>
            {a.phone && <div style={{ fontSize: "13px", color: "#94a3b8" }}>📞 {a.phone}</div>}
          </div>

          {/* Top bidder */}
          {top && (
            <div style={{ ...CONTACT_BOX, marginBottom: "16px", border: "1px solid rgba(245,158,11,0.25)" }}>
              <div style={{ ...LABEL_STYLE, color: "#f59e0b" }}>🏆 Поточний лідер</div>
              <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: top.phone ? "3px" : 0 }}>{top.bidder}</div>
              {top.phone && <div style={{ fontSize: "13px", color: "#94a3b8" }}>📞 {top.phone}</div>}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => onBid(a)}
              disabled={a.bids.length === 0 ? false : new Date(a.endsAt) < new Date()}
              style={{ flex: 1, padding: "12px", background: new Date(a.endsAt) < new Date() ? "#374151" : "#f46f10", color: "white", border: "none", borderRadius: "10px", cursor: new Date(a.endsAt) < new Date() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "14px", fontFamily: "Exo 2, sans-serif" }}
            >
              {new Date(a.endsAt) < new Date() ? "Аукціон завершено" : "⬆ Зробити ставку"}
            </button>
            <button
              onClick={onClose}
              style={{ padding: "12px 20px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "14px", fontFamily: "Exo 2, sans-serif" }}
            >
              ✕ Закрити
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Listings Tab ──────────────────────────────────────────────────────────
function ListingsTab({
  listings, showAddForm, setShowAddForm, onAdded, currentUser,
}: {
  listings: Listing[];
  showAddForm: boolean;
  setShowAddForm: (v: boolean) => void;
  onAdded: () => void;
  currentUser: { name: string; phone: string } | null;
}) {
  const [form, setForm] = useState({ title: "", description: "", price: "", category: "М'ячі", condition: "Новий" });
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalListing, setModalListing] = useState<Listing | null>(null);

  useEffect(() => {
    fetch("/api/admin/me").then((r) => r.json()).then((d) => setIsAdmin(d.isAdmin === true)).catch(() => {});
  }, []);

  // Close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setModalListing(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setF(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleDeleteListing(id: number) {
    if (!confirm("Видалити оголошення?")) return;
    try {
      await fetch("/api/marketplace/listings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, phone: currentUser?.phone ?? "" }),
      });
    } catch {
      // silent fail — продовжуємо без крашу
    }
    onAdded();
  }

  function handleFileSelect(file: File | null) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Максимальний розмір файлу — 5MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { alert("Підтримуються формати: JPG, PNG, WEBP"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0] ?? null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const seller = currentUser?.name ?? "";
    const phone = currentUser?.phone ?? "";
    if (!seller || !phone) { alert("Увійдіть в акаунт щоб додати оголошення"); return; }
    setSaving(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile && imagePreview) {
        setUploading(true);
        try {
          const res = await fetch("/api/marketplace/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: imagePreview, filename: imageFile.name }),
          });
          const data = await res.json();
          imageUrl = data.url ?? null;
        } catch {
          // продовжуємо без зображення
        }
        setUploading(false);
      }
      const EMOJIS: Record<string, string> = { "М'ячі": "🏀", "Форма": "👕", "Взуття": "👟", "Аксесуари": "🎒", "Захист": "🛡️", "Обладнання": "🏋️" };
      await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price), seller, phone, imageUrl, emoji: EMOJIS[form.category] ?? "📦" }),
      });
      setShowAddForm(false);
      setForm({ title: "", description: "", price: "", category: "М'ячі", condition: "Новий" });
      setImageFile(null); setImagePreview("");
      onAdded();
    } catch {
      alert("Помилка при збереженні. Спробуйте ще раз.");
    }
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
    color: "white", fontSize: "14px", fontFamily: "Exo 2, sans-serif", boxSizing: "border-box",
  };
  const lblStyle: React.CSSProperties = { display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" };

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
        <form onSubmit={handleAdd} style={{ background: "#1e2a4a", borderRadius: "16px", padding: "20px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <h3 style={{ margin: 0 }}>Нове оголошення</h3>

          {/* Seller info (read-only) */}
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "12px 14px", display: "flex", gap: "24px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Продавець</div>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>{currentUser?.name || <span style={{ color: "#ef4444" }}>Увійдіть в акаунт</span>}</div>
            </div>
            {currentUser?.phone && (
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Телефон</div>
                <div style={{ fontSize: "14px", color: "#94a3b8" }}>📞 {currentUser.phone}</div>
              </div>
            )}
          </div>

          {/* Title + Price */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><label style={lblStyle}>Назва *</label><input required value={form.title} onChange={(e) => setF("title", e.target.value)} style={inputStyle} /></div>
            <div><label style={lblStyle}>Ціна (грн) *</label><input required type="number" min={1} value={form.price} onChange={(e) => setF("price", e.target.value)} style={inputStyle} /></div>
          </div>

          {/* Description */}
          <div><label style={lblStyle}>Опис</label><textarea value={form.description} onChange={(e) => setF("description", e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></div>

          {/* Photo upload */}
          <div>
            <label style={lblStyle}>Фото товару</label>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)} />
            {imagePreview ? (
              <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", background: "#0f172a", textAlign: "center" }}>
                <img src={imagePreview} alt="preview" style={{ maxWidth: "100%", maxHeight: "260px", objectFit: "contain", display: "block", margin: "0 auto" }} />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.7)", color: "white", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}>✕</button>
                <div style={{ fontSize: "11px", color: "#64748b", padding: "6px" }}>{imageFile?.name} · {((imageFile?.size ?? 0) / 1024).toFixed(0)} KB</div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ border: `2px dashed ${dragOver ? "#f46f10" : "rgba(255,255,255,0.2)"}`, borderRadius: "10px", padding: "32px 16px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(244,111,16,0.08)" : "rgba(255,255,255,0.03)", transition: "all 0.2s" }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>📷</div>
                <div style={{ fontSize: "14px", color: "#94a3b8" }}>Натисніть або перетягніть фото</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>JPG, PNG, WEBP · до 5MB</div>
              </div>
            )}
            {uploading && <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Завантаження фото...</div>}
          </div>

          {/* Category + Condition */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><label style={lblStyle}>Категорія</label>
              <select value={form.category} onChange={(e) => setF("category", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {["М'ячі", "Форма", "Взуття", "Аксесуари", "Захист", "Обладнання"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={lblStyle}>Стан</label>
              <select value={form.condition} onChange={(e) => setF("condition", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option>Новий</option><option>Б/у</option><option>Ідеальний</option><option>Задовільний</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" disabled={saving || uploading} style={{ padding: "10px 20px", background: "#f46f10", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif", opacity: (saving || uploading) ? 0.7 : 1 }}>
              {saving ? "Збереження..." : "Додати"}
            </button>
            <button type="button" onClick={() => { setShowAddForm(false); setImageFile(null); setImagePreview(""); }} style={{ padding: "10px 20px", background: "rgba(255,255,255,0.1)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Exo 2, sans-serif" }}>
              Скасувати
            </button>
          </div>
        </form>
      )}

      {listings.length === 0 ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0" }}>Оголошень поки немає</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {listings.map((l) => (
            <div
              key={l.id}
              onClick={() => setModalListing(l)}
              style={{ background: "#1e2a4a", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", maxWidth: "220px", position: "relative", cursor: "pointer", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(244,111,16,0.4)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            >
              {(isAdmin || currentUser?.phone === l.phone) && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteListing(l.id); }}
                  title="Видалити оголошення"
                  style={{ position: "absolute", top: "6px", left: "6px", width: "28px", height: "28px", background: "rgba(239,68,68,0.85)", border: "none", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", zIndex: 5 }}
                >
                  🗑
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: l.imageUrl ? "#1a2840" : "rgba(255,255,255,0.04)", minHeight: "110px" }}>
                {l.imageUrl
                  ? <img src={l.imageUrl} alt={l.title} style={{ width: "100%", height: "auto", maxHeight: "180px", objectFit: "contain", display: "block" }} />
                  : <span style={{ fontSize: "44px", padding: "18px 0" }}>{l.emoji}</span>
                }
              </div>
              <div style={{ padding: "10px" }}>
                <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "3px" }}>{l.category} · {l.condition}</div>
                <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "6px" }}>{l.title}</div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#f46f10", marginBottom: "4px" }}>{l.price} ₴</div>
                {l.phone && <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>📞 {l.phone}</div>}
                <div style={{ fontSize: "10px", color: "#64748b" }}>Продавець: {l.seller}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Listing detail modal */}
      {modalListing && (
        <ListingModal listing={modalListing} onClose={() => setModalListing(null)} />
      )}
    </>
  );
}

// ── Auctions Tab ──────────────────────────────────────────────────────────
function AuctionsTab({ auctions, onBid, onRefresh, currentUser }: { auctions: Auction[]; onBid: (a: Auction) => void; onRefresh: () => void; currentUser: { name: string; phone: string } | null }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", startPrice: "", minStep: "50", durationHours: "72", imageUrl: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [modalAuction, setModalAuction] = useState<Auction | null>(null);

  // Keep modal auction in sync with latest data after refresh
  useEffect(() => {
    if (modalAuction) {
      const updated = auctions.find((a) => a.id === modalAuction.id);
      if (updated) setModalAuction(updated);
    }
  }, [auctions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setModalAuction(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function setF(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/marketplace/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, filename: file.name }),
        });
        const data = await res.json();
        if (data.url) setF("imageUrl", data.url);
      } catch {
        // зображення не завантажилось — продовжуємо без нього
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const seller = currentUser?.name ?? "";
    const phone = currentUser?.phone ?? "";
    if (!seller || !phone) { alert("Увійдіть в акаунт щоб додати лот"); return; }
    setSaving(true);
    try {
      await fetch("/api/marketplace/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, seller, phone, startPrice: Number(form.startPrice), minStep: Number(form.minStep), durationHours: Number(form.durationHours) }),
      });
      setShowForm(false);
      setForm({ title: "", description: "", startPrice: "", minStep: "50", durationHours: "72", imageUrl: "" });
      onRefresh();
    } catch {
      alert("Помилка при збереженні лоту. Спробуйте ще раз.");
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    try {
      await fetch("/api/marketplace/auctions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // silent fail
    }
    setDeleteConfirm(null);
    onRefresh();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
    color: "white", fontSize: "14px", fontFamily: "Exo 2, sans-serif", boxSizing: "border-box",
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <span style={{ color: "#94a3b8", fontSize: "14px" }}>{auctions.length} аукціонів</span>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "8px 16px", background: "#f46f10", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif" }}
        >
          + Додати лот
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ background: "#1e2a4a", borderRadius: "16px", padding: "20px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ margin: 0, color: "white" }}>Новий лот аукціону</h3>

          {/* Seller info (read-only) */}
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "10px 14px", display: "flex", gap: "24px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Продавець</div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>{currentUser?.name || <span style={{ color: "#ef4444" }}>Увійдіть в акаунт</span>}</div>
            </div>
            {currentUser?.phone && (
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Телефон</div>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>📞 {currentUser.phone}</div>
              </div>
            )}
          </div>

          <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Назва *</label><input required value={form.title} onChange={(e) => setF("title", e.target.value)} style={inputStyle} /></div>
          <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Опис</label><input value={form.description} onChange={(e) => setF("description", e.target.value)} style={inputStyle} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Стартова ціна (₴) *</label><input required type="number" min="1" value={form.startPrice} onChange={(e) => setF("startPrice", e.target.value)} style={inputStyle} /></div>
            <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Мін. крок (₴)</label><input type="number" min="1" value={form.minStep} onChange={(e) => setF("minStep", e.target.value)} style={inputStyle} /></div>
            <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Тривалість (годин)</label><input type="number" min="1" value={form.durationHours} onChange={(e) => setF("durationHours", e.target.value)} style={inputStyle} /></div>
          </div>
          <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Фото товару</label>
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ ...inputStyle, cursor: "pointer" }} />
            {uploading && <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Завантаження...</div>}
            {form.imageUrl && <img src={form.imageUrl} alt="preview" style={{ marginTop: "8px", height: "80px", borderRadius: "8px", objectFit: "cover" }} />}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" disabled={saving || uploading} style={{ padding: "10px 20px", background: "#f46f10", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif" }}>
              {saving ? "Збереження..." : "Зберегти"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: "10px 20px", background: "rgba(255,255,255,0.1)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Exo 2, sans-serif" }}>
              Скасувати
            </button>
          </div>
        </form>
      )}

      {auctions.length === 0 ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0" }}>Активних аукціонів немає</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
          {auctions.map((a) => (
            <div
              key={a.id}
              style={{ position: "relative", cursor: "pointer" }}
              onClick={() => setModalAuction(a)}
            >
              <AuctionCard auction={a} onBid={(auction) => { onBid(auction); }} />
              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(a.id); }}
                title="Видалити лот"
                style={{ position: "absolute", top: "8px", left: "8px", width: "32px", height: "32px", background: "rgba(239,68,68,0.85)", border: "none", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", zIndex: 5 }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm !== null && (() => {
        const target = auctions.find((a) => a.id === deleteConfirm);
        if (!target) return null;
        const hasBids = target.bids.length > 0;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div style={{ background: "#1e2a4a", borderRadius: "16px", padding: "24px", maxWidth: "380px", width: "100%", fontFamily: "Exo 2, sans-serif" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "18px", color: "white" }}>🗑 Видалити лот?</h3>
              {hasBids && (
                <div style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "13px", color: "#fbbf24" }}>
                  ⚠️ Товар бере участь в активних торгах! Всі ставки ({target.bids.length}) будуть видалені.
                </div>
              )}
              <p style={{ color: "#94a3b8", fontSize: "14px", margin: "0 0 20px" }}>
                Ви впевнені, що хочете видалити <strong style={{ color: "white" }}>«{target.title}»</strong>?
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => handleDelete(target.id)}
                  style={{ flex: 1, padding: "10px", background: "#dc2626", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif" }}>
                  Так, видалити
                </button>
                <button onClick={() => setDeleteConfirm(null)}
                  style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.1)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Exo 2, sans-serif" }}>
                  Скасувати
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Auction detail modal */}
      {modalAuction && (
        <AuctionModal
          auction={modalAuction}
          onClose={() => setModalAuction(null)}
          onBid={(a) => { setModalAuction(null); onBid(a); }}
        />
      )}
    </>
  );
}

// ── Auction Card ──────────────────────────────────────────────────────────
function AuctionCard({ auction, onBid }: { auction: Auction; onBid: (a: Auction) => void }) {
  const [timeLeft, setTimeLeft] = useState<{ h: string; m: string; s: string; ended: boolean; urgent: boolean; warning: boolean }>({ h: "00", m: "00", s: "00", ended: false, urgent: false, warning: false });

  useEffect(() => {
    function update() {
      const diff = new Date(auction.endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ h: "00", m: "00", s: "00", ended: true, urgent: false, warning: false });
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setTimeLeft({
        h: String(h).padStart(2, "0"),
        m: String(m).padStart(2, "0"),
        s: String(s).padStart(2, "0"),
        ended: false,
        urgent: diff < 3_600_000,   // < 1 год — червоний
        warning: diff < 10_800_000, // < 3 год — жовтий
      });
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [auction.endsAt]);

  const ended = timeLeft.ended;
  const timerColor = ended ? "#64748b" : timeLeft.urgent ? "#ef4444" : timeLeft.warning ? "#f59e0b" : "#22c55e";
  const timerBg = ended ? "rgba(100,116,139,0.1)" : timeLeft.urgent ? "rgba(239,68,68,0.12)" : timeLeft.warning ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.08)";
  const timerBorder = ended ? "rgba(100,116,139,0.2)" : timeLeft.urgent ? "rgba(239,68,68,0.4)" : timeLeft.warning ? "rgba(245,158,11,0.4)" : "rgba(34,197,94,0.25)";
  const cardBorder = ended ? "rgba(255,255,255,0.06)" : timeLeft.urgent ? "rgba(239,68,68,0.4)" : "rgba(244,111,16,0.3)";

  return (
    <div style={{ background: "#1e2a4a", borderRadius: "16px", overflow: "hidden", border: `1px solid ${cardBorder}`, transition: "border-color 0.5s" }}>
      {/* Image */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: auction.imageUrl ? "#0f1a2e" : "rgba(255,255,255,0.04)", position: "relative", minHeight: "160px" }}>
        {auction.imageUrl
          ? <img src={auction.imageUrl} alt={auction.title} style={{ width: "100%", height: "auto", maxHeight: "300px", objectFit: "contain", display: "block" }} />
          : <span style={{ fontSize: "64px", padding: "32px 0" }}>{auction.emoji}</span>
        }
        {/* Status badge */}
        <div style={{ position: "absolute", top: "8px", right: "8px", background: ended ? "#374151" : "rgba(0,0,0,0.6)", padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, border: `1px solid ${ended ? "transparent" : cardBorder}` }}>
          {ended ? "✓ Завершено" : `${auction.bids.length} ставок`}
        </div>
      </div>

      {/* ── Big Timer ── */}
      {!ended ? (
        <div style={{ background: timerBg, borderBottom: `1px solid ${timerBorder}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px", transition: "background 0.5s" }}>
          <span style={{ fontSize: "11px", color: timerColor, fontWeight: 600, marginRight: "6px", opacity: 0.8 }}>
            {timeLeft.urgent ? "🔥 ЗАЛИШИЛОСЬ" : "⏱ До кінця"}
          </span>
          {[timeLeft.h, timeLeft.m, timeLeft.s].map((unit, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <span style={{
                background: "rgba(0,0,0,0.3)",
                color: timerColor,
                fontFamily: "monospace",
                fontSize: timeLeft.urgent ? "22px" : "20px",
                fontWeight: 800,
                padding: "3px 7px",
                borderRadius: "6px",
                minWidth: "36px",
                textAlign: "center",
                border: `1px solid ${timerBorder}`,
                transition: "color 0.3s, font-size 0.3s",
                animation: timeLeft.urgent ? "urgentPulse 1s ease-in-out infinite" : "none",
              }}>
                {unit}
              </span>
              {i < 2 && <span style={{ color: timerColor, fontWeight: 800, fontSize: "18px", opacity: 0.7, padding: "0 1px" }}>:</span>}
            </span>
          ))}
          <span style={{ fontSize: "10px", color: timerColor, opacity: 0.6, marginLeft: "6px", display: "flex", flexDirection: "column", lineHeight: 1.2, textAlign: "center" }}>
            <span>год</span><span>хв</span>
          </span>
        </div>
      ) : (
        <div style={{ background: "rgba(100,116,139,0.08)", borderBottom: "1px solid rgba(100,116,139,0.15)", padding: "8px 16px", textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
          Аукціон завершено
        </div>
      )}

      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "3px" }}>{auction.category}</div>
        <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "12px", lineHeight: 1.3 }}>{auction.title}</div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "2px" }}>Поточна ставка</div>
            <div style={{ fontSize: "26px", fontWeight: 800, color: "#f46f10", lineHeight: 1 }}>{auction.currentBid} ₴</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "2px" }}>Мін. крок</div>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>+{auction.minStep} ₴</div>
          </div>
        </div>

        {/* Seller + Leader contact blocks */}
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "10px 12px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Seller — always visible */}
          <div>
            <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Продавець</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "1px" }}>{auction.seller}</div>
            {auction.phone && <div style={{ fontSize: "11px", color: "#94a3b8" }}>📞 {auction.phone}</div>}
          </div>

          {/* Top bidder — only when bids exist */}
          {auction.bids.length > 0 && (() => {
            const top = auction.bids[0];
            const prev = auction.bids[1];
            const diff = prev ? top.amount - prev.amount : top.amount - auction.startPrice;
            return (
              <>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.08)" }} />
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px", display: "flex", alignItems: "center", gap: "6px", color: "#f59e0b" }}>
                    🏆 Лідер
                    <span style={{ color: "#22c55e", fontWeight: 700, fontSize: "10px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "4px", padding: "1px 5px" }}>
                      +{diff} ₴
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "1px" }}>{top.bidder}</div>
                  {top.phone && <div style={{ fontSize: "11px", color: "#94a3b8" }}>📞 {top.phone}</div>}
                </div>
              </>
            );
          })()}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onBid(auction); }}
          disabled={ended}
          style={{ width: "100%", padding: "11px", background: ended ? "#374151" : timeLeft.urgent ? "linear-gradient(135deg, #dc2626, #f46f10)" : "#f46f10", color: "white", border: "none", borderRadius: "8px", cursor: ended ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "14px", fontFamily: "Exo 2, sans-serif", transition: "background 0.5s" }}
        >
          {ended ? "Аукціон завершено" : timeLeft.urgent ? "🔥 Зробити ставку!" : "⬆ Зробити ставку"}
        </button>
      </div>

      <style>{`
        @keyframes urgentPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

// ── Bid Modal ─────────────────────────────────────────────────────────────
function BidModal({ auction, currentUser, onClose, onBid }: { auction: Auction; currentUser: { name: string; phone: string } | null; onClose: () => void; onBid: () => void }) {
  const minBid = auction.currentBid + auction.minStep;
  const [amount, setAmount] = useState(String(minBid));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bidder = currentUser?.name ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(amount) < minBid) { setError(`Мінімальна ставка: ${minBid} грн`); return; }
    setSending(true);
    setError("");
    let res: Response, data: Record<string, unknown>;
    try {
      res = await fetch("/api/marketplace/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionId: auction.id, amount: Number(amount), bidder, phone: currentUser?.phone ?? "" }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = await res.json() as any;
    } catch {
      setError("Помилка з'єднання. Спробуйте ще раз.");
      setSending(false);
      return;
    }
    if (!res.ok) { setError((data.error as string) ?? "Помилка"); setSending(false); return; }
    // Save bidder name so outbid notifications can identify this user
    if (typeof window !== "undefined") localStorage.setItem("auction_bidder_name", bidder);
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

        {auction.bids.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
              Історія ставок
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "160px", overflowY: "auto" }}>
              {auction.bids.map((bid, i) => {
                // bids are sorted desc (newest first); prev bid is at index i+1
                const prevAmount = i < auction.bids.length - 1
                  ? auction.bids[i + 1].amount
                  : auction.startPrice;
                const diff = bid.amount - prevAmount;
                const isTop = i === 0;
                return (
                  <div key={bid.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", borderRadius: "7px", background: isTop ? "rgba(244,111,16,0.1)" : "rgba(255,255,255,0.03)", border: isTop ? "1px solid rgba(244,111,16,0.25)" : "1px solid transparent" }}>
                    <span style={{ fontSize: "12px", color: isTop ? "#f46f10" : "#94a3b8", fontWeight: isTop ? 700 : 400, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {isTop && "🏆 "}{bid.bidder}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: isTop ? "#f46f10" : "white", flexShrink: 0 }}>
                      {bid.amount} ₴
                    </span>
                    {diff > 0 && (
                      <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: 700, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "4px", padding: "1px 6px", flexShrink: 0 }}>
                        +{diff} ₴
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {error && <div style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", padding: "10px", borderRadius: "8px", marginBottom: "12px", fontSize: "13px" }}>{error}</div>}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "10px", padding: "12px 14px", marginBottom: "4px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Учасник</div>
          <div style={{ fontWeight: 700, fontSize: "15px", color: "white" }}>{bidder || "—"}</div>
          {currentUser?.phone && <div style={{ fontSize: "13px", color: "#94a3b8" }}>📞 {currentUser.phone}</div>}
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div><label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Сума ставки (мін. {minBid} ₴) *</label><input required type="number" min={minBid} value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} /></div>
          <button type="submit" disabled={sending} style={{ padding: "12px", background: "#f46f10", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "15px", fontFamily: "Exo 2, sans-serif" }}>
            {sending ? "Відправка..." : `Поставити ${amount} ₴`}
          </button>
        </form>
      </div>
    </div>
  );
}
