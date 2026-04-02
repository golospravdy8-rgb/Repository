"use client";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 24px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>⚠️</div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1a2744", margin: "0 0 8px" }}>
        Помилка завантаження
      </h2>
      <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px", maxWidth: 360 }}>
        Не вдалося завантажити сторінку. Перевірте з&apos;єднання та спробуйте знову.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            padding: "10px 22px",
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
          href="/"
          style={{
            padding: "10px 22px",
            backgroundColor: "#1a2744",
            color: "#fff",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          На головну
        </Link>
      </div>
    </div>
  );
}
