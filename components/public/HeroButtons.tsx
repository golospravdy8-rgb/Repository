"use client";

export default function HeroButtons() {
  const btnStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 18px",
    borderRadius: "10px",
    fontFamily: "Montserrat, sans-serif",
    fontWeight: 700,
    fontSize: "28px",
    cursor: "pointer",
    textDecoration: "none",
    transition: "opacity 0.2s",
    border: "none",
  } as React.CSSProperties;

  const orangeBtn = { ...btnStyle, backgroundColor: "#f46f10", color: "white" } as React.CSSProperties;
  const darkBtn = { ...btnStyle, backgroundColor: "#1e2a4a", color: "white", border: "2px solid #f46f10" } as React.CSSProperties;

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginTop: "8px" }}>
        <a href="/marketplace" style={orangeBtn}>
          <span>🛒</span> Барахолка
        </a>
        <a href="/courses" style={orangeBtn}>
          <span>🎓</span> Курси
        </a>
        <a href="/shop" style={orangeBtn}>
          <span>🛍</span> Магазин
        </a>
        <a href="/news" style={orangeBtn}>
          <span>📰</span> Новини
        </a>
        <a href="/media" style={orangeBtn}>
          <span>🎥</span> Медіа
        </a>
        <a href="/reviews" style={orangeBtn}>
          <span>⭐</span> Відгуки
        </a>
        <a href="/chat" style={darkBtn}>
          <span>💬</span> Балачка
        </a>
      </div>
    </>
  );
}
