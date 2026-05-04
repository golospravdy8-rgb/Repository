import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = parseInt(params.id);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if team already in another group of same ageGroup
    const existingGroupTeam = await prisma.groupTeam.findFirst({
      where: {
        teamId,
        group: {
          ageGroup: group.ageGroup,
        },
      },
    });

    if (existingGroupTeam && existingGroupTeam.groupId !== groupId) {
      return NextResponse.json(
        { error: "Team already in another group for this age group" },
        { status: 409 }
      );
    }

    const groupTeam = await prisma.groupTeam.create({
      data: {
        groupId,
        teamId,
      },
    });

    return NextResponse.json(groupTeam, { status: 201 });
  } catch (error) {
    console.error("[groups-teams-post]", error);
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

    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    await prisma.groupTeam.deleteMany({
      where: {
        groupId,
        teamId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[groups-teams-delete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
