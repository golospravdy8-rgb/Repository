import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAuth } from "@/lib/require-auth";
import { setSettings } from "@/lib/site-settings";
import { revalidatePath, revalidateTag } from "next/cache";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import { join } from "path";

const VALID_TYPES = ["logo", "ogImage", "heroBg", "headerBg", "footerBg", "pageBg", "shop"];
const ENTITY_TYPES = ["team-logo", "player-photo", "news"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const uploadId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    try { await requireAuth(); } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const type = form.get("type") as string | null;

    console.log(`[upload ${uploadId}] type: ${type}, file: ${file?.name}, size: ${file?.size}, mime: ${file?.type}`);

    if (!file) return NextResponse.json({ error: "Немає файлу" }, { status: 400 });
    if (!type) return NextResponse.json({ error: "Немає типу" }, { status: 400 });

    const cleanType = type.replace(/^banner-/, "");
    if (!VALID_TYPES.includes(cleanType) && !type.startsWith("banner-") && !ENTITY_TYPES.includes(type)) {
      return NextResponse.json({ error: "Невірний тип: " + type }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Файл ${Math.round(file.size / 1024)}KB перевищує ліміт ${MAX_SIZE_BYTES / 1024}KB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // === SITE IMAGES — VERCEL BLOB or LOCAL FALLBACK ===
    if (VALID_TYPES.includes(cleanType)) {
      const token = process.env.LOGOS_READ_WRITE_TOKEN;

      // PROD: Vercel Blob
      if (token) {
        try {
          const ext = file.name.split(".").pop() || "jpg";
          const blobPath = `site-images/${cleanType}-${Date.now()}.${ext}`;

          console.log(`[upload ${uploadId}] Uploading to Vercel Blob: ${blobPath}`);

          const blob = await put(blobPath, buffer, {
            access: "public",
            contentType: file.type || "image/jpeg",
            token: token,
          });

          const url = blob.url;
          await setSettings({ [`images.${cleanType}`]: url });

          console.log(`[upload ${uploadId}] ✅ Site image saved: ${url} (${Date.now() - startTime}ms)`);
          revalidatePath("/", "layout");
          revalidateTag("site-settings");
          return NextResponse.json({ url, ok: true });
        } catch (blobErr) {
          const errMsg = blobErr instanceof Error ? blobErr.message : String(blobErr);
          console.error(`[upload ${uploadId}] ❌ Vercel Blob error: ${errMsg}`);
          return NextResponse.json(
            { error: `Blob storage error: ${errMsg}` },
            { status: 500 }
          );
        }
      }

      // DEV: Local file system fallback
      console.log(`[upload ${uploadId}] ℹ️ Token not configured, trying local storage`);
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${cleanType}-${Date.now()}.${ext}`;
        const dir = join(process.cwd(), "public", "uploads", "site-images");
        await mkdir(dir, { recursive: true });
        const filepath = join(dir, filename);
        await writeFile(filepath, buffer);

        const url = `/uploads/site-images/${filename}`;
        await setSettings({ [`images.${cleanType}`]: url });

        console.log(`[upload ${uploadId}] ✅ Site image saved locally: ${url} (${Date.now() - startTime}ms)`);
        revalidatePath("/", "layout");
        revalidateTag("site-settings");
        return NextResponse.json({ url, ok: true });
      } catch (fsErr) {
        // PROD: File system is read-only on Vercel, use base64 fallback
        console.log(`[upload ${uploadId}] ℹ️ Local storage failed (read-only FS), using base64 storage`);
        try {
          const mimeType = file.type || "image/png";
          const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
          await setSettings({ [`images.${cleanType}`]: dataUrl });

          console.log(`[upload ${uploadId}] ✅ Site image saved as base64: ${cleanType} (${Date.now() - startTime}ms)`);
          revalidatePath("/", "layout");
          revalidateTag("site-settings");
          return NextResponse.json({ url: dataUrl, ok: true });
        } catch (base64Err) {
          const errMsg = base64Err instanceof Error ? base64Err.message : String(base64Err);
          console.error(`[upload ${uploadId}] ❌ Base64 storage error: ${errMsg}`);
          return NextResponse.json(
            { error: `Storage error: ${errMsg}` },
            { status: 500 }
          );
        }
      }
    }

    // === ENTITY TYPES (team logos, player photos) — VERCEL BLOB or LOCAL FALLBACK ===
    if (ENTITY_TYPES.includes(type)) {
      const token = process.env.LOGOS_READ_WRITE_TOKEN;

      // PROD: Vercel Blob
      if (token) {
        try {
          const ext = file.name.split(".").pop() || "jpg";
          const blobPath = `entity-files/${type}-${Date.now()}.${ext}`;

          console.log(`[upload ${uploadId}] Uploading entity to Vercel Blob: ${blobPath}`);

          const blob = await put(blobPath, buffer, {
            access: "public",
            contentType: file.type || "image/jpeg",
            token: token,
          });

          const url = blob.url;
          console.log(`[upload ${uploadId}] ✅ Entity file saved: ${url} (${Date.now() - startTime}ms)`);
          return NextResponse.json({ url, ok: true });
        } catch (blobErr) {
          const errMsg = blobErr instanceof Error ? blobErr.message : String(blobErr);
          console.error(`[upload ${uploadId}] ❌ Vercel Blob error: ${errMsg}`);
          return NextResponse.json(
            { error: `Blob storage error: ${errMsg}` },
            { status: 500 }
          );
        }
      }

      // DEV: Local file system fallback
      console.log(`[upload ${uploadId}] ℹ️ Token not configured, trying local storage`);
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${type}-${Date.now()}.${ext}`;
        const dir = join(process.cwd(), "public", "uploads", "entity-files");
        await mkdir(dir, { recursive: true });
        const filepath = join(dir, filename);
        await writeFile(filepath, buffer);

        const url = `/uploads/entity-files/${filename}`;
        console.log(`[upload ${uploadId}] ✅ Entity file saved locally: ${url} (${Date.now() - startTime}ms)`);
        return NextResponse.json({ url, ok: true });
      } catch (fsErr) {
        // PROD: File system is read-only on Vercel, use base64 fallback
        console.log(`[upload ${uploadId}] ℹ️ Local storage failed (read-only FS), using base64 storage`);
        try {
          const mimeType = file.type || "image/png";
          const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
          console.log(`[upload ${uploadId}] ✅ Entity file saved as base64: ${type} (${Date.now() - startTime}ms)`);
          return NextResponse.json({ url: dataUrl, ok: true });
        } catch (base64Err) {
          const errMsg = base64Err instanceof Error ? base64Err.message : String(base64Err);
          console.error(`[upload ${uploadId}] ❌ Base64 storage error: ${errMsg}`);
          return NextResponse.json(
            { error: `Storage error: ${errMsg}` },
            { status: 500 }
          );
        }
      }
    }

    // === BANNERS — base64 (для інтеграції з SiteSettings) ===
    const mimeType = file.type || "image/png";
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    if (type.startsWith("banner-")) {
      const slot = type.replace("banner-", "");
      await setSettings({ [`banner.${slot}.img`]: dataUrl });
      console.log(`[upload ${uploadId}] ✅ Banner saved (base64): banner.${slot}.img (${Date.now() - startTime}ms)`);
      revalidatePath("/", "layout");
      revalidateTag("site-settings");
      return NextResponse.json({ url: dataUrl, ok: true });
    }

    return NextResponse.json({ error: "Невідомий тип файлу" }, { status: 400 });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[upload ${uploadId}] ❌ Unexpected error: ${errMsg}`);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
