import { prisma } from "@/lib/prisma";

export const SETTINGS_TAG = "site-settings";

export async function getSetting(key: string, fallback = ""): Promise<string> {
  try {
    const row = await prisma.siteSettings.findUnique({ where: { key } });
    return row?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    const rows = await prisma.siteSettings.findMany({
      where: { key: { in: keys } },
    });
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  } catch {
    return {};
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.siteSettings.findMany();
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  } catch {
    return {};
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function setSettings(data: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(data).map(([key, value]) =>
      prisma.siteSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );
}
