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

  const containerClass = variant === "dark"
    ? "flex gap-2 bg-white/15 backdrop-blur-sm p-1.5 rounded-full"
    : "flex gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-full";

  const activeClass = "bg-orange-500 text-white font-semibold rounded-2xl px-5 py-2.5 text-sm transition-all duration-150 min-h-[44px] flex items-center justify-center";
  const inactiveClass = "bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-2xl px-5 py-2.5 text-sm transition-all duration-150 min-h-[44px] flex items-center justify-center";

  return (
    <div className={containerClass}>
      <button
        onClick={() => switchTo("younger")}
        className={ag === "younger" ? activeClass : inactiveClass}
      >
        U-14
      </button>
      <button
        onClick={() => switchTo("older")}
        className={ag === "older" ? activeClass : inactiveClass}
      >
        U-16
      </button>
    </div>
  );
}
