import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { gmailUser, gmailPass, notifyEmail } = await req.json();

  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ ok: false, error: "Gmail логін або пароль не заповнені" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"Магазин ЛДБЛ" <${gmailUser}>`,
      to: notifyEmail || gmailUser,
      subject: "✅ Тест — Магазин ЛДБЛ підключено до Email",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f5f5f5;border-radius:12px">
          <h2 style="color:#1e2a4a;margin:0 0 12px">✅ Email налаштовано!</h2>
          <p style="color:#333">Магазин ЛДБЛ успішно підключено до Email-сповіщень.</p>
          <p style="color:#888;font-size:13px">Тепер при кожному новому замовленні на адресу <b>${notifyEmail || gmailUser}</b> буде надходити детальне повідомлення.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message });
  }
}
