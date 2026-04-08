import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/vip-requests
 *
 * Отримати список всіх VIP заявок (батьків, які мають або очікують VIP)
 * Сортується за датою створення в зворотньому порядку
 */

export async function GET(req: NextRequest) {
  try {
    // Отримати всіх користувачів, що мають role "parent" або "vip"
    const requests = await prisma.guestContact.findMany({
      where: {
        OR: [
          { role: 'parent' },  // Батьки (очікуючі VIP)
          { role: 'vip' },     // VIP користувачі (активні)
        ],
      },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      count: requests.length,
      requests: requests.map((r) => ({
        id: r.id,
        phone: r.phone,
        firstName: r.firstName,
        lastName: r.lastName,
        role: r.role,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/vip-requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
