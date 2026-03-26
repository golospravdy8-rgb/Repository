"use server";

import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { setSettings, SETTINGS_TAG } from "@/lib/site-settings";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

export async function updateSiteTexts(data: Record<string, string>) {
  await requireAuth();
  await setSettings(data);
  revalidateTag(SETTINGS_TAG);
}

export async function updateSiteColors(data: Record<string, string>) {
  await requireAuth();
  await setSettings(data);
  revalidateTag(SETTINGS_TAG);
}

export async function updateNavigation(items: Array<{ href: string; label: string; visible: boolean }>) {
  await requireAuth();
  await setSettings({ "nav.items": JSON.stringify(items) });
  revalidateTag(SETTINGS_TAG);
}

export async function updateHomeWidgets(data: Record<string, string>) {
  await requireAuth();
  await setSettings(data);
  revalidateTag(SETTINGS_TAG);
}

export async function updateHeaderSettings(data: Record<string, string>) {
  await requireAuth();
  await setSettings(data);
  revalidateTag(SETTINGS_TAG);
}

export async function updateFooterSettings(data: Record<string, string>) {
  await requireAuth();
  await setSettings(data);
  revalidateTag(SETTINGS_TAG);
}

export async function uploadSiteImage(
  formData: FormData,
  type: "logo" | "ogImage" | "heroBg" | "headerBg" | "footerBg" | "pageBg"
): Promise<{ url: string }> {
  await requireAuth();

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() ?? "png";
  const filename = `${type}-${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  const url = `/uploads/${filename}`;
  await setSettings({ [`images.${type}`]: url });
  revalidateTag(SETTINGS_TAG);

  return { url };
}
