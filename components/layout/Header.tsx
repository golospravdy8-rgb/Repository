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
  const ag = searchParams.get("ag") || "younger";
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleLinks = navItems.filter((n) => n.visible !== false);

  function withAg(href: string) {
    return `${href}?ag=${ag}`;
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ overflow: "hidden" }}>
        <div
          className={`flex items-center ${centered ? "justify-center" : "justify-between"}`}
          style={{ minHeight: `${headerHeight}px`, paddingTop: "8px", paddingBottom: "8px" }}
        >
          {/* Logo */}
          <Link href={withAg("/")} className="flex items-center gap-2 flex-shrink-0" style={{ marginLeft: "-8px" }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#fff" }}>
                <img
                  src={logoUrl}
                  alt={siteName}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
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
              <div className="font-bold tracking-wide" style={{ fontSize: "1.1rem", lineHeight: 1.3 }}>{siteName}</div>
              <div style={{ fontSize: "0.65rem", lineHeight: 1.3, color: "rgba(255,255,255,0.85)" }}>{tagline}</div>
            </div>
          </Link>

          {/* Desktop nav */}
          {!centered && (
            <nav className="hidden md:flex items-center gap-0 flex-nowrap justify-end flex-1 min-w-0" style={{ marginLeft: "12px" }}>
              {visibleLinks.map((link) => {
                const active = isActive(link.href);
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

          {/* Mobile: switcher + burger */}
          {!centered && (
            <div className="md:hidden flex items-center gap-2">
              <Suspense fallback={null}>
                <AgeGroupSwitcher orangeColor={orangeColor} />
              </Suspense>
              <button
                className="p-2 rounded hover:bg-white/10"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menu"
              >
                <div className="w-6 h-0.5 bg-white mb-1.5"></div>
                <div className="w-6 h-0.5 bg-white mb-1.5"></div>
                <div className="w-6 h-0.5 bg-white"></div>
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {menuOpen && !centered && (
          <div className="md:hidden pb-4 border-t border-white/10 pt-3">
            {visibleLinks.map((link) => {
              const active = isActive(link.href);
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
