"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function AgeGroupTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ag = searchParams.get("ag") === "older" ? "older" : "younger";

  const switchTo = (group: "younger" | "older") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("ag", group);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex gap-2 mb-6">
      <button
        onClick={() => switchTo("younger")}
        className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
          ag === "younger"
            ? "text-white shadow-md"
            : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
        }`}
        style={ag === "younger" ? { backgroundColor: "#f97316" } : {}}
      >
        U-14
      </button>
      <button
        onClick={() => switchTo("older")}
        className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
          ag === "older"
            ? "text-white shadow-md"
            : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
        }`}
        style={ag === "older" ? { backgroundColor: "#1a2744" } : {}}
      >
        U-16
      </button>
    </div>
  );
}
