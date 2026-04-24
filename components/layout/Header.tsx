"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import AgeGroupSwitcher from "@/components/public/AgeGroupSwitcher";
import AdminButton from "@/components/public/AdminButton";
import LogoutButton from "@/components/public/LogoutButton";

export interface NavItem {
  href: string;
  label: string;
  visible: boolean;
}

export interface HeaderProps {
  siteName: string;
  tagline: string;
  logoText: string;
  logoUrl: string;
  navItems: NavItem[];
  navFontSize: number;
  activeStyle: string;
  logoPosition: string;
  headerHeight: number;
  navyColor: string;
  orangeColor: string;
  headerBg: string;
  headerTextColor?: string;
}

function HeaderInner({
  siteName,
  tagline,
  logoText,
  logoUrl,
  navItems,
  navFontSize,
  activeStyle,
  logoPosition,
  headerHeight,
  navyColor,
  orangeColor,
  headerBg,
  headerTextColor = "rgba(255,255,255,0.85)",
}: HeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ag = searchParams?.get("ag") || "younger";
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleLinks = navItems.filter((n) => n.visible !== false);

  function withAg(href: string) {
    return `${href}?ag=${ag}`;
  }

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  const getActiveLinkStyle = (active: boolean) => {
    if (!active) return { color: headerTextColor };
    const base = { color: orangeColor } as React.CSSProperties;
    if (activeStyle === "underline") return { ...base, borderBottom: `2px solid ${orangeColor}` };
    if (activeStyle === "background") return { ...base, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "6px" };
    return base;
  };

  const centered = logoPosition === "center";

  return (
    <header
      style={{
        backgroundColor: navyColor,
        ...(headerBg ? { backgroundImage: `url(${headerBg})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
        width: "100%",
        overflow: "hidden",
      }}
      className="text-white shadow-lg"
    >
      {/* DESKTOP: Traditional layout */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ overflow: "hidden" }}>
        <div
          className={`flex items-center ${centered ? "justify-center" : "justify-between"}`}
          style={{ minHeight: `${headerHeight}px`, paddingTop: "8px", paddingBottom: "8px" }}
        >
          {/* Logo */}
          <Link href={withAg("/")} className="flex items-center gap-2 flex-shrink-0" style={{ marginLeft: "-8px" }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <div style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                overflow: "hidden",
                flexShrink: 0,
                backgroundColor: "#f0f0f0",
                padding: "5px",
                border: "1.5px solid rgba(0,0,0,0.1)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                boxSizing: "border-box"
              }}>
                <img
                  src={logoUrl}
                  alt={siteName}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            ) : (
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: orangeColor }}
              >
                {logoText}
              </div>
            )}
            <div className="leading-tight flex flex-col items-center">
              <div className="font-bold tracking-tighter text-base md:text-[1.1rem]" style={{ lineHeight: 1.25 }}>{siteName}</div>
              <div className="hidden md:block" style={{ fontSize: "0.65rem", lineHeight: 1.3, color: "rgba(255,255,255,0.85)" }}>{tagline}</div>
            </div>
          </Link>

          {/* Desktop nav */}
          {!centered && (
            <nav className="flex items-center gap-0 flex-nowrap justify-end flex-1 min-w-0" style={{ marginLeft: "12px" }}>
              {visibleLinks.map((link) => {
                const active = isActive(link.href) ?? false;
                return (
                  <Link
                    key={link.href}
                    href={withAg(link.href)}
                    className="px-1.5 py-1 rounded font-medium transition-colors hover:bg-white/10 text-center whitespace-nowrap"
                    style={{ fontSize: `${Math.min(Math.round(navFontSize * 1.1), 13)}px`, ...getActiveLinkStyle(active) }}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="ml-2 pl-2 border-l border-white/20 flex items-center gap-1.5 flex-shrink-0">
                <Suspense fallback={null}>
                  <AgeGroupSwitcher orangeColor={orangeColor} />
                </Suspense>
                <LogoutButton />
                <AdminButton />
              </div>
            </nav>
          )}
        </div>
      </div>

      {/* MOBILE: Restructured layout */}
      <div className="md:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ overflow: "hidden" }}>
        {/* Top row: Menu + Chat buttons */}
        {!centered && (
          <div className="flex items-center justify-between pt-2 pb-2">
            {/* Menu button */}
            <button
              className="p-2 rounded hover:bg-white/10"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              <div className="w-6 h-0.5 bg-white mb-1.5"></div>
              <div className="w-6 h-0.5 bg-white mb-1.5"></div>
              <div className="w-6 h-0.5 bg-white"></div>
            </button>

            {/* Chat button */}
            <Link
              href="/chat"
              className="px-3 py-1.5 text-xs bg-black border border-cyan-400 text-cyan-400 font-bold rounded-full hover:shadow-[0_0_15px_rgba(34,211,238,0.6)] transition duration-300 inline-block"
            >
              💬 Балачка
            </Link>
          </div>
        )}

        {/* Season badge row */}
        <div className="flex justify-center py-2">
          <span className="inline-block px-3 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-[11px] rounded-full shadow-[0_0_15px_rgba(255,77,0,0.5)] whitespace-nowrap">
            ⚡ СЕЗОН 2025-2026
          </span>
        </div>

        {/* Logo and sitename */}
        <div
          className="flex items-center justify-center pb-3"
          style={{ paddingTop: "8px" }}
        >
          <Link href={withAg("/")} className="flex items-center gap-2 flex-shrink-0" style={{ marginLeft: "-8px" }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <div style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                overflow: "hidden",
                flexShrink: 0,
                backgroundColor: "#f0f0f0",
                padding: "5px",
                border: "1.5px solid rgba(0,0,0,0.1)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                boxSizing: "border-box"
              }}>
                <img
                  src={logoUrl}
                  alt={siteName}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            ) : (
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: orangeColor }}
              >
                {logoText}
              </div>
            )}
            <div className="leading-tight flex flex-col items-center">
              <div className="font-bold tracking-tighter text-base" style={{ lineHeight: 1.25 }}>{siteName}</div>
            </div>
          </Link>
        </div>

        {/* Mobile menu */}
        {menuOpen && !centered && (
          <div className="pb-4 border-t border-white/10 pt-3">
            {visibleLinks.map((link) => {
              const active = isActive(link.href) ?? false;
              return (
                <Link
                  key={link.href}
                  href={withAg(link.href)}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium rounded mb-1"
                  style={{
                    color: active ? orangeColor : "rgba(255,255,255,0.85)",
                    backgroundColor: active ? "rgba(255,255,255,0.1)" : "transparent",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="px-3 pt-2 border-t border-white/10 mt-2 flex items-center gap-2">
              <LogoutButton />
              <AdminButton />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default function Header(props: HeaderProps) {
  return (
    <Suspense fallback={
      <header style={{ backgroundColor: props.navyColor, width: "100%", height: `${props.headerHeight}px` }} className="text-white shadow-lg" />
    }>
      <HeaderInner {...props} />
    </Suspense>
  );
}
