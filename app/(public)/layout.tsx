export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/site-settings";
import HeaderWrapper from "@/components/layout/HeaderWrapper";
import FooterWrapper from "@/components/layout/FooterWrapper";
import AdBanner from "@/components/public/AdBanner";

const FONT_URLS: Record<string, string> = {
  "Inter": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  "Montserrat": "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap",
  "Oswald": "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap",
  "Raleway": "https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700;800&display=swap",
  "Bebas Neue": "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
  "Rubik": "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap",
  "Nunito": "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap",
  "Exo 2": "https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800&display=swap",
  "Play": "https://fonts.googleapis.com/css2?family=Play:wght@400;700&display=swap",
  "Ubuntu": "https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap",
};

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
    "fonts.heading",
    "fonts.body",
    "fonts.headingSize",
    "fonts.bodySize",
    "fonts.headingWeight",
    "fonts.bodyWeight",
  ]);

  const headingFont = settings["fonts.heading"] || "Play";
  const bodyFont = settings["fonts.body"] || "Exo 2";
  const headingSize = settings["fonts.headingSize"] || "44";
  const bodySize = settings["fonts.bodySize"] || "18";
  const headingWeight = settings["fonts.headingWeight"] || "700";
  const bodyWeight = settings["fonts.bodyWeight"] || "400";

  // Collect unique font URLs to inject
  const fontUrls = Array.from(new Set(
    [headingFont, bodyFont].map(f => FONT_URLS[f]).filter(Boolean)
  ));

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
    ["--font-heading" as string]: `'${headingFont}', sans-serif`,
    ["--font-body" as string]: `'${bodyFont}', sans-serif`,
    ["--font-heading-size" as string]: `${headingSize}px`,
    ["--font-body-size" as string]: `${bodySize}px`,
    ["--font-heading-weight" as string]: headingWeight,
    ["--font-body-weight" as string]: bodyWeight,
    fontFamily: `'${bodyFont}', sans-serif`,
    fontSize: `${bodySize}px`,
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
