"use client";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
