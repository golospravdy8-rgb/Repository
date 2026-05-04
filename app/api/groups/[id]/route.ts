import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = parseInt(params.id);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const group = await prisma.group.update({
      where: { id: groupId },
      data: { name },
      include: {
        groupTeams: {
          include: {
            team: true,
          },
        },
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("[groups-patch]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = parseInt(params.id);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[groups-delete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
