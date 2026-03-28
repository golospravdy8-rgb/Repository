"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const hasToken = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith("admin_token=ldbl_admin_2025"));
    setIsAdmin(hasToken);
    setChecked(true);
  }, []);

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
    <Link
      href="/admin/dashboard"
      style={{
        background: "#f46f10",
        border: "none",
        color: "white",
        padding: "6px 14px",
        borderRadius: "8px",
        fontSize: "13px",
        fontFamily: "Exo 2, sans-serif",
        textDecoration: "none",
        fontWeight: "bold",
        whiteSpace: "nowrap",
      }}
    >
      ⚙ Адмінпанель
    </Link>
  );
}
