"use client";

import { useEffect, useState } from "react";

const CHAT_KEY = "ldbl_chat_user";
const PARENT_TOKEN_KEY = "parent_token";
const PARENT_DATA_KEY = "parent_data";

export default function LogoutButton() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const hasChatUser = !!localStorage.getItem(CHAT_KEY);
    const hasParent = !!localStorage.getItem(PARENT_TOKEN_KEY);
    setLoggedIn(hasChatUser || hasParent);
  }, []);

  if (!loggedIn) return null;

  function handleLogout() {
    localStorage.removeItem(CHAT_KEY);
    localStorage.removeItem(PARENT_TOKEN_KEY);
    localStorage.removeItem(PARENT_DATA_KEY);
    window.location.href = "/";
  }

  return (
    <button
      onClick={handleLogout}
      title="Вийти з чату"
      style={{
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.35)",
        color: "#fca5a5",
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
      }}
    >
      Вийти
    </button>
  );
}
