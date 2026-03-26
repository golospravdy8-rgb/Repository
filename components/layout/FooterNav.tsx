"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const NAV_LINKS = [
  ["Новини", "/news"],
  ["Розклад", "/schedule"],
  ["Змагання", "/standings"],
  ["Лідери", "/leaders"],
  ["Команди", "/teams"],
] as const;

function FooterNavLinks({ textColor }: { textColor: string }) {
  const searchParams = useSearchParams();
  const ag = searchParams.get("ag") === "older" ? "older" : "younger";

  return (
    <ul className="space-y-1.5 text-sm" style={{ color: textColor }}>
      {NAV_LINKS.map(([label, href]) => (
        <li key={href}>
          <Link
            href={`${href}?ag=${ag}`}
            className="hover:opacity-80 transition-opacity"
            style={{ color: textColor }}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function FooterNav({ textColor }: { textColor: string }) {
  return (
    <Suspense fallback={
      <ul className="space-y-1.5 text-sm" style={{ color: textColor }}>
        {NAV_LINKS.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="hover:opacity-80 transition-opacity" style={{ color: textColor }}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    }>
      <FooterNavLinks textColor={textColor} />
    </Suspense>
  );
}
