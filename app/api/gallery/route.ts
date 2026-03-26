import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";

const GALLERY_PATH = path.join(process.cwd(), "lib", "gallery.data.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

async function readGallery() {
  const raw = await readFile(GALLERY_PATH, "utf-8");
  return JSON.parse(raw) as { albums: Array<{ gameId: number; photos: string[]; coverPhoto: string | null; createdAt: string }> };
}

async function writeGallery(data: object) {
  await writeFile(GALLERY_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// GET /api/gallery — return current gallery data
export async function GET() {
  const gallery = await readGallery();
  return NextResponse.json(gallery);
}

// POST /api/gallery — upload a photo to an album
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const gameId = parseInt((formData.get("gameId") as string) ?? "0");

  if (!file || !gameId) {
    return NextResponse.json({ error: "Missing file or gameId" }, { status: 400 });
  }

  const gallery = await readGallery();
  const album = gallery.albums.find((a) => a.gameId === gameId);
  if (!album) return NextResponse.json({ error: "Album not found" }, { status: 404 });

  if (album.photos.length >= 10) {
    return NextResponse.json({ error: "Max 10 photos per album" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `gallery-${gameId}-${Date.now()}.${ext}`;

  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);

  const url = `/uploads/${filename}`;
  album.photos.push(url);
  if (!album.coverPhoto) album.coverPhoto = url;

  await writeGallery(gallery);
  return NextResponse.json({ url, total: album.photos.length });
}

// DELETE /api/gallery — remove a photo from an album
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { gameId, url } = await req.json() as { gameId: number; url: string };
  if (!gameId || !url) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const gallery = await readGallery();
  const album = gallery.albums.find((a) => a.gameId === gameId);
  if (!album) return NextResponse.json({ error: "Album not found" }, { status: 404 });

  album.photos = album.photos.filter((p) => p !== url);
  if (album.coverPhoto === url) {
    album.coverPhoto = album.photos[0] ?? null;
  }

  await writeGallery(gallery);
  return NextResponse.json({ ok: true, total: album.photos.length });
}

// PATCH /api/gallery — set cover photo
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { gameId, url } = await req.json() as { gameId: number; url: string };

  const gallery = await readGallery();
  const album = gallery.albums.find((a) => a.gameId === gameId);
  if (!album) return NextResponse.json({ error: "Album not found" }, { status: 404 });

  album.coverPhoto = url;
  await writeGallery(gallery);
  return NextResponse.json({ ok: true });
}
