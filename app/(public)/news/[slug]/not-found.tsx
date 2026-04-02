import Link from "next/link";

export default function NewsNotFound() {
  return (
    <div style={{ maxWidth: 440, margin: "60px auto", padding: "32px 24px", textAlign: "center", background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>📰</div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1a2744", margin: "0 0 8px" }}>Новину не знайдено</h2>
      <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 22px" }}>Ця новина не існує або була видалена.</p>
      <Link href="/news" style={{ padding: "10px 22px", backgroundColor: "#1a2744", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
        Всі новини
      </Link>
    </div>
  );
}
