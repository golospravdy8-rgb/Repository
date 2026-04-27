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
  sizes: string | null;
  inStock: boolean;
}

interface CartItem {
  product: Product;
  qty: number;
}

const CATEGORIES = ["Всі", "М'ячі", "Форма", "Взуття", "Аксесуари", "Захист", "Обладнання"];

const SIZE_CATEGORIES = ["Форма", "Взуття"];

const SIZE_TABLE_FORMA = [
  { size: "XS", chest: "84–88", waist: "68–72", hip: "90–94" },
  { size: "S",  chest: "88–92", waist: "72–76", hip: "94–98" },
  { size: "M",  chest: "92–96", waist: "76–80", hip: "98–102" },
  { size: "L",  chest: "96–100", waist: "80–84", hip: "102–106" },
  { size: "XL", chest: "100–104", waist: "84–88", hip: "106–110" },
  { size: "XXL", chest: "104–110", waist: "88–94", hip: "110–116" },
];

const SIZE_TABLE_VZUTTIA = [
  { eu: "36", uk: "3.5", cm: "22.5" },
  { eu: "37", uk: "4",   cm: "23" },
  { eu: "38", uk: "5",   cm: "24" },
  { eu: "39", uk: "6",   cm: "24.5" },
  { eu: "40", uk: "6.5", cm: "25" },
  { eu: "41", uk: "7.5", cm: "26" },
  { eu: "42", uk: "8",   cm: "26.5" },
  { eu: "43", uk: "9",   cm: "27.5" },
  { eu: "44", uk: "10",  cm: "28" },
  { eu: "45", uk: "11",  cm: "29" },
  { eu: "46", uk: "11.5", cm: "29.5" },
];

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

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
  color: "white", fontSize: "14px", fontFamily: "Exo 2, sans-serif",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px",
};

// ── Main Component ────────────────────────────────────────────────────────
export default function ShopClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("Всі");
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);
  const [orderSize, setOrderSize] = useState<string | undefined>(undefined);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me", { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setIsAdmin(d.isAdmin === true); setAdminChecked(true); })
      .catch(() => setAdminChecked(true));
  }, []);

  function loadProducts() {
    fetch("/api/shop/products")
      .then((r) => r.json())
      .then((d) => { setProducts(d.products ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadProducts(); }, []);

  const filtered = category === "Всі" ? products : products.filter((p) => p.category === category);

  async function handleDelete(id: number) {
    if (!confirm("Видалити товар?")) return;
    try {
      await fetch("/api/shop/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {}
    loadProducts();
  }

  function handleOrderClose() {
    setOrderProduct(null);
    setOrderSize(undefined);
    setOrderSuccess(null);
  }

  return (
    <div style={PAGE_STYLE}>
      {/* Header */}
      <header style={HEADER_STYLE}>
        <a href="/" style={{ color: "#f46f10", textDecoration: "none", fontSize: "14px" }}>← Головна</a>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, flex: 1 }}>🏪 Магазин ДЮБЛ</h1>
      </header>

      {/* Category filter */}
      <div style={{ padding: "10px 24px 4px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
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
        {adminChecked && (isAdmin ? (
          <>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                background: "#16a34a", color: "white", border: "none",
                borderRadius: "20px", padding: "6px 16px", fontSize: "14px",
                cursor: "pointer", fontWeight: 700, fontFamily: "Exo 2, sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              + Додати товар
            </button>
            <button
              onClick={async () => {
                await fetch("/api/admin/logout", { method: "POST" });
                setIsAdmin(false);
              }}
              style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.5)", borderRadius: "20px",
                padding: "6px 16px", fontSize: "14px", cursor: "pointer",
                fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap",
              }}
            >
              Вийти
            </button>
          </>
        ) : (
          <a
            href="/admin/login?redirect=/shop"
            style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.5)", borderRadius: "20px",
              padding: "6px 16px", fontSize: "14px", textDecoration: "none",
              fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap",
            }}
          >
            🔐 Увійти як адмін
          </a>
        ))}
      </div>

      {/* Products grid */}
      <div style={{ padding: "8px 24px 32px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0" }}>Завантаження...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0" }}>Товарів у цій категорії немає</div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "12px",
          }}>
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onBuy={(prod, size) => { setOrderProduct(prod); setOrderSize(size); }}
                isAdmin={isAdmin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order modal */}
      {orderProduct && (
        <OrderModal
          product={orderProduct}
          selectedSize={orderSize}
          onClose={handleOrderClose}
          onSuccess={(num) => setOrderSuccess(num)}
          success={orderSuccess}
        />
      )}

      {/* Add product modal */}
      {showAddForm && (
        <AddProductModal
          onClose={() => setShowAddForm(false)}
          onSaved={() => { setShowAddForm(false); loadProducts(); }}
        />
      )}
    </div>
  );
}

