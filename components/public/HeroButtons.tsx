"use client";

import { useState, useEffect } from "react";
import AuthModal from "./AuthModal";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function HeroButtons() {
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authRedirect, setAuthRedirect] = useState("");

  useEffect(() => {
    fetch("http://localhost:3012/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setUser(u))
      .catch(() => {});
  }, []);

  function handleChatClick() {
    if (user) {
      window.location.href = "http://localhost:3011";
    } else {
      setAuthMessage("Для доступу до чату потрібно увійти");
      setAuthRedirect("http://localhost:3011");
      setAuthOpen(true);
    }
  }

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
        <a href="http://localhost:3007" style={orangeBtn}>
          <span>🛒</span> Барахолка
        </a>
        <a href="http://localhost:3008" style={orangeBtn}>
          <span>🎓</span> Курси
        </a>
        <a href="http://localhost:3009" style={orangeBtn}>
          <span>🛍</span> Магазин
        </a>
        <a href="http://localhost:3010" style={orangeBtn}>
          <span>📰</span> Новини
        </a>
        <a href="/media" style={orangeBtn}>
          <span>🎥</span> Медіа
        </a>
        <a href="/reviews" style={orangeBtn}>
          <span>⭐</span> Відгуки
        </a>
        <button onClick={handleChatClick} style={darkBtn}>
          <span>💬</span> Балачка
        </button>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        message={authMessage}
        redirectAfter={authRedirect}
        onSuccess={(u) => setUser(u)}
      />
    </>
  );
}
