import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      textAlign: "center",
      backgroundColor: "#f1f5f9",
      fontFamily: "sans-serif",
    }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🏀</div>
      <h1 style={{ fontSize: 36, fontWeight: 900, color: "#1a2744", margin: "0 0 10px" }}>
        404 — М&apos;яч не знайдено!
      </h1>
      <p style={{ color: "#6b7280", fontSize: 16, margin: "0 0 8px", maxWidth: 400, lineHeight: 1.6 }}>
        Схоже, ця сторінка пішла в аут. 😅
      </p>
      <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 28px" }}>
        Перевір адресу або повернись на головну.
      </p>
      <Link
        href="/"
        style={{
          padding: "12px 30px",
          backgroundColor: "#1a2744",
          color: "#fff",
          borderRadius: 12,
          fontWeight: 800,
          fontSize: 16,
          textDecoration: "none",
          boxShadow: "0 3px 10px rgba(26,39,68,0.25)",
        }}
      >
        🏠 На головну
      </Link>
    </div>
  );
}
