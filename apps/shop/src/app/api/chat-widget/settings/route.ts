import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — widget settings from SiteSettings
export async function GET() {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { in: ["widget.enabled", "widget.interval", "widget.mode"] } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return NextResponse.json({
    enabled: map["widget.enabled"] !== "false",
    interval: Number(map["widget.interval"] || "20"),
    mode: map["widget.mode"] || "sequential",
  });
}

// POST — update product showInChat / chatPriority
export async function POST(req: NextRequest) {
  const { productId, showInChat, chatPriority } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const data: Record<string, boolean> = {};
  if (showInChat !== undefined) data.showInChat = Boolean(showInChat);
  if (chatPriority !== undefined) data.chatPriority = Boolean(chatPriority);

  await prisma.shopProduct.update({ where: { id: Number(productId) }, data });
  return NextResponse.json({ ok: true });
}

// PATCH — update global widget settings
export async function PATCH(req: NextRequest) {
  const { enabled, interval, mode } = await req.json();
  const updates: Array<{ key: string; value: string }> = [];
  if (enabled !== undefined) updates.push({ key: "widget.enabled", value: String(enabled) });
  if (interval !== undefined) updates.push({ key: "widget.interval", value: String(interval) });
  if (mode !== undefined) updates.push({ key: "widget.mode", value: mode });

  for (const u of updates) {
    await prisma.siteSettings.upsert({
      where: { key: u.key },
      update: { value: u.value },
      create: { key: u.key, value: u.value },
    });
  }
  return NextResponse.json({ ok: true });
}
