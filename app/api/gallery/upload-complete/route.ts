import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

export async function POST(req: Request) {
  try {
    const { blob, tokenPayload } = await req.json();

    if (!blob?.url || !tokenPayload) {
      return NextResponse.json(
        { error: "blob.url та tokenPayload обов'язкові" },
        { status: 400 }
      );
    }

    const payload = JSON.parse(tokenPayload);
    const { gameId, isVideo, filename } = payload;

    console.log(
      `[upload-complete] Saving: gameId=${gameId}, isVideo=${isVideo}, url=${blob.url.substring(0, 80)}...`
    );

    const result = await pool.query(
      `INSERT INTO "Video" (title, url, type, "gameId", "isPublished", "publishedAt", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, url, type, "createdAt"`,
      [
        filename,
        blob.url,
        isVideo ? "highlight" : "gallery",
        Number(gameId),
        isVideo,
      ]
    );

    console.log(
      `[upload-complete] ✅ Saved to DB: id=${result.rows[0].id}, gameId=${gameId}`
    );

    return NextResponse.json({
      ok: true,
      video: result.rows[0],
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[upload-complete ERROR]", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
