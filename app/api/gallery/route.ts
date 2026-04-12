import { NextResponse } from "next/server";
import { Pool } from "pg";
import { put, del } from "@vercel/blob";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// GET — Повернути всі альбоми з фото (для site-editor)
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        g.id,
        g."gameId",
        json_agg(json_build_object(
          'id', v.id,
          'url', v.url,
          'createdAt', v."createdAt"
        ) ORDER BY v."createdAt" DESC) FILTER (WHERE v.id IS NOT NULL) as photos
      FROM (
        SELECT DISTINCT ON("gameId") id, "gameId" FROM "Game" WHERE "gameId" IS NOT NULL
      ) g
      LEFT JOIN "Video" v ON v."createdAt" IS NOT NULL
      GROUP BY g.id, g."gameId"
      ORDER BY g.id
    `);

    const albums = result.rows.map(row => {
      const allMedia = (row.photos || []).filter((p: any) => p.url && p.url.startsWith('http'));
      const photos = allMedia.filter((m: any) => !m.url.includes('/videos/'));
      const videos = allMedia.filter((m: any) => m.url.includes('/videos/'));
      return {
        gameId: row.gameId,
        photos,
        videos,
        coverPhoto: allMedia[0]?.url || null,
        createdAt: new Date().toISOString()
      };
    });

    return NextResponse.json({ albums });
  } catch (e) {
    console.error('[gallery GET]', e);
    return NextResponse.json({ albums: [] });
  }
}

// POST — Upload фото до альбому (gameId)
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const gameId = formData.get("gameId") as string;

    if (!file || !gameId) {
      return NextResponse.json({ error: "Missing file or gameId" }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Blob token not configured" }, { status: 500 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const uploadId = Math.random().toString(36).substring(7);
    const isVideo = file.type?.startsWith("video/");
    const folder = isVideo ? "videos" : "gallery";
    const blobPath = `${folder}/${gameId}/${uploadId}-${Date.now()}.${ext}`;
    const contentType = file.type || (isVideo ? "video/mp4" : "image/jpeg");

    console.log(`[gallery ${uploadId}] Uploading ${isVideo ? "video" : "photo"} to Vercel Blob: ${blobPath}`);

    const buffer = Buffer.from(await file.arrayBuffer());
    const blob = await put(blobPath, buffer, {
      access: "public",
      contentType: contentType,
      token: token,
    });

    // Зберігаємо в таблицю Video
    const result = await pool.query(
      `INSERT INTO "Video" (title, url, type, "createdAt") VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [file.name, blob.url, 'gallery']
    );

    console.log(`[gallery ${uploadId}] ✅ Photo saved: ${blob.url}`);
    return NextResponse.json({ url: blob.url, total: 1 });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[gallery] Error: ${errMsg}`);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

// DELETE — Видалити фото за URL
export async function DELETE(req: Request) {
  try {
    const { url } = await req.json() as { url: string };
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // Видаляємо з БД
    await pool.query(`DELETE FROM "Video" WHERE url = $1`, [url]);

    // Видаляємо з Blob якщо є pathname
    try {
      if (url.includes('blob.vercel-storage.com')) {
        const pathname = new URL(url).pathname.replace(/^\//, '');
        await del(pathname).catch(() => {});
      }
    } catch (e) {
      console.warn('[gallery] Could not delete from blob:', e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[gallery DELETE] Error: ${errMsg}`);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
