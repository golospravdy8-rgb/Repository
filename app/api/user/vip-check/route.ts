import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/vip-check
 *
 * Перевірити чи VIP закінчилось і деактивувати якщо необхідно
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const phone = req.cookies.get('user_phone')?.value ||
                  req.nextUrl.searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone not found' },
        { status: 400 }
      );
    }

    // Знайти користувача
    const user = await prisma.guestContact.findUnique({
      where: { phone },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const isVip = user.role === 'vip';

    return NextResponse.json({
      isVip,
      isExpired: false,
      willExpireSoon: false,
      daysUntilExpiry: null,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('GET /api/user/vip-check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
