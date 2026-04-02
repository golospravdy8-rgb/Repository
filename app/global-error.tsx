"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Критична помилка — логуємо для Vercel Logs / Sentry
    console.error("[LDBL CRITICAL]", error.message, error.digest ?? "");
  }, [error]);

  return (
    <html lang="uk">
      <body style={{ margin: 0, fontFamily: "'Segoe UI', sans-serif", backgroundColor: "#f1f5f9" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🏀</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "#1a2744", margin: "0 0 10px" }}>
            Технічна перерва!
          </h1>
          <p style={{ color: "#6b7280", fontSize: 16, margin: "0 0 8px", maxWidth: 400, lineHeight: 1.6 }}>
            Сайт тимчасово недоступний. Наші тренери вже виправляють ситуацію! 🛠️
          </p>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 28px" }}>
            Спробуйте оновити сторінку через кілька секунд.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "14px 32px",
              backgroundColor: "#f97316",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "0 3px 12px rgba(249,115,22,0.4)",
            }}
          >
            🔄 Спробувати знову
          </button>
        </div>
      </body>
    </html>
  );
}
