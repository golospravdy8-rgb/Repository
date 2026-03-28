"use client";

interface HeroButtonsProps {
  buttonBg?: string;
  buttonText?: string;
}

export default function HeroButtons({ buttonBg = "#f46f10", buttonText = "#ffffff" }: HeroButtonsProps) {
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
    backgroundColor: buttonBg,
    color: buttonText,
  } as React.CSSProperties;

  const darkBtn = {
    ...btnStyle,
    backgroundColor: "#1e2a4a",
    color: "#ffffff",
    border: `2px solid ${buttonBg}`,
  } as React.CSSProperties;

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginTop: "8px" }}>
        <a href="/marketplace" style={btnStyle}>
          <span>🛒</span> Барахолка
        </a>
        <a href="/courses" style={btnStyle}>
          <span>🎓</span> Курси
        </a>
        <a href="/shop" style={btnStyle}>
          <span>🛍</span> Магазин
        </a>
        <a href="/news" style={btnStyle}>
          <span>📰</span> Новини
        </a>
        <a href="/media" style={btnStyle}>
          <span>🎥</span> Медіа
        </a>
        <a href="/reviews" style={btnStyle}>
          <span>⭐</span> Відгуки
        </a>
        <a href="/chat" style={darkBtn}>
          <span>💬</span> Балачка
        </a>
      </div>
    </>
  );
}
