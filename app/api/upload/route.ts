import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { setSettings } from "@/lib/site-settings";
import { revalidateTag } from "next/cache";
import { SETTINGS_TAG } from "@/lib/site-settings";

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

  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${type}-${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  const url = `/uploads/${filename}`;

  // Persist URL to SiteSettings so the homepage and other pages pick it up
  const validImageTypes = ["logo", "ogImage", "heroBg", "headerBg", "footerBg", "pageBg"];
  if (validImageTypes.includes(type)) {
    await setSettings({ [`images.${type}`]: url });
    revalidateTag(SETTINGS_TAG);
  }

  return NextResponse.json({ url });
}
