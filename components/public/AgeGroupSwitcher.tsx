"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function AgeGroupSwitcher({ orangeColor }: { orangeColor: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ag = (searchParams?.get("ag") === "older" ? "older" : "younger") as "younger" | "older";

  function handleSwitch(group: "younger" | "older") {
    if (group === ag) return;
    if (typeof window !== "undefined") localStorage.setItem("ageGroup", group);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("ag", group);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const btnBase: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.12)", borderRadius: "8px", padding: "3px" }}>
      <button
        onClick={() => handleSwitch("younger")}
        style={{
          ...btnBase,
          background: ag === "younger" ? orangeColor : "transparent",
          color: ag === "younger" ? "white" : "rgba(255,255,255,0.75)",
        }}
      >
        U-14
      </button>
      <button
        onClick={() => handleSwitch("older")}
        style={{
          ...btnBase,
          background: ag === "older" ? orangeColor : "transparent",
          color: ag === "older" ? "white" : "rgba(255,255,255,0.75)",
        }}
      >
        U-16
      </button>
    </div>
  );
}
