"use client";
import Link from "next/link";

interface ErrorFallbackProps {
  title?: string;
  message?: string;
  reset: () => void;
  backHref?: string;
  backLabel?: string;
}

export default function ErrorFallback({
  title = "Не вдалося завантажити",
  message = "Щось пішло не так. Спробуйте оновити сторінку.",
  reset,
  backHref = "/",
  backLabel = "На головну",
}: ErrorFallbackProps) {
  return (
    <div style={{
      maxWidth: 440,
      margin: "48px auto",
      padding: "32px 24px",
      textAlign: "center",
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
    }}>
      <div style={{ fontSize: 48, marginBottom: 10 }}>🏀</div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1a2744", margin: "0 0 8px" }}>
        {title}
      </h2>
      <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 22px", lineHeight: 1.5 }}>
        {message}
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
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
          href={backHref}
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
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
