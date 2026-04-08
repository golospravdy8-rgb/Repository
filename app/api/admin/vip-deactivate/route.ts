import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/vip-deactivate
 *
 * Деактивує VIP для користувача
 */

interface VIPDeactivateRequest {
  userId: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: VIPDeactivateRequest = await req.json();
    const { userId } = body;

    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json(
        { error: 'Invalid userId' },
        { status: 400 }
      );
    }

    // Знайти користувача
    const user = await prisma.guestContact.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Деактивувати VIP
    const updated = await prisma.guestContact.update({
      where: { id: Number(userId) },
      data: {
        role: 'parent', // Повернути роль на parent
      },
    });

    // Надіслати Telegram сповіщення батькові
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && updated.phone) {
      const phoneId = updated.phone.replace('+', '');
      const message = `ℹ️ СПОВІЩЕННЯ ВІД АДМІНІСТРАЦІЇ

Ваш VIP доступ був деактивований.

Для повторної активації VIP:
1. Заповніть форму оплати на сайті
2. Виберіть бажаний тариф
3. Адміністратор розглянув заявку

Дякуємо за розуміння! 🙏

👉 Перейти на сайт: https://basket-lviv.com`;

      await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: phoneId,
            text: message,
            parse_mode: 'HTML',
          }),
        }
      ).catch(() => {
        console.log('User Telegram notification skipped (optional)');
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        phone: updated.phone,
        name: `${updated.firstName} ${updated.lastName}`,
        role: updated.role,
      },
      message: `✅ VIP деактивовано для ${updated.firstName} ${updated.lastName}`,
    });
  } catch (error) {
    console.error('POST /api/admin/vip-deactivate error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
