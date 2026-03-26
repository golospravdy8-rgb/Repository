import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.listing.update({
    where: { id: Number(params.id) },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
