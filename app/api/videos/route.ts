import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const videos = await prisma.video.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json({ videos });
}

export async function POST(req: NextRequest) {
  const uploadId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "Відео";
  const type = (formData.get("type") as string) || "highlights";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  try {
    const token = process.env.LOGOS_READ_WRITE_TOKEN;
    if (!token) {
      console.error(`[videos ${uploadId}] LOGOS_READ_WRITE_TOKEN not found`);
      return NextResponse.json({ error: "Upload token not configured" }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop() ?? "mp4";
    const blobPath = `videos/${uploadId}-${Date.now()}.${ext}`;

    console.log(`[videos ${uploadId}] Uploading to Vercel Blob: ${blobPath}`);

    const blob = await put(blobPath, buffer, {
      access: "public",
      contentType: file.type || "video/mp4",
      token: token,
    });

    const url = blob.url;
    const video = await prisma.video.create({
      data: { title, url, type },
    });

    console.log(`[videos ${uploadId}] ✅ Video saved: ${url} (${Date.now() - startTime}ms)`);
    return NextResponse.json(video);
  } catch (blobErr) {
    const errMsg = blobErr instanceof Error ? blobErr.message : String(blobErr);
    console.error(`[videos ${uploadId}] Error: ${errMsg}`);
    return NextResponse.json({ error: `Upload error: ${errMsg}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  await prisma.video.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