// ── Product Card (compact) ────────────────────────────────────────────────
function ProductCard({
  product,
  onBuy,
  isAdmin,
  onDelete,
}: {
  product: Product;
  onBuy: (p: Product, size?: string) => void;
  isAdmin: boolean;
  onDelete: (id: number) => void;
}) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [showDetail, setShowDetail] = useState(false);

  const sizeOptions = product.sizes ? product.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const images = product.imageUrl ? product.imageUrl.split("|") : [];
  const mainImage = images[0] ?? null;

  function handleBuy(e: React.MouseEvent) {
    e.stopPropagation();
    if (sizeOptions.length > 0 && !selectedSize) {
      alert("Оберіть розмір перед покупкою");
      return;
    }
    onBuy(product, selectedSize || undefined);
  }

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        style={{
          background: "#1e2a4a",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
      >
        {/* Image */}
        <div style={{
          height: "130px", display: "flex", alignItems: "center",
          justifyContent: "center", background: "rgba(255,255,255,0.04)", position: "relative",
        }}>
          {mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mainImage} alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: "44px" }}>{product.emoji}</span>
          )}
          {product.badge && (
            <span style={{
              position: "absolute", top: "10px", left: "10px",
              background: "#f46f10", color: "white",
              padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
            }}>
              {product.badge}
            </span>
          )}
          {!product.inStock && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: 700, color: "#94a3b8",
            }}>
              Немає в наявності
            </div>
          )}
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}
              style={{
                position: "absolute", top: "10px", right: "10px",
                background: "rgba(239,68,68,0.85)", color: "white",
                border: "none", borderRadius: "6px",
                padding: "3px 8px", fontSize: "11px", fontWeight: 700,
                cursor: "pointer", fontFamily: "Exo 2, sans-serif",
              }}
            >
              🗑 Видалити
            </button>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "8px 10px", flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {product.category}
          </div>
          <div style={{ fontWeight: 700, fontSize: "13px", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.name}</div>

          {/* Size selector on card */}
          {sizeOptions.length > 0 && (
            <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {sizeOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  style={{
                    width: "26px", height: "26px", borderRadius: "5px",
                    border: selectedSize === s ? "2px solid #f46f10" : "1px solid rgba(255,255,255,0.2)",
                    background: selectedSize === s ? "rgba(244,111,16,0.15)" : "transparent",
                    color: selectedSize === s ? "#f46f10" : "white",
                    fontWeight: 700, fontSize: "11px", cursor: "pointer",
                    fontFamily: "Exo 2, sans-serif",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: "auto", paddingTop: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "16px", fontWeight: 800, color: "#f46f10" }}>{product.price} грн</span>
              {product.oldPrice && (
                <span style={{ fontSize: "11px", color: "#64748b", textDecoration: "line-through", marginLeft: "4px" }}>
                  {product.oldPrice} грн
                </span>
              )}
            </div>
            <button
              onClick={handleBuy}
              disabled={!product.inStock}
              style={{
                padding: "5px 10px",
                background: product.inStock ? "#f46f10" : "#374151",
                color: "white", border: "none", borderRadius: "7px",
                cursor: product.inStock ? "pointer" : "not-allowed",
                fontWeight: 700, fontSize: "12px", fontFamily: "Exo 2, sans-serif",
              }}
            >
              🛒 Купити
            </button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {showDetail && (
        <ProductDetailModal
          product={product}
          onClose={() => setShowDetail(false)}
          onBuy={(size) => { setShowDetail(false); onBuy(product, size); }}
        />
      )}
    </>
  );
}

// ── Product Detail Modal ──────────────────────────────────────────────────
function ProductDetailModal({
  product,
  onClose,
  onBuy,
}: {
  product: Product;
  onClose: () => void;
  onBuy: (size?: string) => void;
}) {
  const [activeImg, setActiveImg] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [showSizeTable, setShowSizeTable] = useState(false);

  const images = product.imageUrl ? product.imageUrl.split("|") : [];
  const mainImage = images[activeImg] ?? null;
  const sizeOptions = product.sizes ? product.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const hasSizeTable = SIZE_CATEGORIES.includes(product.category);

  function handleBuy() {
    if (sizeOptions.length > 0 && !selectedSize) {
      alert("Оберіть розмір перед покупкою");
      return;
    }
    onBuy(selectedSize || undefined);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 55, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#1e2a4a", borderRadius: "20px", width: "100%", maxWidth: "560px",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Main image */}
        <div style={{ position: "relative", height: "280px", background: "rgba(255,255,255,0.04)", borderRadius: "20px 20px 0 0", overflow: "hidden" }}>
          {mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mainImage} alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <span style={{ fontSize: "80px" }}>{product.emoji}</span>
            </div>
          )}
          {product.badge && (
            <span style={{
              position: "absolute", top: "14px", left: "14px",
              background: "#f46f10", color: "white",
              padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700,
            }}>
              {product.badge}
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: "14px", right: "14px",
              background: "rgba(0,0,0,0.5)", border: "none", color: "white",
              width: "32px", height: "32px", borderRadius: "50%",
              fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Thumbnail gallery */}
        {images.length > 1 && (
          <div style={{ display: "flex", gap: "8px", padding: "12px 16px 0", overflowX: "auto" }}>
            {images.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`фото ${i + 1}`}
                onClick={() => setActiveImg(i)}
                style={{
                  width: "60px", height: "60px", objectFit: "cover",
                  borderRadius: "8px", cursor: "pointer", flexShrink: 0,
                  border: activeImg === i ? "2px solid #f46f10" : "2px solid transparent",
                  opacity: activeImg === i ? 1 : 0.55,
                  transition: "opacity 0.15s, border-color 0.15s",
                }}
              />
            ))}
          </div>
        )}

        {/* Info */}
        <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
              {product.category}
            </div>
            <div style={{ fontWeight: 800, fontSize: "18px", lineHeight: 1.3 }}>{product.name}</div>
          </div>

          {product.description && (
            <div style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>{product.description}</div>
          )}

          {/* Size selector */}
          {sizeOptions.length > 0 && (
            <div>
              <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "8px" }}>
                {product.category === "Взуття" ? "Розмір:" : product.category === "Форма" ? "Розмір:" : "Розмір м'яча:"}
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {sizeOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    style={{
                      minWidth: "40px", height: "40px", padding: "0 10px", borderRadius: "8px",
                      border: selectedSize === s ? "2px solid #f46f10" : "1px solid rgba(255,255,255,0.2)",
                      background: selectedSize === s ? "rgba(244,111,16,0.15)" : "transparent",
                      color: selectedSize === s ? "#f46f10" : "white",
                      fontWeight: 700, fontSize: "14px", cursor: "pointer",
                      fontFamily: "Exo 2, sans-serif",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size table */}
          {hasSizeTable && (
            <div>
              <button
                onClick={() => setShowSizeTable((v) => !v)}
                style={{
                  background: "none", border: "1px solid rgba(255,255,255,0.15)",
                  color: "#94a3b8", borderRadius: "6px", padding: "5px 12px",
                  fontSize: "13px", cursor: "pointer", fontFamily: "Exo 2, sans-serif",
                }}
              >
                📐 Таблиця розмірів
              </button>
              {showSizeTable && <SizeTable category={product.category} />}
            </div>
          )}

          {/* Price + buy */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
            <div>
              <span style={{ fontSize: "26px", fontWeight: 800, color: "#f46f10" }}>{product.price} грн</span>
              {product.oldPrice && (
                <span style={{ fontSize: "15px", color: "#64748b", textDecoration: "line-through", marginLeft: "10px" }}>
                  {product.oldPrice} грн
                </span>
              )}
            </div>
            <button
              onClick={handleBuy}
              disabled={!product.inStock}
              style={{
                padding: "10px 24px",
                background: product.inStock ? "#f46f10" : "#374151",
                color: "white", border: "none", borderRadius: "10px",
                cursor: product.inStock ? "pointer" : "not-allowed",
                fontWeight: 700, fontSize: "15px", fontFamily: "Exo 2, sans-serif",
              }}
            >
              {product.inStock ? "🛒 Купити" : "Немає в наявності"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Size Table ────────────────────────────────────────────────────────────
function SizeTable({ category }: { category: string }) {
  const isVzuttia = category === "Взуття";

  const thStyle: React.CSSProperties = {
    padding: "6px 10px", textAlign: "left", color: "#64748b",
    fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  };
  const tdStyle: React.CSSProperties = {
    padding: "5px 10px", fontSize: "12px", color: "#e2e8f0",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  };

  return (
    <div style={{
      marginTop: "8px", background: "rgba(0,0,0,0.3)", borderRadius: "8px",
      overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)",
    }}>
      {isVzuttia ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>EU</th>
              <th style={thStyle}>UK</th>
              <th style={thStyle}>см</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_TABLE_VZUTTIA.map((r) => (
              <tr key={r.eu}>
                <td style={{ ...tdStyle, fontWeight: 700, color: "#f46f10" }}>{r.eu}</td>
                <td style={tdStyle}>{r.uk}</td>
                <td style={tdStyle}>{r.cm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Розмір</th>
              <th style={thStyle}>Груди (см)</th>
              <th style={thStyle}>Талія (см)</th>
              <th style={thStyle}>Стегна (см)</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_TABLE_FORMA.map((r) => (
              <tr key={r.size}>
                <td style={{ ...tdStyle, fontWeight: 700, color: "#f46f10" }}>{r.size}</td>
                <td style={tdStyle}>{r.chest}</td>
                <td style={tdStyle}>{r.waist}</td>
                <td style={tdStyle}>{r.hip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Add Product Modal ─────────────────────────────────────────────────────
function AddProductModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "", price: "", oldPrice: "", category: "М'ячі",
    imageUrl: "", description: "", emoji: "🏀", badge: "", inStock: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string | boolean) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        name: form.name,
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        category: form.category,
        imageUrl: form.imageUrl || null,
        description: form.description || "",
        emoji: form.emoji || "🏀",
        badge: form.badge || null,
        inStock: form.inStock,
      };
      const res = await fetch("/api/shop/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Помилка збереження");
      } else {
        onSaved();
      }
    } catch { setError("Помилка мережі"); }
    finally { setSaving(false); }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#1e2a4a", borderRadius: "20px", width: "100%", maxWidth: "480px",
        maxHeight: "90vh", overflowY: "auto", padding: "24px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>+ Додати товар</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "24px", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Назва *</label>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Баскетбольний м'яч Wilson" style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Ціна (₴) *</label>
              <input required type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="1200" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Стара ціна (₴)</label>
              <input type="number" min="0" value={form.oldPrice} onChange={(e) => set("oldPrice", e.target.value)} placeholder="1500" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Категорія *</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {CATEGORIES.filter((c) => c !== "Всі").map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Фото (URL)</label>
            <input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Емодзі (якщо немає фото)</label>
            <input value={form.emoji} onChange={(e) => set("emoji", e.target.value)} placeholder="🏀" style={{ ...inputStyle, width: "80px" }} />
          </div>

          <div>
            <label style={labelStyle}>Опис</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Короткий опис товару..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Бейдж (напр. «Новинка», «-20%»)</label>
            <input value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="Новинка" style={inputStyle} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              id="inStock"
              checked={form.inStock}
              onChange={(e) => set("inStock", e.target.checked)}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label htmlFor="inStock" style={{ fontSize: "14px", cursor: "pointer" }}>В наявності</label>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "10px 20px", background: "rgba(255,255,255,0.08)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Exo 2, sans-serif" }}
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: "10px 24px", background: "#16a34a", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px", fontFamily: "Exo 2, sans-serif", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Збереження..." : "Зберегти товар"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Order Modal ───────────────────────────────────────────────────────────
function OrderModal({
  product,
  selectedSize,
  onClose,
  onSuccess,
  success,
}: {
  product: Product;
  selectedSize?: string;
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
      const itemName = selectedSize ? `${product.name} (розмір ${selectedSize})` : product.name;
      const items = JSON.stringify([{ name: itemName, qty, price: product.price * qty }]);
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
            <p style={{ fontSize: "13px", color: "#64748b" }}>Ми зв&apos;яжемось з вами найближчим часом</p>
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
                {selectedSize && (
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>Розмір: <strong style={{ color: "white" }}>{selectedSize}</strong></div>
                )}
                <div style={{ color: "#f46f10", fontWeight: 800 }}>{product.price} грн</div>
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
                  Разом: <span style={{ color: "#f46f10" }}>{product.price * qty} грн</span>
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
