import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAuth } from "@/lib/require-auth";
import { setSettings } from "@/lib/site-settings";
import { revalidatePath } from "next/cache";

const VALID_TYPES = ["logo", "ogImage", "heroBg", "headerBg", "footerBg", "pageBg"];
const ENTITY_TYPES = ["team-logo", "player-photo", "news"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Universal upload endpoint using Vercel Blob for persistent storage.
 *
 * Works on both localhost (via NODE_ENV check) and production.
 * All files are stored in Vercel Blob and accessible via public URLs.
 *
 * POST /api/upload
 * - file: File (multipart form data)
 * - type: "logo" | "ogImage" | "heroBg" | "team-logo" | "player-photo" | "news" | "banner-*"
 *
 * Returns: { url, ok: true } or { error, status: 400+ }
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate admin
    try {
      await requireAuth();
    } catch {
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
        { error: `Файл ${Math.round(file.size / 1024)}KB перевищує ліміт ${Math.round(MAX_SIZE_BYTES / 1024)}KB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";

    // === SITE IMAGES (heroBg, logo, etc.) ===
    if (VALID_TYPES.includes(cleanType)) {
      const blobPath = `site-images/${cleanType}-${Date.now()}.${ext}`;

      // Upload to Vercel Blob
      const blob = await put(blobPath, buffer, {
        access: "public",
        contentType: file.type || "image/jpeg",
      });

      const url = blob.url;
      await setSettings({ [`images.${cleanType}`]: url });

      console.log("[upload] saved site image to Blob:", url);
      revalidatePath("/", "layout");
      return NextResponse.json({ url, ok: true });
    }

    // === ENTITY TYPES (team logos, player photos, news images) ===
    if (ENTITY_TYPES.includes(type)) {
      const blobPath = `entities/${type}/${Date.now()}.${ext}`;

      // Upload to Vercel Blob
      const blob = await put(blobPath, buffer, {
        access: "public",
        contentType: file.type || "image/jpeg",
      });

      const url = blob.url;
      console.log("[upload] saved entity to Blob:", url);
      return NextResponse.json({ url, ok: true });
    }

    // === BANNERS (still support base64 for backwards compatibility) ===
    if (type.startsWith("banner-")) {
      // Try Blob first, fallback to base64 if BLOB_READ_WRITE_TOKEN not set
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blobPath = `banners/${type}-${Date.now()}.${ext}`;
        const blob = await put(blobPath, buffer, {
          access: "public",
          contentType: file.type || "image/jpeg",
        });
        const url = blob.url;
        const slot = type.replace("banner-", "");
        await setSettings({ [`banner.${slot}.img`]: url });
        console.log("[upload] saved banner to Blob:", url);
        revalidatePath("/", "layout");
        return NextResponse.json({ url, ok: true });
      } else {
        // Fallback: base64 (for local development without BLOB token)
        const mimeType = file.type || "image/png";
        const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
        const slot = type.replace("banner-", "");
        await setSettings({ [`banner.${slot}.img`]: dataUrl });
        console.log("[upload] saved banner as base64 (Blob token not configured)");
        revalidatePath("/", "layout");
        return NextResponse.json({ url: dataUrl, ok: true });
      }
    }

    return NextResponse.json({ error: "Невідомий тип файлу" }, { status: 400 });
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json(
      { error: String(err).slice(0, 100) },
      { status: 500 }
    );
  }
}
