import { getSettings } from "@/lib/site-settings";
import Footer from "./Footer";

export default async function FooterWrapper() {
  const settings = await getSettings([
    "site.name",
    "site.logoText",
    "images.logo",
    "footer.about",
    "footer.copyright",
    "contact.address",
    "contact.email",
    "contact.website",
    "contact.websiteUrl",
    "colors.navy",
    "colors.orange",
    "colors.footerBg",
    "colors.footerText",
    "footer.textColor",
    "footer.col1.visible",
    "footer.col2.visible",
    "footer.col3.visible",
    "images.footerBg",
  ]);

  return (
    <Footer
      siteName={settings["site.name"] ?? "Ліга ESCULAB"}
      logoText={settings["site.logoText"] ?? "БЛ"}
      logoUrl={settings["images.logo"] ?? ""}
      about={settings["footer.about"] ?? "Баскетбольна ліга Львова. Сезон 2025-2026."}
      copyright={settings["footer.copyright"] ?? "Ліга ESCULAB. Усі права захищено."}
      address={settings["contact.address"] ?? "м. Львів"}
      email={settings["contact.email"] ?? "info@basket.lviv.ua"}
      website={settings["contact.website"] ?? "basket.lviv.ua"}
      navyColor={settings["colors.footerBg"] || settings["colors.navy"] || "#1a2744"}
      orangeColor={settings["colors.orange"] || "#f97316"}
      textColor={settings["colors.footerText"] || settings["footer.textColor"] || "#9ca3af"}
      col1Visible={settings["footer.col1.visible"] !== "false"}
      col2Visible={settings["footer.col2.visible"] !== "false"}
      col3Visible={settings["footer.col3.visible"] !== "false"}
      footerBg={settings["images.footerBg"] ?? ""}
    />
  );
}
