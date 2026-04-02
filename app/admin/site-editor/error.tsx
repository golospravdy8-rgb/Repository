"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function SiteEditorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[site-editor error]", error);
  }, [error]);

  return (
    <div style={{ maxWidth: 480, margin: "48px auto", padding: "32px 24px", textAlign: "center", background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
      <div style={{ fontSize: 48, marginBottom: 10 }}>🎨</div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1a2744", margin: "0 0 8px" }}>Редактор сайту не завантажився</h2>
      <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 8px" }}>Сталася помилка при завантаженні редактора.</p>
      {error?.message && (
        <p style={{ color: "#ef4444", fontSize: 12, margin: "0 0 22px", fontFamily: "monospace", padding: "8px", background: "#fef2f2", borderRadius: 4, textAlign: "left", overflowX: "auto" }}>
          {error.message}
        </p>
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
