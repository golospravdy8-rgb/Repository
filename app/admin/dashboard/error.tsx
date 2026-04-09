"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error details to console for debugging
    console.error('[Dashboard Error]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div style={{ maxWidth: 480, margin: "48px auto", padding: "32px 24px", textAlign: "center", background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
      <div style={{ fontSize: 48, marginBottom: 10 }}>⚙️</div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1a2744", margin: "0 0 8px" }}>Помилка дашборду</h2>
      <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 8px" }}>Не вдалося завантажити адмін-панель.</p>
      {process.env.NODE_ENV === "development" && (
        <p style={{ color: "#ef4444", fontSize: 12, margin: "0 0 22px", background: "#fee2e2", padding: "10px 12px", borderRadius: 8, textAlign: "left", wordBreak: "break-word" }}>
          <strong>Debug:</strong> {error.message}
        </p>
      )}
      {process.env.NODE_ENV !== "development" && (
        <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 22px" }}>Спробуйте оновити сторінку або повернутися до панелі управління.</p>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={reset} style={{ padding: "10px 20px", backgroundColor: "#f97316", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Спробувати знову
        </button>
        <Link href="/admin" style={{ padding: "10px 20px", backgroundColor: "#1a2744", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
          До панелі
        </Link>
      </div>
    </div>
  );
}
