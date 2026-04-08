import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = 'force-dynamic';


export async function GET() {
  const videos = await prisma.video.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json({ videos });
}

export async function POST(req: NextRequest) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "Відео";
  const type = (formData.get("type") as string) || "highlights";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split(".").pop() ?? "mp4";
  const filename = `video-${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  const video = await prisma.video.create({
    data: { title, url: `/uploads/${filename}`, type },
  });
  return NextResponse.json(video);
}

export async function DELETE(req: NextRequest) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  await prisma.video.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
