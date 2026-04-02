import { getSettings } from "@/lib/site-settings";
import Footer from "./Footer";

export default async function FooterWrapper() {
  const settings = await getSettings([
    "site.name",
    "site.logoText",
    "images.logo",
    "footer.about",
    "footer.copyright",
    // contact.* (singular) — основний ключ для футера
    "contact.address",
    "contact.email",
    "contact.website",
    "contact.websiteUrl",
    // contacts.* (plural) — fallback якщо contact.* не заповнений
    "contacts.address",
    "contacts.email",
    "contacts.website",
    // Соцмережі
    "social.facebook",
    "social.instagram",
    "social.telegram",
    "social.youtube",
    // fallback для соцмереж зі старого формату
    "contacts.facebook",
    "contacts.instagram",
    "contacts.youtube",
    // Кольори
    "colors.navy",
    "colors.orange",
    "colors.footerBg",
    "colors.footerText",
    "colors.footerLink",
    "colors.footerCopyright",
    "footer.textColor",
    "footer.col1.visible",
    "footer.col2.visible",
    "footer.col3.visible",
    "images.footerBg",
  ]);

  // Адреса/email/сайт: contact.* або contacts.* (fallback)
  const address = settings["contact.address"] || settings["contacts.address"] || "";
  const email   = settings["contact.email"]   || settings["contacts.email"]   || "";
  const website = settings["contact.website"] || settings["contacts.website"] || "";

  // Соцмережі: social.* або contacts.* (fallback)
  const facebook  = settings["social.facebook"]  || settings["contacts.facebook"]  || "";
  const instagram = settings["social.instagram"] || settings["contacts.instagram"] || "";
  const telegram  = settings["social.telegram"]  || "";
  const youtube   = settings["social.youtube"]   || settings["contacts.youtube"]   || "";

  return (
    <Footer
      siteName={settings["site.name"] ?? "Ліга ESCULAB"}
      logoText={settings["site.logoText"] ?? "БЛ"}
      logoUrl={settings["images.logo"] ?? ""}
      about={settings["footer.about"] ?? "Баскетбольна ліга Львова. Сезон 2025-2026."}
      copyright={settings["footer.copyright"] ?? "Ліга ESCULAB. Усі права захищено."}
      address={address}
      email={email}
      website={website}
      facebook={facebook}
      instagram={instagram}
      telegram={telegram}
      youtube={youtube}
      navyColor={settings["colors.footerBg"] || settings["colors.navy"] || "#1a2744"}
      orangeColor={settings["colors.orange"] || "#f97316"}
      textColor={settings["colors.footerText"] || settings["footer.textColor"] || "#9ca3af"}
      linkColor={settings["colors.footerLink"] || ""}
      copyrightColor={settings["colors.footerCopyright"] || ""}
      col1Visible={settings["footer.col1.visible"] !== "false"}
      col2Visible={settings["footer.col2.visible"] !== "false"}
      col3Visible={settings["footer.col3.visible"] !== "false"}
      footerBg={settings["images.footerBg"] ?? ""}
    />
  );
}
