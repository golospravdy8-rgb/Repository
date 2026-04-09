import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const uploadId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    const token = process.env.LOGOS_READ_WRITE_TOKEN;

    if (!token) {
      console.error(`[chat-upload ${uploadId}] LOGOS_READ_WRITE_TOKEN not found`);
      return NextResponse.json(
        { error: "Upload token not configured" },
        { status: 500 }
      );
    }

    const contentType = req.headers.get("content-type") ?? "";

    // MOBILE ONLY — Handle multipart/form-data (FormData from mobile chat)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file in form" }, { status: 400 });
      }

      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = file.name.split(".").pop() ?? "jpg";
        const blobPath = `chat-uploads/${uploadId}-${Date.now()}.${ext}`;

        console.log(`[chat-upload ${uploadId}] Uploading to Vercel Blob: ${blobPath}`);

        const blob = await put(blobPath, buffer, {
          access: "public",
          contentType: file.type || "image/jpeg",
          token: token,
        });

        console.log(`[chat-upload ${uploadId}] ✅ Success: ${blob.url} (${Date.now() - startTime}ms)`);
        return NextResponse.json({ url: blob.url });
      } catch (blobErr) {
        const errMsg = blobErr instanceof Error ? blobErr.message : String(blobErr);
        console.error(`[chat-upload ${uploadId}] Vercel Blob error: ${errMsg}`);
        return NextResponse.json({ error: `Blob error: ${errMsg}` }, { status: 500 });
      }
    }

    // Desktop path — base64 JSON
    const { base64, filename } = await req.json();
    if (!base64 || !filename) {
      return NextResponse.json({ error: "base64 and filename required" }, { status: 400 });
    }

    try {
      const matches = base64.match(/^data:image\/(\w+);base64,/);
      const ext = matches ? matches[1] : (filename.split(".").pop() ?? "jpg");
      const data = base64.includes(",") ? base64.split(",")[1] : base64;
      const buffer = Buffer.from(data, "base64");
      const blobPath = `chat-uploads/${uploadId}-${Date.now()}.${ext}`;

      console.log(`[chat-upload ${uploadId}] Uploading base64 to Vercel Blob: ${blobPath}`);

      const blob = await put(blobPath, buffer, {
        access: "public",
        contentType: `image/${ext}`,
        token: token,
      });

      console.log(`[chat-upload ${uploadId}] ✅ Success: ${blob.url} (${Date.now() - startTime}ms)`);
      return NextResponse.json({ url: blob.url });
    } catch (blobErr) {
      const errMsg = blobErr instanceof Error ? blobErr.message : String(blobErr);
      console.error(`[chat-upload ${uploadId}] Vercel Blob error: ${errMsg}`);
      return NextResponse.json({ error: `Blob error: ${errMsg}` }, { status: 500 });
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(`[chat-upload] Unexpected error: ${errMsg}`);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
