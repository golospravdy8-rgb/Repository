"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/error.tsx] Error caught:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div style={{
      maxWidth: 480,
      margin: "60px auto",
      padding: "32px 24px",
      textAlign: "center",
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚙️</div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1a2744", margin: "0 0 8px" }}>
        Помилка адмін-панелі
      </h2>
      <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px" }}>
        Не вдалося завантажити розділ адміністрування.
      </p>

      {process.env.NODE_ENV === "development" && (
        <details style={{ background: "#f5f5f5", padding: "12px", borderRadius: "8px", marginBottom: "20px", textAlign: "left", fontSize: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: "bold", color: "red", marginBottom: "8px" }}>
            🔍 Error Details (Dev Only)
          </summary>
          <pre style={{ margin: "8px 0 0", fontSize: "11px", overflowX: "auto", background: "#fff", padding: "8px", borderRadius: "4px" }}>
            {error.message}
            {error.stack && "\n\n" + error.stack}
          </pre>
        </details>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            padding: "10px 20px",
            backgroundColor: "#f97316",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Спробувати знову
        </button>
        <Link
          href="/admin"
          style={{
            padding: "10px 20px",
            backgroundColor: "#1a2744",
            color: "#fff",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          До панелі
        </Link>
      </div>
    </div>
  );
}
