import { getSettings } from "@/lib/site-settings";
import Header from "./Header";
import type { NavItem } from "./Header";
import { Suspense } from "react";

function parseNavItems(value: string): NavItem[] {
  try {
    return JSON.parse(value);
  } catch {
    return [
      { href: "/news", label: "Медіа", visible: true },
      { href: "/schedule", label: "Розклад", visible: true },
      { href: "/standings", label: "Змагання", visible: true },
      { href: "/leaders", label: "Лідери", visible: true },
      { href: "/teams", label: "Команди", visible: true },
      { href: "/players", label: "Гравці", visible: true },
      { href: "/contacts", label: "Контакти", visible: true },
    ];
  }
}

export default async function HeaderWrapper() {
  const settings = await getSettings([
    "site.name",
    "site.tagline",
    "site.shortName",
    "site.logoText",
    "images.logo",
    "nav.items",
    "header.fontSizeNav",
    "header.activeStyle",
    "header.logoPosition",
    "header.height",
    "colors.headerBg",
    "colors.headerText",
    "colors.navy",
    "colors.orange",
    "images.headerBg",
  ]);

  return (
    <Suspense fallback={
      <div style={{ height: `${parseInt(settings["header.height"] ?? "64", 10)}px`, backgroundColor: settings["colors.headerBg"] || settings["colors.navy"] || "#1a2744" }} />
    }>
      <Header
        siteName={settings["site.name"] ?? "Ліга ESCULAB"}
        tagline={settings["site.tagline"] || settings["site.shortName"] || "Баскетбол Львів"}
        logoText={settings["site.logoText"] ?? "БЛ"}
        logoUrl={settings["images.logo"] ?? ""}
        navItems={parseNavItems(settings["nav.items"] ?? "")}
        navFontSize={parseInt(settings["header.fontSizeNav"] ?? "14", 10)}
        activeStyle={settings["header.activeStyle"] ?? "underline"}
        logoPosition={settings["header.logoPosition"] ?? "left"}
        headerHeight={parseInt(settings["header.height"] ?? "64", 10)}
        navyColor={settings["colors.headerBg"] || settings["colors.navy"] || "#1a2744"}
        orangeColor={settings["colors.orange"] ?? "#f97316"}
        headerBg={settings["images.headerBg"] ?? ""}
        headerTextColor={settings["colors.headerText"] || "rgba(255,255,255,0.85)"}
      />
    </Suspense>
  );
}
