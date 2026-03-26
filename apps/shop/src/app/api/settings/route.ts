import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { in: ["donate.cardNumber", "donate.cardName"] } },
  });
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return NextResponse.json({
    cardNumber: map["donate.cardNumber"] ?? "4149 5100 9317 2395",
    cardName: map["donate.cardName"] ?? "Христина Полякова",
  });
}
