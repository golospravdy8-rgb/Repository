"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function AgeGroupTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ag = searchParams?.get("ag") === "older" ? "older" : "younger";

  function switchAg(group: "younger" | "older") {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("ag", group);
    router.push(`/admin/dashboard?${params.toString()}`);
  }

  const btnBase = "px-4 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer border-none";

  return (
    <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
      <button
        onClick={() => switchAg("younger")}
        className={btnBase}
        style={ag === "younger"
          ? { backgroundColor: "#1a2744", color: "white" }
          : { backgroundColor: "transparent", color: "#6b7280" }}
      >
        U-14
      </button>
      <button
        onClick={() => switchAg("older")}
        className={btnBase}
        style={ag === "older"
          ? { backgroundColor: "#1a2744", color: "white" }
          : { backgroundColor: "transparent", color: "#6b7280" }}
      >
        U-16
      </button>
    </div>
  );
}
