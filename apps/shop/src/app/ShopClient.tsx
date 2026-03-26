"use client";

import { useState } from "react";

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
};

type CartItem = {
  product: Product;
  qty: number;
  size?: string;
};

const CATS = ["Всі", "М'ячі", "Форма", "Взуття", "Захист", "Обладнання", "Аксесуари"];

type View = "catalog" | "cart" | "checkout" | "success";

export default function ShopClient({ products }: { products: Product[] }) {
  const [cat, setCat] = useState("Всі");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<View>("catalog");
  const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>({});
  const [orderNum, setOrderNum] = useState("");

  // Order form state
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "",
    deliveryType: "nova_poshta",
    postOffice: "",
    paymentType: "card",
    comment: "",
  });
  const [cardInfo, setCardInfo] = useState<{ cardNumber: string; cardName: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const filtered = cat === "Всі" ? products : products.filter((p) => p.category === cat);

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const totalAmount = cart.reduce((s, i) => s + i.product.price * i.qty, 0);

  function addToCart(product: Product, size?: string) {
    setCart((c) => {
      const ex = c.find((i) => i.product.id === product.id && i.size === size);
      if (ex) return c.map((i) => (i.product.id === product.id && i.size === size) ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { product, qty: 1, size }];
    });
  }

  function removeFromCart(id: number) {
    setCart((c) => c.filter((i) => i.product.id !== id));
  }

  function changeQty(id: number, delta: number) {
    setCart((c) =>
      c.flatMap((i) => {
        if (i.product.id !== id) return [i];
        const newQty = i.qty + delta;
        return newQty <= 0 ? [] : [{ ...i, qty: newQty }];
      })
    );
  }

  function inCart(id: number, size?: string) {
    return cart.some((i) => i.product.id === id && i.size === size);
  }

  async function openCheckout() {
    setView("checkout");
    if (!cardInfo) {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        setCardInfo(data);
      } catch {
        setCardInfo({ cardNumber: "4149 5100 9317 2395", cardName: "Христина Полякова" });
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.city.trim() || !form.postOffice.trim()) {
      setFormError("Будь ласка, заповніть всі обов'язкові поля");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: cart.map((i) => ({ name: i.product.name, qty: i.qty, price: i.product.price, size: i.size })),
          totalAmount,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setOrderNum(data.orderNumber);
        setCart([]);
        setView("success");
      } else {
        setFormError(data.error ?? "Помилка при оформленні замовлення");
      }
    } catch {
      setFormError("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "14px",
    fontFamily: "Montserrat, sans-serif",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#6b7280",
    marginBottom: "4px",
  };

  // ===== SUCCESS =====
  if (view === "success") {
    return (
      <div style={{ maxWidth: "600px", margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>✅</div>
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#1e2a4a", margin: "0 0 12px" }}>Замовлення прийнято!</h1>
        <p style={{ color: "#4b5563", fontSize: "16px", marginBottom: "8px" }}>
          Дякуємо! Ми зв&apos;яжемося з вами найближчим часом.
        </p>
        <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "32px" }}>
          Номер замовлення: <strong style={{ color: "#f46f10" }}>#{orderNum}</strong>
        </p>
        <button
          onClick={() => { setView("catalog"); setForm({ firstName: "", lastName: "", phone: "", email: "", city: "", deliveryType: "nova_poshta", postOffice: "", paymentType: "card", comment: "" }); }}
          style={{ padding: "12px 32px", backgroundColor: "#1e2a4a", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "15px" }}
        >
          Повернутись до магазину
        </button>
      </div>
    );
  }

  // ===== CHECKOUT FORM =====
  if (view === "checkout") {
    return (
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px" }}>
        <button onClick={() => setView("cart")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "14px", fontWeight: 600, marginBottom: "20px", padding: 0 }}>
          ← Назад до кошика
        </button>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#1e2a4a", margin: "0 0 24px" }}>Оформлення замовлення</h1>

        <form onSubmit={handleSubmit}>
          {/* Personal info */}
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "20px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1e2a4a", margin: "0 0 16px" }}>👤 Особисті дані</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={labelStyle}>Ім&apos;я *</label>
                <input style={inputStyle} placeholder="Іван" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>Прізвище *</label>
                <input style={inputStyle} placeholder="Петренко" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Телефон *</label>
                <input style={inputStyle} placeholder="+380XXXXXXXXX" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} placeholder="email@example.com" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "20px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1e2a4a", margin: "0 0 16px" }}>📦 Доставка</h2>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              {[
                { value: "nova_poshta", label: "🟡 Нова Пошта" },
                { value: "ukrposhta", label: "🔵 Укрпошта" },
              ].map((opt) => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "10px 16px", border: `2px solid ${form.deliveryType === opt.value ? "#f46f10" : "#e5e7eb"}`, borderRadius: "10px", flex: 1, fontWeight: 600, fontSize: "14px", color: form.deliveryType === opt.value ? "#f46f10" : "#4b5563" }}>
                  <input type="radio" name="delivery" value={opt.value} checked={form.deliveryType === opt.value} onChange={() => setForm((f) => ({ ...f, deliveryType: opt.value }))} style={{ accentColor: "#f46f10" }} />
                  {opt.label}
                </label>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Місто *</label>
                <input style={inputStyle} placeholder="Львів" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>Відділення *</label>
                <input style={inputStyle} placeholder="Відділення №1" value={form.postOffice} onChange={(e) => setForm((f) => ({ ...f, postOffice: e.target.value }))} required />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "20px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1e2a4a", margin: "0 0 16px" }}>💳 Оплата</h2>
            <div style={{ display: "flex", gap: "12px", marginBottom: form.paymentType === "card" ? "16px" : "0" }}>
              {[
                { value: "card", label: "💳 Оплата карткою" },
                { value: "cod", label: "📬 Накладений платіж" },
              ].map((opt) => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "10px 16px", border: `2px solid ${form.paymentType === opt.value ? "#059669" : "#e5e7eb"}`, borderRadius: "10px", flex: 1, fontWeight: 600, fontSize: "14px", color: form.paymentType === opt.value ? "#059669" : "#4b5563" }}>
                  <input type="radio" name="payment" value={opt.value} checked={form.paymentType === opt.value} onChange={() => setForm((f) => ({ ...f, paymentType: opt.value }))} style={{ accentColor: "#059669" }} />
                  {opt.label}
                </label>
              ))}
            </div>

            {form.paymentType === "card" && cardInfo && (
              <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px" }}>
                <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#166534", fontWeight: 600 }}>Реквізити для переказу (Monobank):</p>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: "20px", fontWeight: 800, color: "#1e2a4a", letterSpacing: "2px" }}>
                      {cardInfo.cardNumber}
                    </div>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>{cardInfo.cardName}</div>
                  </div>
                </div>
                <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#166534" }}>
                  Після оплати надішліть скріншот у Telegram або менеджеру.
                </p>
              </div>
            )}

            {form.paymentType === "cod" && (
              <div style={{ backgroundColor: "#fefce8", border: "1px solid #fde68a", borderRadius: "12px", padding: "12px 16px", marginTop: "12px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#92400e" }}>Оплата при отриманні. Додатково стягується комісія пошти.</p>
              </div>
            )}
          </div>

          {/* Comment */}
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1e2a4a", margin: "0 0 12px" }}>💬 Коментар до замовлення</h2>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
              placeholder="Побажання, розмір, колір тощо..."
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            />
          </div>

          {/* Order summary */}
          <div style={{ backgroundColor: "#1e2a4a", borderRadius: "16px", padding: "20px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "white", margin: "0 0 12px" }}>Ваше замовлення</h2>
            {cart.map((item) => (
              <div key={item.product.id + (item.size || "")} style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.8)", fontSize: "13px", marginBottom: "6px" }}>
                <span>{item.product.name}{item.size ? ` (${item.size})` : ""} × {item.qty}</span>
                <span style={{ fontWeight: 700 }}>{item.product.price * item.qty} грн</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", marginTop: "12px", paddingTop: "12px", display: "flex", justifyContent: "space-between", color: "white", fontWeight: 800, fontSize: "18px" }}>
              <span>Разом:</span>
              <span style={{ color: "#f46f10" }}>{totalAmount} грн</span>
            </div>
          </div>

          {formError && (
            <div style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", color: "#dc2626", fontSize: "14px", fontWeight: 600 }}>
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ width: "100%", padding: "16px", backgroundColor: submitting ? "#9ca3af" : "#f46f10", color: "white", border: "none", borderRadius: "12px", fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer", fontSize: "16px", fontFamily: "Montserrat, sans-serif" }}
          >
            {submitting ? "Оформлення..." : `Підтвердити замовлення · ${totalAmount} грн`}
          </button>
        </form>
      </div>
    );
  }

  // ===== CART =====
  if (view === "cart") {
    return (
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px" }}>
        <button onClick={() => setView("catalog")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "14px", fontWeight: 600, marginBottom: "20px", padding: 0 }}>
          ← Продовжити покупки
        </button>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#1e2a4a", margin: "0 0 24px" }}>🛒 Кошик</h1>

        {cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛒</div>
            <p style={{ fontSize: "16px" }}>Кошик порожній</p>
            <button onClick={() => setView("catalog")} style={{ marginTop: "16px", padding: "10px 24px", backgroundColor: "#1e2a4a", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
              До каталогу
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              {cart.map((item) => (
                <div key={item.product.id} style={{ backgroundColor: "white", borderRadius: "16px", padding: "16px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "10px", overflow: "hidden", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", flexShrink: 0 }}>
                    {item.product.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : item.product.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#1e2a4a", fontSize: "15px", marginBottom: "4px" }}>{item.product.name}</div>
                    {item.size && <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}>Розмір: <strong>{item.size}</strong></div>}
                    <div style={{ color: "#f46f10", fontWeight: 800, fontSize: "16px" }}>{item.product.price} грн</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button onClick={() => changeQty(item.product.id, -1)} style={{ width: "32px", height: "32px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "white", cursor: "pointer", fontSize: "16px", fontWeight: 700, color: "#4b5563" }}>−</button>
                    <span style={{ fontWeight: 700, fontSize: "16px", minWidth: "24px", textAlign: "center" }}>{item.qty}</span>
                    <button onClick={() => changeQty(item.product.id, 1)} style={{ width: "32px", height: "32px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "white", cursor: "pointer", fontSize: "16px", fontWeight: 700, color: "#4b5563" }}>+</button>
                    <button onClick={() => removeFromCart(item.product.id)} style={{ marginLeft: "8px", width: "32px", height: "32px", border: "none", borderRadius: "6px", backgroundColor: "#fee2e2", cursor: "pointer", fontSize: "16px", color: "#dc2626" }}>×</button>
                  </div>
                  <div style={{ textAlign: "right", minWidth: "80px" }}>
                    <div style={{ fontWeight: 800, fontSize: "16px", color: "#1e2a4a" }}>{item.product.price * item.qty} грн</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontWeight: 700, color: "#4b5563", fontSize: "16px" }}>Разом:</span>
                <span style={{ fontWeight: 800, fontSize: "22px", color: "#f46f10" }}>{totalAmount} грн</span>
              </div>
              <button
                onClick={openCheckout}
                style={{ width: "100%", padding: "14px", backgroundColor: "#f46f10", color: "white", border: "none", borderRadius: "10px", fontWeight: 800, cursor: "pointer", fontSize: "15px", fontFamily: "Montserrat, sans-serif" }}
              >
                Оформити замовлення →
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ===== CATALOG =====
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1e2a4a", margin: 0 }}>Магазин ЛДБЛ</h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0" }}>Офіційна атрибутика та спортивне спорядження</p>
        </div>
        {cart.length > 0 && (
          <button
            onClick={() => setView("cart")}
            style={{ padding: "10px 20px", backgroundColor: "#f46f10", color: "white", borderRadius: "10px", fontWeight: 700, cursor: "pointer", border: "none", fontSize: "15px", fontFamily: "Montserrat, sans-serif" }}
          >
            🛒 Кошик ({totalItems}) · {totalAmount} грн
          </button>
        )}
      </div>

      {/* Categories */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{ padding: "8px 16px", borderRadius: "20px", border: "none", fontWeight: 600, cursor: "pointer", fontSize: "13px", backgroundColor: cat === c ? "#f46f10" : "#e5e7eb", color: cat === c ? "white" : "#4a4a4a", fontFamily: "Montserrat, sans-serif" }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Products */}
      {products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#9ca3af" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛒</div>
          <p style={{ fontSize: "16px" }}>Товари ще не додані</p>
          <p style={{ fontSize: "13px", marginTop: "8px" }}>Зверніться до адміністратора</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
          {filtered.map((p) => {
            const cartItem = cart.find((i) => i.product.id === p.id);
            return (
              <div key={p.id} style={{ backgroundColor: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", position: "relative" }}>
                {p.badge && (
                  <div style={{ position: "absolute", top: "12px", left: "12px", backgroundColor: "#f46f10", color: "white", fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "4px", zIndex: 1 }}>
                    {p.badge}
                  </div>
                )}
                <div style={{ height: "140px", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "52px" }}>{p.emoji}</span>
                  )}
                </div>
                <div style={{ padding: "14px" }}>
                  <div style={{ fontWeight: 700, color: "#1e2a4a", fontSize: "14px", marginBottom: "4px", lineHeight: "1.3" }}>{p.name}</div>
                  {p.description && (
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", lineHeight: "1.4" }}>{p.description}</div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span style={{ fontWeight: 800, color: "#f46f10", fontSize: "18px" }}>{p.price} грн</span>
                    {p.oldPrice && <span style={{ textDecoration: "line-through", color: "#9ca3af", fontSize: "13px" }}>{p.oldPrice} грн</span>}
                  </div>

                  {/* Size selector */}
                  {p.sizes && p.sizes !== "Один розмір" && (
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, marginBottom: "5px" }}>Розмір:</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {p.sizes.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                          <button
                            key={s}
                            onClick={() => setSelectedSizes((prev) => ({ ...prev, [p.id]: s }))}
                            style={{
                              padding: "3px 8px",
                              borderRadius: "5px",
                              border: `1.5px solid ${selectedSizes[p.id] === s ? "#f46f10" : "#e5e7eb"}`,
                              backgroundColor: selectedSizes[p.id] === s ? "#fff7ed" : "white",
                              color: selectedSizes[p.id] === s ? "#f46f10" : "#4b5563",
                              fontWeight: 700,
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(() => {
                    const selectedSize = p.sizes === "Один розмір" ? "Один розмір" : selectedSizes[p.id];
                    const needSize = !!p.sizes && p.sizes !== "Один розмір";
                    const cartItem2 = cart.find((i) => i.product.id === p.id && i.size === selectedSize);
                    if (cartItem2) {
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button onClick={() => changeQty(p.id, -1)} style={{ width: "32px", height: "32px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "white", cursor: "pointer", fontSize: "16px", fontWeight: 700 }}>−</button>
                          <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: "15px" }}>{cartItem2.qty}</span>
                          <button onClick={() => changeQty(p.id, 1)} style={{ width: "32px", height: "32px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "white", cursor: "pointer", fontSize: "16px", fontWeight: 700 }}>+</button>
                          <button onClick={() => setView("cart")} style={{ flex: 2, padding: "6px", backgroundColor: "#059669", color: "white", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer", fontSize: "12px" }}>В кошику</button>
                        </div>
                      );
                    }
                    return (
                      <button
                        onClick={() => { if (needSize && !selectedSize) return; addToCart(p, selectedSize); }}
                        style={{ width: "100%", padding: "10px", backgroundColor: needSize && !selectedSize ? "#9ca3af" : "#1e2a4a", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: needSize && !selectedSize ? "default" : "pointer", fontSize: "13px", fontFamily: "Montserrat, sans-serif" }}
                      >
                        {needSize && !selectedSize ? "Оберіть розмір" : "Додати в кошик"}
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating cart button */}
      {cart.length > 0 && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 50 }}>
          <button
            onClick={() => setView("cart")}
            style={{ padding: "14px 24px", backgroundColor: "#f46f10", color: "white", borderRadius: "50px", fontWeight: 800, cursor: "pointer", border: "none", fontSize: "15px", boxShadow: "0 4px 20px rgba(244,111,16,0.5)", fontFamily: "Montserrat, sans-serif" }}
          >
            🛒 {totalItems} · {totalAmount} грн
          </button>
        </div>
      )}
    </div>
  );
}
