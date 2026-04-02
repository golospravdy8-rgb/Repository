import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ageGroup = searchParams.get("ageGroup");

  const players = await prisma.player.findMany({
    where: ageGroup ? { team: { ageGroup } } : undefined,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      photoUrl: true,
      team: { select: { id: true, name: true, shortName: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return NextResponse.json({ players });
}
