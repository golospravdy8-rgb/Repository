"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface AgeGroupTabsProps {
  variant?: "light" | "dark";
}

export default function AgeGroupTabs({ variant = "light" }: AgeGroupTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ag = searchParams.get("ag") === "older" ? "older" : "younger";

  const switchTo = (group: "younger" | "older") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("ag", group);
    router.push(`${pathname}?${params.toString()}`);
  };

  if (variant === "dark") {
    return (
      <div style={{ display: "flex", gap: 4 }}>
        <button
          onClick={() => switchTo("younger")}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            background: ag === "younger" ? "#ffffff" : "rgba(255,255,255,0.15)",
            color: ag === "younger" ? "#1e56c8" : "rgba(255,255,255,0.8)",
            transition: "all 0.15s",
          }}
        >
          U-14
        </button>
        <button
          onClick={() => switchTo("older")}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            background: ag === "older" ? "#ffffff" : "rgba(255,255,255,0.15)",
            color: ag === "older" ? "#1e56c8" : "rgba(255,255,255,0.8)",
            transition: "all 0.15s",
          }}
        >
          U-16
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button
        onClick={() => switchTo("younger")}
        style={{
          padding: "4px 12px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          transition: "all 0.15s",
          ...(ag === "younger"
            ? { backgroundColor: "#f97316", color: "white", boxShadow: "0 2px 6px rgba(249,115,22,0.35)" }
            : { backgroundColor: "white", border: "1px solid #e5e7eb", color: "#6b7280" }),
        }}
      >
        U-14
      </button>
      <button
        onClick={() => switchTo("older")}
        style={{
          padding: "4px 12px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          transition: "all 0.15s",
          ...(ag === "older"
            ? { backgroundColor: "#1a2744", color: "white", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }
            : { backgroundColor: "white", border: "1px solid #e5e7eb", color: "#6b7280" }),
        }}
      >
        U-16
      </button>
    </div>
  );
}
