import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const ag = req.nextUrl.searchParams.get("ag") || "younger";
  const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } }).catch(() => null);
  if (!season) return NextResponse.json([]);

  const standings = await prisma.standing.findMany({
    where: { seasonId: season.id },
    include: { team: true },
    orderBy: [{ wins: "desc" }, { pointsFor: "desc" }],
  }).catch(() => []);

  return NextResponse.json(standings);
}
