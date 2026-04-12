import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

export async function GET() {
  const { rows } = await pool.query(`
    SELECT s.id, s.match_id, s.match_title, s.match_url, s.started_by, s.started_at, s.video_started_at, s.current_time_sec,
           COALESCE(array_agg(v.user_name) FILTER (WHERE v.user_name IS NOT NULL), '{}') as viewers
    FROM tv_session s
    LEFT JOIN tv_viewers v ON v.session_id = s.id
    WHERE s.started_at > NOW() - INTERVAL '3 hours'
    GROUP BY s.id ORDER BY s.started_at DESC LIMIT 1
  `);
  if (!rows.length) return NextResponse.json({ session: null, viewers: [] });
  const { viewers, ...session } = rows[0];
  return NextResponse.json({ session, viewers });
}

export async function POST(req: Request) {
  const { matchId, matchTitle, matchUrl, userName } = await req.json();
  await pool.query(`DELETE FROM tv_session WHERE started_at < NOW() - INTERVAL '3 hours'`);
  const { rows } = await pool.query(
    `INSERT INTO tv_session (match_id, match_title, match_url, started_by) VALUES ($1,$2,$3,$4) RETURNING *`,
    [matchId, matchTitle, matchUrl, userName]
  );
  const session = rows[0];
  await pool.query(`INSERT INTO tv_viewers (session_id, user_name) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [session.id, userName]);
  return NextResponse.json({ session, viewers: [userName] });
}

export async function PATCH(req: Request) {
  const { sessionId, userName } = await req.json();
  await pool.query(`INSERT INTO tv_viewers (session_id, user_name) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [sessionId, userName]);
  const { rows } = await pool.query(`SELECT user_name FROM tv_viewers WHERE session_id=$1`, [sessionId]);
  return NextResponse.json({ viewers: rows.map((r) => r.user_name) });
}

export async function DELETE(req: Request) {
  const { sessionId } = await req.json();
  await pool.query(`DELETE FROM tv_session WHERE id=$1`, [sessionId]);
  return NextResponse.json({ success: true });
}

export async function PUT(req: Request) {
  const { sessionId, currentTimeSec } = await req.json();
  await pool.query(
    `UPDATE tv_session
     SET current_time_sec = $2, time_updated_at = NOW()
     WHERE id = $1`,
    [sessionId, currentTimeSec]
  );
  return NextResponse.json({ ok: true });
}
