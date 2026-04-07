import { writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const uploadDir = path.join(process.cwd(), "public", "uploads", "chat");

    // MOBILE ONLY — Handle multipart/form-data (FormData from mobile chat)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file in form" }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.split(".").pop() ?? "jpg";
      const name = `chat-${Date.now()}.${ext}`;
      await writeFile(path.join(uploadDir, name), buffer);
      return NextResponse.json({ url: `/uploads/chat/${name}` });
    }

    // Desktop path — base64 JSON
    const { base64, filename } = await req.json();
    if (!base64 || !filename) return NextResponse.json({ error: "base64 and filename required" }, { status: 400 });

    const matches = base64.match(/^data:image\/(\w+);base64,/);
    const ext = matches ? matches[1] : (filename.split(".").pop() ?? "jpg");
    const name = `chat-${Date.now()}.${ext}`;
    const data = base64.includes(",") ? base64.split(",")[1] : base64;
    const buffer = Buffer.from(data, "base64");

    await writeFile(path.join(uploadDir, name), buffer);

    return NextResponse.json({ url: `/uploads/chat/${name}` });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
