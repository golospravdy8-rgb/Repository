"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        const redirectTo = searchParams?.get("redirect");
        window.location.href = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/admin/dashboard";
      } else {
        setError(data.error || "Невірний email або пароль");
      }
    } catch {
      setError("Помилка з'єднання");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1a2c56 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      fontFamily: "'Exo 2', 'Montserrat', sans-serif",
    }}>
      <div style={{
        background: "rgba(30, 42, 74, 0.95)",
        border: "1px solid rgba(249,115,22,0.25)",
        borderRadius: "20px",
        padding: "48px 40px",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        backdropFilter: "blur(10px)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "28px",
            fontWeight: 900,
            color: "white",
            boxShadow: "0 8px 24px rgba(249,115,22,0.4)",
          }}>
            ДБЛ
          </div>
          <div style={{ color: "white", fontSize: "20px", fontWeight: 800, letterSpacing: "0.5px", marginBottom: "6px" }}>
            Федерація Баскетболу Львова
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>
            Офіційний сайт баскетбольської спільноти Львова
          </div>
          <div style={{
            marginTop: "16px",
            display: "inline-block",
            background: "rgba(249,115,22,0.12)",
            border: "1px solid rgba(249,115,22,0.3)",
            borderRadius: "8px",
            padding: "4px 14px",
            color: "#f97316",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "1px",
          }}>
            АДМІН-ПАНЕЛЬ
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "12px",
              fontWeight: 600,
              display: "block",
              marginBottom: "8px",
              letterSpacing: "0.5px",
            }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ldbl.ua"
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "10px",
                color: "white",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#f97316";
                e.target.style.background = "rgba(255,255,255,0.09)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.12)";
                e.target.style.background = "rgba(255,255,255,0.06)";
              }}
            />
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "12px",
              fontWeight: 600,
              display: "block",
              marginBottom: "8px",
              letterSpacing: "0.5px",
            }}>
              ПАРОЛЬ
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "10px",
                color: "white",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#f97316";
                e.target.style.background = "rgba(255,255,255,0.09)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.12)";
                e.target.style.background = "rgba(255,255,255,0.06)";
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "#fca5a5",
              fontSize: "13px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading ? "rgba(249,115,22,0.5)" : "#f97316",
              border: "none",
              borderRadius: "10px",
              color: "white",
              fontSize: "15px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s, transform 0.1s",
              letterSpacing: "0.5px",
            }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#ea580c"; }}
            onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#f97316"; }}
          >
            {loading ? "Вхід..." : "Увійти"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <a href="/" style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", textDecoration: "none" }}>
            ← На сайт
          </a>
        </div>
      </div>
    </div>
  );
}
