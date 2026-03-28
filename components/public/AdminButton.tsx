"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminButton() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const hasToken = document.cookie.split(";").some((c) => c.trim().startsWith("admin_token="));
    setIsAdmin(hasToken);
  }, []);

  if (!isAdmin) return (
    <Link href="/admin/login" style={{
      background: "transparent",
      border: "1px solid #f46f10",
      color: "#f46f10",
      padding: "5px 12px",
      borderRadius: "8px",
      fontSize: "13px",
      fontFamily: "Exo 2, sans-serif",
      textDecoration: "none",
      whiteSpace: "nowrap",
    }}>
      🔐 Вхід
    </Link>
  );

  return (
    <Link href="/admin/dashboard" style={{
      background: "#f46f10",
      border: "none",
      color: "white",
      padding: "5px 12px",
      borderRadius: "8px",
      fontSize: "13px",
      fontFamily: "Exo 2, sans-serif",
      textDecoration: "none",
      whiteSpace: "nowrap",
    }}>
      ⚙ Адмін
    </Link>
  );
}
