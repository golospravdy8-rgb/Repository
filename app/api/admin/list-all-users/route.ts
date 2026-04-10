import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
  try {
    const users = await prisma.guestContact.findMany({
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      totalUsers: users.length,
      byRole: {
        admin: users.filter(u => u.role === 'admin'),
        vip: users.filter(u => u.role === 'vip'),
        parent: users.filter(u => u.role === 'parent'),
        guest: users.filter(u => u.role === 'guest'),
        player: users.filter(u => u.role === 'player'),
      },
      allUsers: users,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
