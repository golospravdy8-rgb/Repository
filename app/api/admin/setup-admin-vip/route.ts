import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/setup-admin-vip
 * POST /api/admin/setup-admin-vip
 *
 * Активує VIP для реального адміна в системі
 * Приймає параметр phone (query або body)
 */

export async function GET(req: NextRequest) {
  try {
    // Отримати номер телефону із query параметра або з env
    const phone = req.nextUrl.searchParams.get("phone") ||
                  process.env.ADMIN_PHONE_NUMBER;

    if (!phone) {
      return NextResponse.json(
        {
          error: "ADMIN_PHONE_NUMBER not configured",
          message: "Set ADMIN_PHONE_NUMBER env variable or pass ?phone=+380... parameter",
          example: "GET /api/admin/setup-admin-vip?phone=%2B380999999999",
        },
        { status: 400 }
      );
    }

    // Знайти адміна за номером телефону
    let admin = await prisma.guestContact.findUnique({
      where: { phone },
    });

    if (!admin) {
      // Якщо адміна немає - створити його
      admin = await prisma.guestContact.create({
        data: {
          phone,
          firstName: "Admin",
          lastName: "Basket",
          role: "admin",
          displayName: "Адміністратор",
        },
      });
    } else if (admin.role !== "admin") {
      // Якщо користувач існує, але не адмін - оновити роль
      admin = await prisma.guestContact.update({
        where: { phone },
        data: { role: "admin" },
      });
    }

    // Активувати VIP на 1 рік для адміна
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const updated = await prisma.guestContact.update({
      where: { id: admin.id },
      data: {
        role: "admin",
      },
    });

    return NextResponse.json({
      success: true,
      message: "✅ Admin VIP activated successfully",
      admin: {
        id: updated.id,
        phone: updated.phone,
        role: updated.role,
        name: `${updated.firstName} ${updated.lastName}`,
      },
      instructions: {
        step1: `Add to cookie: user_phone = ${updated.phone}`,
        step2: "Go to: http://localhost:3006/vip",
        step3: "You should see all 4 VIP blocks: Статистика, Прогрес, Фото, Відео",
        step4: "Also see: Завантажити сертифікат button",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = body.phone || process.env.ADMIN_PHONE_NUMBER;

    if (!phone) {
      return NextResponse.json(
        {
          error: "ADMIN_PHONE_NUMBER not configured",
          message: "Set ADMIN_PHONE_NUMBER env variable or provide phone in request body",
        },
        { status: 400 }
      );
    }

    // Знайти адміна за номером телефону
    let admin = await prisma.guestContact.findUnique({
      where: { phone },
    });

    if (!admin) {
      admin = await prisma.guestContact.create({
        data: {
          phone,
          firstName: body.firstName || "Admin",
          lastName: body.lastName || "Basket",
          role: "admin",
          displayName: body.displayName || "Адміністратор",
        },
      });
    } else if (admin.role !== "admin") {
      admin = await prisma.guestContact.update({
        where: { phone },
        data: { role: "admin" },
      });
    }

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const updated = await prisma.guestContact.update({
      where: { id: admin.id },
      data: {
        role: "admin",
      },
    });

    return NextResponse.json({
      success: true,
      message: "✅ Admin VIP activated successfully",
      admin: {
        id: updated.id,
        phone: updated.phone,
        role: updated.role,
        name: `${updated.firstName} ${updated.lastName}`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
