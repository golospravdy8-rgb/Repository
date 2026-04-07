import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/vip-check
 *
 * Перевірити чи VIP закінчилось і деактивувати якщо необхідно
 */

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

    // Перевірити чи VIP закінчилось
    const now = new Date();
    const isExpired = user.vipExpiresAt && new Date(user.vipExpiresAt) < now;

    // Якщо VIP закінчилось — деактивувати
    if (isExpired && user.vipStatus) {
      await prisma.guestContact.update({
        where: { id: user.id },
        data: {
          vipStatus: false,
          role: 'parent',
        },
      });

      return NextResponse.json({
        isVip: false,
        isExpired: true,
        expiredAt: user.vipExpiresAt,
        message: '⚠️ Ваш VIP доступ закінчився',
      });
    }

    // Перевірити чи буде закінчуватись за 3 дні
    const daysUntilExpiry = user.vipExpiresAt
      ? Math.floor((new Date(user.vipExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const willExpireSoon = daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry > 0;

    return NextResponse.json({
      isVip: user.vipStatus && user.role === 'vip',
      isExpired: false,
      willExpireSoon,
      daysUntilExpiry,
      expiresAt: user.vipExpiresAt,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        vipStatus: user.vipStatus,
        telegramId: user.telegramId,
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
