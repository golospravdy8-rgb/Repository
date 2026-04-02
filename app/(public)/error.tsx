"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Логуємо для Vercel Logs / Sentry
    console.error("[LDBL Public Error]", error.message, error.digest ?? "");
  }, [error]);

  return (
    <div style={{
      maxWidth: 480,
      margin: "60px auto",
      padding: "40px 28px",
      textAlign: "center",
      background: "#fff",
      borderRadius: 20,
      boxShadow: "0 4px 24px rgba(0,0,0,0.09)",
    }}>
      {/* Анімований м'яч */}
      <div style={{ fontSize: 64, marginBottom: 12, display: "inline-block", animation: "bounce 1s infinite" }}>
        🏀
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>

      <h2 style={{ fontSize: 24, fontWeight: 900, color: "#1a2744", margin: "0 0 8px" }}>
        Упс! М&apos;яч вилетів за межі!
      </h2>
      <p style={{ color: "#6b7280", fontSize: 15, margin: "0 0 8px", lineHeight: 1.6 }}>
        Щось пішло не так, але це не кінець гри! 💪
      </p>
      <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 28px" }}>
        Спробуй оновити сторінку або повернись на головну.
      </p>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          onClick={reset}
          style={{
            padding: "12px 26px",
            backgroundColor: "#f97316",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(249,115,22,0.35)",
          }}
        >
          🔄 Спробувати знову
        </button>
        <Link
          href="/"
          style={{
            padding: "12px 26px",
            backgroundColor: "#1a2744",
            color: "#fff",
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 15,
            textDecoration: "none",
            display: "inline-block",
            boxShadow: "0 2px 8px rgba(26,39,68,0.25)",
          }}
        >
          🏠 На головну
        </Link>
      </div>
    </div>
  );
}
