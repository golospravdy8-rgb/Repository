import { NextResponse } from "next/server";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

export async function POST(req: Request) {
  try {
    const { gameId, filename, contentType } = await req.json();

    if (!gameId || !filename) {
      return NextResponse.json(
        { error: "gameId та filename обов'язкові" },
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

    // Перевір що гра існує
    const gameCheck = await pool.query(
      `SELECT id FROM "Game" WHERE id = $1`,
      [Number(gameId)]
    );
    if (gameCheck.rows.length === 0) {
      return NextResponse.json(
        { error: `Гра ${gameId} не знайдена` },
        { status: 404 }
      );
    }

    const isVideo = contentType?.startsWith("video/");
    const ext = filename.split(".").pop() || (isVideo ? "mp4" : "jpg");
    const uploadId = Math.random().toString(36).substring(7);
    const folder = isVideo ? "videos" : "gallery";
    const pathname = `${folder}/${gameId}/${uploadId}-${Date.now()}.${ext}`;

    console.log(
      `[upload-token] Generating token for gameId=${gameId}, pathname=${pathname}`
    );

    // Генеруємо client token для прямого завантаження
    const clientToken = await generateClientTokenFromReadWriteToken({
      token,
      pathname,
      onUploadCompleted: {
        callbackUrl: `${
          process.env.NEXTAUTH_URL || "https://basketball.lviv.ua"
        }/api/gallery/upload-complete`,
        tokenPayload: JSON.stringify({
          gameId: Number(gameId),
          isVideo,
          filename,
        }),
      },
    });

    console.log(`[upload-token] Token generated successfully`);

    return NextResponse.json({ clientToken, pathname });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[upload-token ERROR]", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
