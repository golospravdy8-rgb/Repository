import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setSettings } from "@/lib/site-settings";
import { revalidatePath } from "next/cache";

const VALID_IMAGE_TYPES = ["logo", "ogImage", "heroBg", "headerBg", "footerBg", "pageBg"];
const MAX_SIZE_BYTES = 512 * 1024; // 512KB limit for DB storage

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) ?? "misc";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (buffer.length > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Файл занадто великий. Максимум ${MAX_SIZE_BYTES / 1024}KB.` },
      { status: 400 }
    );
  }

  const mimeType = file.type || "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  if (VALID_IMAGE_TYPES.includes(type)) {
    await setSettings({ [`images.${type}`]: dataUrl });
    revalidatePath("/", "layout");
  }

  return NextResponse.json({ url: dataUrl });
}
