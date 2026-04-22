import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// @ts-expect-error pdfkit types
import PDFDocument from "pdfkit";
import { FBL_LOGO_BASE64 } from "@/lib/fbl-logo-base64";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';


export async function GET(_req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const gameIdNum = parseInt(gameId);
  if (isNaN(gameIdNum)) return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });

  const game = await prisma.game.findUnique({
    where: { id: gameIdNum },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const [events, boxScores, homePlayers, awayPlayers] = await Promise.all([
    prisma.gameEvent.findMany({ where: { gameId: gameIdNum }, orderBy: { createdAt: "asc" } }),
    prisma.boxScore.findMany({ where: { gameId: gameIdNum }, include: { player: true } }),
    prisma.player.findMany({ where: { teamId: game.homeTeamId }, orderBy: { number: "asc" } }),
    prisma.player.findMany({ where: { teamId: game.awayTeamId }, orderBy: { number: "asc" } }),
  ]);

  // --- Stats helpers ---
  function calcPlayerStats(playerId: number) {
    const pe = events.filter((e) => e.playerId === playerId);
    const fg2Made = pe.filter((e) => e.type === "POINTS" && e.points === 2).length;
    const fg2Miss = pe.filter((e) => e.type === "MISS_2P").length;
    const fg3Made = pe.filter((e) => e.type === "POINTS" && e.points === 3).length;
    const fg3Miss = pe.filter((e) => e.type === "MISS_3P").length;
    const ftMade = pe.filter((e) => e.type === "POINTS" && e.points === 1).length;
    const ftMiss = pe.filter((e) => e.type === "MISS_FT").length;
    const fg2Att = fg2Made + fg2Miss;
    const fg3Att = fg3Made + fg3Miss;
    const ftAtt = ftMade + ftMiss;
    const fgMade = fg2Made + fg3Made;
    const fgAtt = fg2Att + fg3Att;
    const points = fg2Made * 2 + fg3Made * 3 + ftMade;
    const reboundsOff = pe.filter((e) => e.type === "REBOUND_OFF").length;
    const reboundsDef = pe.filter((e) => e.type === "REBOUND_DEF" || e.type === "REBOUND").length;
    const rebounds = reboundsOff + reboundsDef;
    const assists = pe.filter((e) => e.type === "ASSIST").length;
    const steals = pe.filter((e) => e.type === "STEAL").length;
    const blocks = pe.filter((e) => e.type === "BLOCK").length;
    const turnovers = pe.filter((e) => e.type === "TURNOVER").length;
    const fouls = pe.filter((e) => ["FOUL", "FOUL_TECHNICAL", "FOUL_UNSPORTSMANLIKE"].includes(e.type)).length;
    const pct = (m: number, a: number) => (a > 0 ? `${Math.round((m / a) * 100)}` : "-");
    return {
      points, fg2Made, fg2Att, fg3Made, fg3Att, ftMade, ftAtt, fgMade, fgAtt,
      reboundsOff, reboundsDef, rebounds, assists, steals, blocks, turnovers, fouls,
      pct2: `${fg2Made}-${fg2Att}`, pct2p: pct(fg2Made, fg2Att),
      pct3: `${fg3Made}-${fg3Att}`, pct3p: pct(fg3Made, fg3Att),
      pctFt: `${ftMade}-${ftAtt}`, pctFtp: pct(ftMade, ftAtt),
      pctFg: `${fgMade}-${fgAtt}`, pctFgp: pct(fgMade, fgAtt),
    };
  }

  function calcQuarterScores(homeTeamId: number, awayTeamId: number) {
    return [1, 2, 3, 4].map((q) => {
      const qPts = events.filter((e) => e.type === "POINTS" && e.quarter === q);
      return {
        quarter: q,
        home: qPts.filter((e) => e.teamId === homeTeamId).reduce((s, e) => s + (e.points ?? 0), 0),
        away: qPts.filter((e) => e.teamId === awayTeamId).reduce((s, e) => s + (e.points ?? 0), 0),
      };
    });
  }

  function buildTeamRows(players: typeof homePlayers) {
    return players
      .map((p) => {
        const bs = boxScores.find((b) => b.playerId === p.id);
        const stats = calcPlayerStats(p.id);
        const hasData = bs || stats.points > 0 || stats.rebounds > 0 || stats.assists > 0 || stats.fouls > 0;
        if (!hasData) return null;
        return { player: p, bs, stats, isStarter: bs?.isStarter ?? false };
      })
      .filter(Boolean) as { player: typeof homePlayers[0]; bs: typeof boxScores[0] | undefined; stats: ReturnType<typeof calcPlayerStats>; isStarter: boolean }[];
  }

  const quarterScores = calcQuarterScores(game.homeTeamId, game.awayTeamId);
  const homeRows = buildTeamRows(homePlayers).sort((a, b) => a.isStarter === b.isStarter ? a.player.number - b.player.number : a.isStarter ? -1 : 1);
  const awayRows = buildTeamRows(awayPlayers).sort((a, b) => a.isStarter === b.isStarter ? a.player.number - b.player.number : a.isStarter ? -1 : 1);

  // Load logo from base64
  const logoBuffer = Buffer.from(FBL_LOGO_BASE64, 'base64');

  // Generate PDF
  const chunks: Buffer[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30 });
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", resolve);
        doc.on("error", reject);

    const orange = "#f46f10";
    const navy = "#1e2a4a";
    const W = 782; // A4 landscape width minus margins
    const L = 30;  // left margin

    // --- HEADER ---
    doc.rect(0, 0, 842, 70).fill(navy);

    const logoBuffer = Buffer.from(FBL_LOGO_BASE64, 'base64');
    doc.image(logoBuffer, L, 8, { width: 50, height: 50 });

    doc.fillColor("white").fontSize(18).font("Helvetica-Bold").text("ПРОТОКОЛ МАТЧУ", L, 10, { align: "center", width: W });
    doc.fontSize(9).font("Helvetica").text("Дитячо-юнацька баскетбольна ліга Львова", L, 32, { align: "center", width: W });
    const dateStr = new Date(game.scheduledAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
    doc.text(`Дата: ${dateStr}  |  Місце: Мазепи 1А`, L, 46, { align: "center", width: W });

    // --- SCORE ---
    let y = 82;
    doc.fillColor(navy).fontSize(22).font("Helvetica-Bold");
    doc.text(game.homeTeam.name, L, y, { width: W * 0.35, align: "right" });
    doc.text(`${game.homeScore} : ${game.awayScore}`, L + W * 0.35 + 10, y, { width: W * 0.2, align: "center" });
    doc.text(game.awayTeam.name, L + W * 0.55 + 20, y, { width: W * 0.35, align: "left" });

    // Quarter scores
    y += 28;
    const qStr = quarterScores.map((q) => `Q${q.quarter}: ${q.home}-${q.away}`).join("  |  ");
    doc.setFontSize !== undefined;
    doc.fontSize(9).font("Helvetica").fillColor("#6b7280").text(qStr, L, y, { align: "center", width: W });

    y += 14;
    doc.moveTo(L, y).lineTo(L + W, y).strokeColor(orange).lineWidth(1.5).stroke();
    y += 8;

    // --- TABLE helper ---
    const cols = [
      { label: "№", w: 22 },
      { label: "Гравець", w: 90 },
      { label: "Поз", w: 22 },
      { label: "Хв", w: 20 },
      { label: "Оч", w: 22 },
      { label: "КП", w: 34 },
      { label: "%", w: 22 },
      { label: "2О", w: 34 },
      { label: "%", w: 22 },
      { label: "3О", w: 34 },
      { label: "%", w: 22 },
      { label: "ШТ", w: 34 },
      { label: "%", w: 22 },
      { label: "НПД", w: 24 },
      { label: "ЗПД", w: 24 },
      { label: "ПДБ", w: 24 },
      { label: "ПЕР", w: 24 },
      { label: "ВТ", w: 22 },
      { label: "БЛК", w: 24 },
      { label: "ФОЛ", w: 24 },
    ];

    function drawTableHeader(yy: number) {
      doc.rect(L, yy, W, 14).fill("#1e2a4a");
      doc.fillColor("white").fontSize(7).font("Helvetica-Bold");
      let x = L;
      for (const col of cols) {
        doc.text(col.label, x + 1, yy + 3, { width: col.w - 2, align: "center" });
        x += col.w;
      }
      return yy + 14;
    }

    function drawTeamHeader(teamName: string, yy: number) {
      doc.rect(L, yy, W, 16).fill("#f1f5f9");
      doc.fillColor(navy).fontSize(9).font("Helvetica-Bold").text(teamName.toUpperCase(), L + 4, yy + 4);
      return yy + 16;
    }

    function drawRow(
      row: { player: typeof homePlayers[0]; bs: typeof boxScores[0] | undefined; stats: ReturnType<typeof calcPlayerStats>; isStarter: boolean },
      yy: number,
      even: boolean
    ) {
      doc.rect(L, yy, W, 13).fill(even ? "#f9fafb" : "white");
      doc.fillColor(navy).fontSize(7).font("Helvetica");
      const { player: p, bs, stats, isStarter } = row;
      const values = [
        isStarter ? `*${p.number}` : `${p.number}`,
        `${p.lastName} ${p.firstName[0]}.`,
        p.position ?? "-",
        `${bs?.minutes ?? 0}`,
        `${stats.points}`,
        stats.pctFg, stats.pctFgp,
        stats.pct2, stats.pct2p,
        stats.pct3, stats.pct3p,
        stats.pctFt, stats.pctFtp,
        `${stats.reboundsOff || "-"}`,
        `${stats.reboundsDef || "-"}`,
        `${stats.rebounds || "-"}`,
        `${stats.assists || "-"}`,
        `${stats.turnovers || "-"}`,
        `${stats.blocks || "-"}`,
        `${stats.fouls || "-"}`,
      ];
      let x = L;
      for (let i = 0; i < cols.length; i++) {
        const align = i < 2 ? "left" : "center";
        doc.text(values[i] ?? "-", x + 1, yy + 3, { width: cols[i].w - 2, align });
        x += cols[i].w;
      }
      return yy + 13;
    }

    function drawTotalsRow(rows: typeof homeRows, yy: number) {
      const t = rows.reduce(
        (acc, r) => ({
          pts: acc.pts + r.stats.points,
          fgM: acc.fgM + r.stats.fgMade, fgA: acc.fgA + r.stats.fgAtt,
          f2M: acc.f2M + r.stats.fg2Made, f2A: acc.f2A + r.stats.fg2Att,
          f3M: acc.f3M + r.stats.fg3Made, f3A: acc.f3A + r.stats.fg3Att,
          ftM: acc.ftM + r.stats.ftMade, ftA: acc.ftA + r.stats.ftAtt,
          rO: acc.rO + r.stats.reboundsOff, rD: acc.rD + r.stats.reboundsDef,
          reb: acc.reb + r.stats.rebounds, ast: acc.ast + r.stats.assists,
          to: acc.to + r.stats.turnovers, blk: acc.blk + r.stats.blocks, foul: acc.foul + r.stats.fouls,
        }),
        { pts: 0, fgM: 0, fgA: 0, f2M: 0, f2A: 0, f3M: 0, f3A: 0, ftM: 0, ftA: 0, rO: 0, rD: 0, reb: 0, ast: 0, to: 0, blk: 0, foul: 0 }
      );
      const pct = (m: number, a: number) => a > 0 ? `${Math.round((m / a) * 100)}` : "-";
      doc.rect(L, yy, W, 14).fill("#e2e8f0");
      doc.fillColor(navy).fontSize(7).font("Helvetica-Bold");
      const values = [
        "Σ", "РАЗОМ", "", "",
        `${t.pts}`,
        `${t.fgM}-${t.fgA}`, pct(t.fgM, t.fgA),
        `${t.f2M}-${t.f2A}`, pct(t.f2M, t.f2A),
        `${t.f3M}-${t.f3A}`, pct(t.f3M, t.f3A),
        `${t.ftM}-${t.ftA}`, pct(t.ftM, t.ftA),
        `${t.rO}`, `${t.rD}`, `${t.reb}`,
        `${t.ast}`, `${t.to}`, `${t.blk}`, `${t.foul}`,
      ];
      let x = L;
      for (let i = 0; i < cols.length; i++) {
        doc.text(values[i] ?? "", x + 1, yy + 4, { width: cols[i].w - 2, align: i < 2 ? "left" : "center" });
        x += cols[i].w;
      }
      return yy + 14;
    }

    // --- HOME TEAM TABLE ---
    if (y > 520) { doc.addPage(); y = 30; }
    y = drawTeamHeader(game.homeTeam.name, y);
    y = drawTableHeader(y);
    let even = false;
    let prevStarter: boolean | null = null;
    for (const row of homeRows) {
      if (prevStarter === true && !row.isStarter) {
        // Bench divider
        doc.rect(L, y, W, 10).fill("#f1f5f9");
        doc.fillColor("#94a3b8").fontSize(6.5).font("Helvetica-Bold").text("ЛАВКА", L + 4, y + 2);
        y += 10;
      }
      prevStarter = row.isStarter;
      if (y > 530) { doc.addPage(); y = 30; y = drawTableHeader(y); }
      y = drawRow(row, y, even);
      even = !even;
    }
    y = drawTotalsRow(homeRows, y);
    y += 8;

    // --- AWAY TEAM TABLE ---
    if (y > 520) { doc.addPage(); y = 30; }
    y = drawTeamHeader(game.awayTeam.name, y);
    y = drawTableHeader(y);
    even = false;
    prevStarter = null;
    for (const row of awayRows) {
      if (prevStarter === true && !row.isStarter) {
        doc.rect(L, y, W, 10).fill("#f1f5f9");
        doc.fillColor("#94a3b8").fontSize(6.5).font("Helvetica-Bold").text("ЛАВКА", L + 4, y + 2);
        y += 10;
      }
      prevStarter = row.isStarter;
      if (y > 530) { doc.addPage(); y = 30; y = drawTableHeader(y); }
      y = drawRow(row, y, even);
      even = !even;
    }
    y = drawTotalsRow(awayRows, y);
    y += 10;

    // --- LEGEND ---
    if (y > 545) { doc.addPage(); y = 30; }
    doc.moveTo(L, y).lineTo(L + W, y).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    y += 5;
    doc.fillColor("#6b7280").fontSize(6.5).font("Helvetica").text(
      "КП-кидки з поля | 2О-двоочкові | 3О-триочкові | ШТ-штрафні | НПД-підбір напад | ЗПД-підбір захист | ПДБ-підбори | ПЕР-передачі | ВТ-втрати | БЛК-блоки | ФОЛ-фоли | *-стартовий",
      L, y, { width: W }
    );
    y += 16;

    // --- FOOTER ---
    doc.fillColor(orange).fontSize(8).font("Helvetica-Bold").text("Дитячо-юнацька баскетбольна ліга Львова  ·  www.basket.lviv.ua", L, y, { align: "center", width: W });

    doc.end();
      } catch (innerErr) {
        reject(innerErr);
      }
    });
  } catch (err) {
    console.error("PDF generation error:", err instanceof Error ? err.message : String(err), err);
    return NextResponse.json({ error: "Failed to generate PDF", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }

  const buffer = Buffer.concat(chunks);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="match-${gameId}-protocol.pdf"`,
    },
  });
}
