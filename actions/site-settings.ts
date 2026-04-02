"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/require-auth";
import { setSettings } from "@/lib/site-settings";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function updateSiteTexts(data: Record<string, string>) {
  await requireAuth();
  await setSettings(data);
  revalidatePath("/", "layout");
}

export async function updateSiteColors(data: Record<string, string>) {
  await requireAuth();
  await setSettings(data);
  revalidatePath("/", "layout");
}

export async function updateNavigation(items: Array<{ href: string; label: string; visible: boolean }>) {
  await requireAuth();
  await setSettings({ "nav.items": JSON.stringify(items) });
  revalidatePath("/", "layout");
}

export async function updateHomeWidgets(data: Record<string, string>) {
  await requireAuth();
  await setSettings(data);
  revalidatePath("/", "layout");
}

export async function updateHeaderSettings(data: Record<string, string>) {
  await requireAuth();
  await setSettings(data);
  revalidatePath("/", "layout");
}

export async function updateFooterSettings(data: Record<string, string>) {
  await requireAuth();
  await setSettings(data);
  revalidatePath("/", "layout");
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
  revalidatePath("/", "layout");

  return { url };
}
