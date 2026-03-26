import type { Metadata } from "next";
export const metadata: Metadata = { title: "Курси — ЛДБЛ", description: "Баскетбольні тренування для дітей Львова" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, fontFamily: "Montserrat, sans-serif", backgroundColor: "#f1f5f9" }}>
      <header style={{ backgroundColor: "#1e2a4a", color: "white", padding: "0 24px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="http://localhost:3006" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>← ЛДБЛ</a>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
          <span style={{ fontWeight: 800, fontSize: "16px" }}>🎓 Курси</span>
        </div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Баскетбольні тренування</div>
      </header>
      <div style={{ backgroundColor: "white", borderBottom: "1px solid #e5e7eb", padding: "8px 24px", display: "flex", justifyContent: "center" }}>
        <div style={{ padding: "8px 24px", border: "2px dashed #f46f10", borderRadius: "8px", color: "#f46f10", fontSize: "13px", fontWeight: 600 }}>
          📢 Місце для реклами · info@basket.lviv.ua
        </div>
      </div>
      <main style={{ minHeight: "calc(100vh - 120px)" }}>{children}</main>
      <footer style={{ backgroundColor: "#1e2a4a", color: "rgba(255,255,255,0.6)", textAlign: "center", padding: "16px", fontSize: "12px" }}>
        © 2025-2026 ЛДБЛ · <a href="http://localhost:3006" style={{ color: "#f46f10", textDecoration: "none" }}>Повернутись на головний сайт</a>
      </footer>
    </body></html>
  );
}
