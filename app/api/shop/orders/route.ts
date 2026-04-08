import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const TG_BOT = "7685937167:AAFfSNWb98RIshlHtOn9sId6M5DvH0FoV54";
const TG_CHAT = "-1003522476963";
const EMAIL_FROM = "bclvivbasketball@gmail.com";
const EMAIL_PASS = "umpqqbaevypjwgef";

async function sendTelegram(text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: "HTML" }),
    });
  } catch {}
}

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL_FROM, pass: EMAIL_PASS },
    });
    await transporter.sendMail({ from: EMAIL_FROM, to, subject, html });
  } catch (e) {
    console.error("Email error:", e);
  }
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await prisma.shopOrder.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, lastName, phone, email, city, deliveryType, postOffice, paymentType, items, totalAmount, comment } = body;

  if (!firstName || !lastName || !phone || !city || !items || !totalAmount) {
    return NextResponse.json({ error: "Заповніть всі обов'язкові поля" }, { status: 400 });
  }

  // Generate order number
  const orderNumber = "LD" + Math.floor(10000000 + Math.random() * 90000000).toString();

  // Parse items for display
  let itemsText = "";
  try {
    const parsed = JSON.parse(items);
    itemsText = parsed.map((i: { name: string; qty: number; price: number }) => `${i.name} x${i.qty} — ${i.price} грн`).join(", ");
  } catch {
    itemsText = items;
  }

  const order = await prisma.shopOrder.create({
    data: {
      orderNumber,
      firstName,
      lastName,
      phone,
      email: email ?? "",
      city,
      deliveryType: deliveryType ?? "nova_poshta",
      postOffice: postOffice ?? "",
      paymentType: paymentType ?? "cod",
      items,
      totalAmount: Number(totalAmount),
      comment: comment ?? "",
    },
  });

  // Telegram notification
  const tgText = `🛒 Нове замовлення #${orderNumber}
👤 ${firstName} ${lastName}
📞 ${phone}
📦 ${itemsText}
💰 ${totalAmount} грн
🏙 ${city}${postOffice ? `, НП#${postOffice}` : ""}
💳 ${paymentType === "cod" ? "Накладений платіж" : "Карткою онлайн"}`;
  await sendTelegram(tgText);

  // Email to store
  const emailHtml = `<h2>Нове замовлення #${orderNumber}</h2>
<p><b>Клієнт:</b> ${firstName} ${lastName}</p>
<p><b>Телефон:</b> ${phone}</p>
<p><b>Email:</b> ${email ?? "—"}</p>
<p><b>Місто:</b> ${city}${postOffice ? `, НП#${postOffice}` : ""}</p>
<p><b>Товари:</b> ${itemsText}</p>
<p><b>Сума:</b> ${totalAmount} грн</p>
<p><b>Оплата:</b> ${paymentType === "cod" ? "Накладений платіж" : "Карткою онлайн"}</p>`;

  await sendEmail(EMAIL_FROM, `Нове замовлення #${orderNumber}`, emailHtml);

  // Email to buyer
  if (email && email.includes("@")) {
    const buyerHtml = `<h2>✅ Ваше замовлення #${orderNumber} прийнято!</h2>
<p>Дякуємо за замовлення в магазині ЛДБЛ!</p>
<p><b>Товари:</b> ${itemsText}</p>
<p><b>Сума до сплати:</b> ${totalAmount} грн</p>
<p>Ми зв'яжемось з вами найближчим часом.</p>`;
    await sendEmail(email, `Замовлення #${orderNumber} прийнято — ЛДБЛ Магазин`, buyerHtml);
  }

  return NextResponse.json({ ok: true, orderNumber, order });
}
