import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setSettings } from "@/lib/site-settings";
import { revalidatePath } from "next/cache";

const VALID_TYPES = ["logo", "ogImage", "heroBg", "headerBg", "footerBg", "pageBg"];
const MAX_SIZE_BYTES = 1024 * 1024; // 1MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const type = form.get("type") as string | null;

    if (!file) return NextResponse.json({ error: "Немає файлу" }, { status: 400 });
    if (!type) return NextResponse.json({ error: "Немає типу" }, { status: 400 });

    const cleanType = type.replace(/^banner-/, "");
    if (!VALID_TYPES.includes(cleanType) && !type.startsWith("banner-")) {
      return NextResponse.json({ error: "Невірний тип: " + type }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Файл ${Math.round(file.size / 1024)}KB перевищує ліміт ${MAX_SIZE_BYTES / 1024}KB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/png";
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    if (VALID_TYPES.includes(cleanType)) {
      await setSettings({ [`images.${cleanType}`]: dataUrl });
    } else if (type.startsWith("banner-")) {
      const slot = type.replace("banner-", "");
      await setSettings({ [`banner.${slot}.img`]: dataUrl });
    }

    revalidatePath("/", "layout");
    return NextResponse.json({ url: dataUrl, ok: true });
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
