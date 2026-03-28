"use client";

import { useState, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────────
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  oldPrice: number | null;
  category: string;
  emoji: string;
  badge: string | null;
  imageUrl: string | null;
  inStock: boolean;
}

interface CartItem {
  product: Product;
  qty: number;
}

const CATEGORIES = ["Всі", "М'ячі", "Форма", "Взуття", "Аксесуари", "Захист", "Обладнання"];

const PAGE_STYLE: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0f172a",
  color: "white",
  fontFamily: "Exo 2, sans-serif",
};

const HEADER_STYLE: React.CSSProperties = {
  background: "#1e2a4a",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  padding: "16px 24px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

// ── Main Component ────────────────────────────────────────────────────────
export default function ShopClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("Всі");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shop/products")
      .then((r) => r.json())
      .then((d) => { setProducts(d.products ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = category === "Всі" ? products : products.filter((p) => p.category === category);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
    setOrderProduct(product);
  }

  function handleOrderClose() {
    setOrderProduct(null);
    setOrderSuccess(null);
  }

  return (
    <div style={PAGE_STYLE}>
      {/* Header */}
      <header style={HEADER_STYLE}>
        <a href="/" style={{ color: "#f46f10", textDecoration: "none", fontSize: "14px" }}>← Головна</a>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>🏪 Магазин ЛДБЛ</h1>
      </header>

      {/* Category filter */}
      <div style={{ padding: "20px 24px 8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: "6px 16px",
              borderRadius: "20px",
              border: "1px solid",
              borderColor: category === cat ? "#f46f10" : "rgba(255,255,255,0.2)",
              background: category === cat ? "#f46f10" : "transparent",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: category === cat ? 700 : 400,
              fontFamily: "Exo 2, sans-serif",
              transition: "all 0.2s",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div style={{ padding: "16px 24px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0" }}>Завантаження...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0" }}>Товарів у цій категорії немає</div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "20px",
          }}>
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onBuy={addToCart} />
            ))}
          </div>
        )}
      </div>

      {/* Order modal */}
      {orderProduct && (
        <OrderModal
          product={orderProduct}
          onClose={handleOrderClose}
          onSuccess={(num) => setOrderSuccess(num)}
          success={orderSuccess}
        />
      )}
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────
function ProductCard({ product, onBuy }: { product: Product; onBuy: (p: Product) => void }) {
  return (
    <div style={{
      background: "#1e2a4a",
      borderRadius: "16px",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      flexDirection: "column",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}>
      {/* Image / emoji */}
      <div style={{
        height: "180px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.04)",
        position: "relative",
      }}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: "64px" }}>{product.emoji}</span>
        )}
        {product.badge && (
          <span style={{
            position: "absolute", top: "10px", left: "10px",
            background: "#f46f10", color: "white",
            padding: "3px 8px", borderRadius: "6px",
            fontSize: "11px", fontWeight: 700,
          }}>
            {product.badge}
          </span>
        )}
        {!product.inStock && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", fontWeight: 700, color: "#94a3b8",
          }}>
            Немає в наявності
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {product.category}
        </div>
        <div style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.3 }}>{product.name}</div>
        {product.description && (
          <div style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.4 }}>{product.description}</div>
        )}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#f46f10" }}>{product.price} ₴</span>
            {product.oldPrice && (
              <span style={{ fontSize: "14px", color: "#64748b", textDecoration: "line-through", marginLeft: "8px" }}>
                {product.oldPrice} ₴
              </span>
            )}
          </div>
          <button
            onClick={() => onBuy(product)}
            disabled={!product.inStock}
            style={{
              padding: "8px 16px",
              background: product.inStock ? "#f46f10" : "#374151",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: product.inStock ? "pointer" : "not-allowed",
              fontWeight: 700,
              fontSize: "13px",
              fontFamily: "Exo 2, sans-serif",
            }}
          >
            🛒 Купити
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Order Modal ───────────────────────────────────────────────────────────
function OrderModal({
  product,
  onClose,
  onSuccess,
  success,
}: {
  product: Product;
  onClose: () => void;
  onSuccess: (num: string) => void;
  success: string | null;
}) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "+380", email: "",
    city: "", deliveryType: "nova_poshta", postOffice: "", paymentType: "cod",
  });
  const [qty, setQty] = useState(1);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const items = JSON.stringify([{ name: product.name, qty, price: product.price * qty }]);
      const res = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, items, totalAmount: product.price * qty }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Помилка"); }
      else { onSuccess(data.orderNumber); }
    } catch { setError("Помилка мережі"); }
    finally { setSending(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
    color: "white", fontSize: "14px", fontFamily: "Exo 2, sans-serif",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#1e2a4a", borderRadius: "20px", width: "100%", maxWidth: "480px",
        maxHeight: "90vh", overflowY: "auto", padding: "24px",
      }}>
        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
            <h2 style={{ margin: "0 0 8px", color: "#4ade80" }}>Замовлення прийнято!</h2>
            <p style={{ color: "#94a3b8" }}>Номер: <strong style={{ color: "white" }}>#{success}</strong></p>
            <p style={{ fontSize: "13px", color: "#64748b" }}>Ми зв'яжемось з вами найближчим часом</p>
            <button onClick={onClose} style={{ marginTop: "16px", padding: "10px 24px", background: "#f46f10", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif" }}>
              Закрити
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "18px" }}>🛒 Оформити замовлення</h2>
              <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {/* Product summary */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "32px" }}>{product.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "14px" }}>{product.name}</div>
                <div style={{ color: "#f46f10", fontWeight: 800 }}>{product.price} ₴</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>−</button>
                <span style={{ fontWeight: 700, minWidth: "20px", textAlign: "center" }}>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>+</button>
              </div>
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Ім&apos;я *</label>
                  <input required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Іван" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Прізвище *</label>
                  <input required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Петренко" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Телефон *</label>
                <input required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+380 XX XXX XX XX" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="your@email.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Місто *</label>
                <input required value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Львів" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Доставка *</label>
                <select value={form.deliveryType} onChange={(e) => set("deliveryType", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="nova_poshta">Нова пошта</option>
                  <option value="ukrposhta">Укрпошта</option>
                  <option value="pickup">Самовивіз</option>
                </select>
              </div>
              {form.deliveryType !== "pickup" && (
                <div>
                  <label style={labelStyle}>Номер відділення</label>
                  <input value={form.postOffice} onChange={(e) => set("postOffice", e.target.value)} placeholder="№ відділення" style={inputStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>Оплата *</label>
                <select value={form.paymentType} onChange={(e) => set("paymentType", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="cod">Накладений платіж</option>
                  <option value="card">Карткою онлайн</option>
                </select>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 800 }}>
                  Разом: <span style={{ color: "#f46f10" }}>{product.price * qty} ₴</span>
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  style={{ padding: "12px 24px", background: "#f46f10", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "15px", fontFamily: "Exo 2, sans-serif", opacity: sending ? 0.7 : 1 }}
                >
                  {sending ? "Відправка..." : "Оформити замовлення"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
