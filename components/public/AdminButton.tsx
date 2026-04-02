"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => { setIsAdmin(d.isAdmin === true); setChecked(true); })
      .catch(() => setChecked(true));
  }, []);

  async function handleAdminLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    // Повне перезавантаження — скидає всі клієнтські стани та примушує
    // браузер перечитати cookies (httpOnly — не доступні з JS)
    window.location.href = "/";
  }

  if (!checked) return null;

  if (!isAdmin) {
    return (
      <Link
        href="/admin/login"
        title="Вхід для адміністратора"
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "rgba(255,255,255,0.3)",
          padding: "5px 10px",
          borderRadius: "8px",
          fontSize: "12px",
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        🔐
      </Link>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <Link
        href="/admin/dashboard"
        style={{
          background: "#f46f10",
          border: "none",
          color: "white",
          padding: "3px 7px",
          borderRadius: "6px",
          fontSize: "11px",
          fontFamily: "Exo 2, sans-serif",
          textDecoration: "none",
          fontWeight: "bold",
          whiteSpace: "nowrap",
        }}
      >
        ⚙ Адмін
      </Link>
      <button
        onClick={handleAdminLogout}
        title="Вийти"
        style={{
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.4)",
          color: "#fca5a5",
          padding: "3px 7px",
          borderRadius: "6px",
          fontSize: "11px",
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontFamily: "Exo 2, sans-serif",
          fontWeight: "bold",
        }}
      >
        🚪
      </button>
    </div>
  );
}
