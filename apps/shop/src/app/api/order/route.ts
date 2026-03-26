import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

function orderNumber() {
  return "LD" + Date.now().toString().slice(-8);
}

async function sendTelegram(token: string, chatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {}
}

async function sendEmail(opts: {
  gmailUser: string;
  gmailPass: string;
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: opts.gmailUser, pass: opts.gmailPass },
    });
    await transporter.sendMail({
      from: `"Магазин ЛДБЛ" <${opts.gmailUser}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (err) {
    console.error("[shop] email send error:", err);
  }
}

async function getSetting(key: string): Promise<string> {
  const row = await prisma.siteSettings.findUnique({ where: { key } });
  return row?.value ?? "";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    firstName, lastName, phone, email,
    city, deliveryType, postOffice, paymentType,
    items, totalAmount, comment,
  } = body;

  if (!firstName || !lastName || !phone || !city || !postOffice || !items?.length) {
    return NextResponse.json({ error: "Заповніть всі обов'язкові поля" }, { status: 400 });
  }

  const num = orderNumber();

  await prisma.shopOrder.create({
    data: {
      orderNumber: num,
      firstName,
      lastName,
      phone,
      email: email ?? "",
      city,
      deliveryType: deliveryType ?? "nova_poshta",
      postOffice,
      paymentType: paymentType ?? "card",
      items: JSON.stringify(items),
      totalAmount: Number(totalAmount),
      comment: comment ?? "",
    },
  });

  // --- Read settings from DB ---
  const [tgToken, tgChat, notifyEmail, gmailUser, gmailPass] = await Promise.all([
    getSetting("shop.tgBotToken"),
    getSetting("shop.tgChatId"),
    getSetting("shop.notifyEmail"),
    getSetting("shop.gmailUser"),
    getSetting("shop.gmailPass"),
  ]);

  const deliveryLabel = deliveryType === "nova_poshta" ? "Нова Пошта" : "Укрпошта";
  const paymentLabel = paymentType === "card" ? "Оплата карткою (передоплата)" : "Накладений платіж";

  const itemLines = (items as { name: string; qty: number; price: number }[])
    .map((i) => `  • ${i.name} × ${i.qty} — ${i.price * i.qty} грн`)
    .join("\n");

  // --- Telegram ---
  if (tgToken && tgChat) {
    const msg =
      `🛒 <b>Нове замовлення #${num}</b>\n\n` +
      `👤 <b>${firstName} ${lastName}</b>\n` +
      `📞 ${phone}${email ? `\n📧 ${email}` : ""}\n\n` +
      `📦 <b>Доставка:</b> ${deliveryLabel}\n` +
      `🏙 Місто: ${city}\n` +
      `🏣 Відділення: ${postOffice}\n\n` +
      `🧾 <b>Товари:</b>\n${itemLines}\n\n` +
      `💰 <b>Сума: ${totalAmount} грн</b>\n` +
      `💳 ${paymentLabel}` +
      (comment ? `\n\n💬 Коментар: ${comment}` : "");

    await sendTelegram(tgToken, tgChat, msg);
  }

  // --- Email ---
  const emailTo = notifyEmail || "bclvivbasketball@gmail.com";
  if (gmailUser && gmailPass) {
    const itemRowsHtml = (items as { name: string; qty: number; price: number }[])
      .map(
        (i) =>
          `<tr>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${i.name}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${i.qty}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700">${i.price * i.qty} грн</td>
          </tr>`
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html lang="uk">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1)">
  <div style="background:#1e2a4a;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:22px">🛒 Нове замовлення #${num}</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:14px">Магазин ЛДБЛ</p>
  </div>
  <div style="padding:24px 32px">
    <h2 style="margin:0 0 12px;font-size:16px;color:#1e2a4a">👤 Покупець</h2>
    <table style="width:100%;font-size:14px;color:#333;margin-bottom:20px">
      <tr><td style="padding:4px 0;width:140px;color:#888">Ім'я:</td><td><b>${firstName} ${lastName}</b></td></tr>
      <tr><td style="padding:4px 0;color:#888">Телефон:</td><td>${phone}</td></tr>
      ${email ? `<tr><td style="padding:4px 0;color:#888">Email:</td><td>${email}</td></tr>` : ""}
    </table>

    <h2 style="margin:0 0 12px;font-size:16px;color:#1e2a4a">📦 Доставка</h2>
    <table style="width:100%;font-size:14px;color:#333;margin-bottom:20px">
      <tr><td style="padding:4px 0;width:140px;color:#888">Служба:</td><td>${deliveryLabel}</td></tr>
      <tr><td style="padding:4px 0;color:#888">Місто:</td><td>${city}</td></tr>
      <tr><td style="padding:4px 0;color:#888">Відділення:</td><td>${postOffice}</td></tr>
    </table>

    <h2 style="margin:0 0 12px;font-size:16px;color:#1e2a4a">🧾 Товари</h2>
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:8px">
      <thead>
        <tr style="background:#f8f8f8">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600">Товар</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;color:#888;font-weight:600">Кількість</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;color:#888;font-weight:600">Сума</th>
        </tr>
      </thead>
      <tbody>${itemRowsHtml}</tbody>
    </table>
    <div style="text-align:right;font-size:18px;font-weight:800;color:#f46f10;padding:8px 12px">
      Разом: ${totalAmount} грн
    </div>

    <div style="background:#f8f9ff;border-radius:8px;padding:12px 16px;margin-top:16px;font-size:14px">
      <b>💳 Оплата:</b> ${paymentLabel}
      ${comment ? `<br><br><b>💬 Коментар:</b> ${comment}` : ""}
    </div>
  </div>
  <div style="background:#f5f5f5;padding:16px 32px;text-align:center;font-size:12px;color:#aaa">
    Магазин ЛДБЛ · Лига дитячого баскетболу Львова
  </div>
</div>
</body>
</html>`;

    await sendEmail({
      gmailUser,
      gmailPass,
      to: emailTo,
      subject: `🛒 Нове замовлення #${num} — ${firstName} ${lastName}`,
      html,
    });
  }

  return NextResponse.json({ ok: true, orderNumber: num });
}

export async function GET() {
  return NextResponse.json({ status: "shop order API ready" });
}
