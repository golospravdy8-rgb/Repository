import { NextResponse } from "next/server";
import { Pool } from "pg";
import { put, del } from "@vercel/blob";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

/**
 * GET /api/gallery
 * Повертає альбоми матчів з фото/відео, згруповані за gameId
 */
export async function GET() {
  try {
    // Отримаємо всі ігри
    const gamesResult = await pool.query(`
      SELECT id, "homeTeamId", "awayTeamId", "scheduledAt", status, "homeScore", "awayScore"
      FROM "Game"
      ORDER BY "scheduledAt" DESC
    `);

    const albums = [];

    // Для кожної гри отримаємо фото/відео з таблиці Video
    for (const game of gamesResult.rows) {
      const mediaResult = await pool.query(
        `SELECT id, title, url, type, "createdAt" FROM "Video"
         WHERE type = $1 OR type = $2
         ORDER BY "createdAt" DESC`,
        ["gallery", "highlight"]
      );

      const photos = mediaResult.rows.filter(
        (m: any) => !m.url?.includes("/videos/")
      );
      const videos = mediaResult.rows.filter(
        (m: any) => m.url?.includes("/videos/")
      );

      albums.push({
        gameId: game.id,
        photos: photos.map((p: any) => ({
          id: p.id,
          url: p.url,
          createdAt: p.createdAt,
        })),
        videos: videos.map((v: any) => ({
          id: v.id,
          url: v.url,
          createdAt: v.createdAt,
        })),
        coverPhoto: photos[0]?.url || null,
        createdAt: game.scheduledAt,
      });
    }

    return NextResponse.json({ albums });
  } catch (e) {
    console.error("[gallery GET ERROR]", e);
    return NextResponse.json(
      { albums: [], error: String(e) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gallery
 * Завантажити фото чи відео до альбому матчу
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const gameId = formData.get("gameId") as string;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "Файл не вибрано або порожній" },
        { status: 400 }
      );
    }

    if (!gameId || isNaN(Number(gameId))) {
      return NextResponse.json(
        { error: "gameId обов'язковий" },
        { status: 400 }
      );
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN не налаштований" },
        { status: 500 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const uploadId = Math.random().toString(36).substring(7);
    const isVideo = file.type?.startsWith("video/");
    const folder = isVideo ? "videos" : "gallery";
    const blobPath = `${folder}/${gameId}/${uploadId}-${Date.now()}.${ext}`;
    const contentType = file.type || (isVideo ? "video/mp4" : "image/jpeg");

    console.log(
      `[gallery ${uploadId}] Uploading ${isVideo ? "video" : "photo"} to Vercel Blob: ${blobPath}`
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const blob = await put(blobPath, buffer, {
      access: "public",
      contentType: contentType,
      token: token,
    });

    // Зберігаємо в таблицю Video з type=gallery (для фото) або type=highlight (для відео)
    // Фото: isPublished=false (тільки в адмінці)
    // Відео: isPublished=true (показувати на /media)
    const result = await pool.query(
      `INSERT INTO "Video" (title, url, type, "isPublished", "publishedAt", "createdAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, url, type, "createdAt"`,
      [file.name, blob.url, isVideo ? "highlight" : "gallery", isVideo]
    );

    console.log(`[gallery ${uploadId}] ✅ Saved: ${blob.url}`);

    return NextResponse.json({
      url: blob.url,
      id: result.rows[0].id,
      type: result.rows[0].type,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[gallery POST ERROR]", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

/**
 * DELETE /api/gallery
 * Видалити фото/відео за URL
 */
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { url, gameId } = body;

    if (!url) {
      return NextResponse.json(
        { error: "url обов'язковий" },
        { status: 400 }
      );
    }

    // Видаляємо з БД
    const dbResult = await pool.query(
      `DELETE FROM "Video" WHERE url = $1 RETURNING id`,
      [url]
    );

    // Видаляємо з Vercel Blob
    if (url.includes("blob.vercel-storage.com")) {
      try {
        const pathname = new URL(url).pathname.replace(/^\//, "");
        await del(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN! });
        console.log(`[gallery] Deleted from Blob: ${pathname}`);
      } catch (e) {
        console.warn("[gallery] Could not delete from blob:", e);
      }
    }

    return NextResponse.json({ ok: true, deleted: dbResult.rows.length });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[gallery DELETE ERROR]", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

/**
 * PATCH /api/gallery
 * Встановити фото як обкладинку альбому
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { gameId, url } = body;

    if (!gameId || !url) {
      return NextResponse.json(
        { error: "gameId та url обов'язкові" },
        { status: 400 }
      );
    }

    // Логування, але не прив'язуємо обкладинку до конкретної гри
    console.log(`[gallery] Set cover: game=${gameId}, photo=${url}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[gallery PATCH ERROR]", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
