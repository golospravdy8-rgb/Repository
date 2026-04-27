"use client";

import { useState, useEffect } from "react";
import AuthModal from "./AuthModal";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function AuthButton({ orangeColor }: { orangeColor?: string }) {
  const orange = orangeColor || "#f46f10";
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3012/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { setUser(u); setChecked(true); })
      .catch(() => setChecked(true));
  }, []);

  async function handleLogout() {
    await fetch("http://localhost:3012/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    window.location.reload();
  }

  if (!checked) return null;

  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "26px", fontWeight: 600 }}>
          Привіт, {user.name.split(" ")[0]}
          {user.role === "vip" && (
            <span style={{ marginLeft: "4px", color: orange }}>⭐ VIP</span>
          )}
          {user.role === "admin" && (
            <span style={{ marginLeft: "4px", color: orange }}> (admin)</span>
          )}
        </span>
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 20px",
            borderRadius: "6px",
            fontSize: "24px",
            fontWeight: 700,
            border: `1px solid rgba(255,255,255,0.3)`,
            background: "transparent",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
          }}
        >
          Вийти
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setAuthOpen(true)}
        style={{
          padding: "6px 16px",
          borderRadius: "8px",
          fontSize: "26px",
          fontWeight: 700,
          backgroundColor: orange,
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        Увійти
      </button>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={(u) => setUser(u)} />
    </>
  );
}
