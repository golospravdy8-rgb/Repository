import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { base64, filename } = await req.json();
    if (!base64 || !filename) {
      return NextResponse.json({ error: "base64 and filename required" }, { status: 400 });
    }

    const matches = base64.match(/^data:image\/(\w+);base64,/);
    const ext = matches ? matches[1] : (filename.split(".").pop() ?? "jpg");
    const name = `listing-${Date.now()}.${ext}`;
    const data = base64.includes(",") ? base64.split(",")[1] : base64;
    const buffer = Buffer.from(data, "base64");

    const uploadDir = path.join(process.cwd(), "public", "uploads", "marketplace");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, name), buffer);

    return NextResponse.json({ url: `/uploads/marketplace/${name}` });
  } catch (e) {
    console.error("Marketplace upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
