export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/site-settings";
import HeaderWrapper from "@/components/layout/HeaderWrapper";
import FooterWrapper from "@/components/layout/FooterWrapper";
import AdBanner from "@/components/public/AdBanner";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings([
    "colors.bg",
    "colors.navy",
    "colors.orange",
    "colors.text.heading",
    "colors.text.accent",
    "colors.text.body",
    "colors.text.muted",
    "site.zoom",
  ]);

  const bgColor = settings["colors.bg"] || "#f1f5f9";
  const siteZoom = settings["site.zoom"] ? Number(settings["site.zoom"]) / 100 : 1;

  // CSS variables — fallback to navy/orange if page-specific text colors not set
  const navy = settings["colors.navy"] || "#1a2744";
  const orange = settings["colors.orange"] || "#f97316";

  const validColor = (val: string | undefined, fallback: string) =>
    val && val !== "#ffffff" && val !== "" ? val : fallback;

  const headingColor = validColor(settings["colors.text.heading"], navy);
  const accentColor = validColor(settings["colors.text.accent"], orange);
  const bodyColor = validColor(settings["colors.text.body"], "#1f2937");
  const mutedColor = validColor(settings["colors.text.muted"], "#6b7280");

  const cssVars: React.CSSProperties = {
    ["--color-heading" as string]: headingColor,
    ["--color-accent" as string]: accentColor,
    ["--color-body" as string]: bodyColor,
    ["--color-muted" as string]: mutedColor,
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor, ...cssVars, zoom: siteZoom }}>
      <HeaderWrapper />

      <AdBanner slot="top" />

      <main className="flex-1">{children}</main>

      <AdBanner slot="bottom" />

      <FooterWrapper />
    </div>
  );
}
