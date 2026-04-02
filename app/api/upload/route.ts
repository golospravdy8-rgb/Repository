import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { setSettings } from "@/lib/site-settings";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";


const VALID_TYPES = ["logo", "ogImage", "heroBg", "headerBg", "footerBg", "pageBg"];
const ENTITY_TYPES = ["team-logo", "player-photo", "news"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    try { await requireAuth(); } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const type = form.get("type") as string | null;

    console.log("[upload] type:", type, "file:", file?.name, "size:", file?.size, "mime:", file?.type);

    if (!file) return NextResponse.json({ error: "Немає файлу" }, { status: 400 });
    if (!type) return NextResponse.json({ error: "Немає типу" }, { status: 400 });

    const cleanType = type.replace(/^banner-/, "");
    if (!VALID_TYPES.includes(cleanType) && !type.startsWith("banner-") && !ENTITY_TYPES.includes(type)) {
      return NextResponse.json({ error: "Невірний тип: " + type }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Файл ${Math.round(file.size / 1024)}KB перевищує ліміт ${MAX_SIZE_BYTES / 1024}KB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (ENTITY_TYPES.includes(type)) {
      // Зберігаємо файл на диск у public/uploads/ і повертаємо публічний URL
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${type}-${Date.now()}.${ext}`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, fileName), buffer);
      const url = `/uploads/${fileName}`;
      console.log("[upload] saved file:", url);
      return NextResponse.json({ url, ok: true });
    }

    const mimeType = file.type || "image/png";
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    if (VALID_TYPES.includes(cleanType)) {
      await setSettings({ [`images.${cleanType}`]: dataUrl });
    } else if (type.startsWith("banner-")) {
      const slot = type.replace("banner-", "");
      await setSettings({ [`banner.${slot}.img`]: dataUrl });
    }

    console.log("[upload] saved key:", `images.${cleanType}`, "dataUrl length:", dataUrl.length);
    revalidatePath("/", "layout");
    return NextResponse.json({ url: dataUrl, ok: true });
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
