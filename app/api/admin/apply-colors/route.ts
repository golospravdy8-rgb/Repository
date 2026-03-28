import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setSettings } from "@/lib/site-settings";
import { revalidatePath } from "next/cache";

const NEW_COLORS: Record<string, string> = {
  "colors.headerBg":        "#0f172a",
  "colors.headerText":      "#f8fafc",
  "colors.heroBg":          "#0f172a",
  "colors.heroTitle":       "#ffffff",
  "colors.heroSubtitle":    "#94a3b8",
  "colors.pageBg":          "#f8fafc",
  "colors.cardBg":          "#ffffff",
  "colors.cardBorder":      "#e2e8f0",
  "colors.cardText":        "#1e293b",
  "colors.tableBg":         "#0f172a",
  "colors.tableHeaderText": "#ffffff",
  "colors.tableRowOdd":     "#f1f5f9",
  "colors.tableRowEven":    "#ffffff",
  "colors.newsBg":          "#f1f5f9",
  "colors.newsCardBg":      "#ffffff",
  "colors.newsTitle":       "#0f172a",
  "colors.footerBg":        "#0f172a",
  "colors.footerText":      "#94a3b8",
  "colors.footerLink":      "#f97316",
  "colors.footerCopyright": "#475569",
  "colors.btnBlue":         "#2563eb",
  "colors.btnOrange":       "#f97316",
  "colors.btnNavy":         "#0f172a",
  "colors.btnRed":          "#dc2626",
  "colors.btnSchedule":     "#2563eb",
  "colors.btnHero":         "#f97316",
  "colors.btnDonate":       "#ea580c",
  "colors.btnChat":         "#1e293b",
  "colors.navy":            "#0f172a",
  "colors.orange":          "#f97316",
  "colors.blue":            "#2563eb",
  "colors.red":             "#dc2626",
  "colors.bg":              "#f8fafc",
};

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token")?.value;
  if (adminToken !== "ldbl_admin_2025") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await setSettings(NEW_COLORS);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, applied: Object.keys(NEW_COLORS).length });
}
