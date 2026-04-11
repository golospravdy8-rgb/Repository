import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const uploadId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    const token = process.env.LOGOS_READ_WRITE_TOKEN;

    const { base64, filename } = await req.json();
    if (!base64 || !filename) {
      return NextResponse.json({ error: "base64 and filename required" }, { status: 400 });
    }

    const matches = base64.match(/^data:image\/(\w+);base64,/);
    const ext = matches ? matches[1] : (filename.split(".").pop() ?? "jpg");
    const data = base64.includes(",") ? base64.split(",")[1] : base64;
    const buffer = Buffer.from(data, "base64");

    // PROD: Try Vercel Blob if token available
    if (token) {
      try {
        const blobPath = `marketplace-uploads/${uploadId}-${Date.now()}.${ext}`;
        console.log(`[marketplace-upload ${uploadId}] Uploading to Vercel Blob: ${blobPath}`);

        const blob = await put(blobPath, buffer, {
          access: "public",
          contentType: `image/${ext}`,
          token: token,
        });

        console.log(`[marketplace-upload ${uploadId}] ✅ Blob Success: ${blob.url} (${Date.now() - startTime}ms)`);
        return NextResponse.json({ url: blob.url });
      } catch (blobErr) {
        const errMsg = blobErr instanceof Error ? blobErr.message : String(blobErr);
        console.error(`[marketplace-upload ${uploadId}] Vercel Blob error: ${errMsg}, falling back to base64`);
      }
    } else {
      console.log(`[marketplace-upload ${uploadId}] ℹ️ No LOGOS_READ_WRITE_TOKEN, using base64 fallback`);
    }

    // Fallback: Return base64 data URL
    try {
      const mimeType = `image/${ext}`;
      const dataUrl = `data:${mimeType};base64,${data}`;
      console.log(`[marketplace-upload ${uploadId}] ✅ Base64 fallback: ${uploadId} (${Date.now() - startTime}ms)`);
      return NextResponse.json({ url: dataUrl });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[marketplace-upload ${uploadId}] ❌ Fallback error: ${errMsg}`);
      return NextResponse.json({ error: `Upload failed: ${errMsg}` }, { status: 500 });
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(`[marketplace-upload] Unexpected error: ${errMsg}`);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
