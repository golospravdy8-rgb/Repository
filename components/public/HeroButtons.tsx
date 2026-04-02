"use client";

import { useRouter } from "next/navigation";

const LS_KEY = "ldbl_chat_user";

interface HeroButtonsProps {
  buttonBg?: string;
  buttonText?: string;
  chatBg?: string;
  donateBg?: string;
}

function isPlayerLoggedIn(): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const p = JSON.parse(raw);
    return !!(p?.phone && p?.firstName);
  } catch { return false; }
}

function isParentLoggedIn(): boolean {
  try {
    const token = localStorage.getItem("parent_token");
    const raw = localStorage.getItem("parent_data");
    if (!token || !raw) return false;
    const d = JSON.parse(raw);
    return !!(d?.contact?.phone);
  } catch { return false; }
}

export default function HeroButtons({ buttonBg = "#f97316", buttonText = "#ffffff", chatBg = "#1e293b", donateBg }: HeroButtonsProps) {
  const router = useRouter();

  const btnStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 8,
    fontFamily: "Montserrat, sans-serif",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
    textDecoration: "none",
    transition: "opacity 0.2s",
    border: "none",
    backgroundColor: buttonBg,
    color: buttonText,
  } as React.CSSProperties;

  const darkBtn = {
    ...btnStyle,
    backgroundColor: chatBg,
    color: "#ffffff",
    border: `2px solid ${donateBg || buttonBg}`,
  } as React.CSSProperties;

  function goPlayer() {
    router.push(isPlayerLoggedIn() ? "/chat" : "/chat?mode=player");
  }

  function goParent() {
    router.push(isParentLoggedIn() ? "/chat?room=parents" : "/chat?mode=parent");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 4 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        <a href="/marketplace" style={btnStyle}><span>🛒</span> Барахолка</a>
        <a href="/courses"     style={btnStyle}><span>🎓</span> Курси</a>
        <a href="/shop"        style={btnStyle}><span>🛍</span> Магазин</a>
        <a href="/news"        style={btnStyle}><span>📰</span> Новини</a>
        <a href="/media"       style={btnStyle}><span>🎥</span> Медіа</a>
        <a href="/reviews"     style={btnStyle}><span>⭐</span> Відгуки</a>
        <button onClick={goPlayer} style={darkBtn}><span>💬</span> Балачка (гравці)</button>
        <button onClick={goParent} style={darkBtn}><span>👨‍👩‍👦</span> Чат батьків</button>
      </div>
    </div>
  );
}
