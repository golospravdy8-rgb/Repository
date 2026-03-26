"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import AuthButton from "@/components/public/AuthButton";
import AgeGroupSwitcher from "@/components/public/AgeGroupSwitcher";

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
}

export default function Header({
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
    if (!active) return { color: "rgba(255,255,255,0.85)" };
    const base = { color: orangeColor } as React.CSSProperties;
    if (activeStyle === "underline") return { ...base, borderBottom: `2px solid ${orangeColor}` };
    if (activeStyle === "background") return { ...base, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "6px" };
    return base;
  };

  const centered = logoPosition === "center";

  return (
    <header
      style={headerBg
        ? { backgroundImage: `url(${headerBg})`, backgroundSize: "cover", backgroundPosition: "center" }
        : { backgroundColor: navyColor }}
      className="text-white shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center ${centered ? "justify-center" : "justify-between"}`}
          style={{ minHeight: `${headerHeight}px`, paddingTop: "8px", paddingBottom: "8px" }}
        >
          {/* Logo */}
          <Link href={withAg("/")} className="flex items-center gap-3 flex-shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: orangeColor }}
              >
                {logoText}
              </div>
            )}
            <div className="leading-tight">
              <div className="font-bold tracking-wide" style={{ fontSize: "1.265rem", lineHeight: 1.3 }}>{siteName}</div>
              <div className="text-gray-300" style={{ fontSize: "0.805rem", lineHeight: 1.3 }}>{tagline}</div>
            </div>
          </Link>

          {/* Desktop nav */}
          {!centered && (
            <nav className="hidden md:flex items-center gap-1 flex-wrap justify-end">
              {visibleLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={withAg(link.href)}
                    className="px-3 py-2 rounded font-medium transition-colors hover:bg-white/10 text-center"
                    style={{ fontSize: `${navFontSize * 2}px`, ...getActiveLinkStyle(active) }}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="ml-3 pl-3 border-l border-white/20 flex items-center gap-3">
                <Suspense fallback={null}>
                  <AgeGroupSwitcher orangeColor={orangeColor} />
                </Suspense>
                <AuthButton orangeColor={orangeColor} />
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
            <div className="px-3 pt-2 border-t border-white/10 mt-2">
              <AuthButton orangeColor={orangeColor} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
